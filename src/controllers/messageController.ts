import { Request, Response } from 'express';
import { prisma } from '../server';
import multer from 'multer';
import path from 'path';
import { compressFile, shouldCompress } from '../utils/compression';
import { encrypt } from '../utils/encryption';
import { sanitizeText } from '../utils/sanitize';
import { z } from 'zod';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const sendMessageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().max(2000).optional(),
  isViewOnce: z.boolean().optional(),
});

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { receiverId, content, isViewOnce } = parseResult.data;
    let fileUrl = null;

    if (req.file) {
      const filePath = req.file.path;
      const fileSize = req.file.size;

      if (shouldCompress(fileSize)) {
        const compressedPath = `${filePath}.zip`;
        await compressFile(filePath, compressedPath);
        fileUrl = compressedPath;
      } else {
        fileUrl = filePath;
      }
    }

    const encryptedContent = content ? encrypt(sanitizeText(content)) : null;

    const message = await prisma.message.create({
      data: {
        senderId: (req as any).user.id,
        receiverId: sanitizeText(receiverId),
        content: encryptedContent,
        fileUrl,
        isViewOnce: isViewOnce || false,
      },
    });

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { receiverId, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: (req as any).user.id, receiverId: receiverId as string },
          { senderId: receiverId as string, receiverId: (req as any).user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
      include: {
        sender: { select: { username: true, avatar: true } },
        receiver: { select: { username: true, avatar: true } },
      },
    });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    await prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const uploadMiddleware = upload.single('file');