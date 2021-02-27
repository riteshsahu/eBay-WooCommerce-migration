require("dotenv").config();

process.on("uncaughtException", (err) => {
  console.error(err);
  process.exit(1);
});

const axios = require("axios");
const xmlParser = require("xml2json");
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const port = process.env.PORT || 8080;
const moment = require("moment");

const { EBAY_AUTH_TOKEN } = process.env;

app.get("/item", (req, res) => {
  getItem()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

app.get("/items", (req, res) => {
  getItems()
    .then((data) => res.json(data))
    .catch((err) => res.status(500).json(err));
});

const getItem = async () => {
  try {
    const ebayGetOrder = {
      method: "POST",
      url: "https://api.ebay.com/ws/api.dll",
      headers: {
        "X-EBAY-API-SITEID": "0",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
        "X-EBAY-API-CALL-NAME": "GetItem",
        "Content-Type": "application/xml",
      },
      data: `
      <?xml version="1.0" encoding="utf-8"?>
      <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
          <eBayAuthToken>${EBAY_AUTH_TOKEN}</eBayAuthToken>
        </RequesterCredentials>
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <!-- Enter the CreateTime or ModTime filters to limit the number 
        of orders returned using this format
        2015-12-01T20:34:44.000Z -->
        <ItemID>202825942791</ItemID>
      </GetItemRequest>
      `,
    };

    const res = await axios(ebayGetOrder);
    const xmlString = res.data;
    const response = xmlParser.toJson(xmlString);
    return JSON.parse(response);
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getItems = async () => {
  try {
    let items = [];
    let dateTo = moment();
    let dateFrom = moment().subtract(120, "days");
    while (items.length < 200) {
      console.log(dateTo.toISOString(), "dateTo");
      console.log(dateFrom.toISOString(), "dateFrom");
      console.log(items.length, "items length");
      let hasMoreData = true;
      let pageNumber = 1;

      while (hasMoreData) {
        console.log(pageNumber, "pageNumber");
        const ebayGetOrder = {
          method: "POST",
          url: "https://api.ebay.com/ws/api.dll",
          headers: {
            "X-EBAY-API-SITEID": "0",
            "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
            "X-EBAY-API-CALL-NAME": "GetSellerList",
            "Content-Type": "application/xml",
          },
          data: `
            <?xml version="1.0" encoding="utf-8"?>
            <GetSellerListRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
              <eBayAuthToken>${EBAY_AUTH_TOKEN}</eBayAuthToken>
            </RequesterCredentials>
            <DetailLevel>ReturnAll</DetailLevel>
            <Pagination>
              <EntriesPerPage>20</EntriesPerPage>
              <PageNumber>${pageNumber}</PageNumber>
            </Pagination>
            <StartTimeFrom>${dateFrom.toISOString()}</StartTimeFrom>
            <StartTimeTo>${dateTo.toISOString()}</StartTimeTo>
            <ErrorLanguage>en_US</ErrorLanguage>
            <WarningLevel>High</WarningLevel>
            </GetSellerListRequest>
            `,
        };

        const res = await axios(ebayGetOrder);
        const xmlString = res.data;
        const response = xmlParser.toJson(xmlString);
        const itemsData = JSON.parse(response);
        console.log(itemsData, "items data");
        pageNumber++;

        if (
          !(
            itemsData &&
            itemsData.GetSellerListResponse &&
            itemsData.GetSellerListResponse.HasMoreItems
          )
        ) {
          hasMoreData = false;
        }

        if (
          itemsData &&
          itemsData.GetSellerListResponse &&
          itemsData.GetSellerListResponse.ItemArray &&
          itemsData.GetSellerListResponse.ItemArray.Item &&
          itemsData.GetSellerListResponse.ItemArray.Item.length
        ) {
          items = items.concat(itemsData.GetSellerListResponse.ItemArray.Item);
        }
      }

      dateFrom.subtract(120, "days");
      dateTo.subtract(120, "days");
    }
    console.log(items.length, "items length");
    return items;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

http.listen(port, (req, res) => {
  console.log(`server listening on port: ${port}`);
});
