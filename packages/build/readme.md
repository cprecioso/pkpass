# `@pkpass/build`

An all-in-one library that allows you to define, sign, and package Apple Wallet Passes in your server-side applications. Fully-typed, with convenient localization, and no templates necessary.

### Example

```tsx
import { makeLocalizedPassSource, packagePass } from "@pkpass/build";
import forge from "node-forge";
import { readFile, writeFile } from "node:fs/promises";

const passSource = await makeLocalizedPassSource(
  ["es", "en"],
  async ({ localizedString }) => ({
    pass: {
      formatVersion: 1,
      passTypeIdentifier: "pass.com.lumon.my-store-card",
      organizationName: "Lumon Industries",
      description: "Coffee Card",
      storeCard: {
        headerFields: [
          {
            key: "employee-name",
            label: localizedString({
              en: "Employee:",
              es: "Empleado:",
            }),
            value: "Helly R.",
          },
        ],
      },
      locations: [
        {
          latitude: 39.459051,
          longitude: -0.382923,
          relevantText: "Lumon offices",
        },
      ],
      // etc...
    },
    images: {
      icon: {
        "1x": await readFile("./lumon_1x.png"),
        "2x": await readFile("./lumon_2x.png"),
      },
      logo: {
        "1x": await readFile("./lumon_canteen_1x.png"),
        "2x": await readFile("./lumon_canteen_2x.png"),
      },
    },
  }),
);

const wwdrCertificate = forge.pki.certificateFromPem(
  await readFile(new URL("./wwdr.pem", import.meta.url), "utf-8"),
);
const signerCertificate = forge.pki.certificateFromPem(
  await readFile(new URL("./cert.pem", import.meta.url), "utf-8"),
);
const signerKey = forge.pki.privateKeyFromPem(
  await readFile(new URL("./key.pem", import.meta.url), "utf-8"),
);

const passBundle = new Uint8Array(
  await (
    await packagePass(passSource, {
      signingOptions: {
        signerKey,
        signerCertificate,
        wwdrCertificate,
      },
    })
  ).arrayBuffer(),
);

await writeFile("out.pkpass", passBundle);
```
