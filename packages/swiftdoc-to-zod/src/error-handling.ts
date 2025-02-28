import { AsyncLocalStorage } from "node:async_hooks";

const currentPathStorage: AsyncLocalStorage<readonly string[] | undefined> =
  new AsyncLocalStorage();

export const withPath = <T>(path: string, fn: () => T) => {
  const currentPath = currentPathStorage.getStore() ?? [];
  return currentPathStorage.run([...currentPath, path], fn);
};

export const errorAtPath = (cause: unknown) =>
  new Error(
    `Error while processing ${JSON.stringify(currentPathStorage.getStore(), null, 2)}`,
    { cause },
  );

export const assertUnrecognizedValue = (name: string, value: never) => {
  throw errorAtPath(
    new Error(
      `Assertion: Unknown [${name}]: ${JSON.stringify(value, null, 2)}`,
    ),
  );
};

export const assert: (value: unknown, message: string) => asserts value = (
  value,
  message,
) => {
  if (!value) throw errorAtPath(new Error(`Assertion: ${message}`));
};
