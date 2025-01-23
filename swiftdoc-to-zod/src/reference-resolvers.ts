import slugify from "@sindresorhus/slugify";
import { assert } from "@std/assert";
import type { Document } from "./schema.ts";

const URI_PREFIX = /^doc:\/\/com.apple.documentation\//;
const URL_PREFIX = "https://developer.apple.com/";
export const uriToBrowserUrl = (uri: string) => {
  // doc://com.apple.documentation/documentation/uikit/uiapplicationdelegate/1622921-application
  //   https://developer.apple.com/documentation/uikit/uiapplicationdelegate/1622921-application
  return uri.replace(URI_PREFIX, URL_PREFIX);
};

const camelize = (str: string) => `${str.at(0)?.toUpperCase()}${str.slice(1)}`;

export class ReferenceResolvers {
  #documentReferences;

  constructor(document: Document) {
    this.#documentReferences = new Map(Object.entries(document.references));
  }

  getReference(uri: string) {
    const reference = this.#documentReferences.get(uri);
    assert(reference, `Reference ${uri} does not exist`);
    return reference;
  }

  getBrowserLinkInfo(uri: string) {
    const { title } = this.getReference(uri);
    const url = uriToBrowserUrl(uri);
    return { title, url };
  }

  getTypeSpecDefinitionName(id: string) {
    return camelize(
      slugify(id, { separator: "", decamelize: false, lowercase: false }),
    );
  }

  getTypeSpecReference(id: string) {
    return this.getTypeSpecDefinitionName(id);
  }
}
