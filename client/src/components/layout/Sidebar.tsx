import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, ChevronLeft, ChevronRight, Layers, Plus, Shield, LayoutDashboard,
  Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun, Moon, Cloud,
  Flame, Music, Camera, Gift, Award, Bookmark, Bell, Globe, Lightbulb,
  Code, Briefcase, Bug, Compass, Feather, Folder, Package, Puzzle,
  Pencil, Trash2, UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { Project } from '@pileo/shared';
import { useProjectStore } from '../../stores/project.store';
import { useAuthStore } from '../../stores/auth.store';
import * as projectsApi from '../../api/projects.api';
import * as boardsApi from '../../api/boards.api';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ContextMenu, type ContextMenuState } from '../ui/ContextMenu';
import { ShareDialog } from '../ui/ShareDialog';
import styles from './sidebar.module.css';

const PROJECT_ICONS: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'layers', icon: Layers },
  { name: 'folder', icon: Folder },
  { name: 'briefcase', icon: Briefcase },
  { name: 'rocket', icon: Rocket },
  { name: 'star', icon: Star },
  { name: 'zap', icon: Zap },
  { name: 'target', icon: Target },
  { name: 'flag', icon: Flag },
  { name: 'heart', icon: Heart },
  { name: 'globe', icon: Globe },
  { name: 'lightbulb', icon: Lightbulb },
  { name: 'code', icon: Code },
  { name: 'bug', icon: Bug },
  { name: 'compass', icon: Compass },
  { name: 'package', icon: Package },
  { name: 'puzzle', icon: Puzzle },
  { name: 'feather', icon: Feather },
  { name: 'flame', icon: Flame },
  { name: 'award', icon: Award },
  { name: 'bookmark', icon: Bookmark },
  { name: 'coffee', icon: Coffee },
  { name: 'sun', icon: Sun },
  { name: 'moon', icon: Moon },
  { name: 'cloud', icon: Cloud },
  { name: 'music', icon: Music },
  { name: 'camera', icon: Camera },
  { name: 'gift', icon: Gift },
  { name: 'bell', icon: Bell },
];

const PROJECT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PROJECT_ICONS.map(({ name, icon }) => [name, icon]),
);

