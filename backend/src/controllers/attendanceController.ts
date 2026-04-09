import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { formatAttendanceCSV } from '../utils/csv';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function listLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { userId, status, cameraId, startDate, endDate, search } = req.query;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceLogWhereInput = {};

    if (userId) where.userId = userId as string;
    if (status) where.status = status as any;
    if (cameraId) where.cameraId = cameraId as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { employeeId: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, employeeId: true, department: true, faceImagePath: true },
          },
          camera: {
            select: { name: true, location: true },
          },
        },
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`List attendance error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to list attendance logs' });
  }
}

export async function getStats(_req: Request, res: Response): Promise<void> {
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

    // Calculate peak hour
    const todayLogs = await prisma.attendanceLog.findMany({
      where: { createdAt: { gte: today } },
      select: { entryTime: true },
    });

    const hourMap: Record<number, number> = {};
    todayLogs.forEach(log => {
      const hour = new Date(log.entryTime).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });

    let peakHour = 9;
    let maxCount = 0;
    for (const [hour, count] of Object.entries(hourMap)) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hour);
      }
    }

    res.json({
      success: true,
      data: {
        presentToday: uniqueUsers.length,
        totalToday,
        authorized,
        denied,
        peakHour: `${peakHour.toString().padStart(2, '0')}:00`,
      },
    });
  } catch (error: any) {
    logger.error(`Get stats error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
}

export async function exportCSV(req: Request, res: Response): Promise<void> {
  try {
    const { userId, status, startDate, endDate } = req.query;
    const where: Prisma.AttendanceLogWhereInput = {};

    if (userId) where.userId = userId as string;
    if (status) where.status = status as any;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const logs = await prisma.attendanceLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, employeeId: true, department: true },
        },
      },
    });

    const csv = formatAttendanceCSV(logs as any);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    logger.error(`Export CSV error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
}

export async function getUserHistory(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          camera: { select: { name: true, location: true } },
        },
      }),
      prisma.attendanceLog.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error: any) {
    logger.error(`Get user history error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get user history' });
  }
}
