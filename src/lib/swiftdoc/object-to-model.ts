import { fetchJson } from "../http.ts";
import { contentPartsToMarkdown } from "./content-to-markdown.ts";
import { ReferenceResolvers } from "./reference-resolvers.ts";
import { documentSchema } from "./schema.ts";
import { getType } from "./type-to-zod.ts";

export const convertModel = async (
  doc: string,
  {
    baseUrl,
    addReferenced,
  }: { baseUrl: string; addReferenced: (uri: string) => void }
): Promise<{ definition: string }> => {
  const relativeDocUrl = doc
    .replace(/^.?\/?/, "./")
    .replace(/(?:\.json)?$/, ".json");
  const jsonUrl = new URL(relativeDocUrl, baseUrl).href;
  const data = await fetchJson(jsonUrl, documentSchema);

  const resolvers = new ReferenceResolvers(data);

  const properties = data.primaryContentSections
    .find((sections) => sections.kind === "properties")
    ?.items.map((property) => ({
      name: property.name,
      type: property.type,
      description: contentPartsToMarkdown(property.content, resolvers),
      required: property.required,
    }));

  const modelBodyLines = properties?.map((property) => {
    const type = getType(property.type, resolvers);

    type.referenced?.forEach((uri) => addReferenced(uri));

    return [
      (property.description || type.deprecated) &&
        [
          "/**",
          ...[
            ...(type.deprecated ? ["@deprecated"] : []),
            ...(property.description?.split("\n") ?? []),
          ].map((line) => ` * ${line}`),
          " */",
          "",
        ].join("\n"),
      JSON.stringify(property.name),
      ": ",
      type.definition,
      !property.required && ".optional()",
      ",\n",
    ]
      .filter((v): v is string => Boolean(v))
      .join("");
  });

  return {
    definition: [
      "export const ",
      resolvers.getTypeSpecDefinitionName(data.metadata.externalID),
      " = z.object({\n",
      ...(modelBodyLines ?? []),
      "})",
    ].join(""),
  };
};
