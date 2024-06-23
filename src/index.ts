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

async function main() {

  const jsonFilePaths = ["data/transactions-1.json", "data/transactions-2.json"];
  const jsonData = await Deno.readTextFile(jsonFilePaths[0]);
  const data: TransactionResponse = JSON.parse(jsonData);

  const processedTxIds = new Set<string>();
  const bufferedData = data.transactions
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
        }
        if (!acc.has(tx.address)) {
          acc.set(tx.address, [txData]);
        } else {
          acc.get(tx.address)?.push(txData);
        }
      }
      return acc;
    }, new Map<string, UTXOTransactionSchema[]>());

  // Convert Map to the desired object structure
  const groupedTransactions = Array.from(bufferedData).reduce((obj, [address, transactions]) => {
    obj[address] = transactions;
    return obj;
  }, {} as Record<string, UTXOTransactionSchema[]>);
  console.log("Grouped transactions:", groupedTransactions);
  console.log('length:', Object.keys(groupedTransactions).length);
  // await connectWithRetry();
  // const db = client.database("btc-transactions");
  // const tx = db.collection<UTXOTransactionSchema>("tx");
  // const result = await tx.insertMany(data.transactions);
  // console.log("Inserted tx:", result);
}

main();