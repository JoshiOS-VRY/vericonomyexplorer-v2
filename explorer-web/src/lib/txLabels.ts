import type { AddressEvent, IndexedTransaction, TxOutput } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

export type OutputRole = "payment" | "change" | "mining" | "unknown";

export function isCoinbaseTx(tx: Pick<IndexedTransaction, "isCoinbase" | "isCoinstake">): boolean {
  return !!tx.isCoinbase || !!tx.isCoinstake;
}

export function formatConfirmationLabel(confirmations: number | null | undefined): string {
  if (confirmations == null || !Number.isFinite(confirmations)) {
    return "Confirmations unavailable";
  }

  if (confirmations <= 1) {
    return "Confirmed · 1 confirmation";
  }

  return `Confirmed · ${formatNumber(confirmations)} confirmations`;
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
