import { encodeHex } from "@std/encoding";
// @ts-types="@types/node-forge"
import forge from "node-forge";

export const sha1Hash = async (source: BufferSource) => {
  const hashBuf = await globalThis.crypto.subtle.digest("SHA-1", source);
  const hex = encodeHex(hashBuf);
  return hex;
};

export interface SigningOptions {
  signerKey: forge.pki.rsa.PrivateKey;
  signerCertificate: forge.pki.Certificate;
  wwdrCertificate: forge.pki.Certificate;
}

export const createPkcs7DetachedSignature = (
  content: Uint8Array,
  { signerKey, signerCertificate, wwdrCertificate }: SigningOptions,
) => {
  const p7 = forge.pkcs7.createSignedData();

  p7.content = new forge.util.ByteStringBuffer(content);

  p7.addCertificate(wwdrCertificate);
  p7.addCertificate(signerCertificate);

  p7.addSigner({
    certificate: signerCertificate,
    key: signerKey,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime },
    ],
  });

  p7.sign({ detached: true });

  const signatureContent = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.binary.raw.decode(signatureContent);
};
