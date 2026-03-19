import { z } from 'zod';
import { CHAT_MAX_MESSAGE_LENGTH } from '../constants';

export const messageSchema = z.object({
  content: z.string().trim().min(1, 'Le message ne peut pas être vide').max(CHAT_MAX_MESSAGE_LENGTH, `Le message ne peut pas dépasser ${CHAT_MAX_MESSAGE_LENGTH} caractères`),
  imageUrls: z.array(z.string().url()).max(4, 'Maximum 4 images par message').optional(),
});

export type MessageInput = z.infer<typeof messageSchema>;
