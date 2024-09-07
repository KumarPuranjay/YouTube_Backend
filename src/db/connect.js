import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectDb = async () => {
    try {
        const connectionResponse = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        // console.log(connectionResponse);
        console.log(`\n MongoDb connected successfully: ${connectionResponse.connection.host}`)
    } catch (error) {
        console.log(`MONGODB connection error: `, error)
        process.exit(1) // check docs
    }
}

export default connectDb;