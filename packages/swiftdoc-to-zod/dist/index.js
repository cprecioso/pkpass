// src/index.ts
import pMemoize from "p-memoize";
import PQueue from "p-queue";

// src/object-to-model.ts
import assert4 from "node:assert/strict";

// src/content-to-markdown.ts
import assert from "node:assert/strict";
var contentInlinePartsToMarkdown = (parts, resolvers) => Array.from(parts, (part) => {
  switch (part.type) {
    case "text": {
      return part.text;
    }
    case "codeVoice": {
      return `\`${part.code}\``;
    }
    case "reference": {
      const { title, url } = resolvers.getBrowserLinkInfo(part.identifier);
      return `[\`${title}\`](${url})`;
    }
    case "emphasis": {
      return `_${contentInlinePartsToMarkdown(
        part.inlineContent,
        resolvers
      )}_`;
    }
    default: {
      part;
      throw new Error(`Unreachable: Unknown ContentInlinePart type`);
    }
  }
}).join("");
var contentPartsToMarkdown = (parts, resolvers) => Array.from(parts, (part) => {
  assert.equal(
    part.type,
    "paragraph",
    "Unknown ContentPart type"
  );
  return contentInlinePartsToMarkdown(part.inlineContent, resolvers);
}).join("\n\n");

// src/jsdoc-comments.ts
var toJSDocComment = ({
  content,
  deprecated
}) => {
  if (!content && !deprecated) return "";
  return [
    "/**",
    ...[
      ...deprecated ? ["@deprecated"] : [],
      ...content ? content.split("\n") : []
    ].map((line) => ` * ${line}`),
    " */\n"
  ].join("\n");
};

// src/reference-resolvers.ts
import slugify from "@sindresorhus/slugify";
import assert2 from "node:assert/strict";
var URI_PREFIX = /^doc:\/\/com.apple.documentation\//;
var URL_PREFIX = "https://developer.apple.com/";
var uriToBrowserUrl = (uri) => {
  return uri.replace(URI_PREFIX, URL_PREFIX);
};
var camelize = (str) => `${str.at(0)?.toUpperCase()}${str.slice(1)}`;
var ReferenceResolvers = class {
  #documentReferences;
  constructor(document) {
    this.#documentReferences = new Map(Object.entries(document.references));
  }
  getReference(uri) {
    const reference = this.#documentReferences.get(uri);
    assert2(reference, `Reference ${uri} does not exist`);
    return reference;
  }
  getBrowserLinkInfo(uri) {
    const { title } = this.getReference(uri);
    const url = uriToBrowserUrl(uri);
    return { title, url };
  }
  getTypeSpecDefinitionName(id) {
    return camelize(
      slugify(id, { separator: "", decamelize: false, lowercase: false })
    );
  }
  getTypeSpecReference(id) {
    return this.getTypeSpecDefinitionName(id);
  }
};

// src/schema.ts
import * as z from "zod";
var schemaVersionSchema = z.object({ major: z.literal(0), minor: z.number().gte(3), patch: z.number() }).strict();
var typePartSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string() }).strict(),
  z.object({
    kind: z.literal("typeIdentifier"),
    text: z.string(),
    identifier: z.string(),
    preciseIdentifier: z.string()
  }).strict()
]);
var contentInlinePartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }).strict(),
  z.object({
    type: z.literal("emphasis"),
    // deno-lint-ignore no-explicit-any
    inlineContent: z.array(z.lazy(() => contentInlinePartSchema))
  }),
  z.object({ type: z.literal("codeVoice"), code: z.string() }).strict(),
  z.object({
    type: z.literal("reference"),
    identifier: z.string(),
    isActive: z.boolean()
  }).strict()
]);
var contentPartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    inlineContent: z.array(contentInlinePartSchema)
  }).strict()
]);
var attributeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("allowedValues"), values: z.array(z.string()) })
]);
var propertyItemSchema = z.object({
  type: z.array(typePartSchema),
  required: z.boolean().default(false),
  name: z.string(),
  content: z.array(contentPartSchema),
  attributes: z.array(attributeSchema).optional()
});
var relationshipSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("inheritsFrom"),
    identifiers: z.array(z.string()).max(1)
  }),
  z.object({ type: z.literal("inheritedBy") })
]);
var documentSchema = z.object({
  schemaVersion: schemaVersionSchema,
  identifier: z.object({
    interfaceLanguage: z.literal("data"),
    url: z.string()
  }),
  metadata: z.object({
    title: z.string(),
    externalID: z.string(),
    symbolKind: z.enum(["dictionary", "dict"])
  }),
  primaryContentSections: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("properties"),
        items: z.array(propertyItemSchema)
      }),
      z.object({
        kind: z.enum(["declarations", "attributes", "mentions", "content"])
      })
    ])
  ),
  relationshipsSections: z.array(relationshipSchema).optional(),
  abstract: z.array(contentInlinePartSchema),
  references: z.record(
    z.object({
      title: z.string(),
      url: z.string(),
      deprecated: z.boolean().default(false)
    })
  ),
  deprecationSummary: z.array(z.unknown()).optional()
});

