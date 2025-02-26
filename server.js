const soap = require("soap");
const fs = require("node:fs");
const http = require("http");
const postgres = require("postgres"); // Ajout de l'import manquant

const sql = postgres({
  db: "mydb",
  user: "user",
  password: "password",
  port: 5433,
});

// Define the service implementation
const service = {
  ProductsService: {
    ProductsPort: {
      CreateProduct: async function ({ name, about, price }, callback) {
        if (!name || !about || !price) {
          return callback({
            Fault: {
              Code: {
                Value: "soap:Sender",
                Subcode: { value: "rpc:BadArguments" },
              },
              Reason: { Text: "Processing Error" },
              statusCode: 400,
            },
          });
        }

        try {
          const product = await sql`
            INSERT INTO products (name, about, price)
            VALUES (${name}, ${about}, ${price})
            RETURNING *
          `;

          console.log("Product created:", product[0]);
          callback(product[0]); // Retourne le premier (et seul) produit inséré
        } catch (error) {
          console.error("Database error:", error);
          callback({
            Fault: {
              Code: {
                Value: "soap:Server",
                Subcode: { value: "rpc:DatabaseError" },
              },
              Reason: { Text: "Database Insertion Error" },
              statusCode: 500,
            },
          });
        }
      },
    },
  },
};

// Create HTTP server
const server = http.createServer((request, response) => {
  response.end("404: Not Found: " + request.url);
});

server.listen(8000);

// Create the SOAP server
const xml = fs.readFileSync("productsService.wsdl", "utf8");
soap.listen(server, "/products", service, xml, () => {
  console.log("SOAP server running at http://localhost:8000/products?wsdl");
});
