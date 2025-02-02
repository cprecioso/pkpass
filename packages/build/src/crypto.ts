import forge from "node-forge";
import { createHash } from "node:crypto";

export const sha1Hash = async (source: Uint8Array) =>
  createHash("sha1").update(source).digest("hex");

/**
 * An object detailing the keys and certificates to sign the pass with
 *
 * They all should be passed as [`node-forge`](https://www.npmjs.com/package/node-forge) objects.
 *
 * @example
 * ```ts
 * const signerKey = forge.pki.privateKeyFromPem(fs.readFileSync("key.pem", "utf-8"));
 * const signerCertificate = forge.pki.certificateFromPem(fs.readFileSync("cert.pem", "utf-8"));
 * const wwdrCertificate = forge.pki.certificateFromPem(fs.readFileSync("wwdr.pem", "utf-8"));
 *
 * const signingOptions = { signerKey, signerCertificate, wwdrCertificate };
 * ```
 */
export interface SigningOptions {
  /** The private key to sign the pass with. You should get this from your Apple Developer account. */
  signerKey: forge.pki.rsa.PrivateKey;
  /** The certificate to sign the pass with. You should get this from your Apple Developer account. */
  signerCertificate: forge.pki.Certificate;
  /**
   * The Apple Worldwide Developer Relations certificate that your pass certificate is signed with.
   * These are available at [their website](https://www.apple.com/certificateauthority/).
   *
   * > [!IMPORTANT]
   * > Please note that the WWDR certificates are called `G{number}`. You should use the one that
   * > matches the one your pass certificate is signed with. You can check this by opening the
   * > certificate in Keychain Access and looking at the issuer.
   */
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
