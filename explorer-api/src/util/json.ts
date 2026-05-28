export function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? Number(value) : value;
}

export function sanitizeForJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, jsonReplacer)) as T;
}
