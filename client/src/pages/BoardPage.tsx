import { useParams } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useBoardData } from '../hooks/useBoardData';
import { BoardView } from '../components/board/BoardView';

export function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  useWebSocket(boardId);
  useBoardData(projectId, boardId);
  return <BoardView />;
}
