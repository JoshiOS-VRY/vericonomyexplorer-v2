import type {
  AddressTransaction,
  TransactionRelatedAddressesResult,
} from "@/lib/api/types";

export type TxRelatedActivityGroup = {
  address: string;
  transactions: AddressTransaction[];
};

export function mapTransactionRelatedGroups(
  txid: string,
  result: TransactionRelatedAddressesResult,
  maxPerAddress = 5,
): TxRelatedActivityGroup[] {
  if (!result.found || !result.items?.length) {
    return [];
  }

  return result.items
    .map((group) => ({
      address: group.address,
      transactions: group.transactions
        .filter((tx) => tx.txid !== txid)
        .slice(0, maxPerAddress),
    }))
    .filter((group) => group.transactions.length > 0);
}
