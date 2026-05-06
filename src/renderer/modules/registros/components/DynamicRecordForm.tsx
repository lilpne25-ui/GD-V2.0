import React from 'react';
import { toast } from '../../../components/Toast';
import type {
  RecordDefinition,
  RecordField,
  RecordValueInput,
} from '../../../../shared/types/registros-dinamicos';

type DynamicRecordFormProps = {
  definition: RecordDefinition;
  initialValues: Record<string, RecordValueInput>;
  autoContext?: DynamicRecordAutoContext;
  titleValue: string;
  onTitleChange: (next: string) => void;
  submitting: boolean;
  readOnly?: boolean;
  submitLabel: string;
  onSubmit: (values: Record<string, RecordValueInput>) => Promise<void>;
};

type ErrorMap = Record<string, string>;

type DynamicRecordAutoContext = {
  userId?: string;
  userName?: string;
  today?: string;
  nowIso?: string;
};

const AUTO_DEFAULT_TOKENS = new Set<string>([
  '@@actor.id',
  '@@actor.name',
  '@@now.date',
  '@@now.iso',
  '{{current_user_id}}',
  '{{current_user_name}}',
  '{{today}}',
  '{{current_date}}',
  '{{now_iso}}',
  '{{usuario_actual_id}}',
  '{{usuario_actual_nombre}}',
  '{{fecha_hoy}}',
]);

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function isAutoDefaultToken(value: RecordValueInput): value is string {
  if (typeof value !== 'string') return false;
  return AUTO_DEFAULT_TOKENS.has(normalizeToken(value));
}

function resolveAutoDefaultToken(value: string, context?: DynamicRecordAutoContext): string {
  if (!context) return value;

  const token = normalizeToken(value);
  if (token === '@@actor.id' || token === '{{current_user_id}}' || token === '{{usuario_actual_id}}') {
    return context.userId || '';
  }

  if (token === '@@actor.name' || token === '{{current_user_name}}' || token === '{{usuario_actual_nombre}}') {
    return context.userName || '';
  }

  if (token === '@@now.date' || token === '{{today}}' || token === '{{current_date}}' || token === '{{fecha_hoy}}') {
    return context.today || '';
  }

  if (token === '@@now.iso' || token === '{{now_iso}}') {
    return context.nowIso || '';
  }

  return value;
}

function normalizeTextValue(value: RecordValueInput | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function normalizeNumberValue(value: RecordValueInput | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'string') return value;
  return '';
}

function normalizeCheckboxValue(value: RecordValueInput | undefined): boolean {
  return value === true;
}

function normalizeFieldDefault(field: RecordField): RecordValueInput {
  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
    return field.defaultValue;
  }

  if (field.fieldType === 'checkbox') return false;
  return '';
}

function getInitialValues(
  definition: RecordDefinition,
  seed: Record<string, RecordValueInput>,
  autoContext?: DynamicRecordAutoContext
): Record<string, RecordValueInput> {
  const values: Record<string, RecordValueInput> = {};

  definition.fields
    .filter(field => field.isActive)
    .forEach(field => {
      const seedValue = seed[field.fieldKey];
      if (seedValue !== undefined) {
        values[field.fieldKey] = seedValue;
        return;
      }

      const rawDefault = normalizeFieldDefault(field);
      if (isAutoDefaultToken(rawDefault)) {
        values[field.fieldKey] = resolveAutoDefaultToken(rawDefault, autoContext);
        return;
      }

      values[field.fieldKey] = rawDefault;
    });

  return values;
}

