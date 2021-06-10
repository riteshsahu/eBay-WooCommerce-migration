process.on("uncaughtException", (err) => {
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error(err);
});

import express from "express";
import { createServer } from "http";
import EbayService from "./service/ebay";
import WooCommerceService from "./service/wooCommerce";
const app = express();
const server = createServer(app);

const port = process.env.PORT || 4000;

app.get("/ebay/item/:id", (req, res) => {
  EbayService.getItem(req.params.id)
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/wooCommerce/item/:id", (req, res) => {
  WooCommerceService.getItem(req.params.id)
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/wooCommerce/attributes", (req, res) => {
  WooCommerceService.getAttributes(req.params.id)
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/wooCommerce/syncCategories", (req, res) => {
  WooCommerceService.syncCategories()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/wooCommerce/products", (req, res) => {
  WooCommerceService.getProducts()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/items", (req, res) => {
  EbayService.getItems()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/sync", (req, res) => {
  EbayService.syncProductsToWooCommerce()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

server.listen(port, (req, res) => {
  console.log(`server listening on port: ${port}`);
});
