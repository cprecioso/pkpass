import * as z from "zod";

/** A custom scalar for a Date represented as an ISO8601 string */
export const iso8601 = z.date().transform((date) => date.toISOString());
export type iso8601 = z.input<typeof iso8601>;

/** A custom scalar for a string representing an ISO4217 currency */
export const iso4217 = z
  .string()
  .length(3)
  .transform((code) => code.toUpperCase());
export type iso4217 = z.input<typeof iso4217>;

/** A custom scalar for a string with interpolation specifiers */
export const formatString = z.string().brand<"formatString">();
export type formatString = z.input<typeof formatString>;

/** A custom scalar for a {@link formatString} that has been localized to multiple locales */
export const localizedFormatString = z
  .string()
  .brand<"localizedFormatString">();
export type localizedFormatString = z.input<typeof localizedString>;

/** A type for a {@link formatString} that can be plain or {@link localizedFormatString} */
export const localizableFormatString = formatString.or(localizedFormatString);
export type localizableFormatString = z.input<typeof localizableFormatString>;

/** A custom scalar for a string that has been localized to multiple locales */
export const localizedString = z.string().brand<"localizedString">();
export type localizedString = z.input<typeof localizedString>;

/** A type for a string that can be plain or {@link localizedString} */
export const localizableString = z.string().or(localizedString);
export type localizableString = z.input<typeof localizableString>;

const RGB_TRIPLE_REGEX = /^rgb\(\d+, \d+, \d+\)$/;
export const rgbTriple = z.custom<`rgb(${number}, ${number}, ${number})`>(
  (val) => typeof val === "string" && RGB_TRIPLE_REGEX.test(val),
);

export const timezone = z.custom<`${string}/${string}`>((val) => {
  if (typeof val !== "string") return false;
  const splits = val.split("/");
  return Boolean(splits.length === 2 && splits[0] && splits[1]);
});
