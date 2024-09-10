import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      // console.log(file);
      const fileExtension = file.originalname.slice((file.originalname.lastIndexOf(".") - 1 >>> 0) + 2);
      cb(null, file.fieldname + '-' + uniqueSuffix + "." + fileExtension);
    }
  })
  
export const upload = multer({ storage })