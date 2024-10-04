export const toJSDocComment = ({
  content,
  deprecated,
}: {
  content?: string;
  deprecated?: boolean;
}): string => {
  if (!content && !deprecated) return "";

  return [
    "/**",
    ...[
      ...(deprecated ? ["@deprecated"] : []),
      ...(content ? content.split("\n") : []),
    ].map((line) => ` * ${line}`),
    " */\n",
  ].join("\n");
};
