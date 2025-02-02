import { convertSchema } from "@pkpass/swiftdoc-to-zod";
import fs from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUTPUT_FILE_PATH = fileURLToPath(
  new URL("../src/index.ts", import.meta.url),
);

const schema = await convertSchema("/documentation/walletpasses/pass", {
  baseUrl: "https://developer.apple.com/tutorials/data/",
  baseUri: "doc://com.apple.walletpasses/",
  fetchJson: async (url) => (await fetch(url)).json(),
});

await fs.mkdir(dirname(OUTPUT_FILE_PATH), { recursive: true });
await fs.writeFile(OUTPUT_FILE_PATH, schema);
