import PQueue from "p-queue";
import * as z from "zod";

const httpQueue = new PQueue({ autoStart: true, concurrency: 2 });

export const fetchJson = <T extends z.ZodTypeAny>(
  url: string,
  schema: T,
): Promise<z.output<T>> =>
  httpQueue.add(async () => {
    const { default: data } = await import(url, { with: { type: "json" } });
    return schema.parseAsync(data);
  });