function isEmptyValue(field: RecordField, value: RecordValueInput | undefined): boolean {
  if (field.fieldType === 'checkbox') {
    return value !== true;
  }

  if (value === null || value === undefined) return true;

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (typeof value === 'number') {
    return !Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

function validateField(field: RecordField, value: RecordValueInput | undefined): string {
  if (field.required && isEmptyValue(field, value)) {
    return 'Este campo es obligatorio.';
  }

  if (field.fieldType === 'number') {
    if (value === '' || value === null || value === undefined) return '';

    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      return 'Debe capturar un numero valido.';
    }

    if (field.validation.min !== undefined && parsed < field.validation.min) {
      return `El valor minimo es ${field.validation.min}.`;
    }

    if (field.validation.max !== undefined && parsed > field.validation.max) {
      return `El valor maximo es ${field.validation.max}.`;
    }
  }

  if ((field.fieldType === 'text' || field.fieldType === 'textarea') && typeof value === 'string') {
    const txt = value.trim();

    if (field.validation.minLength !== undefined && txt.length < field.validation.minLength && txt.length > 0) {
      return `Debe capturar al menos ${field.validation.minLength} caracteres.`;
    }

    if (field.validation.maxLength !== undefined && txt.length > field.validation.maxLength) {
      return `Debe capturar maximo ${field.validation.maxLength} caracteres.`;
    }

    if (field.validation.pattern) {
      try {
        const pattern = new RegExp(field.validation.pattern);
        if (txt && !pattern.test(txt)) {
          return field.validation.message || 'El formato del campo no es valido.';
        }
      } catch {
        // Ignorar regex invalidas de configuracion para no bloquear UI.
      }
    }
  }

  return '';
}

const DynamicRecordForm: React.FC<DynamicRecordFormProps> = ({
  definition,
  initialValues,
  autoContext,
  titleValue,
  onTitleChange,
  submitting,
  readOnly = false,
  submitLabel,
  onSubmit,
}) => {
  const activeFields = React.useMemo(
    () => definition.fields.filter(field => field.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [definition.fields]
  );

  const [values, setValues] = React.useState<Record<string, RecordValueInput>>(() => getInitialValues(definition, initialValues, autoContext));
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    setValues(getInitialValues(definition, initialValues, autoContext));
    setTouched({});
    setSubmitted(false);
  }, [definition, initialValues, autoContext]);

  const errors = React.useMemo(() => {
    const map: ErrorMap = {};

    if (!titleValue.trim()) {
      map.__title__ = 'El titulo del registro es obligatorio.';
    }

    activeFields.forEach(field => {
      const message = validateField(field, values[field.fieldKey]);
      if (message) {
        map[field.fieldKey] = message;
      }
    });

    return map;
  }, [activeFields, titleValue, values]);

  const setFieldValue = (fieldKey: string, value: RecordValueInput) => {
    setValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const setFieldTouched = (fieldKey: string) => {
    setTouched(prev => ({ ...prev, [fieldKey]: true }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    const errorCount = Object.keys(errors).length;
    if (errorCount > 0) {
      toast.warning('Revisa los campos obligatorios antes de guardar.');
      return;
    }

    await onSubmit(values);
  };

  const renderFieldControl = (field: RecordField) => {
    const fieldId = `dr-field-${field.fieldKey}`;
    const value = values[field.fieldKey];
    const disabled = readOnly || field.fieldType === 'computed' || isAutoDefaultToken(field.defaultValue);
    const errorMessage = submitted || touched[field.fieldKey] ? errors[field.fieldKey] : '';

    if (field.fieldType === 'textarea') {
      return (
        <textarea
          id={fieldId}
          className={`dr-input dr-input--textarea${errorMessage ? ' dr-input--error' : ''}`}
          value={normalizeTextValue(value)}
          onChange={event => setFieldValue(field.fieldKey, event.target.value)}
          onBlur={() => setFieldTouched(field.fieldKey)}
          placeholder={field.placeholder || ''}
          disabled={disabled}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
          rows={4}
        />
      );
    }

    if (field.fieldType === 'select') {
      return (
        <select
          id={fieldId}
          className={`dr-input${errorMessage ? ' dr-input--error' : ''}`}
          value={normalizeTextValue(value)}
          onChange={event => setFieldValue(field.fieldKey, event.target.value)}
          onBlur={() => setFieldTouched(field.fieldKey)}
          disabled={disabled}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
        >
          <option value="">Selecciona una opcion</option>
          {field.options.map(option => (
            <option key={`${field.fieldKey}-${option.value}`} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.fieldType === 'number') {
      return (
        <input
          id={fieldId}
          className={`dr-input${errorMessage ? ' dr-input--error' : ''}`}
          type="number"
          inputMode="decimal"
          value={normalizeNumberValue(value)}
          onChange={event => {
            const raw = event.target.value;
            if (raw === '') {
              setFieldValue(field.fieldKey, '');
              return;
            }
            const parsed = Number(raw);
            setFieldValue(field.fieldKey, Number.isFinite(parsed) ? parsed : raw);
          }}
          onBlur={() => setFieldTouched(field.fieldKey)}
          placeholder={field.placeholder || ''}
          disabled={disabled}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
          min={field.validation.min}
          max={field.validation.max}
          step="any"
        />
      );
    }

    if (field.fieldType === 'date') {
      return (
        <input
          id={fieldId}
          className={`dr-input${errorMessage ? ' dr-input--error' : ''}`}
          type="date"
          value={normalizeTextValue(value)}
          onChange={event => setFieldValue(field.fieldKey, event.target.value)}
          onBlur={() => setFieldTouched(field.fieldKey)}
          disabled={disabled}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
        />
      );
    }

    if (field.fieldType === 'checkbox') {
      return (
        <label className="dr-checkbox-wrap" htmlFor={fieldId}>
          <input
            id={fieldId}
            className="dr-checkbox"
            type="checkbox"
            checked={normalizeCheckboxValue(value)}
            onChange={event => setFieldValue(field.fieldKey, event.target.checked)}
            onBlur={() => setFieldTouched(field.fieldKey)}
            disabled={disabled}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
          />
          <span>Marcado</span>
        </label>
      );
    }

    return (
      <input
        id={fieldId}
        className={`dr-input${errorMessage ? ' dr-input--error' : ''}`}
        type="text"
        value={normalizeTextValue(value)}
        onChange={event => setFieldValue(field.fieldKey, event.target.value)}
        onBlur={() => setFieldTouched(field.fieldKey)}
        placeholder={field.placeholder || ''}
        disabled={disabled}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
      />
    );
  };

  return (
    <form className="dr-form" onSubmit={handleSubmit}>
      <div className="dr-form-title">
        <label htmlFor="dr-record-title">Titulo del registro</label>
        <input
          id="dr-record-title"
          className={`dr-input${(submitted || touched.__title__) && errors.__title__ ? ' dr-input--error' : ''}`}
          type="text"
          value={titleValue}
          onChange={event => onTitleChange(event.target.value)}
          onBlur={() => setFieldTouched('__title__')}
          placeholder="Ej. Mantenimiento switch planta norte"
          disabled={readOnly || submitting}
          aria-invalid={Boolean((submitted || touched.__title__) && errors.__title__)}
          aria-describedby={(submitted || touched.__title__) && errors.__title__ ? 'dr-title-error' : undefined}
        />
        {(submitted || touched.__title__) && errors.__title__ && (
          <small id="dr-title-error" className="dr-field-error" role="alert">{errors.__title__}</small>
        )}
      </div>

      <div className="dr-form-grid">
        {activeFields.map(field => {
          const fieldId = `dr-field-${field.fieldKey}`;
          const errorMessage = submitted || touched[field.fieldKey] ? errors[field.fieldKey] : '';

          return (
            <div key={field.id} className={`dr-field dr-field--${field.fieldType}`}>
              <label htmlFor={fieldId} className="dr-label">
                {field.label}
                {field.required && <span className="dr-required" aria-hidden="true"> *</span>}
              </label>

              {renderFieldControl(field)}

              {field.helpText && <small className="dr-help">{field.helpText}</small>}
              {errorMessage && (
                <small id={`${fieldId}-error`} className="dr-field-error" role="alert">{errorMessage}</small>
              )}
            </div>
          );
        })}
      </div>

      <div className="dr-form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting || readOnly}>
          {submitting ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default DynamicRecordForm;
