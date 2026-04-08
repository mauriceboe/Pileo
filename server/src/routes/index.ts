import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';
import { projectRoutes } from './project.routes.js';
import { memberRoutes } from './member.routes.js';
import { projectBoardRouter, boardRouter } from './board.routes.js';
import { boardColumnRouter, columnRouter } from './column.routes.js';
import { boardTaskRouter, columnTaskRouter, taskRouter } from './task.routes.js';
import { taskActivityRouter, projectActivityRouter } from './activity.routes.js';
import { taskCommentRouter, commentRouter } from './comment.routes.js';
import { taskChecklistRouter, checklistRouter } from './checklist.routes.js';
import { taskLinkRouter, linkRouter } from './link.routes.js';
import { taskAttachmentRouter, attachmentRouter } from './attachment.routes.js';
import { notificationRouter } from './notification.routes.js';
import { projectLabelRouter, labelRouter } from './label.routes.js';
import { adminRoutes } from './admin.routes.js';
import { shareRouter } from './share.routes.js';
import { projectCustomFieldRouter, customFieldRouter, taskCustomValueRouter } from './custom-field.routes.js';


export function registerRoutes(): Router {
  const router = Router();

  router.use('/auth', authRoutes);
  router.use('/users', userRoutes);
  router.use('/projects', projectRoutes);
  router.use('/projects/:projectId/members', memberRoutes);
  router.use('/projects/:projectId/boards', projectBoardRouter);
  router.use('/projects/:projectId/activity', projectActivityRouter);
  router.use('/projects/:projectId/labels', projectLabelRouter);
  router.use('/labels', labelRouter);
  router.use('/projects/:projectId/custom-fields', projectCustomFieldRouter);
  router.use('/custom-fields', customFieldRouter);
  router.use('/tasks/:taskId/custom-values', taskCustomValueRouter);
  router.use('/boards', boardRouter);
  router.use('/boards/:boardId/columns', boardColumnRouter);
  router.use('/boards/:boardId/tasks', boardTaskRouter);
  router.use('/columns', columnRouter);
  router.use('/columns/:columnId/tasks', columnTaskRouter);
  router.use('/tasks', taskRouter);
  router.use('/tasks/:taskId/activity', taskActivityRouter);
  router.use('/tasks/:taskId/comments', taskCommentRouter);
  router.use('/tasks/:taskId/checklist', taskChecklistRouter);
  router.use('/tasks/:taskId/attachments', taskAttachmentRouter);
  router.use('/comments', commentRouter);
  router.use('/tasks/:taskId/links', taskLinkRouter);
  router.use('/checklist', checklistRouter);
  router.use('/links', linkRouter);
  router.use('/attachments', attachmentRouter);
  router.use('/notifications', notificationRouter);
  router.use('/admin', adminRoutes);
  router.use('/', shareRouter);

  return router;
}
