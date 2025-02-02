import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";

export const makeZip = async (files: Map<string, Uint8Array>) => {
  const storage = new Uint8ArrayWriter();

  const zipWriter = new ZipWriter(storage);

  await Promise.all(
    Array.from(files, ([path, contents]) =>
      zipWriter.add(path, new Uint8ArrayReader(contents)),
    ),
  );

  return zipWriter.close();
};
