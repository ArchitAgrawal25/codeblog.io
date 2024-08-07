const asyncHandler = require('../utils/asyncHandler.js');
const ApiError = require('../utils/ApiError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const uploadOnCloudinary = require('../utils/cloudinary.js');
const User = require('../models/user.model.js');
const jwt = require('jsonwebtoken');


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req,res) => {

    const {fullName, email, username, password} = req.body


    if (
        [fullName, email, username, password].some((item) => item?.trim() ==="" )
    ) {
        throw new ApiError(400, "All fields required")
    }

    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // console.log(req.files);
    

    const profileImageLocalPath = req.files?.profileImage[0]?.path

    if (!profileImageLocalPath) {
        throw new ApiError(400, "Profile Image file is required")
    }

    const profileImage = await uploadOnCloudinary(profileImageLocalPath)

    if(!profileImage){
        throw new ApiError(400, "Profile Image file is required 2")
    }

    const user = await User.create({
        fullName,
        profileImage: profileImage.url,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User register Successfully...")
    )

})

const loginUser = asyncHandler(async (req,res) => {
    // username or password: not empty reqbody -> data
    // username should exist in database
    // password should match

    const {email, username, password} = req.body

    if (!(username || email)) {
        throw new ApiError(400,"usernamw or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged In Successfully..."
        )
    )

})

const logoutUser = asyncHandler(async (req,res) => {
    // console.log(req.user);
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1, //this will remove the refreshToken field from the document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


module.exports = {
    registerUser,
    loginUser,
    logoutUser
}