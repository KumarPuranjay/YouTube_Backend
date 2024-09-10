import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiErrors.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinaryService.js";
import jwt from "jsonwebtoken";

// TODO: Removing the files from backend server in case some error occured - Not handled

const generateAccessAndRefreshToken = async function(userId) {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrond while generating token");
    }
};

const registerUser = asyncHandler( async (req, res) => {
    const {username, fullname, email, password} = req.body;

    if(
        [username, fullname, email, password].some((field) => (!field || field?.trim() === ""))
    ) {
        throw new ApiError (400, "All fields is required");
    }

    const userExists = await User.findOne({
        $or: [{username}, {email}]
    });

    if(userExists) throw new ApiError(409, "user or email already exists");

    // fields added by multer
    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if(req.files && req.files.coverImage && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    console.log(coverImageLocalPath);
    
    if(!avatarLocalPath) throw new ApiError(400, "Avatar image not available");

    const avatarOnCloudinary = await uploadOnCloudinary(avatarLocalPath);
    const coverImageOnCloudinary = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatarOnCloudinary) throw new ApiError(400, "Avatar image not available");
    
    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        avatar: avatarOnCloudinary.url,
        coverImage: (coverImageOnCloudinary?.url) ? coverImageOnCloudinary.url : "", 
        password
    });
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) throw new ApiError(500, "Something went wrond while creating user");

    res.status(201).json(new ApiResponse(200, createdUser, "user registered successfully."));
});

const loginUser = asyncHandler( async (req, res) => {
    const {email, username, password} = req.body;
    
    if(!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({ 
        $or: [{username}, {email}],
     });

    if(!user) throw new ApiError(404, "User not found.");

    let isPasswordValid = await user.isPasswordCorrect(user.password);

    if(!isPasswordValid) new ApiError(401, "Invalid user credentials");

    const tokens = await generateAccessAndRefreshToken(user._id);

    // in this way, cookies will only be modifiable from your server only and not backend. 
    const options = {
        httpOnly: true, secure: true
    };

    res.status(200)
        .cookie("accessToken", tokens.accessToken)
        .cookie("refreshToken", tokens.refreshToken)
        .json(new ApiResponse(
            200, 
            {
                email: user.email,
                username: user.username,
                fullname: user.fullname,
                ...tokens
            }, 
            "User LoggedIn Successful"
        ));

});

const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.user._id, 
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

/*  Access token generally expires withing 1 day.
    In order to generate this access token again, 
    we use refresh token which will automatically generate a new access token
    without requiring to log in. */
const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshTokenFromUser = req.cookie.refreshToken ?? req.body.refreshToken;

    if(!refreshTokenFromUser) throw new ApiError(401, "Unauthorized request");

    try {
        const decodedToken = jwt.verify(refreshAccessToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user) throw new ApiError(401, "Invalid refresh token");
    
        if(user?.refreshToken !== refreshAccessToken) throw new ApiError(401, "Refresh token in expired");
        
        const tokens = await generateAccessAndRefreshToken(user._id);
    
        const options = {
            httpOnly: true, secure: true
        };
    
        res.status(200)
            .cookie("accessToken", tokens.accessToken)
            .cookie("refreshToken", tokens.refreshToken)
            .json(new ApiResponse(
                200, 
                {
                    email: user.email,
                    username: user.username,
                    fullname: user.fullname,
                    ...tokens
                }, 
                "Access token refreshed"
            ));
    } catch (error) {
        throw new ApiError(401, error?.message ?? "Invalid refresh token.");
    }
});

export {registerUser, loginUser, logoutUser, refreshAccessToken};