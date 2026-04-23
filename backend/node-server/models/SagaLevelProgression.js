const mongoose = require("mongoose");

const SagaLevelSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completionRating: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  },
);

const SagaSchema = new mongoose.Schema(
  {
    sagaNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    sagaLevels: {
      type: [SagaLevelSchema],
      default: [],
    },
    completionRewardClaimed: {
      type: Boolean,
      default: false,
    },
    completionRewardClaimedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const SagaLevelProgressionSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sagas: {
      type: [SagaSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

SagaLevelProgressionSchema.index({ player: 1 });
SagaLevelProgressionSchema.index({ player: 1, updatedAt: -1 });

module.exports = mongoose.model("SagaLevelProgression", SagaLevelProgressionSchema);
