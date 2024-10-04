import * as z from "zod";

export const iso8601 = z.date().transform((date) => date.toISOString());

export const iso4217 = z
  .string()
  .length(3)
  .transform((code) => code.toUpperCase());

export const localizableString = z.string();
export const localizableFormatString = z.string();
