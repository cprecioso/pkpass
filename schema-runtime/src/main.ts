import * as z from "zod";

export const iso8601 = z.date().transform((date) => date.toISOString());
export type iso8601 = z.input<typeof iso8601>;

export const iso4217 = z
  .string()
  .length(3)
  .transform((code) => code.toUpperCase());
export type iso4217 = z.input<typeof iso4217>;

export const formatString = z.string().brand<"formatString">();
export type formatString = z.input<typeof formatString>;

export const localizedFormatString = z
  .string()
  .brand<"localizedFormatString">();
export type localizedFormatString = z.input<typeof localizedString>;

export const localizableFormatString = formatString.or(localizedFormatString);
export type localizableFormatString = z.input<typeof localizableFormatString>;

export const localizedString = z.string().brand<"localizedString">();
export type localizedString = z.input<typeof localizedString>;

export const localizableString = z.string().or(localizedString);
export type localizableString = z.input<typeof localizableString>;
