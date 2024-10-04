import { fromFileUrl } from "@std/path";
import { convertSchema } from "./lib/swiftdoc/main.ts";

const schema = await convertSchema("/documentation/walletpasses/pass", {
  baseUrl: "https://developer.apple.com/tutorials/data/",
  baseUri: "doc://com.apple.walletpasses/",
});

await Deno.writeTextFile(
  fromFileUrl(new URL("../data.ts", import.meta.url)),
  schema
);
