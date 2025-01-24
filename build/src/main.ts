import {
  type DataWalletPassesPass as Pass,
  DataWalletPassesPass as passSchema,
} from "@pkpass/schema";
import { assert } from "@std/assert";
import { createPkcs7DetachedSignature, sha1Hash } from "./crypto.ts";
import { encodeToUtf8 } from "./encoding.ts";
import { generateStringsCatalog } from "./strings-catalog.ts";
import type { Context, FilePair, LocalesBase } from "./types.ts";
import { makeZip } from "./zip.ts";

type MaybePromise<T> = T | Promise<T>;

export const makeLocalizedPassSource = async <
  const Locales extends LocalesBase,
>(
  locales: Locales,
  fn: (context: Context<Locales>) => MaybePromise<{
    pass: Pass;
    /**
     * Check required images for your pass type at
     * https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html
     */
    images: Partial<
      Record<
        "logo" | "icon" | "strip" | "background" | "thumbnail" | "footer",
        Partial<Record<`${1 | 2 | 3}x`, Uint8Array>>
      >
    >;
  }>,
) => {
  const localizedVariants: Map<Locales[number], Map<string, string>> = new Map(
    locales.map((locale) => [locale, new Map()]),
  );
  const localeSet = new Set(locales);

  let localizedStringCounter = 0;

  const context: Context<Locales> = {
    localizedString: ({
      default: key,
      ...variants
    }: Record<string, string>) => {
      key ??= `localized-string-${localizedStringCounter++}`;

      {
        const differentLocales = localeSet.difference(
          new Set(Object.keys(variants)),
        );
        assert(
          differentLocales.size === 0,
          `Missing locales ${JSON.stringify([...differentLocales])}`,
        );
      }

      for (const [locale, message] of Object.entries(variants)) {
        const localeMap = localizedVariants.get(locale);
        assert(localeMap, `Unrecognized locale \`${locale}\``);

        {
          const existingMessage = localeMap.get(key);
          assert(
            existingMessage == null || existingMessage === message,
            `Message ID \`${key}\` has already been declared
  Existing message: ${existingMessage}
       New message: ${message}`,
          );
        }

        localeMap.set(key, message);
      }

      return key;
    },
  };

  const result = await fn(context);
  const pass = passSchema.parse(result.pass);

  const stringCatalogFiles = Array.from(
    localizedVariants,
    ([locale, localeMap]) =>
      [
        `${locale}.lproj/pass.strings`,
        generateStringsCatalog(localeMap),
      ] as const,
  );

  const binaryFilePairs: FilePair[] = [
    ["pass.json", encodeToUtf8(JSON.stringify(pass))],
    ...stringCatalogFiles,
    ...Object.entries(result.images).flatMap(([baseName, sizeVariants]) =>
      Object.entries(sizeVariants).map(
        ([variant, source]) => [`${baseName}@${variant}.png`, source] as const,
      )
    ),
  ];

  return new Map(binaryFilePairs);
};

const makeManifest = async (files: Map<string, BufferSource>) =>
  encodeToUtf8(
    JSON.stringify(
      Object.fromEntries(
        await Promise.all(
          Array.from(files, async ([name, contents]) => [
            name,
            await sha1Hash(contents),
          ]),
        ),
      ),
    ),
  );

export const packagePass = async (
  source: ReadonlyMap<string, Uint8Array>,
  { fileName = "pass" } = {},
) => {
  const files = new Map(source);

  const manifest = await makeManifest(files);
  files.set("manifest.json", manifest);

  const signature = createPkcs7DetachedSignature(manifest);
  files.set("signature", signature);

  const zip = await makeZip(files);

  return new File([zip], `${fileName}.pkpass`, {
    type: "application/vnd.apple.pkpass",
  });
};
