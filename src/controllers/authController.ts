import { Request, Response } from 'express';
import { z } from 'zod';
import { registerUser, loginUser } from '../services/authService';
import { sanitizeText } from '../utils/sanitize';

const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  username: z.string().min(3),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const register = async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { email, phone, password, username } = parseResult.data;
    const result = await registerUser(email, sanitizeText(phone ?? ''), password, sanitizeText(username));
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { email, password } = parseResult.data;
    const result = await loginUser(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};