import { useState, useRef } from 'react';
import { User, Mail, Calendar, FolderKanban, Camera, Pencil, Check, X } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useProjectStore } from '../../stores/project.store';
import { apiClient } from '../../api/client';
import type { ApiSuccessResponse, UserPublic } from '@pileo/shared';
import { Avatar } from './Avatar';
import { Dialog } from './Dialog';
import styles from './profile-dialog.module.css';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const projects = useProjectStore((s) => s.projects);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch('/api/v1/users/me/avatar', {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        const body = await res.json();
        setUser(body.data);
      }
    } catch {} finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEditName = () => {
    setNameValue(user?.displayName ?? '');
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user?.displayName) {
      setEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      const res = await apiClient.patch<ApiSuccessResponse<UserPublic>>('/users/me', { displayName: trimmed });
      setUser(res.data);
      setEditingName(false);
    } catch {} finally {
      setIsSavingName(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Profile">
      <div className={styles.content}>
        {/* Avatar + name */}
        <div className={styles.header}>
          <div className={styles.avatarWrapper} onClick={handleAvatarClick} title="Change photo">
            <Avatar name={user?.displayName ?? 'User'} src={user?.avatarPath} size="lg" />
            <div className={styles.avatarOverlay}>
              <Camera size={16} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
          <div className={styles.identity}>
            {editingName ? (
              <div className={styles.nameEdit}>
                <input
                  className={styles.nameInput}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                  disabled={isSavingName}
                />
                <button className={styles.nameBtn} onClick={saveName} disabled={isSavingName}><Check size={14} /></button>
                <button className={styles.nameBtn} onClick={() => setEditingName(false)}><X size={14} /></button>
              </div>
            ) : (
              <span className={styles.name} onClick={startEditName} title="Click to edit">
                {user?.displayName ?? 'User'}
                <Pencil size={12} className={styles.nameEditIcon} />
              </span>
            )}
            <span className={styles.username}>@{user?.username}</span>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <FolderKanban size={14} className={styles.statIcon} />
            <span className={styles.statValue}>{projects.length}</span>
            <span className={styles.statLabel}>Projects</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Details */}
        <div className={styles.details}>
          <div className={styles.row}>
            <User size={15} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Name</span>
            <span className={styles.rowValue}>{user?.displayName ?? '—'}</span>
          </div>
          <div className={styles.row}>
            <Mail size={15} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{user?.email ?? '—'}</span>
          </div>
          {memberSince && (
            <div className={styles.row}>
              <Calendar size={15} className={styles.rowIcon} />
              <span className={styles.rowLabel}>Joined</span>
              <span className={styles.rowValue}>{memberSince}</span>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
