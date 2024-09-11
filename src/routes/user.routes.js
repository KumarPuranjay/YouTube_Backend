import { Router } from "express";
import { changePassword, getCurrentUser, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import {decodeJWT} from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(decodeJWT, logoutUser);

router.route("refresh-token").post(refreshAccessToken);

router.route("/change-password").post(decodeJWT, changePassword);

router.route("/current-user").post(decodeJWT, getCurrentUser);

router.route("/update-account").patch(decodeJWT, updateAccountDetails);

router.route("/update-avatar").patch(
    decodeJWT,
    upload.single("avatar"),
    updateUserAvatar
);

router.route("/update-cover-image").patch(
    decodeJWT,
    upload.single("coverImage"),
    updateUserCoverImage
);

router.route("/c/:username").get(decodeJWT, getWatchHistory);

router.route("watch-history").get(decodeJWT, getWatchHistory);

export default router;