import { assertEquals } from "@std/assert";
import { fetchJson } from "../http.ts";
import {
  contentInlinePartsToMarkdown,
  contentPartsToMarkdown,
} from "./content-to-markdown.ts";
import { toJSDocComment } from "./jsdoc-comments.ts";
import { ReferenceResolvers } from "./reference-resolvers.ts";
import { documentSchema } from "./schema.ts";
import { getType } from "./type-to-zod.ts";

type ModelReturn = { name: string; definition: string };

export const convertModel = async (
  doc: string,
  {
    baseUrl,
    addReference,
  }: { baseUrl: string; addReference: (uri: string) => Promise<ModelReturn> }
): Promise<ModelReturn> => {
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
      allowedValues: property.attributes?.find(
        (attribute) => attribute.kind === "allowedValues"
      )?.values,
    }));

  const modelBodyLines = await Promise.all(
    properties?.map(async (property) => {
      const type = getType(property.type, {
        resolvers,
        allowedValues: property.allowedValues,
      });

      if (type.references) {
        await Promise.all(type.references.map((uri) => addReference(uri)));
      }

      return [
        (property.description || type.deprecated) &&
          toJSDocComment({
            content: property.description,
            deprecated: type.deprecated,
          }),
        JSON.stringify(property.name),
        ": ",
        type.definition,
        !property.required && ".optional()",
        ",\n",
      ]
        .filter((v): v is string => Boolean(v))
        .join("");
    }) ?? []
  );

  const inheritsFrom = data.relationshipsSections?.find(
    (section) => section.type === "inheritsFrom"
  )?.identifiers;

  let base = "z.object";

  if (inheritsFrom) {
    assertEquals(inheritsFrom.length, 1);
    const [uri] = inheritsFrom;
    const referencedModel = await addReference(uri);

    base = `${referencedModel.name}.extend`;
  }

  const name = resolvers.getTypeSpecDefinitionName(data.metadata.externalID);

  return {
    name,
    definition: [
      toJSDocComment({
        content: contentInlinePartsToMarkdown(data.abstract, resolvers),
        deprecated: Boolean(data.deprecationSummary),
      }),
      "export const ",
      name,
      ` = ${base}({\n`,
      ...(modelBodyLines ?? []),
      "})",
    ].join(""),
  };
};
