import * as path from "@std/path";
import { formatTypeSpec } from "@typespec/compiler";
import { fetchJson } from "./lib/http.ts";
import { documentSchema } from "./schemas/swiftdoc.ts";
import { DocumentResolvers } from "./util/resolvers.ts";
import { contentPartsToMarkdown, getType, Scalar } from "./util/swiftdoc.ts";

const docToModel = async (
  doc: string,
  {
    baseUrl,
    addReferenced,
  }: { baseUrl: string; addReferenced: (uri: string) => void }
): Promise<{ definition: string; scalars: Scalar[] }> => {
  const relativeDocUrl = doc
    .replace(/^.?\/?/, "./")
    .replace(/(?:\.json)?$/, ".json");
  const jsonUrl = new URL(relativeDocUrl, baseUrl).href;
  const data = await fetchJson(jsonUrl, documentSchema);

  const resolvers = new DocumentResolvers(data);

  const properties = data.primaryContentSections
    .find((sections) => sections.kind === "properties")
    ?.items.map((property) => ({
      name: property.name,
      type: property.type,
      description: contentPartsToMarkdown(property.content, resolvers),
      required: property.required,
    }));

  const scalars: Scalar[] = [];

  const modelBodyLines = properties?.map((property) => {
    const type = getType(property.type, resolvers);

    scalars.push(...(type.scalars ?? []));
    type.referenced?.forEach((uri) => addReferenced(uri));

    return [
      property.description && `/**\n${property.description}\n*/\n`,
      type.deprecated && '#deprecated "Deprecated"\n',
      property.name,
      !property.required && "?",
      ": ",
      type.definition,
      ";\n",
    ]
      .filter((v): v is string => Boolean(v))
      .join("");
  });

  return {
    definition: [
      "model ",
      resolvers.getTypeSpecDefinitionName(data.metadata.externalID),
      " {\n",
      ...(modelBodyLines ?? []),
      "}",
    ].join(""),
    scalars,
  };
};

const getDoc = async (
  doc: string,
  { baseUrl, baseUri }: { baseUrl: string; baseUri: string }
): Promise<string> => {
  const seenDocs = new Set<string>();
  const docQueue: string[] = [];
  const models: string[] = [];
  const scalars: Scalar[] = [];

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

    const model = await docToModel(docUri, { baseUrl, addReferenced });

    scalars.push(...model.scalars);
    models.push(model.definition);
  }

  const scalarLines = Array.from(
    new Map(scalars.map((scalar) => [scalar.name, scalar])).values(),
    (scalar) => `scalar ${scalar.name} extends ${scalar.extends};`
  );

  return [...scalarLines, ...models].join("\n");
};

const schema = await getDoc("/documentation/walletpasses/pass", {
  baseUrl: "https://developer.apple.com/tutorials/data/",
  baseUri: "doc://com.apple.walletpasses/",
});

const formattedSchema = await formatTypeSpec(schema);

await Deno.writeTextFile(
  path.fromFileUrl(new URL("../data.tsp", import.meta.url)),
  formattedSchema
);
