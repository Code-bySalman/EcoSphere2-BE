import { genSalt, hash } from "bcrypt";

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: false , unique:true},
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileSetup: { type: Boolean, default: false },
  image:{type: String, required: false},
  color: {type: String, required: false},
  createdAt: { type: Date, default: Date.now },
});


userSchema.pre('save',async function(next) {
     const salt = await genSalt()
     this.password = await hash(this.password, salt);
     next();
});
const User = mongoose.model("User", userSchema);
export default User;


