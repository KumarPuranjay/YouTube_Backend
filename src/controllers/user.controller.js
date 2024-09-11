import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiErrors.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinaryService.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// TODO: Removing the files from backend server in case some error occured - registerUser()
// TODO: removing the old image from cloudinary after uplaoding new image - updateUserAvatar(), updateUserCoverImage()

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
            $unset: {
                refreshToken: 1
            }
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
    const refreshTokenFromUser = req.cookie?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");
    
    if(!refreshTokenFromUser) throw new ApiError(401, "Unauthorized request");
    
    try {
        const decodedToken = jwt.verify(refreshTokenFromUser, process.env.REFRESH_TOKEN_SECRET);
        
        const user = await User.findById(decodedToken?._id);
    
        if(!user) throw new ApiError(401, "Invalid refresh token");
    
        if(user?.refreshToken !== refreshTokenFromUser) throw new ApiError(401, "Refresh token in expired");
        
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

const changePassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) throw new ApiError(400, "Invalid Old Password");

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "User sent successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullname, email} = req.body;

    if(!fullname && !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname, email
            }
        },
        {new: true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "User details updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalFilePath = req.file?.path;

    if(!avatarLocalFilePath) throw new ApiError(400, "Avatar file is missing");

    const avatarOnCloudinary = await uploadOnCloudinary(avatarLocalFilePath);

    if(avatarOnCloudinary?.url) throw new ApiError(400, "Unable to upload avatar.");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatarOnCloudinary.url
            }
        },
        {new: true}
    ).select("-password");

    return user.status(200).json(new ApiResponse(200, user, "Updated avatar successfully."));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalFilePath = req.file?.path;

    if(!coverImageLocalFilePath) throw new ApiError(400, "cover image file is missing");

    const coverImageOnCloudinary = await uploadOnCloudinary(coverImageLocalFilePath);

    if(coverImageOnCloudinary?.url) throw new ApiError(400, "Unable to upload cover image.");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImageOnCloudinary.url
            }
        },
        {new: true}
    ).select("-password");

    return user.status(200).json(new ApiResponse(200, user, "Updated cover image successfully."));
});

const getuserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if(!username?.trim()) throw new ApiError(400, "please provide a username.");

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {   // get channels
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribersArray"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedToArray"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribersArray"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedToArray"
                },
                isSubscribed: {
                    $cond: {
                        if:{$in: [req.user?._id, "$subscribersArray.subscriber"]}, // the $in can check in body arrays and objects
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: { // allows limited properties of final object to be the end result
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    console.log(channel);
    
    if(!channel?.length) {
        throw new ApiError(400, "Channel does not exist.");
    };

    return res
            .status(200)
            .json(new ApiResponse(200, channel[0], "Profile data sent successfully."));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    /*
        By default, _id: ObjectId('655bc4d71fefdf9ffcbf24bl') in mongodb returns 
        '655bc4d71fefdf9ffcbf24bl' only which is not the original id of document. 
        normally mongoose handles this for you and gives you the document id where using any method.
        You will have to create this of you are using aggregate pipelines.
    */

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        }, 
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [ 
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                        avatar: 1
                                    }
                                },
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner" // or use :- arrayElementAt("$owner", 0)
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
            .status(200)
            .json(
                new ApiResponse(
                    200, 
                    user[0].watchHistory, 
                    "User watch history fetched successfully."
                )
            );
});

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changePassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getuserChannelProfile,
    getWatchHistory
};