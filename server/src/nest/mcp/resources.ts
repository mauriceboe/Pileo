import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as projectService from '../../services/project.service.js';

// Resources are read-only context the model can pull on its own. Today we
// expose a single one — the project list — so Claude can summarise the
// workspace without burning a tool call. More resources (per-board dumps,
// per-task detail) can be added incrementally.
export function registerResources(server: McpServer, userId: string): void {
  server.resource(
    'projects',
    'pileo://projects',
    {
      description: 'All projects the authenticated user can access. JSON array.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const projects = await projectService.list(userId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    },
  );
}
