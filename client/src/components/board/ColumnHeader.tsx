import {
  Pencil, Trash2, Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark, Bell, Globe,
  Lightbulb, Shield, Check, CheckCircle, Clock, Eye, Home, Inbox,
  Layers, Mail, Map, Megaphone, Palette, Play, Search, Send, Settings,
  Smile, Sparkles, ThumbsUp, TrendingUp, Upload, Users,
} from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import styles from './column-header.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
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
  onEdit: () => void;
  onDelete: () => void;
}

export function ColumnHeader({
  name,
  color,
  icon,
  taskCount,
  onEdit,
  onDelete,
}: ColumnHeaderProps) {
  const IconComponent = icon ? ICON_MAP[icon] : null;

  const dropdownItems = [
    {
      label: 'Edit Column',
      icon: <Pencil size={14} />,
      onClick: onEdit,
    },
    'divider' as const,
    {
      label: 'Delete Column',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: onDelete,
    },
  ];

  return (
    <div className={styles.header} style={{ backgroundColor: color }}>
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
