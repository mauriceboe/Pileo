import { describe, it, expect } from "vitest";
import {
  taskWithRelationsSchema,
  boardWithColumnsSchema,
  commentWithAuthorSchema,
  dashboardStatsSchema,
  userTaskSchema,
  projectMemberWithUserSchema,
  taskLabelViewSchema,
  taskAssigneeViewSchema,
  bulkTaskResultSchema,
} from "@pileo/shared";

const UUID = "00000000-0000-0000-0000-000000000000";
const TIMESTAMP = "2026-05-29T12:00:00.000Z";

// Static fixtures that mirror what the NestJS controllers actually return.
// If a controller starts returning a different shape (e.g. renames
// `labelId` back to `id`), one of these tests will fail loudly instead of
// the `as any`-style fallback that used to hide it on the client.

describe("taskWithRelationsSchema", () => {
  it("accepts a full enriched task row", () => {
    expect(() =>
      taskWithRelationsSchema.parse({
        id: UUID, columnId: UUID, title: "Test", description: null,
        position: 0, priority: "none", dueDate: null, completedAt: null,
        rejectedAt: null, creatorId: UUID, createdAt: TIMESTAMP, updatedAt: TIMESTAMP,
        labels: [{ labelId: UUID, name: "bug", color: "#ff0000" }],
        assignees: [{ userId: UUID, username: "maurice", displayName: "Maurice", avatarPath: null }],
        commentCount: 0, checklistTotal: 0, checklistCompleted: 0,
        attachmentCount: 0, linkCount: 0,
      }),
    ).not.toThrow();
  });

  it("rejects when labels use `id` instead of `labelId`", () => {
    expect(() =>
      taskWithRelationsSchema.parse({
        id: UUID, columnId: UUID, title: "Test", description: null,
        position: 0, priority: "none", dueDate: null, completedAt: null,
        rejectedAt: null, creatorId: UUID, createdAt: TIMESTAMP, updatedAt: TIMESTAMP,
        labels: [{ id: UUID, name: "bug", color: "#ff0000" }],
        assignees: [],
        commentCount: 0, checklistTotal: 0, checklistCompleted: 0,
        attachmentCount: 0, linkCount: 0,
      }),
    ).toThrow();
  });

  it("rejects when assignees use `id` instead of `userId`", () => {
    expect(() =>
      taskWithRelationsSchema.parse({
        id: UUID, columnId: UUID, title: "Test", description: null,
        position: 0, priority: "none", dueDate: null, completedAt: null,
        rejectedAt: null, creatorId: UUID, createdAt: TIMESTAMP, updatedAt: TIMESTAMP,
        labels: [],
        assignees: [{ id: UUID, username: "x", displayName: "X", avatarPath: null }],
        commentCount: 0, checklistTotal: 0, checklistCompleted: 0,
        attachmentCount: 0, linkCount: 0,
      }),
    ).toThrow();
  });
});

describe("taskLabelViewSchema", () => {
  it("accepts the joined shape", () => {
    expect(() => taskLabelViewSchema.parse({ labelId: UUID, name: "x", color: "#000" })).not.toThrow();
  });
  it("rejects extra `id` instead of `labelId`", () => {
    expect(() => taskLabelViewSchema.parse({ id: UUID, name: "x", color: "#000" })).toThrow();
  });
});

describe("taskAssigneeViewSchema", () => {
  it("accepts the joined shape", () => {
    expect(() =>
      taskAssigneeViewSchema.parse({ userId: UUID, username: "m", displayName: "M", avatarPath: null }),
    ).not.toThrow();
  });
});

describe("boardWithColumnsSchema", () => {
  it("accepts a board with empty columns array", () => {
    expect(() =>
      boardWithColumnsSchema.parse({
        id: UUID, projectId: UUID, name: "Board", position: 0,
        createdAt: TIMESTAMP, updatedAt: TIMESTAMP, columns: [],
      }),
    ).not.toThrow();
  });
});

describe("commentWithAuthorSchema", () => {
  it("accepts a comment with embedded author", () => {
    expect(() =>
      commentWithAuthorSchema.parse({
        id: UUID, taskId: UUID, authorId: UUID, content: "hi",
        createdAt: TIMESTAMP, updatedAt: TIMESTAMP,
        author: { id: UUID, username: "m", displayName: "M", avatarPath: null },
      }),
    ).not.toThrow();
  });

  it("rejects when author is missing", () => {
    expect(() =>
      commentWithAuthorSchema.parse({
        id: UUID, taskId: UUID, authorId: UUID, content: "hi",
        createdAt: TIMESTAMP, updatedAt: TIMESTAMP,
      }),
    ).toThrow();
  });
});

describe("dashboardStatsSchema", () => {
  it("requires all four counts to be non-negative integers", () => {
    expect(() =>
      dashboardStatsSchema.parse({ totalTasks: 10, completed: 4, inProgress: 6, notifications: 2 }),
    ).not.toThrow();
    expect(() =>
      dashboardStatsSchema.parse({ totalTasks: -1, completed: 4, inProgress: 6, notifications: 2 }),
    ).toThrow();
    expect(() =>
      dashboardStatsSchema.parse({ totalTasks: 1, completed: 4, inProgress: 6 }),
    ).toThrow();
  });
});

describe("userTaskSchema", () => {
  it("accepts the dashboard view for a user task", () => {
    expect(() =>
      userTaskSchema.parse({
        id: UUID, title: "x", priority: "high", dueDate: null,
        completedAt: null, columnId: UUID, columnName: "Todo", columnColor: "#fff",
        boardId: UUID, boardName: "B", projectId: UUID, createdAt: TIMESTAMP,
      }),
    ).not.toThrow();
  });

  it("rejects an unknown priority", () => {
    expect(() =>
      userTaskSchema.parse({
        id: UUID, title: "x", priority: "blocker", dueDate: null,
        completedAt: null, columnId: UUID, columnName: "Todo", columnColor: "#fff",
        boardId: UUID, boardName: "B", projectId: UUID, createdAt: TIMESTAMP,
      }),
    ).toThrow();
  });
});

describe("projectMemberWithUserSchema", () => {
  it("accepts the joined shape with embedded user", () => {
    expect(() =>
      projectMemberWithUserSchema.parse({
        id: UUID, projectId: UUID, userId: UUID, role: "member", joinedAt: TIMESTAMP,
        user: { id: UUID, email: "alice@example.com", username: "m", displayName: "M", avatarPath: null },
      }),
    ).not.toThrow();
  });

  it("accepts a row without the optional user field", () => {
    expect(() =>
      projectMemberWithUserSchema.parse({
        id: UUID, projectId: UUID, userId: UUID, role: "member", joinedAt: TIMESTAMP,
      }),
    ).not.toThrow();
  });
});

describe("bulkTaskResultSchema", () => {
  it("accepts a moved result", () => {
    expect(() =>
      bulkTaskResultSchema.parse({ moved: 3, affectedBoardIds: [UUID] }),
    ).not.toThrow();
  });
  it("accepts a duplicated result", () => {
    expect(() =>
      bulkTaskResultSchema.parse({ duplicated: 2, affectedBoardIds: [UUID, UUID] }),
    ).not.toThrow();
  });
});
