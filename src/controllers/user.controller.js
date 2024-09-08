import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiErrors.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinaryService.js";

const registerUser = asyncHandler( async (req, res) => {
    const {username, fullname, email, password} = req.body;

    if(
        [username, fullname, email, password].some((field) => (!field || field?.trim() === ""))
    ) {
        throw new ApiError (400, "All fields is required");
    }

    const userExists = User.findOne({
        $or: [{username}, {email}]
    });

    if(userExists) throw new ApiError(409, "user or email already exists");

    // fields added by multer
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400, "Avatar image not available");

    const avatarOnCloudinary = await uploadOnCloudinary(avatarLocalPath);
    const coverImageOnCloudinary = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatarOnCloudinary) throw new ApiError(400, "Avatar image not available");

    const user = await User.create({
        fullname,
        email,
        username: username.toLowerCase(),
        avatar: avatarOnCloudinary.url,
        coverImage: coverImageOnCloudinary?.url || "", 
        password
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(createdUser) throw new ApiError(500, "Something went wrond while creating user");

    res.status(201).json(ApiResponse(200, createdUser, "user registered successfully."));
})

const loginUser = asyncHandler( async (req, res) => {
    res.status(200).json({
        message: "ok"
    })
})

export {registerUser, loginUser};