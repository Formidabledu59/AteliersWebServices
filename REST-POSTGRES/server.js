const express = require("express");
const { MongoClient } = require("mongodb");
const fetch = require("node-fetch");
const bcrypt = require("bcrypt");
const saltRounds = 10; // Niveau de hachage

// Importation des schémas Zod
const {
    ProductSchema,
    CreateProductSchema,
    UserSchema,
    CreateUserSchema,
    OrderSchema,
    CreateOrderSchema,
} = require("./schemas");

const app = express();
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

// Connexion à MongoDB et démarrage du serveur
client.connect().then(() => {
    db = client.db("myDB");
    app.listen(port, () => {
        console.log(`Listening on http://localhost:${port}`);
    });
});

// Fonction pour hasher le mot de passe
const hashPassword = (password) => {
    return crypto.createHash("sha512").update(password).digest("hex");
};

// Route racine
app.get("/", (req, res) => {
    res.send("Hello World!");
});

// --- Routes Produits ---

// GET /products/:id - Récupère un produit par son ID
app.get("/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const product = await db.collection("products").findOne({ _id: new MongoClient.ObjectId(id) });
        if (!product) {
            return res.status(404).json({ message: "Produit non trouvé" });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: "Erreur du serveur", error });
    }
});

// GET /products - Récupère tous les produits avec pagination optionnelle
app.get("/products", async (req, res) => {
    try {
        const products = await db.collection("products").find().toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Erreur du serveur", error });
    }
});

// POST /products - Crée un nouveau produit
app.post("/products", async (req, res) => {
    const result = CreateProductSchema.safeParse(req.body);

    // Validation du corps de la requête
    if (!result.success) {
        return res.status(400).json({ message: "Données invalides", errors: result.error.errors });
    }

    const { name, about, price } = result.data;

    try {
        const product = await db.collection("products").insertOne({ name, about, price });

        res.status(201).json({ _id: product.insertedId, name, about, price });
        console.log("Produit créé avec succès");
    } catch (error) {
        console.error("Erreur lors de la création du produit :", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
});

// DELETE /products/:id - Supprime un produit par son ID
app.delete("/products/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.collection("products").deleteOne({ _id: new MongoClient.ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Produit non trouvé" });
        }
        res.status(200).json({ message: "Produit supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur du serveur", error });
    }
});

// --- Routes Utilisateurs ---

// POST /users - Crée un nouvel utilisateur
app.post("/users", async (req, res) => {
    try {
        const parsedUser = CreateUserSchema.parse(req.body);
        const { username, password, email } = parsedUser;

        // Hachage du mot de passe avant de l'enregistrer
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.collection("users").insertOne({ username, password: hashedPassword, email });

        res.status(201).json({
            message: "Utilisateur créé avec succès",
            user: { username, email } // Ne jamais renvoyer le mot de passe
        });

    } catch (error) {
        console.error(error);
        res.status(400).json({ error: "Données invalides", details: error.message });
    }
});

// GET /users - Récupère tous les utilisateurs avec pagination
app.get("/users", async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const users = await db.collection("users").find().skip(offset).limit(limit).toArray();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur", details: error.message });
    }
});

// --- Routes Jeux Free-to-Play ---

// GET /f2p-games - Récupère tous les jeux Free-to-Play
app.get("/f2p-games", async (req, res) => {
    try {
        const response = await fetch("https://www.freetogame.com/api/games");
        const games = await response.json();
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des jeux Free-to-Play", error });
    }
});

// GET /f2p-games/:id - Récupère un jeu Free-to-Play par son ID
app.get("/f2p-games/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const response = await fetch(`https://www.freetogame.com/api/game?id=${id}`);
        const game = await response.json();
        res.json(game);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération du jeu Free-to-Play", error });
    }
});

// --- Routes Commandes ---

// POST /orders - Crée une nouvelle commande
app.post("/orders", async (req, res) => {
    try {
        const parsedOrder = CreateOrderSchema.parse(req.body);
        const { userId, productIds } = parsedOrder;

        const products = await db.collection("products").find({ _id: { $in: productIds.map(id => new MongoClient.ObjectId(id)) } }).toArray();
        const total = products.reduce((sum, product) => sum + product.price, 0) * 1.2;

        const result = await db.collection("orders").insertOne({ userId, productIds, total, payment: false, createdAt: new Date(), updatedAt: new Date() });
        res.status(201).json(result.ops[0]);
    } catch (error) {
        res.status(400).json({ message: "Données invalides", error: error.errors });
    }
});

// GET /orders - Récupère toutes les commandes
app.get("/orders", async (req, res) => {
    try {
        const orders = await db.collection("orders").find().toArray();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Erreur du serveur", error });
    }
});

// GET /orders/:id - Récupère une commande par son ID
app.get("/orders/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const order = await db.collection("orders").findOne({ _id: new MongoClient.ObjectId(id) });
        if (!order) {
            return res.status(404).json({ message: "Commande non trouvée" });
        }
        res.json(order);
    } catch (error) {
        res.status 500).json({ message: "Erreur du serveur", error });
    }
});

// PUT /orders/:id - Met à jour une commande par son ID
app.put("/orders/:id", async (req, res) => {
    const { id } = req.params;
    const { userId, productIds, payment } = req.body;

    try {
        const products = await db.collection("products").find({ _id: { $in: productIds.map(id => new MongoClient.ObjectId(id)) } }).toArray();
        const total = products.reduce((sum, product) => sum + product.price, 0) * 1.2;

        const result = await db.collection("orders").updateOne(
            { _id: new MongoClient.ObjectId(id) },
            { $set: { userId, productIds, total, payment, updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Commande non trouvée" });
        }
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: "Données invalides", error: error.errors });
    }
});

// DELETE /orders/:id - Supprime une commande par son ID
app.delete("/orders/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.collection("orders").deleteOne({ _id: new MongoClient.ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Commande non trouvée" });
        }
        res.status(200).json({ message: "Commande supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur du serveur", error });
    }
});
