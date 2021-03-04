import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import CategoriesSchema from "../schema/categories";
import { decode } from "html-entities";

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WOO_COMMERCE_URL,
  consumerKey: process.env.WOO_COMMERCE_CONSUMER_KEY,
  consumerSecret: process.env.WOO_COMMERCE_CONSUMER_SECRET,
  version: "wc/v3",
  queryStringAuth: true,
});

class WooCommerceService {
  static async createCategory(data) {
    try {
      const res = await WooCommerce.post("products/categories", data);
      return res?.data;
    } catch (error) {
      throw error;
    }
  }

  static async getItem(id) {
    try {
      const res = await WooCommerce.get(`products/${id}`);
      return res?.data;
    } catch (error) {
      throw error;
    }
  }

  static async createAttibute(data) {
    try {
      const res = await WooCommerce.post("products/attributes", data);
      return res?.data;
    } catch (error) {
      throw error;
    }
  }

  static async createProduct(data) {
    try {
      const res = await WooCommerce.post("products", data);
      return res?.data;
    } catch (error) {
      throw error;
    }
  }

  static async createVariation(id, data) {
    try {
      const res = await WooCommerce.post(`products/${id}/variations`, data);
      return res?.data;
    } catch (error) {
      throw error;
    }
  }

  static async batchUpdateVariations(id, data) {
    try {
      const res = await WooCommerce.post(`products/${id}/variations/batch`, data);
      return res?.data;
    } catch (error) {
      throw error;
    }
  }

  static async getAttributes() {
    try {
      const res = await WooCommerce.get("products/attributes");
      return res?.data;
    } catch (error) {
      throw error;
    }
  }

  static async syncCategories() {
    try {
      let page = 1;
      while (true) {
        console.log(page, "page");
        const res = await WooCommerce.get("products/categories", {
          per_page: 100,
          page,
        });
        const wooCommerceCategories = res?.data;
        if (wooCommerceCategories && wooCommerceCategories.length) {
          // await CategoriesSchema.insertMany(wooCommerceCategories);
          await CategoriesSchema.bulkWrite(
            wooCommerceCategories.map((dt) => ({
              updateOne: {
                filter: { id: dt.id },
                update: dt,
                upsert: true,
              },
            }))
          );
          page++;
        } else {
          break;
        }
      }
      return {
        done: true,
      };
    } catch (error) {
      throw error;
    }
  }

  static async getCategories() {
    try {
      let page = 1;
      let categories = [];
      while (true) {
        console.log(page, "page");
        const res = await WooCommerce.get("products/categories", {
          per_page: 100,
          page,
        });

        const wooCommerceCategories = res?.data;
        if (wooCommerceCategories && wooCommerceCategories.length) {
          categories.push(...wooCommerceCategories);
          page++;
        } else {
          break;
        }
      }
      categories = categories.map((dt) => ({
        ...dt,
        name: decode(dt.name),
      }));
      console.log(categories.find((c) => c.name === "Heaters & Chillers"));
      return categories;
    } catch (error) {
      throw error;
    }
  }
}

export default WooCommerceService;
