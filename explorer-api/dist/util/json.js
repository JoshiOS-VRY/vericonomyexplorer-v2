export function jsonReplacer(_key, value) {
    return typeof value === "bigint" ? Number(value) : value;
}
export function sanitizeForJson(value) {
    return JSON.parse(JSON.stringify(value, jsonReplacer));
}
