const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const crypto = require("crypto");

const app = express();
const port = 8000;
const sql = postgres({ db: "mydb", user: "user", password: "password" });

app.use(express.json());

// Schemas
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({ id: true });

const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
  email: z.string().email(),
});
const CreateUserSchema = UserSchema.omit({ id: true });
const UpdateUserSchema = UserSchema.partial().omit({ id: true, password: true });

// Hash password function
const hashPassword = (password) => {
  return crypto.createHash('sha512').update(password).digest('hex');
};

// Routes for Products
app.post("/products", async (req, res) => {
  const result = await CreateProductSchema.safeParse(req.body);

  if (result.success) {
    const { name, about, price } = result.data;

    const product = await sql`
      INSERT INTO products (name, about, price)
      VALUES (${name}, ${about}, ${price})
      RETURNING *
      `;

    res.send(product[0]);
  } else {
    res.status(400).send(result);
  }
});

app.get("/products", async (req, res) => {
  const products = await sql`
    SELECT * FROM products
    `;

  res.send(products);
});

app.get("/products/:id", async (req, res) => {
  const product = await sql`
    SELECT * FROM products WHERE id=${req.params.id}
    `;

  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.delete("/products/:id", async (req, res) => {
  const product = await sql`
    DELETE FROM products
    WHERE id=${req.params.id}
    RETURNING *
    `;

  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

// Routes for Users
app.post("/users", async (req, res) => {
  const result = await CreateUserSchema.safeParse(req.body);

  if (result.success) {
    const { username, password, email } = result.data;
    const hashedPassword = hashPassword(password);

    const user = await sql`
      INSERT INTO users (username, password, email)
      VALUES (${username}, ${hashedPassword}, ${email})
      RETURNING id, username, email
      `;

    res.send(user[0]);
  } else {
    res.status(400).send(result);
  }
});

app.get("/users", async (req, res) => {
  const users = await sql`
    SELECT id, username, email FROM users
    `;

  res.send(users);
});

app.get("/users/:id", async (req, res) => {
  const user = await sql`
    SELECT id, username, email FROM users WHERE id=${req.params.id}
    `;

  if (user.length > 0) {
    res.send(user[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.put("/users/:id", async (req, res) => {
  const result = await CreateUserSchema.safeParse(req.body);

  if (result.success) {
    const { username, password, email } = result.data;
    const hashedPassword = hashPassword(password);

    const user = await sql`
      UPDATE users
      SET username=${username}, password=${hashedPassword}, email=${email}
      WHERE id=${req.params.id}
      RETURNING id, username, email
      `;

    if (user.length > 0) {
      res.send(user[0]);
    } else {
      res.status(404).send({ message: "Not found" });
    }
  } else {
    res.status(400).send(result);
  }
});

app.patch("/users/:id", async (req, res) => {
  const result = await UpdateUserSchema.safeParse(req.body);

  if (result.success) {
    const updates = result.data;
    if (updates.password) {
      updates.password = hashPassword(updates.password);
    }

    const user = await sql`
      UPDATE users
      SET ${sql(updates)}
      WHERE id=${req.params.id}
      RETURNING id, username, email
      `;

    if (user.length > 0) {
      res.send(user[0]);
    } else {
      res.status(404).send({ message: "Not found" });
    }
  } else {
    res.status(400).send(result);
  }
});

app.delete("/users/:id", async (req, res) => {
  const user = await sql`
    DELETE FROM users
    WHERE id=${req.params.id}
    RETURNING id, username, email
    `;

  if (user.length > 0) {
    res.send(user[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});