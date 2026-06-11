export type ChainId = 'vrm' | 'vrc';

export interface TipState {
  height: number;
  hash: string;
  time: number;
}

export interface RpcCredentials {
  host: string;
  port: number;
  username?: string;
  password?: string;
  timeout?: number;
}

export const CHAIN_IDS: ChainId[] = ['vrm', 'vrc'];

export function parseChainId(value: string): ChainId | null {
  const normalized = value.toLowerCase();
  if (normalized === 'vrm' || normalized === 'vrc') {
    return normalized;
  }
  return null;
}
