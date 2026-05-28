import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the four service modules the tools wrap. Each method is a vi.fn so
// individual tests can stub return values and assert call shapes.
vi.mock('../../services/project.service.js', () => ({
  list: vi.fn(),
}));
vi.mock('../../services/board.service.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
}));
vi.mock('../../services/task.service.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  move: vi.fn(),
  update: vi.fn(),
}));
vi.mock('../../services/comment.service.js', () => ({
  create: vi.fn(),
}));

import * as projectService from '../../services/project.service.js';
import * as boardService from '../../services/board.service.js';
import * as taskService from '../../services/task.service.js';
import * as commentService from '../../services/comment.service.js';
import { registerTools } from './tools.js';

// Minimal MCP server stand-in. We only care about capturing tool
// registrations so we can invoke handlers in isolation — no transport.
interface ToolRegistration {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}
function captureServer(): { server: { tool: (...args: never[]) => void }; tools: Map<string, ToolRegistration> } {
  const tools = new Map<string, ToolRegistration>();
  const server = {
    tool: (name: string, description: string, schema: Record<string, unknown>, handler: ToolRegistration['handler']) => {
      tools.set(name, { name, description, schema, handler });
    },
  } as { tool: (...args: never[]) => void };
  return { server, tools };
}

function textOf(result: unknown): string {
  const r = result as { content: Array<{ type: string; text: string }> };
  expect(r.content[0]?.type).toBe('text');
  return r.content[0]!.text;
}

const USER_ID = 'user-1';

describe('MCP tools', () => {
  let tools: Map<string, ToolRegistration>;

  beforeEach(() => {
    vi.clearAllMocks();
    const cap = captureServer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerTools(cap.server as any, USER_ID);
    tools = cap.tools;
  });

  it('registers exactly the eight expected tools', () => {
    expect([...tools.keys()].sort()).toEqual([
      'add_comment',
      'get_board',
      'get_task',
      'list_boards',
      'list_projects',
      'list_tasks_grouped',
      'move_task',
      'update_task',
    ]);
  });

  it('list_projects forwards userId and serialises the rows as JSON text', async () => {
    const rows = [{ id: 'p1', name: 'TREK' }];
    vi.mocked(projectService.list).mockResolvedValue(rows as never);
    const result = await tools.get('list_projects')!.handler({});
    expect(projectService.list).toHaveBeenCalledWith(USER_ID);
    expect(JSON.parse(textOf(result))).toEqual(rows);
  });

  it('list_boards passes projectId + userId', async () => {
    vi.mocked(boardService.list).mockResolvedValue([{ id: 'b1' }] as never);
    await tools.get('list_boards')!.handler({ projectId: 'p1' });
    expect(boardService.list).toHaveBeenCalledWith('p1', USER_ID);
  });

  it('get_board passes boardId + userId', async () => {
    vi.mocked(boardService.getById).mockResolvedValue({ id: 'b1', columns: [] } as never);
    const result = await tools.get('get_board')!.handler({ boardId: 'b1' });
    expect(boardService.getById).toHaveBeenCalledWith('b1', USER_ID);
    expect(JSON.parse(textOf(result))).toEqual({ id: 'b1', columns: [] });
  });

  it('list_tasks_grouped passes boardId + userId', async () => {
    vi.mocked(taskService.list).mockResolvedValue({ col1: [] } as never);
    await tools.get('list_tasks_grouped')!.handler({ boardId: 'b1' });
    expect(taskService.list).toHaveBeenCalledWith('b1', USER_ID);
  });

  it('get_task passes taskId + userId', async () => {
    vi.mocked(taskService.getById).mockResolvedValue({ id: 't1' } as never);
    await tools.get('get_task')!.handler({ taskId: 't1' });
    expect(taskService.getById).toHaveBeenCalledWith('t1', USER_ID);
  });

  it('move_task forwards taskId, userId and {columnId, position}', async () => {
    vi.mocked(taskService.move).mockResolvedValue({ id: 't1' } as never);
    await tools.get('move_task')!.handler({ taskId: 't1', columnId: 'c2', position: 3 });
    expect(taskService.move).toHaveBeenCalledWith('t1', USER_ID, { columnId: 'c2', position: 3 });
  });

  it('update_task strips undefined keys before delegating', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ id: 't1' } as never);
    await tools.get('update_task')!.handler({
      taskId: 't1',
      title: 'New title',
      description: undefined,
      dueDate: null,
      priority: undefined,
    });
    expect(taskService.update).toHaveBeenCalledWith('t1', USER_ID, {
      title: 'New title',
      dueDate: null,
    });
  });

  it('update_task forwards an empty patch as {} (no fields means no-op intent)', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ id: 't1' } as never);
    await tools.get('update_task')!.handler({ taskId: 't1' });
    expect(taskService.update).toHaveBeenCalledWith('t1', USER_ID, {});
  });

  it('add_comment passes (taskId, userId, content) in the legacy order', async () => {
    vi.mocked(commentService.create).mockResolvedValue({ id: 'c1' } as never);
    await tools.get('add_comment')!.handler({ taskId: 't1', content: 'hi' });
    expect(commentService.create).toHaveBeenCalledWith('t1', USER_ID, 'hi');
  });

  it('propagates service errors to the caller (no swallowing)', async () => {
    vi.mocked(projectService.list).mockRejectedValue(new Error('db down'));
    await expect(tools.get('list_projects')!.handler({})).rejects.toThrow('db down');
  });
});
