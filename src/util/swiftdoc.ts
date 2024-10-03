import { assertEquals, unreachable } from "@std/assert";
import {
  ContentInlinePart,
  ContentPart,
  TypePart,
} from "../schemas/swiftdoc.ts";
import { DocumentResolvers } from "./resolvers.ts";

export type Scalar = { name: string; extends: string };

export const contentInlinePartsToMarkdown = (
  parts: Iterable<ContentInlinePart>,
  resolvers: DocumentResolvers
) =>
  Array.from(parts, (part): string => {
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
        part satisfies never;
        unreachable(`Unknown ContentInlinePart type`);
      }
    }
  }).join("");

export const contentPartsToMarkdown = (
  parts: Iterable<ContentPart>,
  resolvers: DocumentResolvers
) =>
  Array.from(parts, (part) => {
    assertEquals(
      part.type satisfies "paragraph",
      "paragraph",
      "Unknown ContentPart type"
    );
    return contentInlinePartsToMarkdown(part.inlineContent, resolvers);
  }).join("\n\n");

export const getType = (
  parts: TypePart[],
  resolvers: DocumentResolvers
): {
  definition: string;
  deprecated?: boolean;
  referenced?: string[];
  scalars?: Scalar[];
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
      return { ...inner, definition: `Array<${inner.definition}>` };
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
        return { ...inner, definition: `Array<${inner.definition}>` };
      }

      switch (part.text) {
        case "string":
        case "boolean": {
          return { definition: part.text };
        }

        case "number": {
          return { definition: "numeric" };
        }

        case "any JSON data": {
          return { definition: "unknown" };
        }

        case "16-bit unsigned integer": {
          return { definition: "uint16" };
        }

        case "double": {
          return { definition: "float64" };
        }

        case "ISO 8601 date as string": {
          return {
            definition: "iso8601",
            scalars: [{ name: "iso8601", extends: "string" }],
          };
        }

        case "ISO 4217 currency code as a string": {
          return {
            definition: "iso4217",
            scalars: [{ name: "iso4217", extends: "string" }],
          };
        }

        case "localizable string": {
          return {
            definition: "localizableString",
            scalars: [{ name: "localizableString", extends: "string" }],
          };
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
