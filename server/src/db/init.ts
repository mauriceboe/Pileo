import { sqlite } from '../config/database.js';
import { logger } from '../config/logger.js';

export function initializeDatabase(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_path TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      email_verified INTEGER NOT NULL DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      background_image TEXT,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      UNIQUE(project_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id, project_id);

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id, position);

    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#4A90D9',
      icon TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      is_rejected INTEGER NOT NULL DEFAULT 0,
      task_limit INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id, position);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'none',
      due_date TEXT,
      completed_at TEXT,
      creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id, position);

    CREATE TABLE IF NOT EXISTS task_assignees (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      UNIQUE(project_id, name)
    );

    CREATE TABLE IF NOT EXISTS task_labels (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY(task_id, label_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id);

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id, created_at);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'mention',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      resource_type TEXT NOT NULL DEFAULT 'task',
      resource_id TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_task ON activity_log(task_id, created_at);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_links (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      last_used_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

    CREATE TABLE IF NOT EXISTS session (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text_small',
      options TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      show_on_card INTEGER NOT NULL DEFAULT 0,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_custom_fields_project ON custom_fields(project_id, position);

    CREATE TABLE IF NOT EXISTS task_custom_values (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      field_id TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
      value TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(task_id, field_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_custom_values_task ON task_custom_values(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_custom_values_field ON task_custom_values(field_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('registration_enabled', 'true');

    CREATE TABLE IF NOT EXISTS share_tokens (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);

    -- OAuth 2.1 — registered MCP clients (claude.ai connector etc.).
    -- client_secret_hash is NULL for public clients (PKCE-only).
    -- created_by is NULL for clients registered via RFC 7591 Dynamic Client
    -- Registration before any user has approved them; the first user to
    -- consent in /authorize claims ownership.
    CREATE TABLE IF NOT EXISTS oauth_clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client_secret_hash TEXT,
      redirect_uris TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      created_by TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_clients_created_by ON oauth_clients(created_by);

    -- Authorization codes — single-use, ~10min TTL, PKCE-required.
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT NOT NULL,
      code_challenge_method TEXT NOT NULL DEFAULT 'S256',
      scopes TEXT NOT NULL,
      audience TEXT,
      expires_at TEXT NOT NULL,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_codes(expires_at);

    -- Access + refresh tokens. We store only SHA-256 hashes so a DB leak
    -- does not yield usable bearer tokens.
    CREATE TABLE IF NOT EXISTS oauth_access_tokens (
      token_hash TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scopes TEXT NOT NULL,
      audience TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      refresh_token_hash TEXT UNIQUE,
      refresh_expires_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user ON oauth_access_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_oauth_tokens_refresh ON oauth_access_tokens(refresh_token_hash);
    CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_access_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_share_tokens_board ON share_tokens(board_id);
  `);

  const projectColumns = sqlite.pragma('table_info(projects)') as Array<{ name: string }>;
  if (!projectColumns.some((col) => col.name === 'icon')) {
    sqlite.exec('ALTER TABLE projects ADD COLUMN icon TEXT');
  }

  const taskColumns = sqlite.pragma('table_info(tasks)') as Array<{ name: string }>;
  if (!taskColumns.some((col) => col.name === 'rejected_at')) {
    sqlite.exec('ALTER TABLE tasks ADD COLUMN rejected_at TEXT');
  }

  const columnColumns = sqlite.pragma('table_info(columns)') as Array<{ name: string }>;
  if (!columnColumns.some((col) => col.name === 'is_rejected')) {
    sqlite.exec('ALTER TABLE columns ADD COLUMN is_rejected INTEGER NOT NULL DEFAULT 0');
  }

  // RFC 7591: oauth_clients.created_by must accept NULL for anonymous
  // Dynamic Client Registration. The original schema shipped with NOT NULL;
  // SQLite can't drop a NOT NULL constraint via ALTER, so we rebuild the
  // table when we detect the old shape. Idempotent — once columns.notnull
  // is 0 the block is a no-op.
  const oauthClientCols = sqlite.pragma('table_info(oauth_clients)') as Array<{ name: string; notnull: number }>;
  const createdBy = oauthClientCols.find((c) => c.name === 'created_by');
  if (createdBy && createdBy.notnull === 1) {
    logger.info('Rebuilding oauth_clients to allow NULL created_by (RFC 7591)');
    sqlite.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN;
      CREATE TABLE oauth_clients_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_secret_hash TEXT,
        redirect_uris TEXT NOT NULL,
        is_public INTEGER NOT NULL DEFAULT 1,
        created_by TEXT REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      );
      INSERT INTO oauth_clients_new (id, name, client_secret_hash, redirect_uris, is_public, created_by, created_at)
        SELECT id, name, client_secret_hash, redirect_uris, is_public, created_by, created_at FROM oauth_clients;
      DROP TABLE oauth_clients;
      ALTER TABLE oauth_clients_new RENAME TO oauth_clients;
      CREATE INDEX IF NOT EXISTS idx_oauth_clients_created_by ON oauth_clients(created_by);
      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  logger.info('Database tables initialized');
}
