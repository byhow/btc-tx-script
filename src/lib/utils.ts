import { UTXOTransactionSchema } from "../models/deposit.ts";
import { names } from "./constants.ts";
import { TransactionResponse } from "./types.ts";

// New function to process transactions
async function processTransactions(filePaths: string[]): Promise<Map<string, UTXOTransactionSchema[]>> {
  const processedTxIds = new Set<string>();
  const bufferedData = new Map<string, UTXOTransactionSchema[]>();

  for (const filePath of filePaths) {
    const jsonData = await Deno.readTextFile(filePath);
    const data: TransactionResponse = JSON.parse(jsonData);

    data.transactions
      .filter(tx => tx.confirmations >= 6 && (tx.category === 'receive' || tx.amount >= 0))
      .reduce((acc, tx) => {
        const txKey = `${tx.txid}:${tx.vout}`;
        if (!processedTxIds.has(txKey)) {
          processedTxIds.add(txKey);
          const txData = {
            address: tx.address,
            amount: tx.amount,
            vout: tx.vout,
            confirmations: tx.confirmations
          };
          if (!acc.has(tx.address)) {
            acc.set(tx.address, [txData]);
          } else {
            acc.get(tx.address)?.push(txData);
          }
        }
        return acc;
      }, bufferedData);
  }

  return bufferedData;
}


export async function processAndLogTransactions(jsonFilePaths: string[], customerAddresses: Record<string, string>) {
  const bufferedData = await processTransactions(jsonFilePaths);

  // Convert Map to the desired object structure
  const groupedTransactions = Array.from(bufferedData).reduce((obj, [address, transactions]) => {
    obj[address] = transactions;
    return obj;
  }, {} as Record<string, UTXOTransactionSchema[]>);

  let [unReferencedCount, unReferencedSum] = [0, 0];
  const knownCustomerMeta = {} as Record<string, { count: number, sum: number }>;
  for (const [address, transactions] of Object.entries(groupedTransactions)) {
    const knownCustomer = customerAddresses[address];
    if (knownCustomer) {
      const count = transactions.length;
      const sum = transactions.reduce((acc, { amount }) => acc + amount, 0);
      knownCustomerMeta[knownCustomer] = { count, sum };
    } else {
      unReferencedCount += transactions.length;
      unReferencedSum += transactions.reduce((acc, { amount }) => acc + amount, 0);
    }
  }

  // Calculate and print smallest and largest valid deposits
  let smallestDeposit = Number.MAX_VALUE;
  let largestDeposit = Number.MIN_VALUE;
  bufferedData.forEach(transactions => {
    transactions.forEach(({ amount }) => {
      if (amount < smallestDeposit) smallestDeposit = amount;
      if (amount > largestDeposit) largestDeposit = amount;
    });
  });

  if (smallestDeposit === Number.MAX_VALUE) smallestDeposit = 0; // Adjust if no deposits were found
  if (largestDeposit === Number.MIN_VALUE) largestDeposit = 0; // Adjust if no deposits were found

  names.forEach(name => {
    if (knownCustomerMeta[name]) {
      console.log(`Deposited for ${name}: count=${knownCustomerMeta[name].count} sum=${knownCustomerMeta[name].sum}`);
    }
  });
  console.log(`Deposited without reference: count=${unReferencedCount} sum=${unReferencedSum}`);
  console.log(`Smallest valid deposit: ${smallestDeposit}`);
  console.log(`Largest valid deposit: ${largestDeposit}`);
}