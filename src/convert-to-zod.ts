import { convertSchema } from "./lib/swiftdoc/main.ts";

const schema = await convertSchema("/documentation/walletpasses/pass", {
  baseUrl: "https://developer.apple.com/tutorials/data/",
  baseUri: /^doc:\/\/com.apple.(?:walletpasses|documentation)\//,
});

console.log(schema);
