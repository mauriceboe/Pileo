import { useState, useEffect } from 'react';
import { Sliders, SlidersHorizontal } from 'lucide-react';
import * as customFieldsApi from '../../api/custom-fields.api';
import type { CustomField } from '../../api/custom-fields.api';
import { CustomSelect } from '../ui/CustomSelect';
import styles from './task-custom-fields.module.css';

interface TaskCustomFieldsProps {
  taskId: string;
  projectId: string;
  headerClassName?: string;
  headerIconClassName?: string;
  headerTitleClassName?: string;
  sectionClassName?: string;
}

export function TaskCustomFields({
  taskId,
  projectId,
  headerClassName,
  headerIconClassName,
  headerTitleClassName,
  sectionClassName,
}: TaskCustomFieldsProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Map<string, string>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      customFieldsApi.listFields(projectId),
      customFieldsApi.getTaskValues(taskId),
    ]).then(([fieldList, valueList]) => {
      if (cancelled) return;
      setFields(fieldList.filter((f) => f.isEnabled));
      const map = new Map<string, string>();
      for (const v of valueList) map.set(v.fieldId, v.value);
      setValues(map);
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));
    return () => { cancelled = true; };
  }, [taskId, projectId]);

  const handleChange = async (fieldId: string, value: string) => {
    setValues((prev) => new Map(prev).set(fieldId, value));
    if (value) {
      await customFieldsApi.setTaskValue(taskId, fieldId, value);
    } else {
      await customFieldsApi.deleteTaskValue(taskId, fieldId);
    }
  };

  if (!isLoaded || fields.length === 0) return null;

  return (
    <div className={sectionClassName}>
      {headerClassName && (
        <div className={headerClassName}>
          <span className={headerIconClassName}>
            <SlidersHorizontal size={15} />
          </span>
          <h4 className={headerTitleClassName}>Custom Fields</h4>
        </div>
      )}
      <div className={styles.container}>
      {fields.map((field) => {
        const value = values.get(field.id) ?? '';

        return (
          <div key={field.id} className={styles.field}>
            <label className={styles.fieldLabel}>
              <Sliders size={12} />
              {field.name}
            </label>

            {field.type === 'dropdown' && (
              <CustomSelect
                value={value}
                onChange={(v) => handleChange(field.id, v)}
                options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
                placeholder="Select..."
              />
            )}

            {field.type === 'text_small' && (
              <input
                className={styles.textInput}
                value={value}
                onChange={(e) => setValues((prev) => new Map(prev).set(field.id, e.target.value))}
                onBlur={() => handleChange(field.id, value)}
                placeholder="Enter value..."
              />
            )}

            {field.type === 'text_large' && (
              <textarea
                className={styles.textArea}
                value={value}
                onChange={(e) => setValues((prev) => new Map(prev).set(field.id, e.target.value))}
                onBlur={() => handleChange(field.id, value)}
                placeholder="Enter text..."
                rows={3}
              />
            )}

            {field.type === 'checklist' && (
              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={value === 'true'}
                  onChange={(e) => handleChange(field.id, e.target.checked ? 'true' : '')}
                />
                <span>{value === 'true' ? 'Done' : 'Not done'}</span>
              </label>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
