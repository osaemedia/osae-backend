import { Request, Response } from 'express';
import { prisma } from '../server';
import { authenticate } from '../middleware/auth';

export const followUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = (req as any).user.id;

    if (userId === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const follow = await prisma.follow.create({
      data: { followerId, followingId: userId },
    });

    res.status(201).json(follow);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Already following' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = (req as any).user.id;

    await prisma.follow.deleteMany({
      where: { followerId, followingId: userId },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const [followers, following, posts] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.post.count({ where: { userId } }),
    ]);

    res.json({ followers, following, posts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};