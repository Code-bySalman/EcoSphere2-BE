import { compare } from "bcrypt";
import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const maxAge = 3 * 24 * 60 * 60 * 1000;

const createToken = (email, userId) => {
    return jwt.sign({ email, userId }, process.env.JWT_SECRET, { expiresIn: '3d' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const signup = async (req, res) => {
  try {
    const password = req.body.password;
    const rawEmail = req.body.email;
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email already exists." });
    }

    const user = await User.create({ email, password });

    const token = createToken(email, user.id);

    res.cookie("jwt", token, {
      maxAge: maxAge,
      secure: true,
      sameSite: "None",
      httpOnly: true
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup
      },
      token
    });
  } catch (error) {
    console.error("Error in signup:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered." });
    }
    res.status(500).json({ message: "Internal server error during signup." });
  }
};

export const login = async (request, response, next) => {
    try {
        const { email, password } = request.body;
        if (!email || !password) {
            return response.status(400).json({ message: "Email and password are required" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return response.status(404).json({ message: "Invalid email or password" });
        }
        const auth = await compare(password, user.password);
        if (!auth) {
            return response.status(401).json({ message: "Invalid email or password" });
        }

        const token = createToken(email, user.id);

        response.cookie("jwt", token, {
            maxAge: maxAge,
            secure: true,
            sameSite: "None"
        });
        return response.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                profileSetup: user.profileSetup,
                image: user.image,
                name: user.name,
                color: user.color
            },
            token: token
        });
    } catch (error) {
        console.error("Error in login:", error);
        response.status(500).json({ message: "Internal server error during login." });
    }
}

export const getUserInfo = async (request, response, next) => {
    try {
        const userData = await User.findById(request.userId);
        if (!userData) {
            return response.status(404).json({ message: "User by the given id not found" });
        }

        return response.status(200).json({
            id: userData.id,
            email: userData.email,
            profileSetup: userData.profileSetup,
            image: userData.image,
            name: userData.name,
            color: userData.color
        });
    } catch (error) {
        console.error("Error in getUserInfo:", error);
        response.status(500).json({ message: "Internal server error while fetching user info." });
    }
}

export const setupProfile = async (request, response, next) => {
    try {
        const { userId } = request;
        const { name, color } = request.body;

        if (!name) {
            return response.status(400).json({ message: "Username is required for profile setup." });
        }

        const userData = await User.findByIdAndUpdate(
            userId,
            { name, color, profileSetup: true },
            { new: true, runValidators: true }
        );

        if (!userData) {
            return response.status(404).json({ message: "User not found for profile setup." });
        }

        return response.status(200).json({
            id: userData.id,
            email: userData.email,
            profileSetup: userData.profileSetup,
            image: userData.image,
            name: userData.name,
            color: userData.color
        });
    } catch (error) {
        console.error("Error in setupProfile:", error);
        response.status(500).json({ message: "Internal server error during profile setup." });
    }
}

export const updateProfile = async (request, response, next) => {
    try {
        const { userId } = request;
        const { name, color } = request.body;

        const fieldsToUpdate = {};
        if (name !== undefined && name !== null) fieldsToUpdate.name = name;
        if (color !== undefined && color !== null) fieldsToUpdate.color = color;

        if (Object.keys(fieldsToUpdate).length === 0) {
            return response.status(400).json({ message: "No fields provided for profile update." });
        }

        const userData = await User.findByIdAndUpdate(
            userId,
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
        );

        if (!userData) {
            return response.status(404).json({ message: "User not found for profile update." });
        }

        return response.status(200).json({
            id: userData.id,
            email: userData.email,
            profileSetup: userData.profileSetup,
            image: userData.image,
            name: userData.name,
            color: userData.color,
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        response.status(500).json({ message: "Internal server error during profile update." });
    }
};

export const uploadImage = async (req, res) => {
    try {
        const { userId } = req;

        if (!req.file) {
            return res.status(400).json({ message: "No image file provided or file type not allowed." });
        }

        const imageUrl = `/uploads${req.file.filename}`;

        const currentUser = await User.findById(userId);

        if (currentUser && currentUser.image) {
            const oldImagePath = path.join(__dirname, '..', currentUser.image);

            try {
                await fs.access(oldImagePath);
                await fs.unlink(oldImagePath);
                console.log(`Deleted old image: ${oldImagePath}`);
            } catch (fileError) {
                console.warn(`Failed to delete old image file ${oldImagePath}: ${fileError.message}`);
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { image: imageUrl, profileSetup: true },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }

        return res.status(200).json({
            id: updatedUser.id,
            email: updatedUser.email,
            profileSetup: updatedUser.profileSetup,
            image: updatedUser.image,
            name: updatedUser.name,
            color: updatedUser.color,
        });

    } catch (error) {
        console.error("Error uploading image:", error);
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: `Image size limit exceeded. Max 2MB allowed.` });
        }
        if (error.message.includes('Only JPEG, PNG, GIF, and WEBP image files are allowed!')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Internal server error during image upload." });
    }
};

export const deleteImage = async (req, res) => {
    try {
        const { userId } = req;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const oldImageUrl = user.image;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { image: null } },
            { new: true }
        );

        if (oldImageUrl) {
            const oldImagePath = path.join(__dirname, '..', oldImageUrl);

            try {
                await fs.access(oldImagePath);
                await fs.unlink(oldImagePath);
                console.log(`Successfully deleted image file: ${oldImagePath}`);
            } catch (fileError) {
                console.warn(`Could not delete physical image file ${oldImagePath}: ${fileError.message}`);
            }
        }

        return res.status(200).json({
            id: updatedUser.id,
            email: updatedUser.email,
            profileSetup: updatedUser.profileSetup,
            image: updatedUser.image,
            name: updatedUser.name,
            color: updatedUser.color,
        });

    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ message: "Internal server error during image deletion." });
    }
};

export const logOutProfile = async (request, response, next) => {
    try {
        response.cookie("jwt", "", { maxAge: 1, secure: true, sameSite: "None" });
        response.status(200).send("Successfully Logged Out!")
    } catch (error) {
        console.error({ error });
        response.status(500).json({ message: "Internal server error." });
    }
}