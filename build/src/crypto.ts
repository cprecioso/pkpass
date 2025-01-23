import { encodeHex } from "@std/encoding";
import { Buffer } from "node:buffer";
// @ts-types="@types/node-forge"
import forge from "node-forge";

export const sha1Hash = async (source: BufferSource) => {
  const hashBuf = await globalThis.crypto.subtle.digest("SHA-1", source);
  const hex = encodeHex(hashBuf);
  return hex;
};

export const createPkcs7DetachedSignature = (manifest: Uint8Array) => {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest);
  p7.sign({ detached: true });

  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
};
