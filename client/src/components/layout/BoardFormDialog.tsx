import { useEffect, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface BoardFormDialogProps {
  open: boolean;
  initialName?: string;
  /** "Rename Board" vs "New Board" — controls title + button label. */
  mode: 'create' | 'rename';
  onClose: () => void;
  onSubmit: (name: string) => Promise<void> | void;
}

export function BoardFormDialog({ open, initialName, mode, onClose, onSubmit }: BoardFormDialogProps) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setName(initialName ?? '');
  }, [open, initialName]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'New Board' : 'Rename Board'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input
          label="Board Name"
          placeholder={mode === 'create' ? 'e.g. Features, Issues, Sprint 1' : 'Board name'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
          autoFocus
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={isSaving} disabled={!name.trim()}>
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
