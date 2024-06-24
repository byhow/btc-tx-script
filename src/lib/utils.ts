import type {
  Transaction,
  TransactionResponse,
  UTXOTransactionSchema,
} from "../models/deposit.ts";
import { type CustomerAddresses, names } from "./constants.ts";
import { aggregateDeposits, countMinMax } from "./db.ts";

/**
 * Processes transactions from multiple file paths and returns a map of addresses to transaction data.
 * Only transactions with at least 6 confirmations and either "receive" category or non-negative amount are included.
 * (this is a local first approach to simulate what the expected output would be)
 *
 * @param filePaths - An array of file paths containing transaction data in JSON format.
 * @returns A Promise that resolves to a map of addresses to arrays of transaction data.
 */
async function processTransactions(
  filePaths: string[],
): Promise<Map<string, UTXOTransactionSchema[]>> {
  const processedTxIds = new Set<string>();
  const bufferedData = new Map<string, UTXOTransactionSchema[]>();

  for (const filePath of filePaths) {
    const jsonData = await Deno.readTextFile(filePath);
    const data: TransactionResponse = JSON.parse(jsonData);

    data.transactions
      .filter((tx) =>
        tx.confirmations >= 6 && (tx.category === "receive" || tx.amount >= 0)
      )
      .reduce((acc, tx) => {
        const txKey = `${tx.txid}:${tx.vout}`;
        if (!processedTxIds.has(txKey)) {
          processedTxIds.add(txKey);
          const txData = {
            address: tx.address,
            amount: tx.amount,
            vout: tx.vout,
            confirmations: tx.confirmations,
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

/**
 * Processes the transactions from the provided JSON files and logs the results.
 *
 * (this is a local first approach to simulate what the expected output would be)
 *
 * @param jsonFilePaths - An array of file paths to the JSON files containing the transactions.
 * @param customerAddresses - A record of customer addresses, where the key is the address and the value is the customer name.
 * @returns void
 */
export async function processAndLogTransactions(
  jsonFilePaths: string[],
  customerAddresses: Record<string, string>,
) {
  const bufferedData = await processTransactions(jsonFilePaths);

  // Convert Map to the desired object structure
  const groupedTransactions = Array.from(bufferedData).reduce(
    (obj, [address, transactions]) => {
      obj[address] = transactions;
      return obj;
    },
    {} as Record<string, UTXOTransactionSchema[]>,
  );

  let [unReferencedCount, unReferencedSum] = [0, 0];
  const knownCustomerMeta = {} as Record<
    string,
    { count: number; sum: number }
  >;
  for (const [address, transactions] of Object.entries(groupedTransactions)) {
    const knownCustomer = customerAddresses[address];
    if (knownCustomer) {
      const count = transactions.length;
      const sum = transactions.reduce((acc, { amount }) => acc + amount, 0);
      knownCustomerMeta[knownCustomer] = { count, sum };
    } else {
      unReferencedCount += transactions.length;
      unReferencedSum += transactions.reduce(
        (acc, { amount }) => acc + amount,
        0,
      );
    }
  }

  // Calculate and print smallest and largest valid deposits
  let smallestDeposit = Number.MAX_VALUE;
  let largestDeposit = Number.MIN_VALUE;
  bufferedData.forEach((transactions) => {
    transactions.forEach(({ amount }) => {
      if (amount < smallestDeposit) smallestDeposit = amount;
      if (amount > largestDeposit) largestDeposit = amount;
    });
  });

  if (smallestDeposit === Number.MAX_VALUE) smallestDeposit = 0; // Adjust if no deposits were found
  if (largestDeposit === Number.MIN_VALUE) largestDeposit = 0; // Adjust if no deposits were found

  names.forEach((name) => {
    if (knownCustomerMeta[name]) {
      console.log(
        `Deposited for ${name}: count=${knownCustomerMeta[name].count} sum=${
          knownCustomerMeta[name].sum
        }`,
      );
    }
  });
  console.log(
    `Deposited without reference: count=${unReferencedCount} sum=${unReferencedSum}`,
  );
  console.log(`Smallest valid deposit: ${smallestDeposit}`);
  console.log(`Largest valid deposit: ${largestDeposit}`);
}

/**
 * Checks for duplicates in the transaction data.
 * This is used to differentiate between transactions with the same txid but different vout values.
 *
 * @param data - The transaction data to check for duplicates.
 */
export const checkDuplicates = (data: TransactionResponse) => {
  // Assuming jsonFilePaths, jsonData, data, and UTXOTransactionSchema are defined as in your provided code snippet.
  const txIdOnlySet = new Set<string>();
  const pairedKeySet = new Set<string>();

  data.transactions.forEach((tx) => {
    txIdOnlySet.add(tx.txid); // Add only txid to the set
    pairedKeySet.add(`${tx.txid}:${tx.vout}`); // Add paired key (txid:vout) to the set
  });

  const txIdOccurrences = new Map<string, number>();

  pairedKeySet.forEach((pairedKey) => {
    const txid = pairedKey.split(":")[0];
    const count = txIdOccurrences.get(txid) || 0;
    txIdOccurrences.set(txid, count + 1);
  });

  txIdOnlySet.forEach((txid) => {
    txIdOccurrences.set(txid, (txIdOccurrences.get(txid) || 0) - 1);
  });

  txIdOccurrences.forEach((count, txid) => {
    if (count > 0) {
      // This txid has more entries in the pairedKeySet than in the txIdOnlySet
      console.log("Extra txid found with additional vout entries:", txid);
    }
  });
};

/**
 * Prints a summary of the transaction in the requirements format.
 *
 * @param aggregatedDeposits - The aggregated deposits.
 * @param customerAddresses - The customer addresses.
 * @param minMax - The minimum and maximum deposit values.
 */
export const printTransactionSummary = (
  aggregatedDeposits: Awaited<ReturnType<typeof aggregateDeposits>>,
  customerAddresses: CustomerAddresses,
  minMax: Awaited<ReturnType<typeof countMinMax>>,
) => {
  let [unReferencedCount, unReferencedSum] = [0, 0];
  const knownCustomerMeta = {} as Record<
    string,
    { count: number; sum: number }
  >;
  for (const { address, count, amount } of aggregatedDeposits) {
    if (customerAddresses[address]) {
      knownCustomerMeta[customerAddresses[address]] = { count, sum: amount };
    } else {
      unReferencedCount += count;
      unReferencedSum += amount;
    }
  }
  names.forEach((name) => {
    console.log(
      `Deposited for ${name}: count=${knownCustomerMeta[name].count} sum=${
        knownCustomerMeta[name].sum
      }`,
    );
  });
  console.log(
    `Deposited without reference: count=${unReferencedCount} sum=${unReferencedSum}`,
  );
  console.log(`Smallest valid deposit: ${minMax[0].minDeposit}`);
  console.log(`Largest valid deposit: ${minMax[0].maxDeposit}`);
};

/**
 * Reads and parses JSON files asynchronously.
 *
 * @param filePaths - An array of file paths to read and parse.
 * @returns A Promise that resolves to an array of transactions.
 */
export async function readAndParseJsonFiles(
  filePaths: string[],
): Promise<Transaction[]> {
  const fileReadPromises = filePaths.map(async (
    filePath,
  ): Promise<TransactionResponse> =>
    JSON.parse(await Deno.readTextFile(filePath))
  );

  const filesData = await Promise.all(fileReadPromises);
  return filesData.flatMap((data) => data.transactions);
}
