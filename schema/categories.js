import mongoose from "../util/mongoose";

const schema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true },
    slug: { type: String },
    parent: { type: Number },
    menu_order: { type: Number },
  },
  {
    timestamps: true,
  }
);

const CategoriesSchema = mongoose.model("categories", schema);
export default CategoriesSchema;
