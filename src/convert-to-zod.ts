import { format } from "prettier";
import { convertSchema } from "./lib/swiftdoc-to-zod/main.ts";

const schema = await convertSchema("/documentation/walletpasses/pass", {
  baseUrl: "https://developer.apple.com/tutorials/data/",
  baseUri: "doc://com.apple.walletpasses/",
});

const formatted = await format(schema, {
  parser: "typescript",
});

console.log(formatted);
