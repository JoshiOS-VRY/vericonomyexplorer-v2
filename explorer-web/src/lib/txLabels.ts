import type {
  AddressEvent,
  AmountDisplay,
  IndexedTransaction,
  TxOutput,
} from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

export type OutputRole = "payment" | "change" | "mining" | "unknown";

export function isCoinbaseTx(tx: Pick<IndexedTransaction, "isCoinbase" | "isCoinstake">): boolean {
  return !!tx.isCoinbase || !!tx.isCoinstake;
}

export function formatConfirmationLabel(confirmations: number | null | undefined): string {
  const count =
    confirmations == null || !Number.isFinite(confirmations)
      ? 1
      : Math.max(0, confirmations);

  if (count <= 0) {
    return "Unconfirmed";
  }

  if (count === 1) {
    return "Confirmed · 1 confirmation";
  }

  return `Confirmed · ${formatNumber(count)} confirmations`;
}

export function classifyOutputRole(
  output: TxOutput,
  changeOutputs: number[] = [],
  isMining = false,
): OutputRole {
  if (isMining) {
    return "mining";
  }

  if (changeOutputs.includes(output.n)) {
    return "change";
  }

  return "payment";
}

export function outputRoleLabel(role: OutputRole): string {
  switch (role) {
    case "change":
      return "Change";
    case "mining":
      return "Mining reward";
    case "payment":
      return "Payment";
    default:
      return "Output";
  }
}

export function addressEventRole(event: AddressEvent): "sender" | "recipient" | "neutral" {
  if (event.eventType === "spend" || event.deltaAtomic.startsWith("-")) {
    return "sender";
  }

  if (event.eventType === "receive" || !event.deltaAtomic.startsWith("-")) {
    return "recipient";
  }

  return "neutral";
}

export interface AggregatedAddressEvent {
  address: string;
  role: ReturnType<typeof addressEventRole>;
  eventType: string;
  deltaAtomic: string;
  delta: AmountDisplay;
  contributionCount: number;
}

const COIN_ATOMIC_DECIMALS = 8;

function formatAtomicDelta(deltaAtomic: string, ticker: string): AmountDisplay {
  const negative = deltaAtomic.startsWith("-");
  const raw = BigInt(negative ? deltaAtomic.slice(1) : deltaAtomic);
  const divisor = BigInt(10) ** BigInt(COIN_ATOMIC_DECIMALS);
  const whole = raw / divisor;
  const frac = raw % divisor;

  let amount: string;
  if (frac === BigInt(0)) {
    amount = whole.toString();
  } else {
    const fracStr = frac
      .toString()
      .padStart(COIN_ATOMIC_DECIMALS, "0")
      .replace(/0+$/, "");
    amount = `${whole}.${fracStr}`;
  }

  if (negative) {
    amount = `-${amount}`;
  }

  return { amount, ticker };
}

function absAtomic(deltaAtomic: string): bigint {
  return BigInt(deltaAtomic.startsWith("-") ? deltaAtomic.slice(1) : deltaAtomic);
}

/** One row per (address, role); sums deltas when the indexer emits per-input/per-output events. */
export function aggregateAddressEvents(events: AddressEvent[]): AggregatedAddressEvent[] {
  const groups = new Map<
    string,
    {
      address: string;
      role: ReturnType<typeof addressEventRole>;
      eventType: string;
      deltaAtomic: bigint;
      ticker: string;
      count: number;
      singleEvent: AddressEvent | null;
    }
  >();

  for (const event of events) {
    const role = addressEventRole(event);
    const key = `${event.address}\0${role}`;
    const delta = BigInt(event.deltaAtomic);
    const existing = groups.get(key);

    if (existing) {
      existing.deltaAtomic += delta;
      existing.count += 1;
      existing.singleEvent = null;
      if (existing.eventType !== event.eventType) {
        existing.eventType = "mixed";
      }
    } else {
      groups.set(key, {
        address: event.address,
        role,
        eventType: event.eventType,
        deltaAtomic: delta,
        ticker: event.delta.ticker,
        count: 1,
        singleEvent: event,
      });
    }
  }

  return [...groups.values()]
    .map((group) => {
      const deltaAtomic = group.deltaAtomic.toString();
      const delta =
        group.count === 1 && group.singleEvent
          ? group.singleEvent.delta
          : formatAtomicDelta(deltaAtomic, group.ticker);

      return {
        address: group.address,
        role: group.role,
        eventType: group.eventType,
        deltaAtomic,
        delta,
        contributionCount: group.count,
      };
    })
    .sort((a, b) => {
      const diff = absAtomic(b.deltaAtomic) - absAtomic(a.deltaAtomic);
      if (diff > BigInt(0)) return 1;
      if (diff < BigInt(0)) return -1;
      return a.address.localeCompare(b.address);
    });
}

export function formatAmountPair(amount: { amount: string; ticker: string }): string {
  return `${amount.amount} ${amount.ticker}`;
}

export function uniqueRelatedAddresses(
  events: AddressEvent[],
  changeOutputIndices: number[],
  outputs: TxOutput[],
): string[] {
  const changeAddresses = new Set(
    outputs
      .filter((output) => changeOutputIndices.includes(output.n))
      .map((output) => output.address)
      .filter(Boolean) as string[],
  );

  const seen = new Set<string>();
  const addresses: string[] = [];

  for (const event of events) {
    if (changeAddresses.has(event.address) || seen.has(event.address)) {
      continue;
    }

    seen.add(event.address);
    addresses.push(event.address);

    if (addresses.length >= 2) {
      break;
    }
  }

  return addresses;
}
