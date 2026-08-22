const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  sourceType: { type: String, required: true }, // 'youtube', 'blog', or 'text'
  sourceInputValue: { type: String, required: true },
  userCustomContext: { type: String, default: "" },
  generatedOutputs: {
    twitter: String,
    linkedin: String,
    reel: String,
    hashtags: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);