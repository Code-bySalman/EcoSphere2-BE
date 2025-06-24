import mongoose from "mongoose";
import Channel from "../models/Channel.js";
import User from "../models/UserModel.js";
import Message from "../models/MessageModel.js";

export const createChannel = async (request, response, next) => {
    try {
        const { name, members } = request.body;
        const userId = request.userId;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return response.status(400).json({ message: "Channel name is required and must be a non-empty string." });
        }

        if (!members || !Array.isArray(members)) {
            return response.status(400).json({ message: "Members must be an array of user IDs." });
        }

        const admin = await User.findById(userId);
        if (!admin) {
            return response.status(400).send("Admin user not found");
        }

        let validateMembers = [];
        if (members.length > 0) {
            validateMembers = await User.find({ _id: { $in: members } });
        }
        
        if (validateMembers.length !== members.length) {
            return response.status(400).send("Some members are not valid users");
        }

        const newChannel = new Channel({
            name,
            members,
            admin: userId,
        });

        await newChannel.save();

        return response.status(201).json({
            channel: newChannel,
        });
    } catch (error) {
        console.error({ error });
        response.status(500).json({ message: "Internal server error." });
    }
};

export const getUserChannel = async (request, response, next) => {
    try {
        const userId = new mongoose.Types.ObjectId(request.userId);
        const channels = await Channel.find({
            $or: [{ admin: userId }, { members: userId }],
        }).sort({ updatedAt: -1 });

        return response.status(200).json({ channels });
    } catch (error) {
        console.error({ error });
        response.status(500).json({ message: "Internal server error." });
    }
};

export const getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;

    const messages = await Message.find({ channelId })
    .populate('sender', 'name color image')
      .sort({ timeStamp: 1 }); // oldest to newest

    return res.status(200).json({ messages});
  } catch (error) {
    console.error("Error fetching channel messages:", error);
    return res.status(500).json({ message: "Failed to fetch channel messages" });
  }
};