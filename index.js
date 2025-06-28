import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/AuthRoutes.js';
import contactRoutes from './routes/ContactRoutes.js';
import channelRoutes from './routes/ChannelRoutes.js';
import messageRoutes from './routes/MessagesRoutes.js';
import setUpSocket from './socket.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || 4444;
const DATABASE_URL = process.env.MONGODB_URL;


const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

app.use(
  cors({
    origin: (origin, cb) => {
     
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/files', express.static(path.join(__dirname, 'uploads', 'files')));

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/channel', channelRoutes);

if (!DATABASE_URL) {
  console.error('MONGODB_URL not provided.');
  process.exit(1);
}

mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    const server = app.listen(port, () =>
      console.log(`Server listening on port ${port}`)
    );
    setUpSocket(server);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

export default app;  