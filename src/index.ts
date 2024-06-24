import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { UTXOTransactionSchema } from "./models/deposit.ts";
import { Transaction, TransactionResponse } from "./lib/types.ts";
import { customerAddresses, names } from "./lib/constants.ts";
import { processAndLogTransactions } from "./lib/utils.ts";
import { aggregateDeposits, countMinMax } from "./lib/db.ts";

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

async function main() {

  const jsonFilePaths = ["data/transactions-1.json", "data/transactions-2.json"];
  const transactionMeta: Transaction[] = []

  for (const filePath of jsonFilePaths) {
    const jsonData = await Deno.readTextFile(filePath);
    const data: TransactionResponse = JSON.parse(jsonData);
    transactionMeta.push(...data.transactions);
  }

  await connectWithRetry();
  const db = client.database("btc");
  const tx = db.collection<Transaction>("transactions");
  await tx.insertMany(transactionMeta);
  // console.log(`inserted ${res.insertedCount} transactions`);

  const aggregatedDeposits = await aggregateDeposits(tx);
  // console.log("Aggregated deposits count:", aggregatedDeposits.length);
  const minMax = await countMinMax(tx);

  let [unReferencedCount, unReferencedSum] = [0, 0];
  const knownCustomerMeta = {} as Record<string, { count: number, sum: number }>;
  for (const { address, count, amount } of aggregatedDeposits) {
    if (customerAddresses[address]) {
      knownCustomerMeta[customerAddresses[address]] = { count, sum: amount };
    } else {
      unReferencedCount += count;
      unReferencedSum += amount;
    }
  }
  names.forEach(name => {
    console.log(`Deposited for ${name}: count=${knownCustomerMeta[name].count} sum=${knownCustomerMeta[name].sum}`);
  });
  console.log(`Deposited without reference: count=${unReferencedCount} sum=${unReferencedSum}`);
  console.log(`Smallest valid deposit: ${minMax[0].minDeposit}`);
  console.log(`Largest valid deposit: ${minMax[0].maxDeposit}`);
}

main();
