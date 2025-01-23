import { assert, assertEquals, unreachable } from "@std/assert";
import * as definedScalars from "./zod-prelude.ts";
import { ReferenceResolvers } from "./reference-resolvers.ts";
import { TypePart } from "./schema.ts";

const customScalar = (name: keyof typeof definedScalars) => name;

const makeArrayType = (type: string) => `z.array(${type})`;

export const getType = (
  parts: TypePart[],
  {
    resolvers,
    allowedValues,
  }: { resolvers: ReferenceResolvers; allowedValues?: string[] }
): {
  definition: string;
  deprecated?: boolean;
  references?: string[];
} => {
  {
    // Check if it is a reference to an array typeReference
    const firstPart = parts.at(0);
    const lastPart = parts.at(-1);

    if (
      firstPart?.kind === "text" &&
      firstPart.text === "[" &&
      lastPart?.kind === "text" &&
      lastPart.text === "]"
    ) {
      assert(!allowedValues, "Unsupported allowedValues inside an array");
      const inner = getType(parts.slice(1, -1), { resolvers });
      return { ...inner, definition: makeArrayType(inner.definition) };
    }
  }

  assertEquals(parts.length, 1);
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
              definition: `z.union([${allowedValues
                .map((value) => `z.literal(${value})`)
                .join(", ")}])`,
            };
          case "string":
            return {
              definition: `z.enum([${allowedValues
                .map((value) => JSON.stringify(value))
                .join(", ")}])`,
            };
          default: {
            return unreachable(`Unknown allowed values type`);
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
              "z.number()",
            ].join(",")}])`,
          };

        default: {
          return unreachable(`Unknown TypePart text`);
        }
      }

      return unreachable();
    }

    case "typeIdentifier": {
      return {
        definition: resolvers.getTypeSpecReference(part.preciseIdentifier),
        deprecated: resolvers.getReference(part.identifier).deprecated,
        references: [part.identifier],
      };
    }

    default: {
      part satisfies never;
      unreachable(`Unknown TypePart kind`);
    }
  }
};
