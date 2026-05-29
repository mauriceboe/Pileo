import { useEffect, useState, type MouseEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, ChevronLeft, ChevronRight, Plus, Shield, LayoutDashboard,
  Pencil, Trash2, UserPlus,
} from 'lucide-react';
import type { Project } from '@pileo/shared';
import { useProjectStore } from '../../stores/project.store';
import { useAuthStore } from '../../stores/auth.store';
import { useAppVersion } from '../../hooks/useAppVersion';
import * as projectsApi from '../../api/projects.api';
import * as boardsApi from '../../api/boards.api';
import { ContextMenu, type ContextMenuState } from '../ui/ContextMenu';
import { ShareDialog } from '../ui/ShareDialog';
import { getProjectIcon } from '../../constants/project-icons';
import { ProjectFormDialog } from './ProjectFormDialog';
import { BoardFormDialog } from './BoardFormDialog';
import styles from './sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface BoardTarget {
  projectId: string;
  boardId: string;
  name: string;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const projects = useProjectStore((s) => s.projects);
  const boardsByProject = useProjectStore((s) => s.boardsByProject);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const fetchAllBoards = useProjectStore((s) => s.fetchAllBoards);
  const fetchBoardsForProject = useProjectStore((s) => s.fetchBoardsForProject);
  const addBoardToProject = useProjectStore((s) => s.addBoardToProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const selectProject = useProjectStore((s) => s.selectProject);

  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const version = useAppVersion();

  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [createBoardFor, setCreateBoardFor] = useState<string | null>(null);
  const [renameBoard, setRenameBoard] = useState<BoardTarget | null>(null);
  const [projectCtx, setProjectCtx] = useState<ContextMenuState | null>(null);
  const [boardCtx, setBoardCtx] = useState<ContextMenuState | null>(null);
  const [shareProjectId, setShareProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects().then(() => fetchAllBoards());
  }, [fetchProjects, fetchAllBoards]);

  const handleCreateProject = async ({ name, icon }: { name: string; icon: string | null }) => {
    try {
      const project = await projectsApi.createProject({ name, icon });
      await fetchProjects();
      await fetchBoardsForProject(project.id);
      const boards = await boardsApi.listBoards(project.id);
      const firstBoard = boards[0];
      if (firstBoard) navigate(`/projects/${project.id}/boards/${firstBoard.id}`);
    } catch {
      // Errors surfaced by API layer
    }
  };

  const handleEditProject = async ({ name, icon }: { name: string; icon: string | null }) => {
    if (!editProject) return;
    try {
      await updateProject(editProject.id, { name, icon });
    } catch {
      // Errors surfaced by API layer
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.name}"? All boards and tasks will be lost.`)) return;
    try {
      await deleteProject(project.id);
      navigate('/');
    } catch {
      // Errors surfaced by API layer
    }
  };

  const handleCreateBoard = async (name: string) => {
    const projectId = createBoardFor;
    if (!projectId) return;
    try {
      const board = await boardsApi.createBoard(projectId, { name });
      addBoardToProject(projectId, board);
      navigate(`/projects/${projectId}/boards/${board.id}`);
    } catch {
      // Errors surfaced by API layer
    }
  };

  const handleRenameBoard = async (name: string) => {
    if (!renameBoard) return;
    try {
      await boardsApi.updateBoard(renameBoard.boardId, { name });
      await fetchBoardsForProject(renameBoard.projectId);
    } catch {
      // Errors surfaced by API layer
    }
  };

  const handleDeleteBoard = async (projectId: string, boardId: string, boardName: string) => {
    if (!window.confirm(`Delete board "${boardName}"? All columns and tasks will be lost.`)) return;
    try {
      await boardsApi.deleteBoard(boardId);
      useProjectStore.getState().removeBoardFromProject(projectId, boardId);
      navigate(`/projects/${projectId}/boards`);
    } catch {
      // Errors surfaced by API layer
    }
  };

  const handleProjectContextMenu = (event: MouseEvent, project: Project) => {
    event.preventDefault();
    event.stopPropagation();
    setProjectCtx({ x: event.clientX, y: event.clientY, data: project });
  };

  const handleBoardContextMenu = (event: MouseEvent, projectId: string, board: { id: string; name: string }) => {
    event.preventDefault();
    event.stopPropagation();
    setBoardCtx({ x: event.clientX, y: event.clientY, data: { projectId, board } });
  };

  return (
    <>
      {!collapsed && <div className={styles.overlay} onClick={onToggle} role="presentation" />}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.header}>
          {!collapsed && (
            <span className={styles.logo}>
              Pileo <span className={styles.alphaBadge}>Alpha</span>
              <span className={styles.versionBadge}>v{version}</span>
            </span>
          )}
          <button
            className={styles.toggleButton}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
            <Home size={20} />
            {!collapsed && <span className={styles.navLabel}>Home</span>}
          </NavLink>

          {currentUser?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
              <Shield size={20} />
              {!collapsed && <span className={styles.navLabel}>Admin</span>}
            </NavLink>
          )}
        </nav>

        {!collapsed && (
          <div className={styles.projectSection}>
            <div className={styles.projectSectionHeader}>Projects</div>
            <div className={styles.projectList}>
              {projects.map((project) => {
                const Icon = getProjectIcon(project.icon);
                return (
                  <div key={project.id} className={styles.projectGroup}>
                    <div
                      className={styles.projectHeader}
                      onContextMenu={(e) => handleProjectContextMenu(e, project)}
                    >
                      <Icon size={14} />
                      <span className={styles.projectHeaderName}>{project.name}</span>
                      <button
                        className={styles.addBoardButton}
                        onClick={() => setCreateBoardFor(project.id)}
                        title="Add board"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <nav className={styles.boardList}>
                      {(boardsByProject[project.id] ?? []).map((board) => (
                        <NavLink
                          key={board.id}
                          to={`/projects/${project.id}/boards/${board.id}`}
                          end
                          className={({ isActive }) => `${styles.boardItem} ${isActive ? styles.boardItemActive : ''}`}
                          onContextMenu={(e) => handleBoardContextMenu(e, project.id, board)}
                        >
                          <LayoutDashboard size={14} />
                          <span className={styles.boardName}>{board.name}</span>
                        </NavLink>
                      ))}
                    </nav>
                  </div>
                );
              })}
              <button className={styles.newProjectButton} onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                <span>New Project</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {projectCtx && (
        <ContextMenu
          x={projectCtx.x}
          y={projectCtx.y}
          onClose={() => setProjectCtx(null)}
          items={[
            { label: 'Edit Project', icon: <Pencil size={14} />, onClick: () => setEditProject(projectCtx.data as Project) },
            { label: 'New Board', icon: <Plus size={14} />, onClick: () => setCreateBoardFor((projectCtx.data as Project).id) },
            {
              label: 'Invite Members',
              icon: <UserPlus size={14} />,
              onClick: () => {
                const project = projectCtx.data as Project;
                selectProject(project);
                setShareProjectId(project.id);
              },
            },
            ...((projectCtx.data as Project).ownerId === currentUser?.id ? [
              'divider' as const,
              { label: 'Delete Project', icon: <Trash2 size={14} />, danger: true, onClick: () => handleDeleteProject(projectCtx.data as Project) },
            ] : []),
          ]}
        />
      )}

      {boardCtx && (() => {
        const { projectId, board } = boardCtx.data as { projectId: string; board: { id: string; name: string } };
        const ownerOfProject = projects.find((p) => p.id === projectId)?.ownerId === currentUser?.id;
        return (
          <ContextMenu
            x={boardCtx.x}
            y={boardCtx.y}
            onClose={() => setBoardCtx(null)}
            items={[
              { label: 'Rename Board', icon: <Pencil size={14} />, onClick: () => setRenameBoard({ projectId, boardId: board.id, name: board.name }) },
              ...(ownerOfProject ? [
                'divider' as const,
                { label: 'Delete Board', icon: <Trash2 size={14} />, danger: true, onClick: () => handleDeleteBoard(projectId, board.id, board.name) },
              ] : []),
            ]}
          />
        );
      })()}

      <ProjectFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateProject}
      />

      <ProjectFormDialog
        open={!!editProject}
        project={editProject}
        onClose={() => setEditProject(null)}
        onSubmit={handleEditProject}
      />

      <BoardFormDialog
        open={!!createBoardFor}
        mode="create"
        onClose={() => setCreateBoardFor(null)}
        onSubmit={handleCreateBoard}
      />

      <BoardFormDialog
        open={!!renameBoard}
        mode="rename"
        initialName={renameBoard?.name}
        onClose={() => setRenameBoard(null)}
        onSubmit={handleRenameBoard}
      />

      <ShareDialog open={!!shareProjectId} onClose={() => setShareProjectId(null)} />
    </>
  );
}
