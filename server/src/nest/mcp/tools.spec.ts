import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the four service modules the tools wrap. Each method is a vi.fn so
// individual tests can stub return values and assert call shapes.
vi.mock('../../services/project.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
}));
vi.mock('../../services/board.service.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../../services/task.service.js', () => ({
  list: vi.fn(),
  getById: vi.fn(),
  move: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  updateAssignees: vi.fn(),
  updateLabels: vi.fn(),
}));
vi.mock('../../services/comment.service.js', () => ({
  create: vi.fn(),
}));
vi.mock('../../services/label.service.js', () => ({
  list: vi.fn(),
  create: vi.fn(),
}));
vi.mock('../../services/link.service.js', () => ({
  create: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../../services/checklist.service.js', () => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../../services/custom-field.service.js', () => ({
  listFields: vi.fn(),
  createField: vi.fn(),
  updateField: vi.fn(),
  setTaskValue: vi.fn(),
}));

import * as projectService from '../../services/project.service.js';
import * as boardService from '../../services/board.service.js';
import * as taskService from '../../services/task.service.js';
import * as commentService from '../../services/comment.service.js';
import * as labelService from '../../services/label.service.js';
import * as linkService from '../../services/link.service.js';
import * as checklistService from '../../services/checklist.service.js';
import * as customFieldService from '../../services/custom-field.service.js';
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

  it('registers the full expected tool set', () => {
    expect([...tools.keys()].sort()).toEqual([
      'add_checklist_item',
      'add_comment',
      'add_link',
      'create_board',
      'create_custom_field',
      'create_label',
      'create_project',
      'create_task',
      'delete_board',
      'delete_checklist_item',
      'delete_link',
      'delete_task',
      'get_board',
      'get_task',
      'list_boards',
      'list_custom_fields',
      'list_labels',
      'list_projects',
      'list_tasks_grouped',
      'move_task',
      'set_task_assignees',
      'set_task_custom_value',
      'set_task_labels',
      'set_task_status',
      'toggle_checklist_item',
      'update_checklist_item',
      'update_custom_field',
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

  it('set_task_status stamps completedAt/rejectedAt now when flags are true', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ id: 't1' } as never);
    await tools.get('set_task_status')!.handler({ taskId: 't1', completed: true, rejected: true });
    expect(taskService.update).toHaveBeenCalledWith('t1', USER_ID, {
      completedAt: expect.any(Date),
      rejectedAt: expect.any(Date),
    });
  });

  it('set_task_status clears the timestamps when flags are false', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ id: 't1' } as never);
    await tools.get('set_task_status')!.handler({ taskId: 't1', completed: false, rejected: false });
    expect(taskService.update).toHaveBeenCalledWith('t1', USER_ID, {
      completedAt: null,
      rejectedAt: null,
    });
  });

  it('set_task_status only touches the flag that was passed', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ id: 't1' } as never);
    await tools.get('set_task_status')!.handler({ taskId: 't1', completed: true });
    expect(taskService.update).toHaveBeenCalledWith('t1', USER_ID, {
      completedAt: expect.any(Date),
    });
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

  // --- New write tools (expanded surface) -------------------------------

  it('create_project forwards compacted body + userId', async () => {
    vi.mocked(projectService.create).mockResolvedValue({ id: 'p1' } as never);
    await tools.get('create_project')!.handler({ name: 'Pileo', icon: 'rocket' });
    expect(projectService.create).toHaveBeenCalledWith({ name: 'Pileo', icon: 'rocket' }, USER_ID);
  });

  it('create_board forwards (projectId, userId, { name })', async () => {
    vi.mocked(boardService.create).mockResolvedValue({ id: 'b1' } as never);
    await tools.get('create_board')!.handler({ projectId: 'p1', name: 'Sprint 1' });
    expect(boardService.create).toHaveBeenCalledWith('p1', USER_ID, { name: 'Sprint 1' });
  });

  it('delete_board confirms by returning { deleted: id }', async () => {
    vi.mocked(boardService.remove).mockResolvedValue(undefined as never);
    const r = await tools.get('delete_board')!.handler({ boardId: 'b1' });
    expect(boardService.remove).toHaveBeenCalledWith('b1', USER_ID);
    expect(JSON.parse(textOf(r))).toEqual({ deleted: 'b1' });
  });

  it('create_task strips undefined keys before delegating', async () => {
    vi.mocked(taskService.create).mockResolvedValue({ id: 't1' } as never);
    await tools.get('create_task')!.handler({
      columnId: 'c1',
      title: 'Bug',
      description: undefined,
      priority: 'high',
    });
    expect(taskService.create).toHaveBeenCalledWith('c1', USER_ID, { title: 'Bug', priority: 'high' });
  });

  it('delete_task confirms', async () => {
    vi.mocked(taskService.remove).mockResolvedValue(undefined as never);
    const r = await tools.get('delete_task')!.handler({ taskId: 't1' });
    expect(taskService.remove).toHaveBeenCalledWith('t1', USER_ID);
    expect(JSON.parse(textOf(r))).toEqual({ deleted: 't1' });
  });

  it('set_task_assignees forwards { add, remove }', async () => {
    vi.mocked(taskService.updateAssignees).mockResolvedValue({ id: 't1' } as never);
    await tools.get('set_task_assignees')!.handler({ taskId: 't1', add: ['u1'], remove: ['u2'] });
    expect(taskService.updateAssignees).toHaveBeenCalledWith('t1', USER_ID, { add: ['u1'], remove: ['u2'] });
  });

  it('set_task_labels forwards { add, remove }', async () => {
    vi.mocked(taskService.updateLabels).mockResolvedValue({ id: 't1' } as never);
    await tools.get('set_task_labels')!.handler({ taskId: 't1', add: ['l1'], remove: [] });
    expect(taskService.updateLabels).toHaveBeenCalledWith('t1', USER_ID, { add: ['l1'], remove: [] });
  });

  it('create_label forwards (projectId, userId, { name, color })', async () => {
    vi.mocked(labelService.create).mockResolvedValue({ id: 'l1' } as never);
    await tools.get('create_label')!.handler({ projectId: 'p1', name: 'Bug', color: '#EF4444' });
    expect(labelService.create).toHaveBeenCalledWith('p1', USER_ID, { name: 'Bug', color: '#EF4444' });
  });

  it('add_link delegates to linkService.create', async () => {
    vi.mocked(linkService.create).mockResolvedValue({ id: 'lk1' } as never);
    await tools.get('add_link')!.handler({ taskId: 't1', url: 'https://x.test' });
    expect(linkService.create).toHaveBeenCalledWith('t1', USER_ID, 'https://x.test');
  });

  it('toggle_checklist_item flips isCompleted via service.update', async () => {
    vi.mocked(checklistService.update).mockResolvedValue({ id: 'i1' } as never);
    await tools.get('toggle_checklist_item')!.handler({ itemId: 'i1', isCompleted: true });
    expect(checklistService.update).toHaveBeenCalledWith('i1', USER_ID, { isCompleted: true });
  });

  it('update_checklist_item with both fields forwards compacted patch', async () => {
    vi.mocked(checklistService.update).mockResolvedValue({ id: 'i1' } as never);
    await tools.get('update_checklist_item')!.handler({ itemId: 'i1', title: 'renamed' });
    expect(checklistService.update).toHaveBeenCalledWith('i1', USER_ID, { title: 'renamed' });
  });

  it('create_custom_field forwards data as-is to the sync service', async () => {
    vi.mocked(customFieldService.createField).mockReturnValue({ id: 'f1' } as never);
    await tools.get('create_custom_field')!.handler({
      projectId: 'p1',
      name: 'Workload',
      type: 'dropdown',
      options: ['low', 'high'],
      showOnCard: true,
    });
    expect(customFieldService.createField).toHaveBeenCalledWith('p1', {
      name: 'Workload',
      type: 'dropdown',
      options: ['low', 'high'],
      showOnCard: true,
    });
  });

  it('update_custom_field strips undefined before delegating', async () => {
    vi.mocked(customFieldService.updateField).mockReturnValue({ id: 'f1', isEnabled: false } as never);
    await tools.get('update_custom_field')!.handler({ fieldId: 'f1', isEnabled: false });
    expect(customFieldService.updateField).toHaveBeenCalledWith('f1', { isEnabled: false });
  });

  it('set_task_custom_value forwards (taskId, fieldId, value)', async () => {
    vi.mocked(customFieldService.setTaskValue).mockReturnValue({ id: 'v1' } as never);
    await tools.get('set_task_custom_value')!.handler({ taskId: 't1', fieldId: 'f1', value: 'high' });
    expect(customFieldService.setTaskValue).toHaveBeenCalledWith('t1', 'f1', 'high');
  });
});
