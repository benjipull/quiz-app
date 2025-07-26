const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    alias: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    avatar: { type: Number, required: true, default: 1},
    password: { type: String, required: true },
    age: { type: Number, required: true, min: 1 },
    created_at: { type: Date, default: Date.now }, // Automatically set on creation
    lastupdated_at: { type: Date, default: Date.now, required: true }, // Automatically set on creation and updated on save
    lastlogin_at: { type: Date }, // This should be updated specifically on user login

    // 🔑 Password Reset Fields
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
});

// 🔐 Hash password before saving and update lastupdated_at
UserSchema.pre("save", async function (next) {
    // Hash password only if it's modified
    if (this.isModified("password")) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // Always update lastupdated_at when the document is saved (whether new or updated)
    // The default already handles initial creation, this handles subsequent updates.
    this.lastupdated_at = new Date();

    next();
});

module.exports = mongoose.model("User", UserSchema);
