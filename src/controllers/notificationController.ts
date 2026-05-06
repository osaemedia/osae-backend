import { Request, Response } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = (req as any).user.id;

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};