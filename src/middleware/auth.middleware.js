import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const removeJWT = asyncHandler(async function (req, res, next) {
    try {
        const token = req.cookie?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token) throw new ApiError(401, "Unauthorized request");
    
        const decodedInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); 
    
        const user = await User.findById(decodedInfo?._id).select("-password -refreshToken");
    
        if(!user) throw new ApiError(401, "Invalid token");
    
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
}); 

export {removeJWT};