import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { addProjectMemberByEmailSchema, updateProjectMemberSchema } from '@pileo/shared';
import type { AddProjectMemberByEmailInput, UpdateProjectMemberInput } from '@pileo/shared';
import * as memberService from '../services/member.service.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const members = await memberService.listMembers(req.params.projectId!, (req as AuthenticatedRequest).user.id);
  res.status(200).json({ data: members });
});

router.post('/', validate(addProjectMemberByEmailSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: AddProjectMemberByEmailInput }).validatedBody;
  const member = await memberService.addMember(
    req.params.projectId!,
    (req as AuthenticatedRequest).user.id,
    body.email,
    body.role,
  );
  res.status(201).json({ data: member });
});

router.patch('/:userId', validate(updateProjectMemberSchema), async (req: Request, res: Response): Promise<void> => {
  const body = (req as Request & { validatedBody: UpdateProjectMemberInput }).validatedBody;
  const member = await memberService.updateMemberRole(
    req.params.projectId!,
    (req as AuthenticatedRequest).user.id,
    req.params.userId!,
    body.role,
  );
  res.status(200).json({ data: member });
});

router.delete('/:userId', async (req: Request, res: Response): Promise<void> => {
  await memberService.removeMember(
    req.params.projectId!,
    (req as AuthenticatedRequest).user.id,
    req.params.userId!,
  );
  res.status(204).send();
});

export { router as memberRoutes };
