const mongoose = require('mongoose');

const userUsageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
  },
  papersGenerated: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

// Compound index to quickly find a user's usage for a specific date
userUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UserUsage', userUsageSchema);
