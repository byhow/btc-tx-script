import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";

const MONGO_URI = Deno.env.get("MONGO_URI") || "mongodb://mongo:27017";

const client = new MongoClient();
console.log("Connecting to MongoDB at...", MONGO_URI);
await client.connect(MONGO_URI);

const db = client.database("btc-transactions");
const users = db.collection("users");

const user = await users.insertOne({
  name: "John Doe",
  age: 25,
});

console.log("Inserted user:", user);