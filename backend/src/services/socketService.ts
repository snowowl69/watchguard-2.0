import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

let ioInstance: SocketServer;

export function initSocketService(io: SocketServer, prisma: PrismaClient): void {
  ioInstance = io;

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join admin room if user has admin role
    socket.on('join:admin', () => {
      socket.join('admin');
      logger.debug(`Socket ${socket.id} joined admin room`);
    });

    // Join user-specific room
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      logger.debug(`Socket ${socket.id} joined user:${userId} room`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Emit attendance stats every 30 seconds
  setInterval(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalToday, authorized, denied] = await Promise.all([
        prisma.attendanceLog.count({ where: { createdAt: { gte: today } } }),
        prisma.attendanceLog.count({ where: { createdAt: { gte: today }, status: 'AUTHORIZED' } }),
        prisma.attendanceLog.count({ where: { createdAt: { gte: today }, status: 'DENIED' } }),
      ]);

      // Unique present users today
      const uniqueUsers = await prisma.attendanceLog.findMany({
        where: { createdAt: { gte: today }, status: 'AUTHORIZED' },
        distinct: ['userId'],
        select: { userId: true },
      });

      // Calculate peak hour from individual logs
      const todayLogs = await prisma.attendanceLog.findMany({
        where: { createdAt: { gte: today } },
        select: { entryTime: true },
      });

      let peakHour = 9;
      const hourMap: Record<number, number> = {};
      todayLogs.forEach((entry) => {
        const hour = new Date(entry.entryTime).getHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      });
      
      let maxCount = 0;
      for (const [hour, count] of Object.entries(hourMap)) {
        if (count > maxCount) {
          maxCount = count;
          peakHour = parseInt(hour);
        }
      }

      io.emit('attendance:update', {
        stats: {
          presentToday: uniqueUsers.length,
          totalToday,
          authorized,
          denied,
          peakHour: `${peakHour.toString().padStart(2, '0')}:00`,
        },
      });
    } catch (error) {
      logger.error('Failed to emit attendance stats:', error);
    }
  }, 30000);

  logger.info('Socket.IO service initialized');
}

export function emitFaceDetected(data: {
  userId: string;
  name: string;
  confidence: number;
  status: string;
  cameraId?: string;
  timestamp: string;
  boundingBox?: { x: number; y: number; w: number; h: number };
}): void {
  if (ioInstance) {
    ioInstance.emit('face:detected', data);
  }
}

export function emitNewNotification(userId: string, data: { message: string; type: string }): void {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('notification:new', data);
    // Also emit to admin room
    ioInstance.to('admin').emit('notification:new', data);
  }
}

export function emitNewApproval(data: { requestId: string; name: string }): void {
  if (ioInstance) {
    ioInstance.to('admin').emit('approval:new', data);
  }
}
