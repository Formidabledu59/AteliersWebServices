import express from "express";
import { MongoClient } from "mongodb";
import { z } from "zod";

const app = express();
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

// Product Schema + Product Route here.

// Schemas
const ProductSchema = z.object({
  _id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({ _id: true });

// Init mongodb client connection
client.connect().then(() => {
  console.log("Connected to MongoDB");
  // Select db to use in mongodb
  db = client.db("myDB");
  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error("Failed to connect to MongoDB", err);
  process.exit(1); // Exit the process if connection fails
});

// Route to insert multiple documents
app.post("/insert-documents", async (req, res) => {
  try {
    const collection = db.collection("documents");
    const insertResult = await collection.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
    res.status(200).json({ message: "Documents inserted", result: insertResult });
  } catch (err) {
    console.error("Error inserting documents:", err);
    res.status(500).json({ error: "Failed to insert documents" });
  }
});

// Route to find all documents
app.get("/find-documents", async (req, res) => {
  try {
    const collection = db.collection("documents");
    const findResult = await collection.find({}).toArray();
    res.status(200).json({ message: "Documents found", documents: findResult });
  } catch (err) {
    console.error("Error finding documents:", err);
    res.status(500).json({ error: "Failed to find documents" });
  }
});

// Route to find documents with a query filter
app.get("/find-documents-filtered", async (req, res) => {
  try {
    const collection = db.collection("documents");
    const filteredDocs = await collection.find({ a: 3 }).toArray();
    res.status(200).json({ message: "Filtered documents found", documents: filteredDocs });
  } catch (err) {
    console.error("Error finding filtered documents:", err);
    res.status(500).json({ error: "Failed to find filtered documents" });
  }
});

// Route to create a product
app.post("/products", async (req, res) => {
  const result = CreateProductSchema.safeParse(req.body);

  // If Zod parsed successfully the request body
  if (result.success) {
    const { name, about, price } = result.data;

    try {
      const ack = await db
        .collection("products")
        .insertOne({ name, about, price });

      // Validate the inserted product with ProductSchema
      const validatedProduct = ProductSchema.safeParse({
        _id: ack.insertedId.toString(),
        name,
        about,
        price,
      });

      if (validatedProduct.success) {
        res.status(201).send(validatedProduct.data);
      } else {
        res.status(500).send({ error: "Failed to validate inserted product" });
      }
    } catch (err) {
      console.error("Error inserting product:", err);
      res.status(500).send({ error: "Failed to create product" });
    }
  } else {
    res.status(400).send(result);
  }
});

// Update a document
// The following operation updates a document in the documents collection.

const updateResult = await collection.updateOne({ a: 3 }, { $set: { b: 1 } });
console.log('Updated documents =>', updateResult);
// The method updates the first document where the field a is equal to 3 by adding a new field b to the document set to 1. updateResult contains information about whether there was a matching document to update or not.

// Remove a document
// Remove the document where the field a is equal to 3.

const deleteResult = await collection.deleteMany({ a: 3 });
console.log('Deleted documents =>', deleteResult);

// Index a Collection
// Indexes can improve your application's performance. The following function creates an index on the a field in the documents collection.

const indexName = await collection.createIndex({ a: 1 });
console.log('index name =', indexName);

// Full documentation : https://www.mongodb.com/docs/drivers/node/current/