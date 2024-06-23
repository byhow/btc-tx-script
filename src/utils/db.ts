// Import the latest major version of the MongoDB driver
import { MongoClient } from "npm:mongodb@6";

export async function connectToMongoDB() {
  // Get the MongoDB URL from the environment variable
  console.log(`attempting connection at: ${Deno.env.get("MONGO_URL")}`);
  const mongoUrl = Deno.env.get("MONGO_URL");

  // Check if the MONGO_URL environment variable is set
  if (!mongoUrl) {
    console.error("MONGO_URL environment variable is not set.");
    return new MongoClient('mongodb://localhost:27017');
  }

  // Create a new MongoDB client instance
  // Get the MongoDB URL from the environment variable
  console.log(`attempting to create database instance at: ${Deno.env.get("MONGO_URL")}`);
  const client = new MongoClient(mongoUrl);

  try {
    // Connect to MongoDB using the URL from the environment variable
    await client.connect();
    console.log("Connected to MongoDB successfully.");
    // Proceed with using the client for database operations
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }

  return client;
}