import { eq, and } from 'drizzle-orm';
import { db } from '../config/database.js';
import { projects, projectMembers } from '../db/schema/index.js';
import { logger } from '../config/logger.js';
import { generateUniqueSlug } from '../utils/slug.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import * as boardService from './board.service.js';
import type { CreateProjectInput, UpdateProjectInput, ProjectMemberRole } from '@pileo/shared';

type ProjectRow = typeof projects.$inferSelect;

async function getMemberRole(projectId: string, userId: string): Promise<ProjectMemberRole | null> {
  const rows = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);

  return (rows[0]?.role as ProjectMemberRole) ?? null;
}

function requireRole(role: ProjectMemberRole | null, allowed: ProjectMemberRole[]): void {
  if (!role || !allowed.includes(role)) {
    throw new ForbiddenError();
  }
}

export async function create(data: CreateProjectInput, userId: string): Promise<ProjectRow> {
  const slug = await generateUniqueSlug(data.name);

  const inserted = await db
    .insert(projects)
    .values({
      name: data.name,
      slug,
      description: data.description ?? null,
      icon: data.icon ?? null,
      ownerId: userId,
    })
    .returning();

  const project = inserted[0]!;

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId,
    role: 'owner',
  });

  await boardService.create(project.id, userId, { name: 'Board' });

  logger.info({ projectId: project.id, userId }, 'Project created');
  return project;
}

export async function list(userId: string): Promise<ProjectRow[]> {
  const rows = await db
    .select({ project: projects })
    .from(projects)
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, userId))
    .orderBy(projects.createdAt);

  return rows.map((row) => row.project);
}

export async function getById(projectId: string, userId: string): Promise<ProjectRow> {
  const role = await getMemberRole(projectId, userId);
  if (!role) {
    throw new NotFoundError('Project', projectId);
  }

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const project = rows[0];
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  return project;
}

export async function update(
  projectId: string,
  userId: string,
  data: UpdateProjectInput,
): Promise<ProjectRow> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin']);

  const updated = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId))
    .returning();

  const project = updated[0];
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  logger.info({ projectId, userId }, 'Project updated');
  return project;
}

export async function remove(projectId: string, userId: string): Promise<void> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner']);

  const deleted = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning({ id: projects.id });

  if (deleted.length === 0) {
    throw new NotFoundError('Project', projectId);
  }

  logger.info({ projectId, userId }, 'Project deleted');
}

export async function archive(projectId: string, userId: string): Promise<ProjectRow> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin']);

  const rows = await db
    .select({ isArchived: projects.isArchived })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const project = rows[0];
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  const updated = await db
    .update(projects)
    .set({ isArchived: !project.isArchived, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId))
    .returning();

  logger.info({ projectId, userId, isArchived: !project.isArchived }, 'Project archive toggled');
  return updated[0]!;
}

export async function updateBackground(
  projectId: string,
  userId: string,
  filePath: string,
): Promise<ProjectRow> {
  const role = await getMemberRole(projectId, userId);
  requireRole(role, ['owner', 'admin']);

  const updated = await db
    .update(projects)
    .set({ backgroundImage: filePath, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId))
    .returning();

  const project = updated[0];
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  logger.info({ projectId, userId }, 'Project background updated');
  return project;
}

// Re-export for use by other services
export { getMemberRole, requireRole };
