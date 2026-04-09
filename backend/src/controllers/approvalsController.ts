import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import path from 'path';
import { extractEmbedding, syncEmbedding } from '../services/aiService';
import { emitNewNotification } from '../services/socketService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function listPending(_req: Request, res: Response): Promise<void> {
  try {
    const requests = await prisma.faceRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, data: requests });
  } catch (error: any) {
    logger.error(`List approvals error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to list approvals' });
  }
}

export async function approve(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const faceRequest = await prisma.faceRequest.findUnique({ where: { id } });
    if (!faceRequest || faceRequest.status !== 'PENDING') {
      res.status(404).json({ success: false, message: 'Pending request not found' });
      return;
    }

    // Extract face embedding from the uploaded image
    const imagePath = path.join(__dirname, '..', '..', faceRequest.imagePath);
    const embeddingResult = await extractEmbedding(imagePath);

    let faceEmbedding: number[] | null = null;
    if (embeddingResult.success && embeddingResult.embedding) {
      faceEmbedding = embeddingResult.embedding;
    }

    // Check if user with same employeeId already exists
    const existingUser = await prisma.user.findUnique({
      where: { employeeId: faceRequest.employeeId },
    });

    const passwordHash = await bcrypt.hash('password123', 12);

    let user;
    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          faceEmbedding: faceEmbedding as any,
          faceImagePath: faceRequest.imagePath,
          status: 'ACTIVE',
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          name: faceRequest.name,
          employeeId: faceRequest.employeeId,
          email: `${faceRequest.employeeId.toLowerCase()}@watchguard.app`,
          passwordHash,
          role: faceRequest.role,
          department: faceRequest.department,
          faceEmbedding: faceEmbedding as any,
          faceImagePath: faceRequest.imagePath,
          status: 'ACTIVE',
        },
      });
    }

    // Sync embedding to AI service
    if (faceEmbedding) {
      await syncEmbedding(user.id, faceEmbedding, user.name);
    }

    // Update face request
    await prisma.faceRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        message: `Face registration approved for ${faceRequest.name}`,
        type: 'INFO',
        userId: req.user!.userId,
      },
    });

    emitNewNotification(req.user!.userId, {
      message: `Face registration approved for ${faceRequest.name}`,
      type: 'INFO',
    });

    logger.info(`Face request ${id} approved by ${req.user!.userId}`);

    res.json({
      success: true,
      message: 'Request approved and user created',
      data: {
        userId: user.id,
        name: user.name,
        hasEmbedding: !!faceEmbedding,
      },
    });
  } catch (error: any) {
    logger.error(`Approve request error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to approve request' });
  }
}

export async function reject(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const faceRequest = await prisma.faceRequest.findUnique({ where: { id } });
    if (!faceRequest || faceRequest.status !== 'PENDING') {
      res.status(404).json({ success: false, message: 'Pending request not found' });
      return;
    }

    await prisma.faceRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
      },
    });

    logger.info(`Face request ${id} rejected by ${req.user!.userId}`);

    res.json({ success: true, message: 'Request rejected' });
  } catch (error: any) {
    logger.error(`Reject request error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
}
