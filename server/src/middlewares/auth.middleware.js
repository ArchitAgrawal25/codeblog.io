const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError.js');
const asyncHandler = require('../utils/asyncHandler.js');
const User = require('../models/user.model.js');
const { json } = require('express');


const verifyJWT = asyncHandler(async (req, res, next) => {   
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

    if (!token) {
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)
    .select("-password -refreshToken")
    
    if (!user) {
        throw new ApiError(401, "Invalid Access Token")
    }

    req.user = user;
    next()
} catch (error) {
    res.status(401).json({message:"Unauthorized"})
    // throw new ApiError(401, error?.message || "Invalid Access Token")
    // console.log({error: error.message});
    throw new ApiError(401, json(error))
    
}
});

module.exports = verifyJWT;