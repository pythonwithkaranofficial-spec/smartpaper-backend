const mongoose = require("mongoose");

const imageCacheSchema = new mongoose.Schema({
  imageHash: { type: String, required: true, unique: true },
  class: { type: String, required: true },
  subject: { type: String, required: true },
  chapter: { type: String, required: true },
  diagramType: { type: String, required: true },
  prompt: { type: String, required: true },
  keywords: { type: [String] },
  cbseLevel: { type: String, required: true },
  
  imageData: { type: Buffer, required: true },
  mimeType: { type: String, required: true },
  imageWidth: { type: Number, required: true },
  imageHeight: { type: Number },
  compressionFormat: { type: String, required: true },
  quality: { type: Number, required: true },
  version: { type: Number, default: 1 },
  
  usageCount: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ImageCache", imageCacheSchema);
