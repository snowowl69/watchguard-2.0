import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const department = req.query.department as string;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = { isDeleted: false };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role as any;
    if (department) where.department = department;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          employeeId: true,
          email: true,
          role: true,
          department: true,
          faceImagePath: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`List users error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to list users' });
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, isDeleted: false },
      select: {
        id: true,
        name: true,
        employeeId: true,
        email: true,
        role: true,
        department: true,
        faceImagePath: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    logger.error(`Get user error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Only admins can update other users, users can update themselves
    if (req.user!.role !== 'ADMIN' && req.user!.userId !== id) {
      res.status(403).json({ success: false, message: 'Not authorized to update this user' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: req.body,
      select: {
        id: true,
        name: true,
        employeeId: true,
        email: true,
        role: true,
        department: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info(`User ${id} updated`);
    res.json({ success: true, message: 'User updated', data: user });
  } catch (error: any) {
    logger.error(`Update user error: ${error.message}`);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isDeleted: true },
    });

    logger.info(`User ${req.params.id} soft-deleted`);
    res.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    logger.error(`Delete user error: ${error.message}`);
    if (error.code === 'P2025') {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
}
