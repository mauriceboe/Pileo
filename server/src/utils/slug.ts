import { like } from 'drizzle-orm';
import { db } from '../config/database.js';
import { projects } from '../db/schema/index.js';

const SLUG_MAX_LENGTH = 100;

function toBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = toBaseSlug(name);

  if (!base) {
    // Fallback for names that produce empty slugs (e.g., all special characters)
    return generateUniqueSlug('project');
  }

  const existing = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(like(projects.slug, `${base}%`));

  const slugSet = new Set(existing.map((row) => row.slug));

  if (!slugSet.has(base)) {
    return base;
  }

  let counter = 2;
  while (slugSet.has(`${base}-${counter}`)) {
    counter++;
  }

  return `${base}-${counter}`;
}
