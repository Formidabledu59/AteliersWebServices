import express from "express";
import { MongoClient, ObjectId } from "mongodb";
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

// Route to create a product with category IDs
app.post("/products", async (req, res) => {
  const result = CreateProductSchema.extend({
    categoryIds: z.array(z.string().refine((id) => ObjectId.isValid(id), {
      message: "Invalid ObjectId format",
    })),
  }).safeParse(req.body);

  // If Zod parsed successfully the request body
  if (result.success) {
    const { name, about, price, categoryIds } = result.data;
    const categoryObjectIds = categoryIds.map((id) => new ObjectId(id));

    try {
      const ack = await db
        .collection("products")
        .insertOne({ name, about, price, categoryIds: categoryObjectIds });

      res.status(201).send({
        _id: ack.insertedId,
        name,
        about,
        price,
        categoryIds: categoryObjectIds,
      });
    } catch (err) {
      console.error("Error inserting product:", err);
      res.status(500).send({ error: "Failed to create product" });
    }
  } else {
    res.status(400).send(result);
  }
});

// Route to get products with categories (aggregation)
app.get("/products", async (req, res) => {
  try {
    const result = await db
      .collection("products")
      .aggregate([
        { $match: {} }, // Match all products (can be customized for filtering)
        {
          $lookup: {
            from: "categories", // Collection to join
            localField: "categoryIds", // Field in "products"
            foreignField: "_id", // Field in "categories"
            as: "categories", // Output array field
          },
        },
      ])
      .toArray();

    res.status(200).send(result);
  } catch (err) {
    console.error("Error fetching products with categories:", err);
    res.status(500).send({ error: "Failed to fetch products" });
  }
});

// Route to update a document
app.put("/update-document", async (req, res) => {
  try {
    const collection = db.collection("documents");
    const updateResult = await collection.updateOne({ a: 3 }, { $set: { b: 1 } });
    console.log("Updated documents =>", updateResult);
    res.status(200).json({ message: "Document updated", result: updateResult });
  } catch (err) {
    console.error("Error updating document:", err);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// Route to delete documents
app.delete("/delete-documents", async (req, res) => {
  try {
    const collection = db.collection("documents");
    const deleteResult = await collection.deleteMany({ a: 3 });
    console.log("Deleted documents =>", deleteResult);
    res.status(200).json({ message: "Documents deleted", result: deleteResult });
  } catch (err) {
    console.error("Error deleting documents:", err);
    res.status(500).json({ error: "Failed to delete documents" });
  }
});

// Route to create an index on the "a" field in the "documents" collection
app.post("/create-index", async (req, res) => {
  try {
    const collection = db.collection("documents");
    const indexName = await collection.createIndex({ a: 1 });
    console.log("Index created =>", indexName);
    res.status(200).json({ message: "Index created", indexName });
  } catch (err) {
    console.error("Error creating index:", err);
    res.status(500).json({ error: "Failed to create index" });
  }
});

// Index a Collection
// Indexes can improve your application's performance. The following function creates an index on the a field in the documents collection.

// Full documentation : https://www.mongodb.com/docs/drivers/node/current/