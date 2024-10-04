import { assertEquals, unreachable } from "@std/assert";
import { ReferenceResolvers } from "./reference-resolvers.ts";
import { ContentInlinePart, ContentPart } from "./schema.ts";

export const contentInlinePartsToMarkdown = (
  parts: Iterable<ContentInlinePart>,
  resolvers: ReferenceResolvers
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
  resolvers: ReferenceResolvers
) =>
  Array.from(parts, (part) => {
    assertEquals(
      part.type satisfies "paragraph",
      "paragraph",
      "Unknown ContentPart type"
    );
    return contentInlinePartsToMarkdown(part.inlineContent, resolvers);
  }).join("\n\n");
