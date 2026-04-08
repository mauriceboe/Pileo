import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Download, Trash2, FileText, ExternalLink } from 'lucide-react';
import type { Attachment } from '@pileo/shared';
import { useAuthStore } from '../../stores/auth.store';
import * as attachmentsApi from '../../api/attachments.api';
import styles from './task-attachments.module.css';

interface TaskAttachmentsProps {
  taskId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString();
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const [attachmentsList, setAttachmentsList] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((state) => state.user);

  const fetchAttachments = useCallback(async () => {
    try { setAttachmentsList(await attachmentsApi.listAttachments(taskId)); } catch {}
  }, [taskId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  const handleUpload = async (files: FileList | File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const attachment = await attachmentsApi.uploadAttachment(taskId, file);
        setAttachmentsList((prev) => [...prev, attachment]);
      }
    } catch {} finally { setIsUploading(false); }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) handleUpload(files);
    event.target.value = '';
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Delete this attachment?')) return;
    setAttachmentsList((prev) => prev.filter((a) => a.id !== attachmentId));
    try { await attachmentsApi.deleteAttachment(attachmentId); } catch { fetchAttachments(); }
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files.length > 0) handleUpload(Array.from(e.dataTransfer.files)); };

  return (
    <div className={styles.container}>
      <div
        ref={dropZoneRef}
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
        onDragOver={handleDragOver} onDrop={handleDrop}
      >
        <div className={styles.dropZoneContent}>
          <Upload size={18} className={styles.dropZoneIcon} />
          <span className={styles.dropZoneText}>
            {isUploading ? 'Uploading...' : <>Drop files or <span className={styles.dropZoneLink}>browse</span></>}
          </span>
        </div>
        <input ref={fileInputRef} type="file" className={styles.fileInput} onChange={handleFileSelect} multiple />
      </div>

      <div className={styles.fileList}>
        {attachmentsList.length === 0 && !isUploading && (
          <p className={styles.emptyMessage}>No attachments</p>
        )}
        {attachmentsList.map((attachment) => (
          <div key={attachment.id} className={styles.fileItem}>
            <div className={styles.fileIcon}><FileText size={14} /></div>
            <div className={styles.fileInfo}>
              <div className={styles.fileName}>{attachment.fileName}</div>
              <div className={styles.fileMeta}>
                <span>{formatFileSize(attachment.fileSize)}</span>
                <span>{formatDate(attachment.createdAt)}</span>
              </div>
            </div>
            <div className={styles.fileActions}>
              <a href={attachmentsApi.getDownloadUrl(attachment.id)} target="_blank" rel="noopener noreferrer" className={styles.fileActionButton} title="Open"><ExternalLink size={14} /></a>
              <a href={attachmentsApi.getDownloadUrl(attachment.id)} className={styles.fileActionButton} title="Download" download><Download size={14} /></a>
              {attachment.uploaderId === currentUser?.id && (
                <button type="button" className={`${styles.fileActionButton} ${styles.fileActionButtonDanger}`} onClick={() => handleDelete(attachment.id)} title="Delete"><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
