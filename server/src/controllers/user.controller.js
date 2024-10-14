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
        throw new ApiError(501, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req,res) => {

    const {fullName, email, username, password} = req.body


    if (
        [fullName, email, username, password].some((item) => item?.trim() ==="" )
    ) {
        res.status(400).json(new ApiResponse(400, {}, "All fields required"))
        // throw new ApiError(400, "All fields required")
    }

    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if (existedUser) {
        res.status(409).json(new ApiResponse(409, {}, "User with email or username already exists"))
        // throw new ApiError(409, "User with email or username already exists")
    }

    // console.log(email, username);
    

    if (username.length < 4 || username.length > 20) {
        res.status(400).json(new ApiResponse(400, {}, "Username should be between 4 and 20 characters long"))
        // throw new ApiError(400, "Username should be between 4 and 20 characters long")
    }

    // Edge Case: User Registration with Special Characters in Email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) {
        res.status(400).json(new ApiResponse(400, {}, "Invalid email address"))
        // throw new ApiError(400, "Invalid email address")
    }

    if (password.length < 6) {
        res.status(400).json(new ApiResponse(400, {}, "Password should be at least 6 characters long"))
        // throw new ApiError(400, "Password should be at least 6 characters long")
    }

    // console.log(req.files);
    

    // const profileImageLocalPath = req.files?.profileImage[0]?.path

    // if (!profileImageLocalPath) {
    //     throw new ApiError(400, "Profile Image file is required")
    // }

    // const profileImage = await uploadOnCloudinary(profileImageLocalPath)

    // if(!profileImage){
    //     throw new ApiError(400, "Profile Image file is required 2")
    // }

    const user = await User.create({
        fullName,
        // profileImage: profileImage.url,
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        res.status(500).json(new ApiResponse(500, {}, "Something went wrong while registering the user"))
        // throw new ApiError(500, "Something went wrong while registering the user")
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
        res.status(400).json(new ApiResponse(400, {}, "usernamw or email is required"))
        // throw new ApiError(400,"usernamw or email is required")
    }

    if (!password) {
        res.status(400).json(new ApiResponse(400, {}, "Password is required"))
        // throw new ApiError(400, "Password is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    // console.log(user);
    

    if (!user) {
        res.status(404).json(new ApiResponse(404, {}, "User does not exist"))
        // throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    // console.log(isPasswordValid);
    

    if (!isPasswordValid) {
        res.status(401).json(new ApiResponse(401, {}, "Invalid user credentials"))
        // throw new ApiError(401, "Invalid user credentials")
    }

    // console.log(123);
    
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    // console.log(11111111);
    
    // console.log(accessToken,refreshToken);
    

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // console.log(loggedInUser);
    

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
            "User logged In Successfully..."
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


    

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const getUserProfile = asyncHandler(async (req,res) => {
    const {username} = req.params

    

})


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile
}