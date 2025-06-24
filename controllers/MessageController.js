import Message from "../models/MessageModel.js";
import {mkdirSync, renameSync} from "fs"
export const getMessages = async (request, response, next) => {
    try {
        const user1 = request.userId;
        const user2 = request.body.id;

        if (!user1 || !user2) {
            return response.status(400).send("Both user IDs are required to fetch messages.");
        }
       
        const messages = await Message.find({
            $or:[
                { sender: user1, recipient: user2 },
                { sender: user2, recipient: user1 }
            ]
        })
        .sort({ timestamp: 1 })
        .populate("sender", "_id name email image")
        .populate("recipient", "_id name email image")
        .lean();

        return response.status(200).json({ messages });

    } catch (error) {
        console.error("Error in getMessages controller:", error);
        return response.status(500).json({ message: "Internal server error while fetching messages." });
    }
};

export const uploadFile = async (request, response, next) => {
    try {
        if (!request.file) {
            return response.status(400).json({ message: "File is required." });
        }

        const filePathForFrontend = `/uploads/files/${request.file.filename}`;

        return response.status(200).json({ filePath: filePathForFrontend });

    } catch (error) {
        console.error("Error in uploadFile controller:", error);
        return response.status(500).json({ message: "Internal server error while uploading file." });
    }
};