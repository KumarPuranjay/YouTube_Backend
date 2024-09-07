import dotenv  from "dotenv";
import connectDb from './db/connect.js';
import app from './app.js';

dotenv.config({
    path: "../.env"
});

connectDb()
    .then(() => {
        const port = process.env.PORT || 8000

        // error in express app creation
        app.on("error", (error) => {
            console.log(error);
            throw error;
        })

        // app.use() is used for middleware

        app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);
        })
    });
