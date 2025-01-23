import type { localizableString } from "@pkpass/schema-runtime";

export type LocalesBase = readonly string[];

export type LocalizedStringVariants<Locales extends LocalesBase> =
  & Record<
    Locales[number],
    string
  >
  & { default?: string };

export interface Context<Locales extends LocalesBase> {
  localizedString: (
    variants: LocalizedStringVariants<Locales>,
  ) => localizableString;
}

export type FilePair = readonly [path: string, contents: Uint8Array];
export type FilesMap = Map<string, Uint8Array>;
