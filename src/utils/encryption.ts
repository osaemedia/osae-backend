import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
const IV_LENGTH = 16;

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher(ALGORITHM, KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

export const decrypt = (encryptedText: string): string => {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipher(ALGORITHM, KEY);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};