function getProjectIcon(iconName: string | null | undefined): LucideIcon {
  return (iconName && PROJECT_ICON_MAP[iconName]) || Layers;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { projects, boardsByProject, fetchProjects, fetchAllBoards, fetchBoardsForProject, addBoardToProject, updateProject, deleteProject, selectProject } = useProjectStore();
  const currentUser = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('layers');
  const [isCreating, setIsCreating] = useState(false);

  const [showCreateBoard, setShowCreateBoard] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('layers');
  const [isSaving, setIsSaving] = useState(false);

  const [editBoard, setEditBoard] = useState<{ projectId: string; boardId: string; name: string } | null>(null);
  const [editBoardName, setEditBoardName] = useState('');
  const [isSavingBoard, setIsSavingBoard] = useState(false);

  const [projectCtx, setProjectCtx] = useState<ContextMenuState | null>(null);
  const [boardCtx, setBoardCtx] = useState<ContextMenuState | null>(null);
  const [shareProjectId, setShareProjectId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      await fetchProjects();
      await fetchAllBoards();
    };
    load();
  }, [fetchProjects, fetchAllBoards]);

  const handleCreateProject = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsCreating(true);
    try {
      const project = await projectsApi.createProject({ name: trimmed, icon: newIcon || null });
      await fetchProjects();
      await fetchBoardsForProject(project.id);
      setNewName('');
      setNewIcon('layers');
      setShowCreate(false);
      const boards = await boardsApi.listBoards(project.id);
      const firstBoard = boards[0];
      if (firstBoard) {
        navigate(`/projects/${project.id}/boards/${firstBoard.id}`);
      }
    } catch {} finally { setIsCreating(false); }
  };

  const handleCreateBoard = async () => {
    const projectId = showCreateBoard;
    if (!projectId) return;
    const trimmed = newBoardName.trim();
    if (!trimmed) return;
    setIsCreatingBoard(true);
    try {
      const board = await boardsApi.createBoard(projectId, { name: trimmed });
      addBoardToProject(projectId, board);
      setShowCreateBoard(null);
      setNewBoardName('');
      navigate(`/projects/${projectId}/boards/${board.id}`);
    } catch {} finally { setIsCreatingBoard(false); }
  };

  const handleEditProject = async () => {
    if (!editProject) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await updateProject(editProject.id, { name: trimmed, icon: editIcon || null });
      setEditProject(null);
    } catch {} finally { setIsSaving(false); }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!window.confirm(`Delete project "${project.name}"? All boards and tasks will be lost.`)) return;
    try {
      await deleteProject(project.id);
      navigate('/');
    } catch {}
  };

  const openEditDialog = (project: Project) => {
    setEditName(project.name);
    setEditIcon((project as any).icon ?? 'layers');
    setEditProject(project);
  };

  const handleEditBoard = async () => {
    if (!editBoard) return;
    const trimmed = editBoardName.trim();
    if (!trimmed) return;
    setIsSavingBoard(true);
    try {
      await boardsApi.updateBoard(editBoard.boardId, { name: trimmed });
      await fetchBoardsForProject(editBoard.projectId);
      setEditBoard(null);
    } catch {} finally { setIsSavingBoard(false); }
  };

  const handleDeleteBoard = async (projectId: string, boardId: string, boardName: string) => {
    if (!window.confirm(`Delete board "${boardName}"? All columns and tasks will be lost.`)) return;
    try {
      await boardsApi.deleteBoard(boardId);
      const { removeBoardFromProject } = useProjectStore.getState();
      removeBoardFromProject(projectId, boardId);
      navigate(`/projects/${projectId}/boards`);
    } catch {}
  };

  const handleProjectContextMenu = (event: React.MouseEvent, project: Project) => {
    event.preventDefault();
    event.stopPropagation();
    setProjectCtx({ x: event.clientX, y: event.clientY, data: project });
  };

  const handleBoardContextMenu = (event: React.MouseEvent, projectId: string, board: { id: string; name: string }) => {
    event.preventDefault();
    event.stopPropagation();
    setBoardCtx({ x: event.clientX, y: event.clientY, data: { projectId, board } });
  };

  const handleOpenShare = (project: Project) => {
    selectProject(project);
    setShareProjectId(project.id);
  };

  return (
    <>
      {!collapsed && (
        <div className={styles.overlay} onClick={onToggle} role="presentation" />
      )}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.header}>
          {!collapsed && (
            <span className={styles.logo}>
              Pileo <span className={styles.alphaBadge}>Alpha</span>
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
              {projects.map((project) => (
                <div key={project.id} className={styles.projectGroup}>
                  <div
                    className={styles.projectHeader}
                    onContextMenu={(e) => handleProjectContextMenu(e, project)}
                  >
                    {(() => { const Icon = getProjectIcon((project as any).icon); return <Icon size={14} />; })()}
                    <span className={styles.projectHeaderName}>{project.name}</span>
                    <button
                      className={styles.addBoardButton}
                      onClick={() => { setShowCreateBoard(project.id); setNewBoardName(''); }}
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
                        className={({ isActive }) =>
                          `${styles.boardItem} ${isActive ? styles.boardItemActive : ''}`
                        }
                        onContextMenu={(e) => handleBoardContextMenu(e, project.id, board)}
                      >
                        <LayoutDashboard size={14} />
                        <span className={styles.boardName}>{board.name}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>
              ))}
              <button className={styles.newProjectButton} onClick={() => setShowCreate(true)}>
                <Plus size={14} />
                <span>New Project</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Project context menu */}
      {projectCtx && (
        <ContextMenu
          x={projectCtx.x}
          y={projectCtx.y}
          onClose={() => setProjectCtx(null)}
          items={[
            {
              label: 'Edit Project',
              icon: <Pencil size={14} />,
              onClick: () => openEditDialog(projectCtx.data as Project),
            },
            {
              label: 'New Board',
              icon: <Plus size={14} />,
              onClick: () => { setShowCreateBoard((projectCtx.data as Project).id); setNewBoardName(''); },
            },
            {
              label: 'Invite Members',
              icon: <UserPlus size={14} />,
              onClick: () => handleOpenShare(projectCtx.data as Project),
            },
            ...((projectCtx.data as Project).ownerId === currentUser?.id ? [
              'divider' as const,
              {
                label: 'Delete Project',
                icon: <Trash2 size={14} />,
                danger: true,
                onClick: () => handleDeleteProject(projectCtx.data as Project),
              },
            ] : []),
          ]}
        />
      )}

      {/* Board context menu */}
      {boardCtx && (() => {
        const { projectId, board } = boardCtx.data as { projectId: string; board: { id: string; name: string } };
        const ownerOfProject = projects.find((p) => p.id === projectId)?.ownerId === currentUser?.id;
        return (
          <ContextMenu
            x={boardCtx.x}
            y={boardCtx.y}
            onClose={() => setBoardCtx(null)}
            items={[
              {
                label: 'Rename Board',
                icon: <Pencil size={14} />,
                onClick: () => {
                  setEditBoardName(board.name);
                  setEditBoard({ projectId, boardId: board.id, name: board.name });
                },
              },
              ...(ownerOfProject ? [
                'divider' as const,
                {
                  label: 'Delete Board',
                  icon: <Trash2 size={14} />,
                  danger: true,
                  onClick: () => handleDeleteBoard(projectId, board.id, board.name),
                },
              ] : []),
            ]}
          />
        );
      })()}

      {/* New Project dialog */}
      <Dialog open={showCreate} onClose={() => { setShowCreate(false); setNewName(''); setNewIcon('layers'); }} title="New Project">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Project Name"
            placeholder="My Project"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateProject(); } }}
            autoFocus
          />
          <div>
            <span className={styles.iconPickerLabel}>Icon</span>
            <div className={styles.iconGrid}>
              {PROJECT_ICONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  className={`${styles.iconOption} ${newIcon === name ? styles.iconSelected : ''}`}
                  onClick={() => setNewIcon(name)}
                  title={name}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => { setShowCreate(false); setNewName(''); setNewIcon('layers'); }}>Cancel</Button>
            <Button size="sm" onClick={handleCreateProject} loading={isCreating} disabled={!newName.trim()}>Create</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Project dialog */}
      <Dialog open={!!editProject} onClose={() => setEditProject(null)} title="Edit Project">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Project Name"
            placeholder="Project name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEditProject(); } }}
            autoFocus
          />
          <div>
            <span className={styles.iconPickerLabel}>Icon</span>
            <div className={styles.iconGrid}>
              {PROJECT_ICONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  className={`${styles.iconOption} ${editIcon === name ? styles.iconSelected : ''}`}
                  onClick={() => setEditIcon(name)}
                  title={name}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setEditProject(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEditProject} loading={isSaving} disabled={!editName.trim()}>Save</Button>
          </div>
        </div>
      </Dialog>

      {/* New Board dialog */}
      <Dialog open={!!showCreateBoard} onClose={() => { setShowCreateBoard(null); setNewBoardName(''); }} title="New Board">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Board Name"
            placeholder="e.g. Features, Issues, Sprint 1"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateBoard(); } }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => { setShowCreateBoard(null); setNewBoardName(''); }}>Cancel</Button>
            <Button size="sm" onClick={handleCreateBoard} loading={isCreatingBoard} disabled={!newBoardName.trim()}>Create</Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Board dialog */}
      <Dialog open={!!editBoard} onClose={() => setEditBoard(null)} title="Rename Board">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            label="Board Name"
            placeholder="Board name"
            value={editBoardName}
            onChange={(e) => setEditBoardName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEditBoard(); } }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setEditBoard(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEditBoard} loading={isSavingBoard} disabled={!editBoardName.trim()}>Save</Button>
          </div>
        </div>
      </Dialog>

      {/* Share dialog */}
      <ShareDialog open={!!shareProjectId} onClose={() => setShareProjectId(null)} />
    </>
  );
}
