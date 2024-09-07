import express from "express";
import cors from "cors";
import  cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({limit: "16kb"}));

// used to parse the special characters of url into human readable like "%20" -> " "
app.use(express.urlencoded({extended: true, limit:"16kb"}));

// tells express that pthe public folder is for storing static assets.
app.use(express.static("public"))

// used to read cookies from browser
app.use(cookieParser())

export default app;