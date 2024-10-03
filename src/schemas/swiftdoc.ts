import * as z from "zod";

export const schemaVersionSchema = z
  .object({ major: z.literal(0), minor: z.number().gte(3), patch: z.number() })
  .strict();
export type SchemaVersion = z.input<typeof schemaVersionSchema>;

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
export type TypePart = z.input<typeof typePartSchema>;

export const contentInlinePartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }).strict(),
  z.object({
    type: z.literal("emphasis"),
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
export type ContentInlinePart = z.input<typeof contentInlinePartSchema>;

export const contentPartSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("paragraph"),
      inlineContent: z.array(contentInlinePartSchema),
    })
    .strict(),
]);
export type ContentPart = z.input<typeof contentPartSchema>;

export const propertyItemSchema = z.object({
  type: z.array(typePartSchema),
  required: z.boolean(),
  name: z.string(),
  content: z.array(contentPartSchema),
});
export type PropertyItem = z.input<typeof propertyItemSchema>;

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
  abstract: z.array(contentInlinePartSchema),
  references: z.record(
    z.object({
      title: z.string(),
      url: z.string(),
      deprecated: z.boolean().default(false),
    })
  ),
});
export type Document = z.input<typeof documentSchema>;
