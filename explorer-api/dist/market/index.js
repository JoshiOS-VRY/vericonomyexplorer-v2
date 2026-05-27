import { createSwrCache } from "../cache/swrCache.js";
import { fetchCoinGeckoBtcUsd, fetchCoinGeckoVericoin } from "./coingecko.js";
import { fetchLcwHistory24h, fetchLcwSingle, mapLcwToMarket, } from "./livecoinwatch.js";
function getMarketCacheTtlMs() {
    const configured = Number(process.env.VCEXP_MARKET_CACHE_TTL_MS);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }
    return 120_000;
}
const emptyMarket = () => ({
    usd: null,
    btc: null,
    marketCap: null,
    volume24h: null,
    change24h: null,
    circulatingSupply: null,
    source: "unavailable",
    updatedAt: null,
    priceHistory24h: [],
});
function finalizeMarket(partial, onChainSupply, btcUsd) {
    let { usd, btc, marketCap, source } = partial;
    if (btc == null && usd != null && btcUsd != null && btcUsd > 0) {
        btc = usd / btcUsd;
        if (source === "unavailable")
            source = "computed";
    }
    if (marketCap == null && usd != null && onChainSupply != null) {
        marketCap = usd * onChainSupply;
        if (source === "unavailable")
            source = "computed";
    }
    return {
        ...partial,
        usd,
        btc,
        marketCap,
        source,
    };
}
let btcUsdInflight = null;
async function getSharedBtcUsd() {
    if (!btcUsdInflight) {
        btcUsdInflight = fetchCoinGeckoBtcUsd().finally(() => {
            btcUsdInflight = null;
        });
    }
    return btcUsdInflight;
}
async function fetchChainMarketInternal(chainId, onChainSupply, btcUsd) {
    const [usdData, btcData, history, cgVrc] = await Promise.all([
        fetchLcwSingle(chainId, "USD"),
        fetchLcwSingle(chainId, "BTC"),
        fetchLcwHistory24h(chainId),
        chainId === "vrc" ? fetchCoinGeckoVericoin() : Promise.resolve(null),
    ]);
    let partial = mapLcwToMarket(usdData, btcData, history);
    if (chainId === "vrc" && cgVrc && partial.usd == null && cgVrc.usd != null) {
        partial = {
            ...partial,
            usd: cgVrc.usd,
            btc: cgVrc.btc ?? partial.btc,
            source: "coingecko",
            updatedAt: new Date().toISOString(),
        };
    }
    return finalizeMarket(partial, onChainSupply, btcUsd);
}
const marketCache = createSwrCache({
    max: 8,
    ttlMs: getMarketCacheTtlMs(),
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error("aborted");
        const [chainId, supplyStr] = key.split(":");
        const supply = supplyStr === "null" ? null : Number(supplyStr);
        const btcUsd = await getSharedBtcUsd();
        const result = await fetchChainMarketInternal(chainId, Number.isFinite(supply) ? supply : null, btcUsd);
        return result;
    },
});
export async function fetchChainMarket(chainId, onChainSupply = null) {
    const key = `${chainId}:${onChainSupply ?? "null"}`;
    try {
        const cached = await marketCache.fetch(key);
        return (cached ?? emptyMarket());
    }
    catch {
        const stale = marketCache.get(key, { allowStale: true });
        if (stale) {
            return stale;
        }
        return emptyMarket();
    }
}
export async function fetchHomeMarket(vrmSupply, vrcSupply) {
    const btcUsd = await getSharedBtcUsd();
    const [vrm, vrc] = await Promise.all([
        fetchChainMarketInternal("vrm", vrmSupply, btcUsd),
        fetchChainMarketInternal("vrc", vrcSupply, btcUsd),
    ]);
    return {
        vrm,
        vrc,
        fetchedAt: new Date().toISOString(),
    };
}
export { emptyMarket };