// src/type-to-zod.ts
import assert3 from "node:assert/strict";
var customScalar = (name) => `customScalars.${name}`;
var makeArrayType = (type) => `z.array(${type})`;
var getType = (parts, {
  resolvers,
  allowedValues
}) => {
  {
    const firstPart = parts.at(0);
    const lastPart = parts.at(-1);
    if (firstPart?.kind === "text" && firstPart.text === "[" && lastPart?.kind === "text" && lastPart.text === "]") {
      assert3(!allowedValues, "Unsupported allowedValues inside an array");
      const inner = getType(parts.slice(1, -1), { resolvers });
      return { ...inner, definition: makeArrayType(inner.definition) };
    }
  }
  assert3.equal(parts.length, 1);
  const [part] = parts;
  switch (part.kind) {
    case "text": {
      if (part.text.startsWith("[") && part.text.endsWith("]")) {
        const inner = getType(
          [{ kind: "text", text: part.text.slice(1, -1) }],
          { resolvers, allowedValues }
        );
        return { ...inner, definition: makeArrayType(inner.definition) };
      }
      if (allowedValues) {
        switch (part.text) {
          case "number":
            return {
              definition: `z.union([${allowedValues.map((value) => `z.literal(${value})`).join(", ")}])`
            };
          case "string":
            return {
              definition: `z.enum([${allowedValues.map((value) => JSON.stringify(value)).join(", ")}])`
            };
          default: {
            throw new Error(`Unreachable: Unknown allowed values type`);
          }
        }
      }
      switch (part.text) {
        case "number":
        case "string":
        case "boolean":
          return { definition: `z.${part.text}()` };
        case "any JSON data":
          return { definition: "z.unknown()" };
        case "16-bit unsigned integer":
          return { definition: "z.number().positive()" };
        case "double":
          return { definition: "z.number()" };
        case "ISO 8601 date as string":
          return { definition: customScalar("iso8601") };
        case "ISO 4217 currency code as a string":
          return { definition: customScalar("iso4217") };
        case "localizable string":
          return { definition: customScalar("localizableString") };
        case "Localizable format string":
          return { definition: customScalar("localizableFormatString") };
        case "localizable string, ISO 8601 date, or number":
          return {
            definition: `z.union([${[
              customScalar("localizableString"),
              customScalar("iso8601"),
              "z.number()"
            ].join(",")}])`
          };
        default: {
          throw new Error(`Unreachable: Unknown TypePart text`);
        }
      }
    }
    case "typeIdentifier": {
      return {
        definition: resolvers.getTypeSpecReference(part.preciseIdentifier),
        deprecated: resolvers.getReference(part.identifier).deprecated,
        references: [part.identifier]
      };
    }
    default: {
      part;
      throw new Error(`Unreachable: Unknown TypePart kind`);
    }
  }
};

// src/object-to-model.ts
var convertModel = async (doc, {
  baseUrl,
  addReference,
  fetchJson
}) => {
  const relativeDocUrl = doc.replace(/^.?\/?/, "./").replace(/(?:\.json)?$/, ".json");
  const jsonUrl = new URL(relativeDocUrl, baseUrl).href;
  const data = documentSchema.parse(await fetchJson(jsonUrl));
  const resolvers = new ReferenceResolvers(data);
  const properties = data.primaryContentSections.find((sections) => sections.kind === "properties")?.items.map((property) => ({
    name: property.name,
    type: property.type,
    description: contentPartsToMarkdown(property.content, resolvers),
    required: property.required,
    allowedValues: property.attributes?.find(
      (attribute) => attribute.kind === "allowedValues"
    )?.values
  }));
  const modelBodyLines = await Promise.all(
    properties?.map(async (property) => {
      const type = getType(property.type, {
        resolvers,
        allowedValues: property.allowedValues
      });
      if (type.references) {
        await Promise.all(type.references.map((uri) => addReference(uri)));
      }
      return [
        (property.description || type.deprecated) && toJSDocComment({
          content: property.description,
          deprecated: type.deprecated
        }),
        JSON.stringify(property.name),
        ": ",
        type.definition,
        // Workaround because the PassFields definitions are not declared as arrays for some reason
        property.name.endsWith("Fields") && ".array()",
        !property.required && ".optional()",
        ",\n"
      ].filter((v) => Boolean(v)).join("");
    }) ?? []
  );
  const inheritsFrom = data.relationshipsSections?.find(
    (section) => section.type === "inheritsFrom"
  )?.identifiers;
  let base = "z.object";
  if (inheritsFrom) {
    assert4.equal(inheritsFrom.length, 1);
    const [uri] = inheritsFrom;
    const referencedModel = await addReference(uri);
    base = `${referencedModel.name}.extend`;
  }
  const name = resolvers.getTypeSpecDefinitionName(data.metadata.externalID);
  return {
    name,
    definition: `${toJSDocComment({
      content: contentInlinePartsToMarkdown(data.abstract, resolvers),
      deprecated: Boolean(data.deprecationSummary)
    })}
export const ${name} = ${base}({
${modelBodyLines.join("\n")}
})
export type ${name} = z.input<typeof ${name}>`
  };
};

// src/index.ts
var convertSchema = async (doc, {
  baseUrl,
  baseUri,
  fetchJson
}) => {
  const models = [];
  const modelQueue = new PQueue({ autoStart: true });
  const convertModel2 = pMemoize(
    async (...args) => {
      const model = await convertModel(...args);
      models.push(model.definition);
      return model;
    }
  );
  const addReference = async (docUri) => await modelQueue.add(async () => {
    docUri = docUri.replace(baseUri, "/");
    return await convertModel2(docUri, { baseUrl, addReference, fetchJson });
  });
  await addReference(doc);
  await modelQueue.onIdle();
  return [
    `import * as customScalars from "@pkpass/schema-runtime";`,
    `import * as z from "zod";`,
    "",
    ...models
  ].join("\n");
};
export {
  convertSchema
};
