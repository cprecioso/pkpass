import * as z from "zod";

export const iso8601 = z.date().transform((date) => date.toISOString());
export type iso8601 = z.input<typeof iso8601>;

export const iso4217 = z
  .string()
  .length(3)
  .transform((code) => code.toUpperCase());
export type iso4217 = z.input<typeof iso4217>;

export const localizableString = z.string();
export type localizableString = z.input<typeof localizableString>;

export const localizableFormatString = z.string();
export type localizableFormatString = z.input<typeof localizableFormatString>;
