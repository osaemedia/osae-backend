import { Request, Response } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: { id: true, email: true, phone: true, username: true, bio: true, avatar: true },
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { username, bio, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: (req as any).user.id },
      data: { username, bio, avatar },
      select: { id: true, email: true, phone: true, username: true, bio: true, avatar: true },
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};