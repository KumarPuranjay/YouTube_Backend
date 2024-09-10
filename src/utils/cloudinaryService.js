import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// fs library is used to perform file operations in node-js.

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        // Upload an image
        const uploadResult = await cloudinary.uploader
            .upload(
                localFilePath, {
                    resource_type: "auto"
                }
            )
        
        // console.log(`file is uploaded on cloudinary: ${uploadResult}`);
        fs.unlinkSync(localFilePath);
        return uploadResult;
    } catch (error) {
        // remove the temporary saved file on backend server.


        // fs.unlink os used to delete(or unlink) file from backend server.
        /*  fs.unlinkSync is used to unlink file synchronously 
            i.e., first file will be removed and then any other operation will be performed. */
        fs.unlinkSync(localFilePath);

        return null;
    }
}

export {uploadOnCloudinary};