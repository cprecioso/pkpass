declare const convertSchema: (doc: string, { baseUrl, baseUri, fetchJson, }: {
    baseUrl: string;
    baseUri: string;
    fetchJson: (url: string) => Promise<unknown>;
}) => Promise<string>;

export { convertSchema };
