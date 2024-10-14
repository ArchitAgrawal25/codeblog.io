const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  email:{
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  fullName:{
    type: String,
    required: true,
    trim: true,
    index: true
  },
  profileImage:{
    type: String, // Cloudinary URL
    // required: true,
  },
  password:{
    type: String,
    required: [true, "Password is required"],
  },
  refreshToken:{
    type: String,
  }

},{
  timestamps: true
})


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
})

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function () {
  // console.log(process.env.ACCESS_TOKEN_SECRET); // should not be undefined
  // console.log(process.env.ACCESS_TOKEN_EXPIRY); // should not be undefined
  return jwt.sign(
      {
          _id: this._id,
          username: this.username,
          email: this.email,
          fullName: this.fullName,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
  )
}
 
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
      {
          _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
          expiresIn: process.env.REFRESH_TOKEN_EXPIRY
      }
  )
}


const User = mongoose.model('User', userSchema);

module.exports = User;