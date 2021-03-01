import axios from "axios";
import moment from "moment";
import xmlParser from "xml2json";
const { EBAY_AUTH_TOKEN } = process.env;
const DAYS_DIFF = 60;

async function callApi(...args) {
  try {
    const res = await axios(...args);
    const xmlString = res.data;
    const response = xmlParser.toJson(xmlString);
    return JSON.parse(response);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

function getDefaultXmlData() {
  return `
  <RequesterCredentials>
    <eBayAuthToken>${EBAY_AUTH_TOKEN}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  `;
}

function getDefaultHeaders() {
  return {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "Content-Type": "application/xml",
  };
}

const ebayService = {
  async getCategories() {
    const data = `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      ${getDefaultXmlData()}
      <!-- Call-specific Input Fields -->
      <!-- ... more CategoryParent values allowed here ... -->
      <LevelLimit>10</LevelLimit>
      <ViewAllNodes>true</ViewAllNodes>
      <!-- Standard Input Fields -->
      <DetailLevel>ReturnAll</DetailLevel>
      <!-- ... more DetailLevel values allowed here ... -->
      <!-- ... more CategoryParent values allowed here ... -->
      <!-- Standard Input Fields -->
    </GetCategoriesRequest>
    `;

    console.log(data, "data");

    const res = await callApi({
      method: "POST",
      url: "https://api.ebay.com/ws/api.dll",
      headers: {
        ...getDefaultHeaders(),
        "X-EBAY-API-CALL-NAME": "GetCategories",
      },
      data,
    });
    return res;
  },

  async getItem() {
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
          <ItemID>201837976583</ItemID>
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
  },

  async getItems() {
    try {
      let items = [];
      let dateTo = moment();
      let dateFrom = moment().subtract(DAYS_DIFF, "days");
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
            items = items.concat(
              itemsData.GetSellerListResponse.ItemArray.Item
            );
            return items;
          }
        }

        dateFrom.subtract(DAYS_DIFF, "days");
        dateTo.subtract(DAYS_DIFF, "days");
      }
      console.log(items.length, "items length");
      return items;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  async syncProductsToWooCommerce() {},
};

export default ebayService;
