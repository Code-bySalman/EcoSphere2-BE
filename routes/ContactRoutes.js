import { Router } from "express"
import { verifyToken } from '../middlewares/AuthMiddlewares.js';
import { getAllContacts, getContactsToDm, searchContacts } from "../controllers/ContactController.js";

const contactRoutes = Router();

contactRoutes.post("/search", verifyToken, searchContacts);

contactRoutes.get("/get-contacts-to-dm", verifyToken, getContactsToDm);

contactRoutes.get("/create-channel", verifyToken, getAllContacts);

export default contactRoutes