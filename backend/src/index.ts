import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

import { logger } from './utils/logger';
import { initSocketService } from './services/socketService';
import authRoutes from './routes/auth';
import faceRoutes from './routes/face';
import userRoutes from './routes/users';
import attendanceRoutes from './routes/attendance';
import approvalRoutes from './routes/approvals';
import cameraRoutes from './routes/cameras';
import notificationRoutes from './routes/notifications';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// ─── Socket.IO ────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

// Make io and prisma available to routes
app.set('io', io);
app.set('prisma', prisma);

// ─── Global Middleware ────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Rate Limiting ────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Watch Guard API is running', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Socket.IO Setup ────────────────────────────────────
initSocketService(io, prisma);

// ─── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Watch Guard Backend running on port ${PORT}`);
  logger.info(`📡 Socket.IO listening for connections`);
  logger.info(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

export { app, io, prisma };
