import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true // read more about it, used to optimise searching
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true // read more about it, used to optimise searching
        },
        avatar: {
            type: String, // image-url, in our case cloudinary-url
            required: true,
        },
        converImage: {
            type: String, // image-url, in our case cloudinary-url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        },
        accessToken: {
            type: String
        }
    }, 
    {
        timestamps: true
    }
);

// () => {} arrow functions don't have context of this keyword
// so normal function is being used here
userSchema.pre("save", async function(next) {
    // calls bcrypt is only password is modified.
    // isModified is an imbuilt function of mongodb.
    if(!this.isModified("password")) return next();

    this.password = bcrypt.hash(this.password, 10);
    next();
})

// injecting methods into user schema
userSchema.methods.isPasswordCorrect() = async function(password) {
    return await bcrypt.compare(password, this.password);
}

// both jwt functions can be wraped in async-await block, but generally the algorithm is pretty fast.
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);