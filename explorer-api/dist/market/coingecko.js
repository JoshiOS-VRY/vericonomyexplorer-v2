export async function fetchCoinGeckoBtcUsd() {
    const apiKey = process.env.VCEXP_COINGECKO_API_KEY?.trim();
    const headers = { accept: "application/json" };
    if (apiKey) {
        headers["x-cg-pro-api-key"] = apiKey;
    }
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", {
            headers,
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok)
            return null;
        const data = (await response.json());
        const usd = data.bitcoin?.usd;
        return typeof usd === "number" && Number.isFinite(usd) ? usd : null;
    }
    catch {
        return null;
    }
}
export async function fetchCoinGeckoVericoin() {
    const apiKey = process.env.VCEXP_COINGECKO_API_KEY?.trim();
    const headers = { accept: "application/json" };
    if (apiKey) {
        headers["x-cg-pro-api-key"] = apiKey;
    }
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=vericoin&vs_currencies=usd,btc", {
            headers,
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok)
            return { usd: null, btc: null };
        const data = (await response.json());
        const usd = data.vericoin?.usd;
        const btc = data.vericoin?.btc;
        return {
            usd: typeof usd === "number" && Number.isFinite(usd) ? usd : null,
            btc: typeof btc === "number" && Number.isFinite(btc) ? btc : null,
        };
    }
    catch {
        return { usd: null, btc: null };
    }
}
