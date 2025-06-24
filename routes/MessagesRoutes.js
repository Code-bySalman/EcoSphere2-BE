import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddlewares.js";
import { getMessages, uploadFile } from "../controllers/MessageController.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const messageRoute = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'files'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

messageRoute.post("/get-messages", verifyToken, getMessages);
messageRoute.post("/upload-file", verifyToken, upload.single("file"), uploadFile);

export default messageRoute;