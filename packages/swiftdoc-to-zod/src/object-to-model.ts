import assert from "node:assert/strict";
import {
  contentInlinePartsToMarkdown,
  contentPartsToMarkdown,
} from "./content-to-markdown";
import { toJSDocComment } from "./jsdoc-comments";
import { ReferenceResolvers } from "./reference-resolvers";
import { documentSchema } from "./schema";
import { getType } from "./type-to-zod";

type ModelReturn = { name: string; definition: string };

export const convertModel = async (
  doc: string,
  {
    baseUrl,
    addReference,
    fetchJson,
  }: {
    baseUrl: string;
    addReference: (uri: string) => Promise<ModelReturn>;
    fetchJson: (url: string) => Promise<unknown>;
  },
): Promise<ModelReturn> => {
  const relativeDocUrl = doc
    .replace(/^.?\/?/, "./")
    .replace(/(?:\.json)?$/, ".json");
  const jsonUrl = new URL(relativeDocUrl, baseUrl).href;

  const data = documentSchema.parse(await fetchJson(jsonUrl));

  const resolvers = new ReferenceResolvers(data);

  const properties = data.primaryContentSections
    .find((sections) => sections.kind === "properties")
    ?.items.map((property) => ({
      name: property.name,
      type: property.type,
      description: contentPartsToMarkdown(property.content, resolvers),
      required: property.required,
      allowedValues: property.attributes?.find(
        (attribute) => attribute.kind === "allowedValues",
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
        // Workaround because the PassFields definitions are not declared as arrays for some reason
        property.name.endsWith("Fields") && ".array()",
        !property.required && ".optional()",
        ",\n",
      ]
        .filter((v): v is string => Boolean(v))
        .join("");
    }) ?? [],
  );

  const inheritsFrom = data.relationshipsSections?.find(
    (section) => section.type === "inheritsFrom",
  )?.identifiers;

  let base = "z.object";

  if (inheritsFrom) {
    assert.equal(inheritsFrom.length, 1);
    const [uri] = inheritsFrom;
    const referencedModel = await addReference(uri);

    base = `${referencedModel.name}.extend`;
  }

  const name = resolvers.getTypeSpecDefinitionName(data.metadata.externalID);

  return {
    name,
    definition: `${toJSDocComment({
      content: contentInlinePartsToMarkdown(data.abstract, resolvers),
      deprecated: Boolean(data.deprecationSummary),
    })}
export const ${name} = ${base}({
${modelBodyLines.join("\n")}
})
export type ${name} = z.input<typeof ${name}>`,
  };
};
