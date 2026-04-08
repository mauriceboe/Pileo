// -- Board Room Events (scoped per board) --
export const WEBSOCKET_EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_MOVED: "task:moved",
  TASK_DELETED: "task:deleted",
  TASK_ASSIGNEE_ADDED: "task:assignee:added",
  TASK_ASSIGNEE_REMOVED: "task:assignee:removed",
  TASK_LABEL_ADDED: "task:label:added",
  TASK_LABEL_REMOVED: "task:label:removed",
  COLUMN_CREATED: "column:created",
  COLUMN_UPDATED: "column:updated",
  COLUMN_DELETED: "column:deleted",
  COLUMN_REORDERED: "column:reordered",
  COMMENT_CREATED: "comment:created",
  COMMENT_UPDATED: "comment:updated",
  COMMENT_DELETED: "comment:deleted",
  CHECKLIST_UPDATED: "checklist:updated",
  PRESENCE_JOIN: "presence:join",
  PRESENCE_LEAVE: "presence:leave",
  PRESENCE_CURSOR: "presence:cursor",
  PRESENCE_TASK_FOCUS: "presence:task:focus",
  // User-scoped events
  NOTIFICATION_NEW: "notification:new",
} as const;

export type WebSocketEventName = (typeof WEBSOCKET_EVENTS)[keyof typeof WEBSOCKET_EVENTS];

export interface WebSocketMessage {
  event: WebSocketEventName;
  payload: unknown;
  boardId: string;
  userId: string;
  timestamp: string;
}

export interface PresenceJoinPayload {
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
}

export interface PresenceLeavePayload {
  userId: string;
}

export interface PresenceCursorPayload {
  userId: string;
  x: number;
  y: number;
}

export interface TaskMovedPayload {
  taskId: string;
  fromColumnId: string;
  toColumnId: string;
  position: number;
}

export interface NotificationNewPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType: string;
  resourceId: string;
}
