// -- User Roles --
export const USER_ROLES = ["admin", "user"] as const;

// -- Project Member Roles --
export const PROJECT_MEMBER_ROLES = ["owner", "admin", "member", "viewer"] as const;

// -- Task Priorities --
export const TASK_PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

// -- Notification Types --
export const NOTIFICATION_TYPES = [
  "mention",
  "assignment",
  "due_date",
  "comment",
  "task_moved",
] as const;

// -- Notification Resource Types --
export const NOTIFICATION_RESOURCE_TYPES = ["task", "comment", "project"] as const;

// -- Validation Regex --
export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

// -- Default Column Colors --
export const DEFAULT_COLUMN_COLORS = [
  "#4A90D9", // Blue
  "#F5A623", // Gold/Yellow
  "#7ED321", // Green
  "#F5735A", // Orange/Coral
  "#50C8C6", // Teal
  "#9B59B6", // Purple
  "#E74C3C", // Red
  "#3B82F6", // Bright Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#14B8A6", // Emerald
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#6366F1", // Indigo
  "#10B981", // Green
  "#EF4444", // Rose
  "#78716C", // Stone
  "#64748B", // Slate
  "#1E293B", // Dark
] as const;

// -- Limits --
export const MAX_TITLE_LENGTH = 500;
export const MAX_DESCRIPTION_LENGTH = 10000;
export const MAX_COMMENT_LENGTH = 10000;
export const MAX_LABEL_NAME_LENGTH = 50;
export const MAX_COLUMN_NAME_LENGTH = 100;
export const MAX_BOARD_NAME_LENGTH = 100;
export const MAX_PROJECT_NAME_LENGTH = 100;
export const MAX_PROJECT_DESCRIPTION_LENGTH = 1000;
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_USERNAME_LENGTH = 39;
export const MIN_USERNAME_LENGTH = 3;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_CHECKLIST_ITEM_TITLE_LENGTH = 500;
export const MAX_NOTIFICATION_TITLE_LENGTH = 200;
export const MAX_NOTIFICATION_MESSAGE_LENGTH = 1000;

// -- File Upload --
export const DEFAULT_MAX_FILE_SIZE = 10_485_760; // 10 MB in bytes
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "svg"] as const;
export const ALLOWED_DOCUMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "md",
  "csv",
] as const;
export const ALLOWED_ARCHIVE_EXTENSIONS = ["zip", "tar.gz"] as const;

// -- Rate Limiting --
export const RATE_LIMIT_GLOBAL_MAX = 800;
export const RATE_LIMIT_GLOBAL_WINDOW_MS = 60_000;
export const RATE_LIMIT_AUTH_MAX = 5;
export const RATE_LIMIT_AUTH_WINDOW_MS = 60_000;
export const RATE_LIMIT_UPLOAD_MAX = 10;
export const RATE_LIMIT_UPLOAD_WINDOW_MS = 60_000;
export const RATE_LIMIT_WEBSOCKET_MAX = 60;
export const RATE_LIMIT_WEBSOCKET_WINDOW_MS = 60_000;

// -- Session --
export const DEFAULT_SESSION_MAX_AGE_MS = 604_800_000; // 7 days

// -- Auth --
export const MAX_FAILED_LOGIN_ATTEMPTS = 10;
export const ACCOUNT_LOCKOUT_DURATION_MS = 900_000; // 15 minutes
export const PASSWORD_RESET_TOKEN_EXPIRY_MS = 3_600_000; // 1 hour

// -- WebSocket --
export const WEBSOCKET_UNAUTHENTICATED_TIMEOUT_MS = 5_000;
export const WEBSOCKET_RECONNECT_INITIAL_DELAY_MS = 1_000;
export const WEBSOCKET_RECONNECT_MAX_DELAY_MS = 30_000;
export const WEBSOCKET_RECONNECT_MULTIPLIER = 2;
export const WEBSOCKET_RECONNECT_JITTER_MS = 500;

// -- Pagination --
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
