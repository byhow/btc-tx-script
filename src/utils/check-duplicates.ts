import { TransactionResponse } from "./types.ts";

export const checkDuplicates = (data: TransactionResponse) => {
  // Assuming jsonFilePaths, jsonData, data, and UTXOTransactionSchema are defined as in your provided code snippet.
  const txIdOnlySet = new Set<string>();
  const pairedKeySet = new Set<string>();

  data.transactions.forEach(tx => {
    txIdOnlySet.add(tx.txid); // Add only txid to the set
    pairedKeySet.add(`${tx.txid}:${tx.vout}`); // Add paired key (txid:vout) to the set
  });

  const txIdOccurrences = new Map<string, number>();

  pairedKeySet.forEach(pairedKey => {
    const txid = pairedKey.split(":")[0];
    const count = txIdOccurrences.get(txid) || 0;
    txIdOccurrences.set(txid, count + 1);
  });

  txIdOnlySet.forEach(txid => {
    txIdOccurrences.set(txid, (txIdOccurrences.get(txid) || 0) - 1);
  });

  txIdOccurrences.forEach((count, txid) => {
    if (count > 0) {
      // This txid has more entries in the pairedKeySet than in the txIdOnlySet
      console.log("Extra txid found with additional vout entries:", txid);
    }
  });
}