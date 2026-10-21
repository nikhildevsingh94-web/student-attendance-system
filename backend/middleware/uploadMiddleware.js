import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Ensure uploads directory exists synchronously
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Storage configuration with sanitized unique filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Sanitize extension
    const ext = path.extname(file.originalname).toLowerCase();
    // Unique safe filename
    const safeName = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, safeName);
  }
});

// Allowed file types: PDF, JPG, JPEG, PNG
const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/pjpeg'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'));
  }
};

export const uploadAssignmentFile = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB file size limit
  },
  fileFilter
});
