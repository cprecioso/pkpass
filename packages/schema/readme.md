# `@pkpass/schema`

This library provides [Zod schemas](https://zod.dev) for [Apple's Wallet Passes format](https://developer.apple.com/documentation/walletpasses/pass) (also known as Passbook Passes, or PKPass).

The main schema is `DataWalletPassesPass`.

If you need a more complete solution for generating passes that includes localization, adding images, and correctly packaging the file, take a look at [`@pkpass/build`](../build).

> [!IMPORTANT]
> The schemas are as expressive as possible, and include documentation comments, but it is still recommended to read through [Apple's docs](https://developer.apple.com/documentation/walletpasses/pass) in order to understand the expected content of each field, and how it works.

These schemas are automatically generated at [`scripts/build.ts`](./scripts/build.ts), through the generator at [`@pkpass/swiftdoc-to-zod`](../swiftdoc-to-zod).
