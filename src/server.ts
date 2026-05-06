import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import messageRoutes from './routes/message';
import postRoutes from './routes/post';
import followRoutes from './routes/follow';
import storyRoutes from './routes/story';
import notificationRoutes from './routes/notification';
import liveRoutes from './routes/live';
import walletRoutes from './routes/wallet';
import { setupSocket } from './sockets/socket';
import { rateLimitMiddleware } from './middleware/rateLimit';
import dotenv from 'dotenv';

dotenv.config();

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

export const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(rateLimitMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/wallet', walletRoutes);

// Socket setup
setupSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});