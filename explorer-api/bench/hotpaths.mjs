import autocannon from 'autocannon';

const base = process.env.BENCH_URL ?? 'http://127.0.0.1:3003';
const duration = Number(process.env.BENCH_DURATION ?? 10);
const connections = Number(process.env.BENCH_CONNECTIONS ?? 10);
const chain = process.env.BENCH_CHAIN ?? 'vrm';
const sampleAddress = process.env.BENCH_ADDRESS ?? '';
const sampleBlock = process.env.BENCH_BLOCK ?? '1';
const sampleTx = process.env.BENCH_TX ?? '';

const paths = [
  { name: 'health', url: `${base}/v1/health` },
  { name: 'tip height', url: `${base}/v1/${chain}/tip/height` },
  { name: 'summary', url: `${base}/v1/${chain}/summary` },
  { name: 'home shell', url: `${base}/v1/home/shell` },
  { name: 'richlist', url: `${base}/v1/${chain}/richlist?limit=25` },
  { name: 'indexer status', url: `${base}/v1/indexer/status` },
  { name: 'landing', url: `${base}/v1/landing` },
  { name: 'vrm dashboard', url: `${base}/v1/vrm/dashboard` },
  { name: 'chain health', url: `${base}/v1/${chain}/health` },
  { name: 'block', url: `${base}/v1/${chain}/block/${sampleBlock}` },
];

if (sampleAddress) {
  paths.push({
    name: 'address',
    url: `${base}/v1/${chain}/address/${encodeURIComponent(sampleAddress)}?limit=25`,
  });
  paths.push({
    name: 'balance-history',
    url: `${base}/v1/${chain}/address/${encodeURIComponent(sampleAddress)}/balance-history?maxPoints=120`,
  });
  paths.push({
    name: 'address utxos',
    url: `${base}/v1/${chain}/address/${encodeURIComponent(sampleAddress)}/utxos?limit=25`,
  });
}

if (sampleTx) {
  paths.push({
    name: 'search tx',
    url: `${base}/v1/${chain}/search?q=${sampleTx}`,
  });
  paths.push({
    name: 'tx related addresses',
    url: `${base}/v1/${chain}/tx/${sampleTx}/related-addresses?limit=6`,
  });
}

async function run(name, url) {
  const result = await autocannon({
    url,
    connections,
    duration,
  });

  console.log(`\n=== ${name} ===`);
  console.log(`url: ${url}`);
  console.log(`requests: ${result.requests.total}`);
  console.log(`throughput: ${result.throughput.mean} req/s`);
  console.log(`latency p50: ${result.latency.p50} ms`);
  console.log(`latency p99: ${result.latency.p99} ms`);
  console.log(`errors: ${result.errors}`);

  return {
    name,
    url,
    requests: result.requests.total,
    throughput: result.throughput.mean,
    p50: result.latency.p50,
    p99: result.latency.p99,
    errors: result.errors,
  };
}

const results = [];
for (const path of paths) {
  results.push(await run(path.name, path.url));
}

console.log('\n=== summary ===');
console.table(results);
