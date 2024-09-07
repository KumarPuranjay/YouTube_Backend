import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // cloudinary-url
            required: true
        },
        thumbnail: {
            type: String, // cloudinary-url
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        duration: {
            type: Number,
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean, 
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

// checkout mongoose aggregation pipeline.
// mongoose-aggregate-paginate-v2 is used to write advanced mongodb queries(i.e., complex queries)
videoSchema.plugin(mongooseAggregatePaginate)

export const video = mongoose.model("Video", videoSchema);