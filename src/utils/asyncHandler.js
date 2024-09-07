// this is a template that will be reused in the entire code
// func can be seen as a generic function which will be used in async-await calls.
const asyncHandler = (func) => {
    (req, res, next) => {
        Promise.resolve(func(req, res, next)).catch((err) => next(err))
    }

    // another way to write the above code.
    // async (req, res, next) => {
    //     try {
    //         await func(res, res, next)
    //     } catch(error) {
    //         res.status(error.code || 500).json({
    //             success: false,
    //             message: error.message
    //         });
    //     };
    // };
};

export {asyncHandler};