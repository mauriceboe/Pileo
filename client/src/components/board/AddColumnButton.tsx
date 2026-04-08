import { useState } from 'react';
import { Plus } from 'lucide-react';
import { DEFAULT_COLUMN_COLORS } from '@pileo/shared';
import { useBoardStore } from '../../stores/board.store';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ColorPicker } from '../ui/ColorPicker';
import styles from './add-column-button.module.css';
import editStyles from './edit-column-dialog.module.css';

// Same icon list as Column.tsx
import {
  Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark,
  Bell, Globe, Lightbulb, Shield, Check, CheckCircle,
  Clock, Eye, Home, Inbox, Layers, Mail, Map, Megaphone,
  Palette, Pencil, Play, Search, Send, Settings, Smile,
  Sparkles, ThumbsUp, TrendingUp, Upload, Users,
} from 'lucide-react';

const COLUMN_ICONS = [
  { name: 'check', icon: Check }, { name: 'checkCircle', icon: CheckCircle },
  { name: 'star', icon: Star }, { name: 'heart', icon: Heart },
  { name: 'thumbsUp', icon: ThumbsUp }, { name: 'smile', icon: Smile },
  { name: 'sparkles', icon: Sparkles }, { name: 'zap', icon: Zap },
  { name: 'rocket', icon: Rocket }, { name: 'target', icon: Target },
  { name: 'flag', icon: Flag }, { name: 'play', icon: Play },
  { name: 'trendingUp', icon: TrendingUp }, { name: 'inbox', icon: Inbox },
  { name: 'layers', icon: Layers }, { name: 'clock', icon: Clock },
  { name: 'eye', icon: Eye }, { name: 'search', icon: Search },
  { name: 'pencil', icon: Pencil }, { name: 'send', icon: Send },
  { name: 'upload', icon: Upload }, { name: 'coffee', icon: Coffee },
  { name: 'sun', icon: Sun }, { name: 'moon', icon: Moon },
  { name: 'cloud', icon: Cloud }, { name: 'flame', icon: Flame },
  { name: 'music', icon: Music }, { name: 'camera', icon: Camera },
  { name: 'gift', icon: Gift }, { name: 'award', icon: Award },
  { name: 'bookmark', icon: Bookmark }, { name: 'bell', icon: Bell },
  { name: 'globe', icon: Globe }, { name: 'lightbulb', icon: Lightbulb },
  { name: 'shield', icon: Shield }, { name: 'mail', icon: Mail },
  { name: 'map', icon: Map }, { name: 'megaphone', icon: Megaphone },
  { name: 'palette', icon: Palette }, { name: 'users', icon: Users },
  { name: 'home', icon: Home }, { name: 'settings', icon: Settings },
];

interface AddColumnButtonProps {
  boardId: string;
}

export function AddColumnButton({ boardId }: AddColumnButtonProps) {
  const addColumn = useBoardStore((state) => state.addColumn);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_COLUMN_COLORS[0]);
  const [icon, setIcon] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await addColumn(boardId, { name: name.trim(), color, icon: icon || undefined });
      setName('');
      setColor(DEFAULT_COLUMN_COLORS[0] as string);
      setIcon('');
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setColor(DEFAULT_COLUMN_COLORS[0] as string);
    setIcon('');
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') { event.preventDefault(); handleSubmit(); }
    if (event.key === 'Escape') { handleCancel(); }
  };

  if (!isOpen) {
    return (
      <div className={styles.container}>
        <button className={styles.addButton} onClick={() => setIsOpen(true)} type="button">
          <Plus size={18} />
          Add Column
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.inlineForm}>
        <Input
          placeholder="Column name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <div>
          <label className={styles.fieldLabel}>Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div>
          <label className={styles.fieldLabel}>Icon (optional)</label>
          <div className={editStyles.iconGrid}>
            <button
              type="button"
              className={`${editStyles.iconOption} ${!icon ? editStyles.iconSelected : ''}`}
              onClick={() => setIcon('')}
              title="No icon"
            >
              —
            </button>
            {COLUMN_ICONS.map(({ name: n, icon: Icon }) => (
              <button
                key={n}
                type="button"
                className={`${editStyles.iconOption} ${icon === n ? editStyles.iconSelected : ''}`}
                onClick={() => setIcon(n)}
                title={n}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
        <div className={styles.formActions}>
          <Button size="sm" onClick={handleSubmit} loading={isSaving}>Add</Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
