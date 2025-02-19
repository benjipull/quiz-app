const mongoose = require("mongoose");

const CompletionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    questionsAttempted: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    incorrectAnswers: { type: Number, required: true },
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    imageUrl: { type: String }, // Store image URL
    createdAt: { type: Date, default: Date.now }, // ✅ Automatically store creation date
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Store user ID
    completions: [CompletionSchema] // ✅ New array of embedded documents
});

module.exports = mongoose.model("Category", CategorySchema);