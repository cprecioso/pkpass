import { convertModel } from "./object-to-model.ts";
import { SCALAR_IMPORT_NAME } from "./type-to-zod.ts";

const SCALAR_IMPORT_PATH = import.meta.resolve("../../runtime/scalars.ts");

export const convertSchema = async (
  doc: string,
  { baseUrl, baseUri }: { baseUrl: string; baseUri: string }
): Promise<string> => {
  const seenDocs = new Set<string>();
  const docQueue: string[] = [];
  const models: string[] = [];

  const addReferenced = (uri: string) => {
    if (seenDocs.has(uri)) return;
    seenDocs.add(uri);
    docQueue.push(uri);
  };

  addReferenced(doc);
  while (true) {
    let docUri = docQueue.shift();
    if (!docUri) break;

    if (docUri.startsWith(baseUri)) docUri = `/${docUri.slice(baseUri.length)}`;

    const model = await convertModel(docUri, { baseUrl, addReferenced });

    models.push(model.definition);
  }

  return [
    `import * as ${SCALAR_IMPORT_NAME} from ${JSON.stringify(
      SCALAR_IMPORT_PATH
    )};`,
    `import * as z from "zod";`,
    ...models.reverse(),
  ].join("\n");
};
