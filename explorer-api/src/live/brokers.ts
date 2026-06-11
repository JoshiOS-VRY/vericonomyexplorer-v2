import { getTipPollMs, getZmqUrl } from '../env.js';
import { getRpcClient } from '../rpc/index.js';
import type { ChainId, TipState } from '../types.js';
import { CHAIN_IDS } from '../types.js';
import { TipBroker } from './tipBroker.js';

const brokers = new Map<ChainId, TipBroker>();

export async function initBrokers(): Promise<void> {
  for (const chainId of CHAIN_IDS) {
    const broker = new TipBroker(
      chainId,
      getRpcClient(chainId),
      getTipPollMs(),
      getZmqUrl(chainId)
    );
    await broker.start();
    brokers.set(chainId, broker);
  }
}

export async function stopBrokers(): Promise<void> {
  await Promise.all([...brokers.values()].map((broker) => broker.stop()));
  brokers.clear();
}

export function getBroker(chainId: ChainId): TipBroker {
  const broker = brokers.get(chainId);
  if (!broker) {
    throw new Error(`Tip broker not initialized for ${chainId}`);
  }
  return broker;
}

export function getTip(chainId: ChainId): TipState | null {
  return getBroker(chainId).getTip();
}

export function onTip(chainId: ChainId, listener: (tip: TipState) => void): () => void {
  const broker = getBroker(chainId);
  broker.on('tip', listener);
  return () => broker.off('tip', listener);
}

export function onAnyTip(listener: (chainId: ChainId, tip: TipState) => void): () => void {
  const unsubs = CHAIN_IDS.map((chainId) => onTip(chainId, (tip) => listener(chainId, tip)));
  return () => unsubs.forEach((unsub) => unsub());
}
