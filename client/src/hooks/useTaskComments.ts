import { useCallback, useEffect, useState } from 'react';
import type { CommentWithAuthor } from '@pileo/shared';
import * as commentsApi from '../api/comments.api';

interface UseTaskCommentsResult {
  comments: CommentWithAuthor[];
  create: (content: string) => Promise<void>;
  update: (commentId: string, content: string) => Promise<void>;
  remove: (commentId: string) => Promise<void>;
}

export function useTaskComments(taskId: string): UseTaskCommentsResult {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);

  const reload = useCallback(async () => {
    try {
      setComments(await commentsApi.listComments(taskId));
    } catch {
      // Comments are non-critical
    }
  }, [taskId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(async (content: string) => {
    try {
      const comment = await commentsApi.createComment(taskId, { content });
      setComments((prev) => [comment, ...prev]);
    } catch {
      // Errors surfaced by API layer
    }
  }, [taskId]);

  const update = useCallback(async (commentId: string, content: string) => {
    try {
      const updated = await commentsApi.updateComment(commentId, { content });
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    } catch {
      // Errors surfaced by API layer
    }
  }, []);

  const remove = useCallback(async (commentId: string) => {
    try {
      await commentsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // Errors surfaced by API layer
    }
  }, []);

  return { comments, create, update, remove };
}
