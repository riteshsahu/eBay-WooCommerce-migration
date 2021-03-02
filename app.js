process.on("uncaughtException", (err) => {
  console.error(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error(err);
});

import express from "express";
import { createServer } from "http";
import EbayService from "./service/Ebay";
import WooCommerceService from "./service/WooCommerce";
const app = express();
const server = createServer(app);

const port = process.env.PORT || 8080;

app.get("/item", (req, res) => {
  EbayService.getItem()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/items", (req, res) => {
  EbayService.getItems()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/test", (req, res) => {
  WooCommerceService.getAttributes()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

server.listen(port, (req, res) => {
  console.log(`server listening on port: ${port}`);
});
