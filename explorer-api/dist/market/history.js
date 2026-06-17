import { fetchCoinGeckoMarketChart } from './coingecko.js';
import { fetchLcwHistoryRange } from './livecoinwatch.js';
const PERIOD_DAYS = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    all: null,
};
function downsamplePoints(points, maxPoints) {
    if (points.length <= maxPoints) {
        return points;
    }
    const step = Math.ceil(points.length / maxPoints);
    const sampled = [];
    for (let i = 0; i < points.length; i += step) {
        sampled.push(points[i]);
    }
    const last = points[points.length - 1];
    if (sampled[sampled.length - 1]?.time !== last.time) {
        sampled.push(last);
    }
    return sampled;
}
export async function fetchMarketHistory(chainId, period, currency = 'usd') {
    const days = PERIOD_DAYS[period];
    const end = Date.now();
    const start = days != null ? end - days * 24 * 60 * 60 * 1000 : end - 365 * 24 * 60 * 60 * 1000;
    const maxPoints = period === '7d' ? 80 : period === '30d' ? 100 : 120;
    const [lcwPoints, cgPoints] = await Promise.all([
        fetchLcwHistoryRange(chainId, currency.toUpperCase(), start, end),
        currency === 'usd' ? fetchCoinGeckoMarketChart(chainId, days ?? 365) : Promise.resolve([]),
    ]);
    let points = lcwPoints;
    let source = lcwPoints.length > 0 ? 'livecoinwatch' : 'unavailable';
    if (points.length === 0 && cgPoints.length > 0) {
        points = cgPoints;
        source = 'coingecko';
    }
    return {
        chainId,
        period,
        currency,
        since: Math.floor(start / 1000),
        points: downsamplePoints(points, maxPoints),
        source,
        fetchedAt: new Date().toISOString(),
    };
}
