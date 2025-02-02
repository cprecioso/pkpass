import type { localizableString } from "@pkpass/schema-runtime";

export type LocalesBase = readonly string[];

export type LocalizedStringVariants<Locales extends LocalesBase> = Record<
  Locales[number],
  string
> & { key?: string };

export interface PassBuilderContext<Locales extends LocalesBase> {
  /**
   * Creates a localized string, that changes based on the locale of the user
   *
   * You're expected to give a translation for each of the locales you have
   * declared.
   *
   * @example
   * ```ts
   * localizedString({
   *   en: "Hello",
   *   es: "Hola",
   * })
   * ```
   */
  localizedString: (
    variants: LocalizedStringVariants<Locales>,
  ) => localizableString;
}

export type FilePair = readonly [path: string, contents: Uint8Array];
export type FilesMap = Map<string, Uint8Array>;
