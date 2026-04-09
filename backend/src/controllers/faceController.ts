import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { recognizeFace, recognizeFaceBase64 } from '../services/aiService';
import { emitFaceDetected, emitNewApproval } from '../services/socketService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function recognize(req: Request, res: Response): Promise<void> {
  try {
    let result;

    if (req.file) {
      // Image uploaded as file
      result = await recognizeFace(req.file.path);
    } else if (req.body.image_base64) {
      // Image sent as base64
      result = await recognizeFaceBase64(req.body.image_base64);
    } else {
      res.status(400).json({ success: false, message: 'No image provided. Send file or image_base64.' });
      return;
    }

    // Log the attendance
    if (result.matched && result.userId) {
      const user = await prisma.user.findUnique({ where: { id: result.userId } });
      if (user) {
        const log = await prisma.attendanceLog.create({
          data: {
            userId: user.id,
            confidence: result.confidence || 0,
            status: 'AUTHORIZED',
            cameraId: req.body.cameraId || null,
          },
        });

        // Emit real-time event
        emitFaceDetected({
          userId: user.id,
          name: user.name,
          confidence: result.confidence || 0,
          status: 'AUTHORIZED',
          cameraId: req.body.cameraId,
          timestamp: new Date().toISOString(),
          boundingBox: result.boundingBox,
        });

        logger.info(`Face recognized: ${user.name} (confidence: ${result.confidence})`);

        res.json({
          success: true,
          message: 'Face recognized',
          data: {
            matched: true,
            user: { id: user.id, name: user.name, employeeId: user.employeeId, department: user.department },
            confidence: result.confidence,
            status: 'AUTHORIZED',
            boundingBox: result.boundingBox,
            logId: log.id,
          },
        });
        return;
      }
    }

    // Unknown face or no match — log as denied
    if (req.user) {
      await prisma.attendanceLog.create({
        data: {
          userId: req.user.userId,
          confidence: result.confidence || 0,
          status: 'DENIED',
          cameraId: req.body.cameraId || null,
        },
      });
    }

    emitFaceDetected({
      userId: 'unknown',
      name: 'Unknown',
      confidence: result.confidence || 0,
      status: 'DENIED',
      cameraId: req.body.cameraId,
      timestamp: new Date().toISOString(),
      boundingBox: result.boundingBox,
    });

    res.json({
      success: true,
      message: result.reason || 'Face not recognized',
      data: {
        matched: false,
        confidence: result.confidence || 0,
        reason: result.reason || 'no_match',
        boundingBox: result.boundingBox,
      },
    });
  } catch (error: any) {
    logger.error(`Face recognition error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Face recognition failed' });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Image file is required' });
      return;
    }

    const { name, employeeId, department, role } = req.body;
    if (!name || !employeeId || !department) {
      res.status(400).json({ success: false, message: 'Name, employee ID, and department are required' });
      return;
    }

    // Check for duplicate employeeId in pending requests
    const existing = await prisma.faceRequest.findFirst({
      where: { employeeId, status: 'PENDING' },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'A pending registration already exists for this employee ID' });
      return;
    }

    const faceRequest = await prisma.faceRequest.create({
      data: {
        name,
        employeeId,
        department,
        role: role || 'USER',
        imagePath: `/uploads/${path.basename(req.file.path)}`,
        status: 'PENDING',
      },
    });

    // Emit to admin room
    emitNewApproval({ requestId: faceRequest.id, name: faceRequest.name });

    logger.info(`New face registration request: ${name} (${employeeId})`);

    res.status(201).json({
      success: true,
      message: 'Face registration request submitted',
      data: faceRequest,
    });
  } catch (error: any) {
    logger.error(`Face registration error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
}

export async function getEmbedding(req: Request, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, name: true, faceEmbedding: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        embedding: user.faceEmbedding,
      },
    });
  } catch (error: any) {
    logger.error(`Get embedding error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get embedding' });
  }
}
