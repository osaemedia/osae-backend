export const sanitizeText = (text: string) => {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
};