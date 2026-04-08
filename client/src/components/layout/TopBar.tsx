import { useState, useRef } from 'react';
import { Menu, User, Settings, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../stores/project.store';
import { useAuthStore } from '../../stores/auth.store';
import { useBoardStore } from '../../stores/board.store';
import * as boardsApi from '../../api/boards.api';
import type { Board } from '@pileo/shared';
import { NotificationBell } from '../notifications/NotificationBell';
import { ThemeToggle } from '../ui/ThemeToggle';
import { SettingsDialog } from '../ui/SettingsDialog';
import { ProfileDialog } from '../ui/ProfileDialog';
import { ShareDialog } from '../ui/ShareDialog';
import { BoardPresence } from '../board/BoardPresence';
import styles from './top-bar.module.css';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [boardNameEdit, setBoardNameEdit] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const selectedProject = useProjectStore((s) => s.selectedProject);
  const fetchBoardsForProject = useProjectStore((s) => s.fetchBoardsForProject);
  const removeBoardFromProject = useProjectStore((s) => s.removeBoardFromProject);
  const board = useBoardStore((s) => s.board);
  const setBoard = useBoardStore((s) => s.setBoard);
  const isProjectOwner = selectedProject?.ownerId === currentUser?.id;

  const handleStartEdit = () => {
    if (!board) return;
    setBoardNameEdit(board.name);
    setIsEditingBoard(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const handleSaveBoard = async () => {
    const trimmed = boardNameEdit.trim();
    if (!trimmed || !board || trimmed === board.name) {
      setIsEditingBoard(false);
      return;
    }
    try {
      const updated = await boardsApi.updateBoard(board.id, { name: trimmed });
      if (setBoard) setBoard(updated);
      if (selectedProject) fetchBoardsForProject(selectedProject.id);
    } catch {}
    setIsEditingBoard(false);
  };

  return (
    <>
      <header className={styles.topBar}>
        <div className={styles.left}>
          <button className={styles.menuButton} onClick={onToggleSidebar} aria-label="Toggle sidebar">
            <Menu size={20} />
          </button>

          {/* Project name */}
          <span className={styles.projectName}>{selectedProject?.name ?? 'Pileo'}</span>

          {/* Board name — editable */}
          {board && (
            <>
              <span className={styles.separator}>/</span>
              {isEditingBoard ? (
                <input
                  ref={inputRef}
                  className={styles.boardNameInput}
                  value={boardNameEdit}
                  onChange={(e) => setBoardNameEdit(e.target.value)}
                  onBlur={handleSaveBoard}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleSaveBoard(); }
                    if (e.key === 'Escape') setIsEditingBoard(false);
                  }}
                  autoFocus
                />
              ) : (
                <button className={styles.boardNameBtn} onClick={handleStartEdit} title="Rename board">
                  {board.name}
                  <Pencil size={12} className={styles.boardNameIcon} />
                </button>
              )}
              {isProjectOwner && (
                <button
                  className={styles.boardDeleteBtn}
                  onClick={async () => {
                    if (!window.confirm(`Delete board "${board.name}"? All columns and tasks will be lost.`)) return;
                    try {
                      await boardsApi.deleteBoard(board.id);
                      if (selectedProject) removeBoardFromProject(selectedProject.id, board.id);
                      navigate(selectedProject ? `/projects/${selectedProject.id}/boards` : '/');
                    } catch {}
                  }}
                  title="Delete board"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}

          <BoardPresence />
        </div>
        <div className={styles.right}>
          {selectedProject && (
            <div className={styles.tooltipWrapper}>
              <button className={styles.iconButton} onClick={() => setShareOpen(true)} aria-label="Share">
                <UserPlus size={18} />
              </button>
              <span className={styles.tooltip}>Share</span>
            </div>
          )}
          <ThemeToggle />
          <div className={styles.tooltipWrapper}>
            <button className={styles.iconButton} onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <Settings size={18} />
            </button>
            <span className={styles.tooltip}>Settings</span>
          </div>
          <div className={styles.hideOnMobile}><NotificationBell /></div>
          <div className={styles.tooltipWrapper}>
            <button className={styles.avatarButton} onClick={() => setProfileOpen(true)} aria-label="Profile">
              <User size={14} />
            </button>
            <span className={styles.tooltip}>Profile</span>
          </div>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  );
}
