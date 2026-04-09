import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: notifications });
  } catch (error: any) {
    logger.error(`List notifications error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to list notifications' });
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    logger.error(`Mark read error: ${error.message}`);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to mark notification' });
  }
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    logger.error(`Mark all read error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to mark notifications' });
  }
}
