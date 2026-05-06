import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { sanitizeText } from '../utils/sanitize';

const storySchema = z.object({
  mediaUrl: z.string().url(),
});

export const createStory = async (req: Request, res: Response) => {
  try {
    const parseResult = storySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { mediaUrl } = parseResult.data;
    const userId = (req as any).user.id;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        userId,
        mediaUrl: sanitizeText(mediaUrl),
        expiresAt,
      },
    });

    res.status(201).json(story);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f: any) => f.followingId);

    const stories = await prisma.story.findMany({
      where: {
        userId: { in: [...followingIds, userId] },
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(stories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};