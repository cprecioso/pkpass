import { assertEquals, unreachable } from "@std/assert";
import * as definedScalars from "../../runtime/scalars.ts";
import { ReferenceResolvers } from "./reference-resolvers.ts";
import { TypePart } from "./schema.ts";

export const SCALAR_IMPORT_NAME = "SCALARS";
const customScalar = (name: keyof typeof definedScalars) =>
  `${SCALAR_IMPORT_NAME}.${name}`;

const makeArrayType = (type: string) => `z.array(${type})`;

export const getType = (
  parts: TypePart[],
  resolvers: ReferenceResolvers
): {
  definition: string;
  deprecated?: boolean;
  referenced?: string[];
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
      const inner = getType(parts.slice(1, -1), resolvers);
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
          resolvers
        );
        return { ...inner, definition: makeArrayType(inner.definition) };
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

        case "localizable string": {
          return { definition: customScalar("localizableString") };
        }

        default: {
          console.log(part.text);
          return unreachable(`Unknown TypePart text`);
        }
      }

      return unreachable();
    }

    case "typeIdentifier": {
      return {
        definition: resolvers.getTypeSpecReference(part.preciseIdentifier),
        deprecated: resolvers.getReference(part.identifier).deprecated,
        referenced: [part.identifier],
      };
    }

    default: {
      part satisfies never;
      unreachable(`Unknown TypePart kind`);
    }
  }
};
