const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    alias: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    avatar: { type: Number, required: true, default: 1},
    password: { type: String, required: true },
    age: { type: Number, required: true, min: 1 },
    created_at: { type: Date },
    lastupdated_at: { type: Date, default: Date.now, required: true },
    lastlogin_at: { type: Date },
    

    // 🔑 Password Reset Fields
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
});

// 🔐 Hash password before saving
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model("User", UserSchema);
