import { encodeToUtf16 } from "./encoding";

export const generateStringsCatalog = (messages: Map<string, string>) =>
  encodeToUtf16(
    Array.from(
      messages,
      ([key, message]) =>
        `${JSON.stringify(key)} = ${JSON.stringify(message)};\n`,
    ).join(""),
  );
