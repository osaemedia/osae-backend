import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../server';
import { sanitizeText } from '../utils/sanitize';

const postSchema = z.object({
  content: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string()).optional(),
  privacy: z.enum(['public', 'friends', 'private']).optional(),
  hashtags: z.array(z.string()).optional(),
});

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional(),
});

export const createPost = async (req: Request, res: Response) => {
  try {
    const parseResult = postSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { content, mediaUrls, privacy, hashtags } = parseResult.data;
    const userId = (req as any).user.id;

    const post = await prisma.post.create({
      data: {
        userId,
        content: content ? sanitizeText(content) : undefined,
        mediaUrls: mediaUrls || [],
        privacy: privacy || 'public',
        hashtags: hashtags || [],
      },
      include: {
        user: { select: { username: true, avatar: true } },
        likes: true,
        comments: { include: { user: { select: { username: true } } } },
      },
    });

    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getFeed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 10), 20);
    const lastPostId = (req.query.cursor as string) || (req.query.lastPostId as string) || undefined;

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f: any) => f.followingId);

    const queryOptions: any = {
      where: {
        OR: [
          { userId: { in: followingIds }, privacy: { in: ['public', 'friends'] } },
          { privacy: 'public' },
          { userId: userId },
        ],
      },
      include: {
        user: { select: { username: true, avatar: true } },
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { username: true } } },
          take: 3,
        },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    };

    if (lastPostId) {
      queryOptions.cursor = { id: lastPostId };
      queryOptions.skip = 1;
    }

    const posts = await prisma.post.findMany(queryOptions);
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const likePost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = (req as any).user.id;

    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      return res.json({ liked: false });
    }

    await prisma.like.create({ data: { userId, postId } });
    res.json({ liked: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const commentOnPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const parseResult = commentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { content, parentId } = parseResult.data;
    const userId = (req as any).user.id;

    const comment = await prisma.comment.create({
      data: {
        userId,
        postId,
        content: sanitizeText(content),
        parentId,
      },
      include: {
        user: { select: { username: true, avatar: true } },
        replies: { include: { user: { select: { username: true } } } },
      },
    });

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};