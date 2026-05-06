import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { sanitizeText } from '../utils/sanitize';

const liveStreamSchema = z.object({
  title: z.string().min(3).max(200),
  category: z.string().max(100).optional(),
  visibility: z.enum(['public', 'friends', 'private']).optional(),
});

export const startLiveStream = async (req: Request, res: Response) => {
  try {
    const parseResult = liveStreamSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { title, category, visibility } = parseResult.data;
    const userId = (req as any).user.id;

    const activeStream = await prisma.liveStream.findFirst({
      where: { userId, isLive: true },
    });

    if (activeStream) {
      return res.status(400).json({ error: 'Already streaming' });
    }

    const stream = await prisma.liveStream.create({
      data: {
        userId,
        title: sanitizeText(title),
        category: category ? sanitizeText(category) : undefined,
        visibility: visibility || 'public',
        isLive: true,
      },
    });

    res.status(201).json(stream);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const endLiveStream = async (req: Request, res: Response) => {
  try {
    const { streamId } = req.params;
    const userId = (req as any).user.id;

    const stream = await prisma.liveStream.findFirst({
      where: { id: streamId, userId },
    });

    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getLiveStreams = async (req: Request, res: Response) => {
  try {
    const streams = await prisma.liveStream.findMany({
      where: { isLive: true },
      include: {
        user: { select: { username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(streams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};