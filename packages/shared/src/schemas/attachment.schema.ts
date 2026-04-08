import { z } from "zod";

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  uploaderId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1),
  fileSize: z.number().int().min(0),
  mimeType: z.string().min(1).max(255),
  createdAt: z.string(),
});
