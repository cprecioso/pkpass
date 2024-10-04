import pMemoize from "p-memoize";
import PQueue from "p-queue";
import { convertModel as eagerConvertModel } from "./object-to-model.ts";
import { SCALAR_IMPORT_NAME } from "./type-to-zod.ts";

const SCALAR_IMPORT_PATH = import.meta.resolve("../../runtime/scalars.ts");

export const convertSchema = async (
  doc: string,
  { baseUrl, baseUri }: { baseUrl: string; baseUri: RegExp }
): Promise<string> => {
  const models: string[] = [];

  const modelQueue = new PQueue({ autoStart: true });
  const convertModel = pMemoize(
    async (...args: Parameters<typeof eagerConvertModel>) => {
      const model = await eagerConvertModel(...args);
      models.push(model.definition);
      return model;
    }
  );

  const addReference = async (docUri: string) =>
    (await modelQueue.add(async () => {
      docUri = docUri.replace(baseUri, "/");
      docUri = docUri.replace(/-data.dictionary$/, "");
      return await convertModel(docUri, { baseUrl, addReference });
    }))!;

  void addReference(doc);
  await modelQueue.onIdle();

  return [
    `import * as ${SCALAR_IMPORT_NAME} from ${JSON.stringify(
      SCALAR_IMPORT_PATH
    )};`,
    `import * as z from "zod";`,
    ...models,
  ].join("\n");
};
