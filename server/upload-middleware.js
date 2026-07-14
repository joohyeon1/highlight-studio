const multer = require("multer");
const path = require("node:path");

function createUploadMiddleware({
  uploadDir,
  maxPhotos,
  makeId
}) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `${makeId("photo")}${ext}`);
    }
  });

  return multer({
    storage,
    limits: {
      files: maxPhotos,
      fileSize: 30 * 1024 * 1024
    },
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|png|webp)$/i.test(file.mimetype || "")) return cb(null, true);
      cb(new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다."));
    }
  });
}

module.exports = {
  createUploadMiddleware
};
