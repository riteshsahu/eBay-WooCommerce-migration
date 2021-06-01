import axios from "axios";
import moment from "moment";
import xmlParser from "xml2json";
import WooCommerceService from "./WooCommerce";
import { ebayToWc, ebayProductVariantToWcProductVariant } from "../util/marshaller";
const { EBAY_AUTH_TOKEN } = process.env;
const DAYS_DIFF = 110;
import ProductSchema from "../schema/product";
import CategoriesSchema from "../schema/categories";
import logger from "../util/winstonLogger";
import { encode } from "html-entities";
import { WOO_COMMERCE_RESERVED_TERMS } from "../config";

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

    // console.log(data, "data");

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
          <OutputSelector>Title</OutputSelector>
          <OutputSelector>Variations</OutputSelector>
          <OutputSelector>VariationSpecificsSet</OutputSelector>
          <OutputSelector>Pictures</OutputSelector>
          <OutputSelector>Description</OutputSelector>
          <OutputSelector>ItemID</OutputSelector>
          <OutputSelector>DiscountPriceInfo</OutputSelector>
          <OutputSelector>ItemID</OutputSelector>
          <OutputSelector>PrimaryCategory</OutputSelector>
          <OutputSelector>ViewItemURL</OutputSelector>
          <OutputSelector>Currency</OutputSelector>
          <OutputSelector>SellingStatus</OutputSelector>
          <OutputSelector>StartPrice</OutputSelector>
          <OutputSelector>Quantity</OutputSelector>
          <OutputSelector>ShippingPackageDetails</OutputSelector>
          <OutputSelector>PictureDetails</OutputSelector>
        </GetItemRequest>
        `,
      };

      const res = await axios(ebayGetOrder);
      const xmlString = res.data;
      const response = xmlParser.toJson(xmlString);
      const item = JSON.parse(response);
      return item?.GetItemResponse?.Item;
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
        // console.log(dateTo.toISOString(), "dateTo");
        // console.log(dateFrom.toISOString(), "dateFrom");
        // console.log(items.length, "items length");
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
      let itemsCount = 0;

      const wooCommerceAttributes = await WooCommerceService.getAttributes();
      while (dateTo.year() != 2005) {
        console.log(dateTo.year(), "year");
        // console.log(dateTo.toISOString(), "dateTo");
        // console.log(dateFrom.toISOString(), "dateFrom");
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
              <Pagination>
                <EntriesPerPage>150</EntriesPerPage>
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
          pageNumber++;

          if (!(itemsData && itemsData.GetSellerListResponse && itemsData.GetSellerListResponse.HasMoreItems)) {
            hasMorePaginatedItems = false;
          }

          if (itemsData?.GetSellerListResponse?.ItemArray?.Item?.length) {
            // const items = itemsData.GetSellerListResponse.ItemArray.Item;
            const items = [
              { ItemID: 202938491832 },
              { ItemID: 202113116291 },
              { ItemID: 201999409362 },
              { ItemID: 201828867365 },
              { ItemID: 201837976583 },
            ];

            for (let i = 0; i < items.length; i++) {
              itemsCount++;
              try {
                const item = items[i];
                const savedProductData = await ProductSchema.findOne({
                  ebay_ItemID: item.ItemID,
                });

                if (savedProductData && savedProductData.wooCommerce_id) {
                  if (!savedProductData.hasVariations) {
                    // skip if product already exist
                    continue;
                  } else if (savedProductData.ebayVariantsAddedToWoo) {
                    continue;
                  }
                }

                const ebayProduct = await this.getItem(item.ItemID);

                if (!ebayProduct) {
                  throw new Error(`Ebay product with item id = ${item.ItemId} not found.`);
                }

                ebayProduct.attributes = [];
                ebayProduct.categories = [];

                console.log("processing item ", ebayProduct.ItemID);

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

                    const wooAtt = wooCommerceAttributes.find(
                      (dt) => dt.name.toLowerCase().replace(/ /g, "") === attibute.Name.toLowerCase().replace(/ /g, "")
                    );
                    let productAttribute;

                    let slug = attibute.Name.toLowerCase().replace(/ /g, "");

                    if (WOO_COMMERCE_RESERVED_TERMS.includes(slug)) {
                      slug += "_1";
                    }

                    if (!wooAtt) {
                      const atData = await WooCommerceService.createAttibute({
                        name: attibute.Name.replace(/ /g, ""),
                        slug: `pa_${slug}_1`,
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

                if (savedProductData && savedProductData.wooCommerce_id) {
                  if (!savedProductData.hasVariations) {
                    // skip if product already exist
                    continue;
                  } else {
                    const wooProduct = await WooCommerceService.getItem(savedProductData.wooCommerce_id);
                    await this.syncEbaProductyVariantionToWooCommerceProduct(ebayProduct, wooProduct);
                    continue;
                  }
                }

                logger.info({
                  type: "info",
                  message: `Processing Product - \n ItemID - ${ebayProduct.ItemID}.`,
                  service: "EbayService.syncProductsToWooCommerce",
                  date: new Date(),
                });

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

                const wcProductPayload = await ebayToWc(ebayProduct);
                // console.log(wcProductPayload, "wcProductPayload");
                const wooCommerceProduct = await WooCommerceService.createProduct(wcProductPayload);
                // console.log(wooCommerceProduct, "wooCommerceProduct");

                const productToSave = new ProductSchema({
                  ebay_ItemID: ebayProduct.ItemID,
                  ebay_data: JSON.stringify(ebayProduct),
                  wooCommerce_id: wooCommerceProduct.id,
                  hasVariations: ebayProduct.Variations?.Variation?.length ? true : false,
                });

                await productToSave.save();

                // handle Variations
                await this.syncEbaProductyVariantionToWooCommerceProduct(ebayProduct, wooCommerceProduct);

                // if (ebayProduct.Variations?.Variation?.length) {
                //   // TODO: remove this
                //   return { done: true };
                // }
              } catch (error) {
                // console.error(error);
                console.log(error?.response?.data);
                console.log("Failed");
                logger.info({
                  type: "error",
                  message: error,
                  service: "EbayService.syncProductsToWooCommerce",
                  date: new Date(),
                });
                continue;
              }
            }
            return;
          }
        }

        dateFrom.subtract(DAYS_DIFF, "days");
        dateTo.subtract(DAYS_DIFF, "days");
      }
      return { done: true, itemsCount };
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
