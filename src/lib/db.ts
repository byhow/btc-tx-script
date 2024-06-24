// Import the latest major version of the MongoDB driver
import type { Collection } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import type { Transaction } from "../models/deposit.ts";

/**
 * Aggregates deposits from a transaction collection.
 *  - Filters out transactions with less than 6 confirmations, not a receive category, and negative amounts.
 *  - deduplicates transactions by txid and vout.
 *  - groups transactions by address and sums the amount and counts the number of transactions.
 *  - projects the address, amount, and count fields.
 *
 * @param txCollection - The transaction collection to aggregate.
 * @returns A promise that resolves to an array of aggregated deposits.
 */
export const aggregateDeposits = (txCollection: Collection<Transaction>) =>
  txCollection.aggregate<{ amount: number; count: number; address: string }>([
    {
      $match: {
        $and: [
          { confirmations: { $gte: 6 } },
          {
            $or: [
              { category: "receive" },
              { amount: { $gte: 0 } },
            ],
          },
        ],
      },
    },
    {
      $group: {
        _id: { txid: "$txid", vout: "$vout" }, // Group by a composite key of txid and vout
        address: { $first: "$address" }, // Take the first occurrence of address
        amount: { $first: "$amount" }, // Take the first occurrence of amount
      },
    },
    {
      $group: {
        _id: "$address", // Group by address
        amount: { $sum: "$amount" }, // Sum the amount for each address
        count: { $sum: 1 }, // Count the number of transactions for each address
      },
    },
    {
      $project: {
        _id: 0, // Exclude the _id field from the output
        address: "$_id", // Set the address field to the value of _id (the address)
        amount: 1, // Include the summed amount
        count: 1, // Include the count of transactions
      },
    },
  ]).toArray();

/**
 * Calculates the minimum and maximum deposit amounts from a collection of transactions.
 *
 * @param txCollection - The collection of transactions.
 * @returns A promise that resolves to an object containing the minimum and maximum deposit amounts.
 */
export const countMinMax = (txCollection: Collection<Transaction>) =>
  txCollection.aggregate<{
    minDeposit: number;
    maxDeposit: number;
  }>([
    {
      $match: {
        $and: [
          { confirmations: { $gte: 6 } },
          {
            $or: [
              { category: "receive" },
              { amount: { $gte: 0 } },
            ],
          },
        ],
      },
    },
    {
      $group: {
        _id: null,
        minDeposit: { $min: "$amount" },
        maxDeposit: { $max: "$amount" },
      },
    },
  ]).toArray();
