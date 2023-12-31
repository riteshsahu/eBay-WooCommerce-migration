import mongoose from "../util/mongoose";

const schema = new mongoose.Schema(
  {
    ebay_ItemID: { type: String, unique: true, required: true },
    ebay_data: { type: String, required: true },
    wc_data: { type: String, required: true },
    wooCommerce_id: { type: String, required: true },
    hasVariations: { type: Boolean, default: false },
    ebayVariantsAddedToWoo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const ProductSchema = mongoose.model("products", schema);
export default ProductSchema;
