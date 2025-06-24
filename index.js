import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/AuthRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import contactRoutes from './routes/ContactRoutes.js';
import channelRoutes from './routes/ChannelRoutes.js';
import setUpSocket from './socket.js';
import messageRoutes from './routes/MessagesRoutes.js'; 
dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 4444;
const DATABASE_URL = process.env.MONGODB_URL;
const ORIGIN = process.env.ORIGIN;

if (!DATABASE_URL) {
    console.error('Error: MONGODB_URL is not defined in your .env file.');
    process.exit(1);
}
if (!ORIGIN) {
    console.log('Warning: ORIGIN is not defined in your .env file. CORS might be too restrictive or too permissive.');
}

app.use(cors({
    origin: [ORIGIN],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/uploads/files", express.static(path.join(__dirname, 'uploads', 'files')));
app.use(cookieParser());
app.use(express.json()); // Middleware to parse JSON request bodies

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/channel", channelRoutes);


// Connect to MongoDB and then start the server
mongoose.connect(DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to MongoDB');
        // Start the HTTP server only after successful DB connection
        const server = app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

        // Set up Socket.IO with the created HTTP server
        setUpSocket(server);
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1); // Exit process if DB connection fails
    });