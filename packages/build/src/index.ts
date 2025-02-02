import {
  type DataWalletPassesPass as Pass,
  DataWalletPassesPass as passSchema,
} from "@pkpass/schema";
import assert from "node:assert/strict";
import { extname } from "node:path";
import {
  createPkcs7DetachedSignature,
  sha1Hash,
  type SigningOptions,
} from "./crypto";
import { encodeToUtf8 } from "./encoding";
import { generateStringsCatalog } from "./strings-catalog";
import type { FilePair, LocalesBase, PassBuilderContext } from "./types";
import { makeZip } from "./zip";

export type { SigningOptions } from "./crypto";
export type { PassBuilderContext } from "./types";

type MaybePromise<T> = T | Promise<T>;

export interface PassDefinition {
  /** The information on the pass */
  pass: Pass;
  /**
   * Check required images for your pass type at
   * https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html
   *
   * @example
   * ```ts
   * ({
   *   logo: {
   *     1x: fs.readFileSync("./logo_1.png"),
   *     2x: fs.readFileSync("./logo_1.png"),
   *   },
   * })
   * ```
   */
  images: Partial<
    Record<
      "logo" | "icon" | "strip" | "background" | "thumbnail" | "footer",
      Partial<Record<`${1 | 2 | 3}x`, Uint8Array>>
    >
  >;
}

/**
 * Create a pass source from an object. Passes objects are typed and will be checked against the schema.
 *
 * If you want to localize a specific string, you can use the {@link PassBuilderContext.localizedString} function.
 *
 * @returns A map of the file names inside the pass bundle, with their binary contents.
 */
export const makeLocalizedPassSource = async <
  const Locales extends LocalesBase,
>(
  locales: Locales,
  passBuilderFn: (
    context: PassBuilderContext<Locales>,
  ) => MaybePromise<PassDefinition>,
): Promise<Map<string, Uint8Array>> => {
  const localizedVariants: Map<Locales[number], Map<string, string>> = new Map(
    locales.map((locale) => [locale, new Map()]),
  );
  const localeSet = new Set(locales);

  let localizedStringCounter = 0;

  const context: PassBuilderContext<Locales> = {
    localizedString: ({ key, ...variants }: Record<string, string>) => {
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

  const result = await passBuilderFn(context);
  const pass = passSchema.parse(result.pass);

  const stringCatalogFiles = localizedVariants
    .entries()
    .filter(([, localeMap]) => localeMap.size > 0)
    .map(
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
      ),
    ),
  ];

  return new Map(binaryFilePairs);
};

/**
 * Create a pass source from an object.
 * Passes objects are typed and will be checked against the schema.
 *
 * @returns A map of the file names inside the pass bundle, with their binary contents.
 */
export const makePassSource = async (passDefinition: PassDefinition) =>
  makeLocalizedPassSource([], () => passDefinition);

const makeManifest = async (files: Map<string, Uint8Array>) =>
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

/**
 * Creates a pass package from its source. Handles creating
 * the manifest, signing it, and zipping everything together.
 *
 * @param source
 * @param options
 *
 * @returns A [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File)
 * object representing the pass package, with the correct name and
 * MIME type (`application/vnd.apple.pkpass`).
 */
export const packagePass = async (
  /**
   * The pass source as a Map of file name to its binary content
   * (the return type of {@link makePassSource} or {@link makeLocalizedPassSource}).
   */
  source: ReadonlyMap<string, Uint8Array>,
  {
    fileName = "pass",
    signingOptions,
  }: {
    /**
     * Which basename to give to the resulting file (`.pkpass` will be appended to this).
     *
     * @default "pass"
     */
    fileName?: string;
    signingOptions: SigningOptions;
  },
): Promise<File> => {
  const files = new Map(source);

  // We delete the manifest and signature files if they exist just in case
  files.delete("manifest.json");
  files.delete("signature");

  const manifest = await makeManifest(files);
  files.set("manifest.json", manifest);

  const signature = createPkcs7DetachedSignature(manifest, signingOptions);
  files.set("signature", signature);

  const zip = await makeZip(files);

  return new File([zip], `${fileName}.pkpass`, {
    type: "application/vnd.apple.pkpass",
  });
};

/**
 * If you have multiple passes you want to distribute to the user
 * in one go, you can optionally bundle them together with this
 * function, which will create a `.pkpasses` file containing all
 * the passes.
 *
 * > [!NOTE]
 * > A maximum of 10 passes, and a minimum of 1 pass can be bundled.
 *
 * @param passes
 * @param options
 *
 * @returns A [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File)
 * object representing the passes bundle, with the correct name and
 * MIME type (`application/vnd.apple.pkpasses`).
 */
export const bundlePasses = async (
  /** An array of `File` objects representing the passes (e.g. the output of {@link packagePass}). */
  passes: readonly File[],
  {
    fileName = "passes",
  }: {
    /**
     * Which basename to give to the resulting file (`.pkpasses` will be appended to this).
     *
     * @default "passes"
     */
    fileName?: string;
  } = {},
): Promise<File> => {
  assert(
    passes.every(
      (pass) =>
        extname(pass.name) === ".pkpass" ||
        pass.type === "application/vnd.apple.pkpass",
    ),
    "Every pass must be a valid .pkpass file",
  );

  assert(passes.length > 0, "At least one pass must be provided");
  assert(passes.length <= 10, "At most 10 passes can be bundled");

  const files = new Map(
    await Promise.all(
      passes.map(
        async (pass) =>
          [pass.name, new Uint8Array(await pass.arrayBuffer())] as const,
      ),
    ),
  );

  const zip = await makeZip(files);

  return new File([zip], `${fileName}.pkpasses`, {
    type: "application/vnd.apple.pkpasses",
  });
};
