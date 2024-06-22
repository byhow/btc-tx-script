import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";

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
  await connectWithRetry();

  const db = client.database("btc-transactions");
  const users = db.collection("users");

  const user = await users.insertOne({
    name: "John Doe",
    age: 25,
  });

  console.log("Inserted user:", user);
}

main();