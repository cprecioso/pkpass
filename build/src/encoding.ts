export const encodeToUtf8 = (str: string) => new TextEncoder().encode(str);

export const encodeToUtf16 = (str: string) => {
  const len = str.length;
  const buf = new Uint16Array(len);
  for (let i = 0; i < len; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return new Uint8Array(buf);
};
