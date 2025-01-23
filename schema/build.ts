import { convertSchema } from "@pkpass/swiftdoc-to-zod";
import { format } from "prettier";

const schema = await convertSchema("/documentation/walletpasses/pass", {
  baseUrl: "https://developer.apple.com/tutorials/data/",
  baseUri: "doc://com.apple.walletpasses/",
  fetchJson: async (url) =>
    (await import(url, { with: { type: "json" } })).default,
});

const formatted = await format(schema, {
  parser: "typescript",
});

await Deno.mkdir(new URL("./out/", import.meta.url), { recursive: true });
await Deno.writeTextFile(
  new URL("./out/schema.ts", import.meta.url),
  formatted,
);
