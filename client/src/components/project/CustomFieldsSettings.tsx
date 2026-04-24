import { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, X } from 'lucide-react';
import * as customFieldsApi from '../../api/custom-fields.api';
import type { CustomField } from '../../api/custom-fields.api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';
import styles from './custom-fields-settings.module.css';

const FIELD_TYPES = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'text_small', label: 'Short Text' },
  { value: 'text_large', label: 'Long Text' },
  { value: 'checklist', label: 'Checklist' },
];

interface CustomFieldsSettingsProps {
  projectId: string;
}

export function CustomFieldsSettings({ projectId }: CustomFieldsSettingsProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomField['type']>('text_small');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    customFieldsApi.listFields(projectId).then((f) => {
      setFields(f);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [projectId]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsCreating(true);
    try {
      const field = await customFieldsApi.createField(projectId, {
        name: trimmed,
        type: newType,
        options: newType === 'dropdown' ? ['Option 1'] : undefined,
        showOnCard: false,
      });
      setFields((prev) => [...prev, field]);
      setNewName('');
      setNewType('text_small');
      setShowAdd(false);
      setExpandedId(field.id);
    } catch {} finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (fieldId: string, data: Parameters<typeof customFieldsApi.updateField>[1]) => {
    try {
      const updated = await customFieldsApi.updateField(fieldId, data);
      setFields((prev) => prev.map((f) => (f.id === fieldId ? updated : f)));
    } catch {}
  };

  const handleDelete = async (fieldId: string) => {
    if (!window.confirm('Delete this custom field? Values on all tasks will be lost.')) return;
    try {
      await customFieldsApi.deleteField(fieldId);
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
    } catch {}
  };

  if (isLoading) return <p className={styles.empty}>Loading...</p>;

  return (
    <div className={styles.container}>
      {fields.length === 0 && !showAdd && (
        <p className={styles.empty}>No custom fields yet. Add fields to customize task cards.</p>
      )}

      <div className={styles.fieldList}>
        {fields.map((field) => {
          const isExpanded = expandedId === field.id;
          return (
            <div key={field.id} className={styles.fieldCard}>
              <div className={styles.fieldHeader} onClick={() => setExpandedId(isExpanded ? null : field.id)}>
                <div className={styles.fieldHeaderLeft}>
                  <span className={styles.fieldName}>{field.name}</span>
                  <span className={styles.fieldTypeBadge}>{FIELD_TYPES.find((t) => t.value === field.type)?.label}</span>
                  {field.showOnCard && <span className={styles.cardBadge}>Card</span>}
                  {!field.isEnabled && <span className={styles.disabledBadge}>Disabled</span>}
                </div>
                {isExpanded ? <ChevronUp size={14} className={styles.chevron} /> : <ChevronDown size={14} className={styles.chevron} />}
              </div>

              {isExpanded && (
                <FieldEditor
                  field={field}
                  onUpdate={(data) => handleUpdate(field.id, data)}
                  onDelete={() => handleDelete(field.id)}
                />
              )}
            </div>
          );
        })}
      </div>

      {showAdd ? (
        <div className={styles.addForm}>
          <Input
            label="Field Name"
            placeholder="e.g. Color, Status, Sprint"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowAdd(false); }}
            autoFocus
          />
          <div>
            <label className={styles.formLabel}>Type</label>
            <CustomSelect
              value={newType}
              onChange={(v) => setNewType(v as CustomField['type'])}
              options={FIELD_TYPES}
            />
          </div>
          <div className={styles.addFormActions}>
            <Button size="sm" variant="secondary" onClick={() => { setShowAdd(false); setNewName(''); }}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} loading={isCreating} disabled={!newName.trim()}>Add Field</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Custom Field
        </Button>
      )}
    </div>
  );
}

// --- Field Editor ---

function FieldEditor({ field, onUpdate, onDelete }: {
  field: CustomField;
  onUpdate: (data: Parameters<typeof customFieldsApi.updateField>[1]) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(field.name);
  const [options, setOptions] = useState<string[]>(field.options ?? []);
  const [newOption, setNewOption] = useState('');

  const handleSaveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== field.name) onUpdate({ name: trimmed });
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    const updated = [...options, trimmed];
    setOptions(updated);
    setNewOption('');
    onUpdate({ options: updated });
  };

  const handleRemoveOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    onUpdate({ options: updated });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.editorField}>
        <label className={styles.formLabel}>Name</label>
        <input
          className={styles.editorInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
        />
      </div>

      <div className={styles.editorField}>
        <label className={styles.formLabel}>Type</label>
        <CustomSelect
          value={field.type}
          onChange={(v) => onUpdate({ type: v as CustomField['type'] })}
          options={FIELD_TYPES}
        />
      </div>

      {field.type === 'dropdown' && (
        <div className={styles.editorField}>
          <label className={styles.formLabel}>Options</label>
          <div className={styles.optionsList}>
            {options.map((opt, i) => (
              <div key={i} className={styles.optionChip}>
                <span>{opt}</span>
                <button className={styles.optionRemoveBtn} onClick={() => handleRemoveOption(i)} type="button">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className={styles.optionAddRow}>
            <input
              className={styles.editorInput}
              placeholder="New option..."
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
            />
            <Button size="sm" variant="secondary" onClick={handleAddOption} disabled={!newOption.trim()}>Add</Button>
          </div>
        </div>
      )}

      <div className={styles.editorSwitches}>
        <button
          type="button"
          className={`${styles.switchBtn} ${field.showOnCard ? styles.switchActive : ''}`}
          onClick={() => onUpdate({ showOnCard: !field.showOnCard })}
        >
          <Eye size={13} />
          Show on card
        </button>
        <button
          type="button"
          className={`${styles.switchBtn} ${field.isEnabled ? styles.switchActive : ''}`}
          onClick={() => onUpdate({ isEnabled: !field.isEnabled })}
        >
          {field.isEnabled ? <Eye size={13} /> : <EyeOff size={13} />}
          {field.isEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <div className={styles.editorFooter}>
        <Button size="sm" variant="danger" onClick={onDelete}>
          <Trash2 size={13} /> Delete Field
        </Button>
      </div>
    </div>
  );
}
