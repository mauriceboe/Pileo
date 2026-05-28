// DI tokens for the database layer. Keeping these in a dedicated file so
// modules can import them without pulling in the singleton sqlite instance
// at module-load time (helps tests substitute the connection).

export const SQLITE = Symbol.for('pileo.sqlite');
export type SqliteToken = typeof SQLITE;
