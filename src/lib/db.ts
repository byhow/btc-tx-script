// Import the latest major version of the MongoDB driver
import { Collection } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { Transaction } from "./types.ts";

export function aggregateDeposits(txCollection: Collection<Transaction>) {
  return txCollection.aggregate<{ amount: number; count: number, address: string }>([
    {
      $match: {
        $and: [
          { confirmations: { $gte: 6 } },
          {
            $or: [
              { category: "receive" },
              { amount: { $gte: 0 } }
            ]
          }
        ]
      }
    },
    {
      $group: {
        _id: { txid: "$txid", vout: "$vout" }, // Group by a composite key of txid and vout
        address: { $first: "$address" }, // Take the first occurrence of address
        amount: { $first: "$amount" }, // Take the first occurrence of amount
      }
    },
    {
      $group: {
        _id: "$address", // Group by address
        amount: { $sum: "$amount" }, // Sum the amount for each address
        count: { $sum: 1 } // Count the number of transactions for each address
      }
    },
    {
      $project: {
        _id: 0, // Exclude the _id field from the output
        address: "$_id", // Set the address field to the value of _id (the address)
        amount: 1, // Include the summed amount
        count: 1 // Include the count of transactions
      }
    },
  ]).toArray();
}

export function countMinMax(txCollection: Collection<Transaction>) {
  return txCollection.aggregate<{
    minDeposit: number;
    maxDeposit: number;
  }>([
    {
      $match: {
        confirmations: { $gte: 6 },
        category: "receive"
      }
    },
    {
      $group: {
        _id: null,
        minDeposit: { $min: "$amount" },
        maxDeposit: { $max: "$amount" }
      }
    }
  ]).toArray();
}

