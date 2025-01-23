import pMemoize from "p-memoize";
import PQueue from "p-queue";
import { convertModel as eagerConvertModel } from "./object-to-model.ts";

const FILE_PRELUDE = await Deno.readTextFile(
  new URL("./zod-prelude.ts", import.meta.url)
);

export const convertSchema = async (
  doc: string,
  { baseUrl, baseUri }: { baseUrl: string; baseUri: string }
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
      return await convertModel(docUri, { baseUrl, addReference });
    }))!;

  void addReference(doc);
  await modelQueue.onIdle();

  return [FILE_PRELUDE, ...models].join("\n");
};
