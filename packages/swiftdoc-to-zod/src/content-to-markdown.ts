import { assertUnrecognizedValue } from "./error-handling";
import type { ReferenceResolvers } from "./reference-resolvers";
import type { ContentInlinePart, ContentPart } from "./schema";

export const contentInlinePartsToMarkdown = (
  parts: Iterable<ContentInlinePart>,
  resolvers: ReferenceResolvers,
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
          resolvers,
        )}_`;
      }
      default:
        return assertUnrecognizedValue("ContentInlinePart type", part);
    }
  }).join("");

export const contentPartsToMarkdown = (
  parts: Iterable<ContentPart>,
  resolvers: ReferenceResolvers,
) =>
  Array.from(parts, (part) => {
    if (part.type === "paragraph") {
      return contentInlinePartsToMarkdown(part.inlineContent, resolvers);
    } else {
      return assertUnrecognizedValue("ContentPart type", part.type);
    }
  }).join("\n\n");
