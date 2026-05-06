import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../server';
import { generateToken } from '../config/jwt';

export const registerUser = async (email: string, phone: string, password: string, username: string) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newUser = await tx.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        username,
      },
    });

    // Create wallet for the user
    await tx.wallet.create({
      data: {
        userId: newUser.id,
        balance: 0,
        currency: 'USD',
      },
    });

    return newUser;
  });

  const token = generateToken({ id: user.id, email: user.email });
  return { user, token };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error('Invalid password');
  const token = generateToken({ id: user.id, email: user.email });
  return { user, token };
};