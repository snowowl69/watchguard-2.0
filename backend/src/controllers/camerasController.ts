import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function listCameras(_req: Request, res: Response): Promise<void> {
  try {
    const cameras = await prisma.camera.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: cameras });
  } catch (error: any) {
    logger.error(`List cameras error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to list cameras' });
  }
}

export async function createCamera(req: Request, res: Response): Promise<void> {
  try {
    const camera = await prisma.camera.create({
      data: req.body,
    });

    logger.info(`Camera created: ${camera.name}`);
    res.status(201).json({ success: true, message: 'Camera created', data: camera });
  } catch (error: any) {
    logger.error(`Create camera error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to create camera' });
  }
}

export async function updateCamera(req: Request, res: Response): Promise<void> {
  try {
    const camera = await prisma.camera.update({
      where: { id: req.params.id },
      data: req.body,
    });

    logger.info(`Camera ${req.params.id} updated`);
    res.json({ success: true, message: 'Camera updated', data: camera });
  } catch (error: any) {
    logger.error(`Update camera error: ${error.message}`);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Camera not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to update camera' });
  }
}
