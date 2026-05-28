import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as projectService from '../../services/project.service.js';
import * as boardService from '../../services/board.service.js';
import * as taskService from '../../services/task.service.js';
import * as commentService from '../../services/comment.service.js';

// Serialise any value to a single text block — the MCP "content" array is
// required by the spec, and JSON-as-text is the lowest-friction format for
// model consumption when the underlying data is already JSON-shaped.
function ok(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  };
}

// Register the first cut of Pileo MCP tools. Eight tools cover the
// read + assign + move workflow we need to drive the Brownfield-Rewrite
// board from Claude. More tools (toggle_checklist_item, set_labels,
// set_assignees, create_task, …) can be added later behind the same
// pattern — each is a thin wrapper over the existing service function.
export function registerTools(server: McpServer, userId: string): void {
  server.tool(
    'list_projects',
    'List all projects the authenticated user owns or is a member of.',
    {},
    async () => {
      const rows = await projectService.list(userId);
      return ok(rows);
    },
  );

  server.tool(
    'list_boards',
    'List boards in a project (in display order).',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const rows = await boardService.list(projectId, userId);
      return ok(rows);
    },
  );

  server.tool(
    'get_board',
    'Get a board with its columns. Does NOT include tasks — use list_tasks_grouped for the cards.',
    { boardId: z.string().describe('Board ID') },
    async ({ boardId }) => {
      const board = await boardService.getById(boardId, userId);
      return ok(board);
    },
  );

  server.tool(
    'list_tasks_grouped',
    'List all tasks on a board, grouped by columnId. Returns { columnId: Task[] }.',
    { boardId: z.string().describe('Board ID') },
    async ({ boardId }) => {
      const grouped = await taskService.list(boardId, userId);
      return ok(grouped);
    },
  );

  server.tool(
    'get_task',
    'Get a single task with full detail.',
    { taskId: z.string().describe('Task ID') },
    async ({ taskId }) => {
      const task = await taskService.getById(taskId, userId);
      return ok(task);
    },
  );

  server.tool(
    'move_task',
    'Move a task to a different column and/or position. Position is 0-based.',
    {
      taskId: z.string().describe('Task ID'),
      columnId: z.string().describe('Target column ID'),
      position: z.number().int().nonnegative().describe('0-based position within the target column'),
    },
    async ({ taskId, columnId, position }) => {
      const updated = await taskService.move(taskId, userId, { columnId, position });
      return ok(updated);
    },
  );

  server.tool(
    'update_task',
    'Patch one or more fields of a task. Pass only the fields you want to change.',
    {
      taskId: z.string().describe('Task ID'),
      title: z.string().min(1).max(500).optional(),
      description: z.string().optional(),
      dueDate: z.string().nullable().optional().describe('ISO 8601 timestamp or null to clear'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable().optional(),
    },
    async ({ taskId, ...patch }) => {
      // Strip undefined keys so the legacy service receives only what was passed.
      const data: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) data[k] = v;
      const updated = await taskService.update(taskId, userId, data as never);
      return ok(updated);
    },
  );

  server.tool(
    'add_comment',
    'Add a plain-text comment to a task.',
    {
      taskId: z.string().describe('Task ID'),
      content: z.string().min(1).describe('Comment body'),
    },
    async ({ taskId, content }) => {
      const comment = await commentService.create(taskId, userId, content);
      return ok(comment);
    },
  );
}
