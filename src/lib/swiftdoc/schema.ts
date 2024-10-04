import * as z from "zod";

export const schemaVersionSchema = z
  .object({ major: z.literal(0), minor: z.number().gte(3), patch: z.number() })
  .strict();
export type SchemaVersion = z.infer<typeof schemaVersionSchema>;

export const typePartSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string() }).strict(),
  z
    .object({
      kind: z.literal("typeIdentifier"),
      text: z.string(),
      identifier: z.string(),
      preciseIdentifier: z.string(),
    })
    .strict(),
]);
export type TypePart = z.infer<typeof typePartSchema>;

export const contentInlinePartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }).strict(),
  z.object({
    type: z.literal("emphasis"),
    // deno-lint-ignore no-explicit-any
    inlineContent: z.array(z.lazy((): any => contentInlinePartSchema)),
  }),
  z.object({ type: z.literal("codeVoice"), code: z.string() }).strict(),
  z
    .object({
      type: z.literal("reference"),
      identifier: z.string(),
      isActive: z.boolean(),
    })
    .strict(),
]);
export type ContentInlinePart = z.infer<typeof contentInlinePartSchema>;

export const contentPartSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("paragraph"),
      inlineContent: z.array(contentInlinePartSchema),
    })
    .strict(),
]);
export type ContentPart = z.infer<typeof contentPartSchema>;

export const propertyItemSchema = z.object({
  type: z.array(typePartSchema),
  required: z.boolean(),
  name: z.string(),
  content: z.array(contentPartSchema),
});
export type PropertyItem = z.infer<typeof propertyItemSchema>;

export const relationshipSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("inheritsFrom"),
    identifiers: z.array(z.string()).max(1),
  }),
  z.object({ type: z.literal("inheritedBy") }),
]);
export type Relationship = z.infer<typeof relationshipSchema>;

export const documentSchema = z.object({
  schemaVersion: schemaVersionSchema,
  identifier: z.object({
    interfaceLanguage: z.literal("data"),
    url: z.string(),
  }),
  metadata: z.object({
    title: z.string(),
    externalID: z.string(),
    symbolKind: z.literal("dictionary"),
  }),
  primaryContentSections: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("properties"),
        items: z.array(propertyItemSchema),
      }),
      z.object({
        kind: z.enum(["declarations", "attributes", "mentions", "content"]),
      }),
    ])
  ),
  relationshipsSections: z.array(relationshipSchema).optional(),
  abstract: z.array(contentInlinePartSchema),
  references: z.record(
    z.object({
      title: z.string(),
      url: z.string(),
      deprecated: z.boolean().default(false),
    })
  ),
  deprecationSummary: z.array(z.unknown()).optional(),
});
export type Document = z.infer<typeof documentSchema>;
