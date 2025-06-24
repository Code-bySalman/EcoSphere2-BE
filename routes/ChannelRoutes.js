import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddlewares.js";
import { createChannel, getUserChannel, getChannelMessages } from "../controllers/ChannelController.js";

const channelRoutes = Router();

channelRoutes.post("/create-group", verifyToken, createChannel);

channelRoutes.get("/create-user-group", verifyToken, getUserChannel);
channelRoutes.get("/:channelId/messages", verifyToken, getChannelMessages);


export default channelRoutes;