import axios from "axios";
import moment from "moment";
import xmlParser from "xml2json";
import WooCommerceService from "./WooCommerce";
import { ebayToWc, ebayProductVariantToWcProductVariant } from "../util/marshaller";
const { EBAY_AUTH_TOKEN } = process.env;
const DAYS_DIFF = 60;
import ProductSchema from "../schema/product";
import CategoriesSchema from "../schema/categories";
import logger from "../util/winstonLogger";
import { encode } from "html-entities";

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

class EbayService {
  static async getCategories() {
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
  }

  static async getItem(id) {
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
          <ItemID>${id}</ItemID>
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
  }

  static async getItems() {
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
              <IncludeVariations>true</IncludeVariations>
              <ErrorLanguage>en_US</ErrorLanguage>
              <WarningLevel>High</WarningLevel>
              </GetSellerListRequest>
              `,
          };

          const res = await axios(ebayGetOrder);
          const xmlString = res.data;
          const response = xmlParser.toJson(xmlString);
          const itemsData = JSON.parse(response);
          pageNumber++;

          if (!(itemsData && itemsData.GetSellerListResponse && itemsData.GetSellerListResponse.HasMoreItems)) {
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
            return items;
          }
        }

        dateFrom.subtract(DAYS_DIFF, "days");
        dateTo.subtract(DAYS_DIFF, "days");
      }
      console.log(items.length, "total items length");
      return items;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  static async syncProductsToWooCommerce() {
    console.log("sync started");
    try {
      let dateTo = moment();
      let dateFrom = moment().subtract(DAYS_DIFF, "days");
      let hasMoreItems = true;
      let itemDoneLength = 0;
      const wooCommerceAttributes = await WooCommerceService.getAttributes();
      while (hasMoreItems) {
        console.log(dateTo.toISOString(), "dateTo");
        console.log(dateFrom.toISOString(), "dateFrom");
        let hasMorePaginatedItems = true;
        let pageNumber = 1;

        while (hasMorePaginatedItems) {
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
              <IncludeVariations>true</IncludeVariations>
              <OutputSelector>Title</OutputSelector>
              <OutputSelector>Variations</OutputSelector>
              <OutputSelector>Description</OutputSelector>
              <OutputSelector>ItemID</OutputSelector>
              <OutputSelector>DiscountPriceInfo</OutputSelector>
              <OutputSelector>ItemID</OutputSelector>
              <OutputSelector>PrimaryCategory</OutputSelector>
              <OutputSelector>attributes</OutputSelector>
              <OutputSelector>ViewItemURL</OutputSelector>
              <OutputSelector>Variations</OutputSelector>
              <OutputSelector>Currency</OutputSelector>
              <OutputSelector>SellingStatus</OutputSelector>
              <OutputSelector>StartPrice</OutputSelector>
              <OutputSelector>Quantity</OutputSelector>
              <OutputSelector>ShippingPackageDetails</OutputSelector>
              <OutputSelector>PictureDetails</OutputSelector>
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

          if (!(itemsData && itemsData.GetSellerListResponse && itemsData.GetSellerListResponse.HasMoreItems)) {
            hasMorePaginatedItems = false;
          }

          if (
            itemsData &&
            itemsData.GetSellerListResponse &&
            itemsData.GetSellerListResponse.ItemArray &&
            itemsData.GetSellerListResponse.ItemArray.Item &&
            itemsData.GetSellerListResponse.ItemArray.Item.length
          ) {
            const items = itemsData.GetSellerListResponse.ItemArray.Item;
            for (let i = 0; i < items.length; i++) {
              const ebayProduct = items[i];
              console.log("processing item ", ebayProduct.ItemID);

              const savedProductData = await ProductSchema.findOne({
                ebay_ItemID: ebayProduct.ItemID,
              });

              if (savedProductData && savedProductData.wooCommerce_id) {
                if (!savedProductData.hasVariations) {
                  // skip if product already exist
                  continue;
                } else {
                  await this.syncEbaProductyVariantionToWooCommerceProduct(ebayProduct, wooCommerceProduct);
                  continue;
                }
              }

              logger.info({
                type: "info",
                message: `Processing Product - \n ItemID - ${ebayProduct.ItemID}
                .`,
                service: "EbayService.syncProductsToWooCommerce",
                date: new Date(),
              });

              ebayProduct.attributes = [];
              ebayProduct.categories = [];

              if (!ebayProduct.Variations?.Variation) {
                console.log(ebayProduct.ItemID, "item id continue");
                continue;
              } else {
                console.log("contains variants");
              }

              // handle Categories
              if (ebayProduct.PrimaryCategory?.CategoryName) {
                const ebayCategories = ebayProduct.PrimaryCategory?.CategoryName.split(":");

                for (let i = 0; i < ebayCategories.length; i++) {
                  const ebayCategory = ebayCategories[i];

                  const wooCat = await CategoriesSchema.findOne({
                    name: encode(ebayCategory),
                  });

                  // const wooCat = wooCommerceCategories.find(
                  //   (dt) => dt.name === ebayCategory
                  // );

                  let productCategory;

                  if (!wooCat) {
                    const newWooCat = await WooCommerceService.createCategory({
                      name: ebayCategory,
                      ...(ebayProduct.categories[i - 1]
                        ? {
                            parent: ebayProduct.categories[i - 1].id,
                          }
                        : null),
                    });

                    // wooCommerceCategories.push({
                    //   ...newWooCat,
                    //   name: decode(newWooCat.name),
                    // });

                    const cateRes = new CategoriesSchema(newWooCat);
                    await cateRes.save();

                    productCategory = newWooCat;
                  } else {
                    productCategory = wooCat;
                  }

                  ebayProduct.categories.push({
                    id: productCategory.id,
                    name: productCategory.name,
                    slug: productCategory.slug,
                  });
                }
              }

              // handle Attributes
              if (ebayProduct.Variations?.VariationSpecificsSet?.NameValueList) {
                if (
                  !Array.isArray(ebayProduct.Variations.VariationSpecificsSet.NameValueList) &&
                  ebayProduct.Variations.VariationSpecificsSet.NameValueList.Value
                ) {
                  ebayProduct.Variations.VariationSpecificsSet.NameValueList = [
                    ebayProduct.Variations.VariationSpecificsSet.NameValueList,
                  ];
                }

                for (let i = 0; i < ebayProduct.Variations.VariationSpecificsSet.NameValueList.length; i++) {
                  const attibute = ebayProduct.Variations.VariationSpecificsSet.NameValueList[i];

                  const wooAtt = wooCommerceAttributes.findOne((dt) => dt.name === attibute.Name);
                  let productAttribute;

                  if (!wooAtt) {
                    const atData = await WooCommerceService.createAttibute({
                      name: attibute.Name,
                      slug: `pa_${attibute.Name.toLowerCase()}`,
                      type: "select",
                      order_by: "menu_order",
                      has_archives: true,
                    });

                    productAttribute = atData;

                    wooCommerceAttributes.push(atData);
                  } else {
                    productAttribute = wooAtt;
                  }

                  ebayProduct.attributes.push({
                    id: productAttribute.id,
                    name: productAttribute.name,
                    position: i + 1,
                    visible: true,
                    variation: true,
                    options: attibute.Value,
                  });
                }
              }

              const wcProductPayload = await ebayToWc(ebayProduct);
              const wooCommerceProduct = await WooCommerceService.createProduct(wcProductPayload);

              const productToSave = new ProductSchema({
                ebay_ItemID: ebayProduct.ItemID,
                ebay_data: JSON.stringify(ebayProduct),
                wooCommerce_id: wooCommerceProduct.id,
                hasVariations: ebayProduct.Variations?.Variation?.length ? true : false,
              });

              await productToSave.save();
              itemDoneLength++;

              // handle Variations
              await this.syncEbaProductyVariantionToWooCommerceProduct(ebayProduct, wooCommerceProduct);

              // TODO: remove this
              if (itemDoneLength > 19) {
                return { done: true };
              }
            }
          } else {
            hasMoreItems = false;
          }
        }

        dateFrom.subtract(DAYS_DIFF, "days");
        dateTo.subtract(DAYS_DIFF, "days");
      }
      console.log(items.length, "items length");
      return items;
    } catch (error) {
      console.error(error);
      logger.info({
        type: "error",
        message: error,
        service: "EbayService.syncProductsToWooCommerce",
        date: new Date(),
      });
      throw error;
    }
  }

  static async syncEbaProductyVariantionToWooCommerceProduct(ebayProduct, wooCommerceProduct) {
    try {
      if (ebayProduct.Variations?.Variation?.length) {
        const variationsPayload = [];
        for (const variation of ebayProduct.Variations.Variation) {
          variationsPayload.push(ebayProductVariantToWcProductVariant(variation, wooCommerceProduct, ebayProduct));
        }

        await WooCommerceService.batchUpdateVariations(wooCommerceProduct.id, { create: variationsPayload });
        await ProductSchema.updateOne(
          {
            wooCommerce_id: wooCommerceProduct.id,
          },
          { $set: { ebayVariantsAddedToWoo: true } }
        );
      }
    } catch (error) {
      // adding variations failed
      throw error;
    }
  }
}

export default EbayService;
