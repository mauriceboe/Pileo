import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as projectService from '../../services/project.service.js';
import * as boardService from '../../services/board.service.js';
import * as taskService from '../../services/task.service.js';
import * as commentService from '../../services/comment.service.js';
import * as labelService from '../../services/label.service.js';
import * as linkService from '../../services/link.service.js';
import * as checklistService from '../../services/checklist.service.js';
import * as customFieldService from '../../services/custom-field.service.js';

// Serialise any value to a single MCP text block.
function ok(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

// Strip undefined keys so the legacy services receive only the fields the
// caller actually set. Important for partial-update tools.
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
const FIELD_TYPES = ['dropdown', 'checklist', 'text_small', 'text_large'] as const;

// Register the Pileo MCP tool surface. Each tool is a thin wrapper over an
// existing service function — no new business logic lives here. New tools
// go in alphabetically by domain (project → board → column → task → …).
export function registerTools(server: McpServer, userId: string): void {
  // ---------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------
  server.tool(
    'list_projects',
    'List all projects the authenticated user owns or is a member of.',
    {},
    async () => ok(await projectService.list(userId)),
  );

  server.tool(
    'create_project',
    'Create a new project owned by the authenticated user.',
    {
      name: z.string().min(1).max(100),
      description: z.string().max(1000).optional(),
      icon: z.string().max(50).optional(),
    },
    async ({ name, description, icon }) => {
      const project = await projectService.create(
        compact({ name, description, icon }) as never,
        userId,
      );
      return ok(project);
    },
  );

  // ---------------------------------------------------------------------
  // Boards
  // ---------------------------------------------------------------------
  server.tool(
    'list_boards',
    'List boards in a project (in display order).',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => ok(await boardService.list(projectId, userId)),
  );

  server.tool(
    'get_board',
    'Get a board with its columns. Does NOT include tasks — use list_tasks_grouped for the cards.',
    { boardId: z.string().describe('Board ID') },
    async ({ boardId }) => ok(await boardService.getById(boardId, userId)),
  );

  server.tool(
    'create_board',
    'Create a board inside a project.',
    {
      projectId: z.string(),
      name: z.string().min(1).max(100),
    },
    async ({ projectId, name }) => ok(await boardService.create(projectId, userId, { name } as never)),
  );

  server.tool(
    'delete_board',
    'Delete a board (and all its columns + tasks). Owner/admin only.',
    { boardId: z.string() },
    async ({ boardId }) => {
      await boardService.remove(boardId, userId);
      return ok({ deleted: boardId });
    },
  );

  // ---------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------
  server.tool(
    'list_tasks_grouped',
    'List all tasks on a board, grouped by columnId. Returns { columnId: Task[] }.',
    { boardId: z.string().describe('Board ID') },
    async ({ boardId }) => ok(await taskService.list(boardId, userId)),
  );

  server.tool(
    'get_task',
    'Get a single task with full detail.',
    { taskId: z.string().describe('Task ID') },
    async ({ taskId }) => ok(await taskService.getById(taskId, userId)),
  );

  server.tool(
    'create_task',
    'Create a new task in a column.',
    {
      columnId: z.string(),
      title: z.string().min(1).max(500),
      description: z.string().max(10000).optional(),
      priority: z.enum(PRIORITIES).optional(),
      dueDate: z.string().nullable().optional().describe('ISO 8601'),
    },
    async ({ columnId, title, description, priority, dueDate }) => {
      const data = compact({ title, description, priority, dueDate }) as never;
      return ok(await taskService.create(columnId, userId, data));
    },
  );

  server.tool(
    'update_task',
    'Patch a task. Only the fields you pass are changed.',
    {
      taskId: z.string(),
      title: z.string().min(1).max(500).optional(),
      description: z.string().max(10000).nullable().optional(),
      priority: z.enum(PRIORITIES).optional(),
      dueDate: z.string().nullable().optional(),
    },
    async ({ taskId, ...patch }) =>
      ok(await taskService.update(taskId, userId, compact(patch) as never)),
  );

  server.tool(
    'delete_task',
    'Delete a task.',
    { taskId: z.string() },
    async ({ taskId }) => {
      await taskService.remove(taskId, userId);
      return ok({ deleted: taskId });
    },
  );

  server.tool(
    'move_task',
    'Move a task to a different column and/or position (0-based).',
    {
      taskId: z.string(),
      columnId: z.string(),
      position: z.number().int().nonnegative(),
    },
    async ({ taskId, columnId, position }) =>
      ok(await taskService.move(taskId, userId, { columnId, position })),
  );

  server.tool(
    'set_task_assignees',
    'Add and/or remove assignees on a task. Pass userIds in add/remove arrays.',
    {
      taskId: z.string(),
      add: z.array(z.string()).optional().default([]),
      remove: z.array(z.string()).optional().default([]),
    },
    async ({ taskId, add, remove }) =>
      ok(await taskService.updateAssignees(taskId, userId, { add, remove })),
  );

  server.tool(
    'set_task_labels',
    'Add and/or remove labels (a.k.a. categories) on a task. Pass labelIds.',
    {
      taskId: z.string(),
      add: z.array(z.string()).optional().default([]),
      remove: z.array(z.string()).optional().default([]),
    },
    async ({ taskId, add, remove }) =>
      ok(await taskService.updateLabels(taskId, userId, { add, remove })),
  );

  // ---------------------------------------------------------------------
  // Labels (called "categories" in some UIs)
  // ---------------------------------------------------------------------
  server.tool(
    'list_labels',
    'List labels (categories) in a project.',
    { projectId: z.string() },
    async ({ projectId }) => ok(await labelService.list(projectId, userId)),
  );

  server.tool(
    'create_label',
    'Create a label (category) in a project. Color is a hex string.',
    {
      projectId: z.string(),
      name: z.string().min(1).max(50),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe('#RRGGBB'),
    },
    async ({ projectId, name, color }) =>
      ok(await labelService.create(projectId, userId, { name, color })),
  );

  // ---------------------------------------------------------------------
  // Custom fields
  // ---------------------------------------------------------------------
  server.tool(
    'list_custom_fields',
    'List custom fields defined on a project.',
    { projectId: z.string() },
    async ({ projectId }) => ok(customFieldService.listFields(projectId)),
  );

  server.tool(
    'create_custom_field',
    'Create a custom field on a project. options is required + only used for type=dropdown.',
    {
      projectId: z.string(),
      name: z.string().min(1).max(100),
      type: z.enum(FIELD_TYPES),
      options: z.array(z.string()).optional(),
      showOnCard: z.boolean().optional(),
    },
    async ({ projectId, name, type, options, showOnCard }) =>
      ok(customFieldService.createField(projectId, { name, type, options, showOnCard })),
  );

  server.tool(
    'update_custom_field',
    'Patch a custom field. Use isEnabled=false to deactivate without deleting.',
    {
      fieldId: z.string(),
      name: z.string().min(1).max(100).optional(),
      type: z.enum(FIELD_TYPES).optional(),
      options: z.array(z.string()).optional(),
      showOnCard: z.boolean().optional(),
      isEnabled: z.boolean().optional(),
    },
    async ({ fieldId, ...patch }) => ok(customFieldService.updateField(fieldId, compact(patch))),
  );

  server.tool(
    'set_task_custom_value',
    'Set (or update) the value of a custom field on a specific task.',
    {
      taskId: z.string(),
      fieldId: z.string(),
      value: z.string(),
    },
    async ({ taskId, fieldId, value }) =>
      ok(customFieldService.setTaskValue(taskId, fieldId, value)),
  );

  // ---------------------------------------------------------------------
  // Comments
  // ---------------------------------------------------------------------
  server.tool(
    'add_comment',
    'Add a plain-text comment to a task.',
    { taskId: z.string(), content: z.string().min(1) },
    async ({ taskId, content }) => ok(await commentService.create(taskId, userId, content)),
  );

  // ---------------------------------------------------------------------
  // Links
  // ---------------------------------------------------------------------
  server.tool(
    'add_link',
    'Attach a URL to a task.',
    { taskId: z.string(), url: z.string().url() },
    async ({ taskId, url }) => ok(await linkService.create(taskId, userId, url)),
  );

  server.tool(
    'delete_link',
    'Detach a link from a task.',
    { linkId: z.string() },
    async ({ linkId }) => {
      await linkService.remove(linkId, userId);
      return ok({ deleted: linkId });
    },
  );

  // ---------------------------------------------------------------------
  // Checklist items
  // ---------------------------------------------------------------------
  server.tool(
    'add_checklist_item',
    'Add a checklist item to a task.',
    { taskId: z.string(), title: z.string().min(1).max(500) },
    async ({ taskId, title }) => ok(await checklistService.create(taskId, userId, title)),
  );

  server.tool(
    'toggle_checklist_item',
    'Mark a checklist item as completed or uncompleted.',
    { itemId: z.string(), isCompleted: z.boolean() },
    async ({ itemId, isCompleted }) =>
      ok(await checklistService.update(itemId, userId, { isCompleted })),
  );

  server.tool(
    'update_checklist_item',
    'Rename a checklist item and/or change its completion state.',
    {
      itemId: z.string(),
      title: z.string().min(1).max(500).optional(),
      isCompleted: z.boolean().optional(),
    },
    async ({ itemId, title, isCompleted }) =>
      ok(await checklistService.update(itemId, userId, compact({ title, isCompleted }))),
  );

  server.tool(
    'delete_checklist_item',
    'Delete a checklist item from a task.',
    { itemId: z.string() },
    async ({ itemId }) => {
      await checklistService.remove(itemId, userId);
      return ok({ deleted: itemId });
    },
  );
}
