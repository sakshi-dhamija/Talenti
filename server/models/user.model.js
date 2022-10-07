const mongoose = require("mongoose");
const { isEmail } = require("validator");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, "Email is required."],
      unique: [true, "email is already taken."],
      validate: [isEmail, "invalid email"],
    },
    interviewsScheduled: [
      {
        type: Schema.Types.ObjectId,
        ref: "Interview",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
