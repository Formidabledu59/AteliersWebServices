const z = require("zod");

// Schéma pour les produits
const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
});

const CreateProductSchema = ProductSchema.omit({ id: true }); // Schéma pour créer un produit (sans ID)

// Schéma pour les utilisateurs
const UserSchema = z.object({
    id: z.string(),
    username: z.string(),
    password: z.string().min(6), // Mot de passe avec une longueur minimale de 6 caractères
    email: z.string().email(), // Email valide
});

const CreateUserSchema = UserSchema.omit({ id: true }); // Schéma pour créer un utilisateur (sans ID)

// Schéma pour les commandes
const OrderSchema = z.object({
    userId: z.string(), // ID de l'utilisateur
    productIds: z.array(z.string()), // Liste des IDs des produits
    total: z.number().positive(), // Total de la commande
    payment: z.boolean().default(false), // État du paiement (par défaut : false)
    createdAt: z.date().default(new Date()), // Date de création
    updatedAt: z.date().default(new Date()), // Date de mise à jour
});

const CreateOrderSchema = OrderSchema.omit({ createdAt: true, updatedAt: true }); // Schéma pour créer une commande

module.exports = {
    ProductSchema,
    CreateProductSchema,
    UserSchema,
    CreateUserSchema,
    OrderSchema,
    CreateOrderSchema,
};
