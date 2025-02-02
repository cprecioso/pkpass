import forge from "node-forge";
import { createHash } from "node:crypto";

export const sha1Hash = async (source: Uint8Array) =>
  createHash("sha1").update(source).digest("hex");

export interface SigningOptions {
  signerKey: forge.pki.rsa.PrivateKey;
  signerCertificate: forge.pki.Certificate;
  wwdrCertificate: forge.pki.Certificate;
}

export const createPkcs7DetachedSignature = (
  content: Uint8Array<any>,
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
