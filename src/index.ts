import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import type { Transaction } from "./models/deposit.ts";
import { customerAddresses } from "./lib/constants.ts";
import { aggregateDeposits, countMinMax } from "./lib/db.ts";
import { printTransactionSummary, readAndParseJsonFiles } from "./lib/utils.ts";

const MONGO_URI = Deno.env.get("MONGO_URI") || "mongodb://mongo:27017";

const client = new MongoClient();

/**
 * Connects to MongoDB with retry logic.
 *
 * @returns {Promise<void>} A promise that resolves when the connection is successful.
 */
async function connectWithRetry(): Promise<void> {
  while (true) {
    try {
      console.log("Connecting to MongoDB at...", MONGO_URI);
      await client.connect(MONGO_URI);
      console.log("Connected to MongoDB successfully.");
      return; // Exit the loop on successful connection
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      console.log("Retrying in 2 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds before retrying
    }
  }
}

async function main() {
  const jsonFilePaths = [
    "data/transactions-1.json",
    "data/transactions-2.json",
  ];
  const transactionMeta = await readAndParseJsonFiles(jsonFilePaths);

  await connectWithRetry();
  const db = client.database("btc");
  const tx = db.collection<Transaction>("transactions");
  await tx.insertMany(transactionMeta);

  const [aggregatedDeposits, minMax] = await Promise.all([
    aggregateDeposits(tx),
    countMinMax(tx),
  ]);
  printTransactionSummary(aggregatedDeposits, customerAddresses, minMax);
}

main();
