process.on("uncaughtException", (err) => {
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error(err);
});

import express from "express";
import { createServer } from "http";
import ebayService from "./service/ebay";
import wooCommerceService from "./service/wooCommerce";
const app = express();
const server = createServer(app);

const port = process.env.PORT || 8080;

app.get("/item", (req, res) => {
  ebayService
    .getItem()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/items", (req, res) => {
  ebayService
    .getItems()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/test", (req, res) => {
  ebayService
    .getCategories()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

server.listen(port, (req, res) => {
  console.log(`server listening on port: ${port}`);
});
