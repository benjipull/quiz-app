const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    alias: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    avatar: { type: Number, required: true, default: 1},
    
    knowledgePoints: { type: Number, required: true, default: 0 },
    wisdomGems: { type: Number, required: true, default: 0 },
    enlightenmentCrystals: { type: Number, required: true, default: 0 },
    coins: { type: Number, required: true, default: 0 },
    level: { type: Number, required: true, default: 1 },
    
    password: { type: String, required: true },
    age: { type: Number, required: true, min: 1 },
    
    created_at: { type: Date, default: Date.now },
    lastupdated_at: { type: Date, default: Date.now, required: true },
    lastlogin_at: { type: Date },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
});

// 🔐 Hash password before saving and update lastupdated_at
UserSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // 🔄 Always recalculate level before saving
    this.level = this.calculateLevel();

    this.lastupdated_at = new Date();
    next();
});

// 📈 Method to calculate level based on knowledge points
UserSchema.methods.calculateLevel = function () {
    // 👇 start at level 1, +1 for each 1000 points
    return Math.floor(this.knowledgePoints / 1000) + 1;
};

module.exports = mongoose.model("User", UserSchema);
