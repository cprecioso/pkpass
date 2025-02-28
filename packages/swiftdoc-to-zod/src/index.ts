import pMemoize from "p-memoize";
import PQueue from "p-queue";
import { withPath } from "./error-handling";
import { convertModel as eagerConvertModel } from "./object-to-model";

/**
 * Converts a SwiftDoc JSON document to a Zod schema.
 *
 * @param documentURL The URL of the SwiftDoc JSON file
 * @param options Options for the conversion
 *
 * @returns A string of TypeScript code defining the Zod schemas
 */
export const convertSchema = async (
  /** The URL of the SwiftDoc JSON file */
  documentURL: string,
  {
    baseUrl,
    baseUri,
    fetchJson = async (url) => (await fetch(url)).json(),
  }: {
    /**
     * When referring to other documents by URL, the paths will be prefixed by this URL.
     *
     * Check the [PKPass implementation](../../schema/scripts/build.ts) for an example.
     */
    baseUrl: string;
    /**
     * When referring to other documents by URI, the paths will be prefixed by this URI.
     *
     * Check the [PKPass implementation](../../schema/scripts/build.ts) for an example.
     */
    baseUri: string;
    /**
     * A function to fetch URLs. Should return parsed JSON values.
     * `fetch().json()` is the default implementation.
     *
     * If you're using Deno, you can use
     * `import(url, { with: { type: "json" } })`, which will
     * cache the result for you and hash it into your `deno.lock`.
     */
    fetchJson?: (url: string) => Promise<unknown>;
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
      return await withPath(docUri, () =>
        convertModel(docUri, { baseUrl, addReference, fetchJson }),
      );
    }))!;

  await addReference(documentURL);
  await modelQueue.onIdle();

  return [
    `import * as customScalars from "@pkpass/schema-runtime";`,
    `import * as z from "zod";`,
    "",
    ...models,
  ].join("\n");
};
