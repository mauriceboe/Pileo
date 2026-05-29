import {
  Pencil, Trash2, Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark, Bell, Globe,
  Lightbulb, Shield, Check, CheckCircle, Clock, Eye, Home, Inbox,
  Layers, Mail, Map, Megaphone, Palette, Play, Search, Send, Settings,
  Smile, Sparkles, ThumbsUp, TrendingUp, Upload, Users, CheckSquare, X,
  GripVertical,
  type LucideIcon,
} from 'lucide-react';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Dropdown } from '../ui/Dropdown';
import styles from './column-header.module.css';

const ICON_MAP: Record<string, LucideIcon> = {
  check: Check, checkCircle: CheckCircle, star: Star, heart: Heart,
  thumbsUp: ThumbsUp, smile: Smile, sparkles: Sparkles, zap: Zap,
  rocket: Rocket, target: Target, flag: Flag, play: Play,
  trendingUp: TrendingUp, inbox: Inbox, layers: Layers, clock: Clock,
  eye: Eye, search: Search, pencil: Pencil, send: Send, upload: Upload,
  coffee: Coffee, sun: Sun, moon: Moon, cloud: Cloud, flame: Flame,
  music: Music, camera: Camera, gift: Gift, award: Award,
  bookmark: Bookmark, bell: Bell, globe: Globe, lightbulb: Lightbulb,
  shield: Shield, mail: Mail, map: Map, megaphone: Megaphone,
  palette: Palette, users: Users, home: Home, settings: Settings,
};

interface ColumnHeaderProps {
  name: string;
  color: string;
  icon?: string | null;
  taskCount: number;
  selectionMode?: boolean;
  selectedCount?: number;
  allSelected?: boolean;
  dragListeners?: SyntheticListenerMap;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSelectionMode?: () => void;
  onToggleSelectAll?: () => void;
}

export function ColumnHeader({
  name,
  color,
  icon,
  taskCount,
  selectionMode = false,
  selectedCount = 0,
  allSelected = false,
  dragListeners,
  onEdit,
  onDelete,
  onToggleSelectionMode,
  onToggleSelectAll,
}: ColumnHeaderProps) {
  const IconComponent = icon ? ICON_MAP[icon] : null;

  const dropdownItems = [
    {
      label: 'Edit Column',
      icon: <Pencil size={14} />,
      onClick: onEdit,
    },
    {
      label: 'Select Tasks',
      icon: <CheckSquare size={14} />,
      onClick: () => onToggleSelectionMode?.(),
    },
    'divider' as const,
    {
      label: 'Delete Column',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: onDelete,
    },
  ];

  if (selectionMode) {
    return (
      <div className={`${styles.header} ${styles.selectionHeader}`} style={{ backgroundColor: color }}>
        <button
          className={styles.selectAllBtn}
          onClick={onToggleSelectAll}
          aria-label={allSelected ? 'Deselect all' : 'Select all'}
          title={allSelected ? 'Deselect all' : 'Select all'}
        >
          <span className={`${styles.selectAllBox} ${allSelected ? styles.selectAllBoxOn : ''}`}>
            {allSelected && <Check size={11} strokeWidth={3} />}
          </span>
        </button>
        <div className={styles.titleGroup}>
          <h3 className={styles.name}>{selectedCount} of {taskCount} selected</h3>
        </div>
        <button
          className={styles.exitSelectBtn}
          onClick={onToggleSelectionMode}
          aria-label="Exit selection"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.header} style={{ backgroundColor: color }}>
      <span
        className={styles.dragHandle}
        {...(dragListeners ?? {})}
        aria-label="Drag column"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </span>
      <div className={styles.titleGroup}>
        {IconComponent ? (
          <span className={styles.iconWrapper}>
            <IconComponent size={14} />
          </span>
        ) : (
          <span className={styles.dot} />
        )}
        <h3 className={styles.name}>{name}</h3>
      </div>
      <span className={styles.count}>{taskCount}</span>
      <div className={styles.actions}>
        <Dropdown items={dropdownItems} />
      </div>
    </div>
  );
}
