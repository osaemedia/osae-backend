import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../server';
import { sanitizeText } from '../utils/sanitize';

const setPinSchema = z.object({
  pin: z.string().min(4).max(10),
});

const transferSchema = z.object({
  recipientUsername: z.string().min(1),
  amount: z.number().int().positive(),
  pin: z.string().min(4).max(10),
});

const depositSchema = z.object({
  amount: z.number().int().positive(),
});

const withdrawSchema = z.object({
  amount: z.number().int().positive(),
});

export const getBalance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      balance: wallet.balance,
      currency: wallet.currency,
      balanceDisplay: `${wallet.currency} ${(wallet.balance / 100).toFixed(2)}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const setPin = async (req: Request, res: Response) => {
  try {
    const parseResult = setPinSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { pin } = parseResult.data;
    const userId = (req as any).user.id;

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.walletPin.upsert({
      where: { userId },
      update: { pinHash: hashedPin },
      create: { userId, pinHash: hashedPin },
    });

    res.json({ success: true, message: 'PIN set successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const transfer = async (req: Request, res: Response) => {
  try {
    const parseResult = transferSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { recipientUsername, amount, pin } = parseResult.data;
    const senderId = (req as any).user.id;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Get sender's wallet and verify PIN
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return res.status(404).json({ error: 'Your wallet not found' });
    }

    const senderPin = await prisma.walletPin.findUnique({
      where: { userId: senderId },
    });

    if (!senderPin) {
      return res.status(400).json({ error: 'You must set a PIN before transferring' });
    }

    const isPinValid = await bcrypt.compare(pin, senderPin.pinHash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Get recipient
    const recipient = await prisma.user.findUnique({
      where: { username: sanitizeText(recipientUsername) },
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (recipient.id === senderId) {
      return res.status(400).json({ error: 'Cannot send money to yourself' });
    }

    // Check if recipient has wallet
    const recipientWallet = await prisma.wallet.findUnique({
      where: { userId: recipient.id },
    });

    if (!recipientWallet) {
      return res.status(400).json({ error: 'Recipient wallet not found' });
    }

    if (senderWallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Perform transfer in transaction
    const transaction = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deduct from sender
      await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: { decrement: amount } },
      });

      // Add to recipient
      await tx.wallet.update({
        where: { userId: recipient.id },
        data: { balance: { increment: amount } },
      });

      // Create transaction record
      const txRecord = await tx.transaction.create({
        data: {
          senderId,
          receiverId: recipient.id,
          amount,
          currency: 'USD',
          status: 'completed',
          type: 'send',
          reference: `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      return txRecord;
    });

    res.json({
      success: true,
      message: `Transferred $${(amount / 100).toFixed(2)} to ${recipient.username}`,
      transaction,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 10), 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { username: true, avatar: true } },
        receiver: { select: { username: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.transaction.count({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    res.json({
      transactions: transactions.map((t) => ({
        ...t,
        amountDisplay: `$${(t.amount / 100).toFixed(2)}`,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deposit = async (req: Request, res: Response) => {
  try {
    const parseResult = depositSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { amount } = parseResult.data;
    const userId = (req as any).user.id;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Simulate deposit: add to wallet and create transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          senderId: userId,
          receiverId: userId,
          amount,
          currency: 'USD',
          status: 'completed',
          type: 'deposit',
          reference: `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    });

    res.json({
      success: true,
      message: `Deposited $${(amount / 100).toFixed(2)}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const withdraw = async (req: Request, res: Response) => {
  try {
    const parseResult = withdrawSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { amount } = parseResult.data;
    const userId = (req as any).user.id;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Simulate withdrawal: deduct from wallet and create transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          senderId: userId,
          receiverId: userId,
          amount,
          currency: 'USD',
          status: 'completed',
          type: 'withdraw',
          reference: `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    });

    res.json({
      success: true,
      message: `Withdrawal of $${(amount / 100).toFixed(2)} requested`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};