import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import CategoriesSchema from "../schema/categories";

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WOO_COMMERCE_URL,
  consumerKey: process.env.WOO_COMMERCE_CONSUMER_KEY,
  consumerSecret: process.env.WOO_COMMERCE_CONSUMER_SECRET,
  version: "wc/v3",
  queryStringAuth: true,
});

const wooCommerceService = {
  async createCategory(data) {
    await WooCommerce.post("products/categories", data);
  },

  async syncCategories() {
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
          await CategoriesSchema.insertMany(wooCommerceCategories);
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
  },

  async getCategories() {
    try {
      const res = await WooCommerce.get("products/categories", {
        per_page: 100,
      });
      console.log(res.data.length, "length");
      return res?.data;
    } catch (error) {
      console.error(error, "er");
      throw error;
    }
  },
};

export default wooCommerceService;
