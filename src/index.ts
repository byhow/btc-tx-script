import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import type { TransactionResponse } from "./utils/types.ts";
import { customerAddresses } from "./utils/constants.ts";
import { UTXOTransactionSchema } from "./models/deposit.ts";

const MONGO_URI = Deno.env.get("MONGO_URI") || "mongodb://mongo:27017";

const client = new MongoClient();

async function connectWithRetry() {
  while (true) {
    try {
      console.log("Connecting to MongoDB at...", MONGO_URI);
      await client.connect(MONGO_URI);
      console.log("Connected to MongoDB successfully.");
      return; // Exit the loop on successful connection
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      console.log("Retrying in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before retrying
    }
  }
}

// New function to process transactions
async function processTransactions(filePaths: string[]): Promise<Map<string, UTXOTransactionSchema[]>> {
  const processedTxIds = new Set<string>();
  const bufferedData = new Map<string, UTXOTransactionSchema[]>();

  for (const filePath of filePaths) {
    const jsonData = await Deno.readTextFile(filePath);
    const data: TransactionResponse = JSON.parse(jsonData);

    data.transactions
      .filter(tx => tx.confirmations >= 6 && (tx.category === 'receive' || tx.amount > 0))
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

async function main() {

  const jsonFilePaths = ["data/transactions-1.json", "data/transactions-2.json"];
  const bufferedData = await processTransactions(jsonFilePaths);

  // Convert Map to the desired object structure
  const groupedTransactions = Array.from(bufferedData).reduce((obj, [address, transactions]) => {
    obj[address] = transactions;
    return obj;
  }, {} as Record<string, UTXOTransactionSchema[]>);

  // console.log("Grouped transactions:", groupedTransactions);
  // console.log('length:', Object.keys(groupedTransactions).length);

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

  const names = [
    "Wesley Crusher",
    "Leonard McCoy",
    "Jonathan Archer",
    "Jadzia Dax",
    "Montgomery Scott",
    "James T. Kirk",
    "Spock"
  ];
  names.forEach(name => {
    console.log(`Deposited for ${name}: count=${knownCustomerMeta[name].count} sum=${knownCustomerMeta[name].sum}`);
  })
  console.log(`Deposited without reference: count=${unReferencedCount} sum=${unReferencedSum}`)
  console.log(`Smallest valid deposit: ${smallestDeposit}`);
  console.log(`Largest valid deposit: ${largestDeposit}`);

  // await connectWithRetry();
  // const db = client.database("btc-transactions");
  // const tx = db.collection<UTXOTransactionSchema>("tx");
  // const result = await tx.insertMany(data.transactions);
  // console.log("Inserted tx:", result);
}

main();