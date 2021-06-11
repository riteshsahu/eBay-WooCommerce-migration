import mongoose from "../util/mongoose";

const schema = new mongoose.Schema({
  ebay_ItemID: { type: String, unique: true, required: true },
});

const DuplicateProductSchema = mongoose.model("duplicates", schema);
export default DuplicateProductSchema;
