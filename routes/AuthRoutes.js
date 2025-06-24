import { Router } from 'express';
import { deleteImage, getUserInfo, login, logOutProfile, setupProfile, signup, updateProfile, uploadImage } from '../controllers/AuhController.js';
import { verifyToken } from '../middlewares/AuthMiddlewares.js';
import multer from 'multer';
import path from 'path';

import { fileURLToPath } from 'url';

const authRoutes = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'profiles'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const userId = req.userId || 'unknown-user';
        cb(null, `${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WEBP image files are allowed!'), false);
        }
    }
});

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.get("/user-info", verifyToken, getUserInfo);
authRoutes.post("/setup-profile", verifyToken, setupProfile);
authRoutes.post("/update-profile", verifyToken, updateProfile);
authRoutes.post("/upload-image", verifyToken, upload.single("profileImage"), uploadImage);
authRoutes.delete("/delete-image", verifyToken, deleteImage);
authRoutes.post("/logout", logOutProfile)

export default authRoutes;