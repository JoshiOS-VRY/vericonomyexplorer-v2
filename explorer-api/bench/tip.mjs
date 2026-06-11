import autocannon from 'autocannon';

const base = process.env.BENCH_URL ?? 'http://127.0.0.1:3003';
const duration = Number(process.env.BENCH_DURATION ?? 10);

async function run(name, url) {
  const result = await autocannon({
    url,
    connections: 10,
    duration,
  });

  console.log(`\n=== ${name} ===`);
  console.log(`url: ${url}`);
  console.log(`requests: ${result.requests.total}`);
  console.log(`throughput: ${result.throughput.mean} req/s`);
  console.log(`latency p50: ${result.latency.p50} ms`);
  console.log(`latency p99: ${result.latency.p99} ms`);
  console.log(`errors: ${result.errors}`);
}

await run('tip height', `${base}/v1/vrm/tip/height`);
await run('health', `${base}/v1/health`);
