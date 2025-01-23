import pMemoize from "p-memoize";
import PQueue from "p-queue";
import { convertModel as eagerConvertModel } from "./object-to-model.ts";

export const convertSchema = async (
  doc: string,
  { baseUrl, baseUri, fetchJson }: {
    baseUrl: string;
    baseUri: string;
    fetchJson: (url: string) => Promise<unknown>;
  },
): Promise<string> => {
  const models: string[] = [];

  const modelQueue = new PQueue({ autoStart: true });
  const convertModel = pMemoize(
    async (...args: Parameters<typeof eagerConvertModel>) => {
      const model = await eagerConvertModel(...args);
      models.push(model.definition);
      return model;
    },
  );

  const addReference = async (docUri: string) =>
    (await modelQueue.add(async () => {
      docUri = docUri.replace(baseUri, "/");
      return await convertModel(docUri, { baseUrl, addReference, fetchJson });
    }))!;

  void addReference(doc);
  await modelQueue.onIdle();

  return [
    `import * as customScalars from "@pkpass/schema-runtime";`,
    `import * as z from "zod";`,
    "",
    ...models,
  ].join("\n");
};
