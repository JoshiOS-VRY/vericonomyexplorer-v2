import { createSwrCache } from '../cache/swrCache.js';
import { withTimeout } from '../util/timeout.js';
import { fetchCoinGeckoBtcUsd, fetchCoinGeckoVericoin } from './coingecko.js';
import { fetchLcwHistory24h, fetchLcwSingle, mapLcwToMarket } from './livecoinwatch.js';
function getMarketCacheTtlMs() {
    const configured = Number(process.env.VCEXP_MARKET_CACHE_TTL_MS);
    if (Number.isFinite(configured) && configured > 0) {
        return configured;
    }
    return 120_000;
}
const marketFetchTimeoutMs = Number(process.env.VCEXP_MARKET_FETCH_TIMEOUT_MS ?? 4_000);
const emptyMarket = () => ({
    usd: null,
    btc: null,
    marketCap: null,
    volume24h: null,
    change24h: null,
    circulatingSupply: null,
    source: 'unavailable',
    updatedAt: null,
    priceHistory24h: [],
});
function resolveEffectiveUsd(chainId, usd, btc, btcUsd) {
    // VRC: derive USD from BTC × BTC/USD so cap matches the displayed BTC price.
    if (chainId === 'vrc' && btc != null && btcUsd != null && btcUsd > 0) {
        return btc * btcUsd;
    }
    return usd;
}
function finalizeMarket(partial, onChainSupply, btcUsd, chainId) {
    let { usd, btc, marketCap, source } = partial;
    if (btc == null && usd != null && btcUsd != null && btcUsd > 0) {
        btc = usd / btcUsd;
        if (source === 'unavailable')
            source = 'computed';
    }
    const effectiveUsd = resolveEffectiveUsd(chainId, usd, btc, btcUsd);
    if (marketCap == null && effectiveUsd != null && onChainSupply != null) {
        marketCap = effectiveUsd * onChainSupply;
        if (source === 'unavailable')
            source = 'computed';
    }
    return applyOnChainMarketCap({
        ...partial,
        usd: effectiveUsd,
        btc,
        marketCap,
        source,
    }, chainId, onChainSupply);
}
/** VRC cap is always on-chain supply × USD; VRM fills cap only when external data lacks it. */
export function applyOnChainMarketCap(market, chainId, onChainSupply) {
    if (onChainSupply == null || !Number.isFinite(onChainSupply) || market.usd == null) {
        return market;
    }
    if (chainId === 'vrc') {
        return {
            ...market,
            marketCap: market.usd * onChainSupply,
            circulatingSupply: onChainSupply,
        };
    }
    if (market.marketCap != null) {
        return market;
    }
    return {
        ...market,
        marketCap: market.usd * onChainSupply,
        circulatingSupply: onChainSupply,
        source: market.source === 'unavailable' ? 'computed' : market.source,
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
        fetchLcwSingle(chainId, 'USD'),
        fetchLcwSingle(chainId, 'BTC'),
        fetchLcwHistory24h(chainId),
        chainId === 'vrc' ? fetchCoinGeckoVericoin() : Promise.resolve(null),
    ]);
    let partial = mapLcwToMarket(usdData, btcData, history);
    if (chainId === 'vrc' && cgVrc && (cgVrc.usd != null || cgVrc.btc != null)) {
        partial = {
            ...partial,
            usd: cgVrc.usd ?? partial.usd,
            btc: cgVrc.btc ?? partial.btc,
            source: 'coingecko',
            updatedAt: new Date().toISOString(),
        };
    }
    return finalizeMarket(partial, onChainSupply, btcUsd, chainId);
}
const marketCache = createSwrCache({
    max: 8,
    ttlMs: getMarketCacheTtlMs(),
    fetch: async (key, signal) => {
        if (signal.aborted)
            throw new Error('aborted');
        const [chainId, supplyStr] = key.split(':');
        const supply = supplyStr === 'null' ? null : Number(supplyStr);
        const btcUsd = await getSharedBtcUsd();
        const result = await fetchChainMarketInternal(chainId, Number.isFinite(supply) ? supply : null, btcUsd);
        return result;
    },
});
export async function fetchChainMarket(chainId, onChainSupply = null) {
    const key = `${chainId}:${onChainSupply ?? 'null'}`;
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
    return withTimeout((async () => {
        const btcUsd = await getSharedBtcUsd();
        const [vrm, vrc] = await Promise.all([
            fetchChainMarketInternal('vrm', vrmSupply, btcUsd),
            fetchChainMarketInternal('vrc', vrcSupply, btcUsd),
        ]);
        return {
            vrm,
            vrc,
            fetchedAt: new Date().toISOString(),
        };
    })(), marketFetchTimeoutMs, 'fetchHomeMarket').catch(() => ({
        vrm: emptyMarket(),
        vrc: emptyMarket(),
        fetchedAt: new Date().toISOString(),
    }));
}
export { emptyMarket };
