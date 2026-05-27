import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(moduleDir, "..", "..");
let loaded = false;
export function loadEnv() {
    if (loaded)
        return;
    loaded = true;
    loadDotenv({ path: path.join(repoRoot, ".env") });
    loadDotenv({ path: path.join(repoRoot, ".env.local"), override: true });
    process.chdir(repoRoot);
}
export function getPort() {
    return Number(process.env.VCEXP_FAST_API_PORT ?? process.env.EXPLORER_FAST_API_PORT ?? 3003);
}
export function getTipPollMs() {
    return Number(process.env.VCEXP_TIP_POLL_MS ?? 3000);
}
export function getZmqUrl(chainId) {
    const key = chainId === "vrm" ? "VCEXP_VRM_ZMQ" : "VCEXP_VRC_ZMQ";
    return process.env[key] || undefined;
}
export function getHost() {
    return process.env.VCEXP_FAST_API_HOST ?? "127.0.0.1";
}
