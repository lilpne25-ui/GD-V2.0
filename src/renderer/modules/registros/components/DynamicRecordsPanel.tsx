import React from 'react';
import EmptyState from '../../../components/EmptyState';
import { toast } from '../../../components/Toast';
import type {
  CreateRecordInput,
  RecordDefinition,
  RecordInstance,
  RecordTransitionOption,
  RecordStatus,
  RecordType,
  RecordValueInput,
  TransitionRecordInput,
  UpdateRecordInput,
} from '../../../../shared/types/registros-dinamicos';
import DynamicRecordForm from './DynamicRecordForm';

type RecordEditMode = 'new' | 'edit';

type SessionUser = {
  id: string;
  nombre: string;
  rol: string;
};

function parseBooleanFlag(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'si', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
}

function resolveActor(): SessionUser {
  const fallback: SessionUser = {
    id: 'system-beta',
    nombre: 'Usuario SGC',
    rol: 'admin',
  };

  try {
    const raw = localStorage.getItem('sgc_session') || localStorage.getItem('session_user') || localStorage.getItem('auth_user');
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as {
      id?: string;
      usuario_id?: string;
      nombre?: string;
      username?: string;
      rol?: string;
      role?: string;
    };

    return {
      id: parsed.id || parsed.usuario_id || fallback.id,
      nombre: parsed.nombre || parsed.username || fallback.nombre,
      rol: parsed.rol || parsed.role || fallback.rol,
    };
  } catch {
    return fallback;
  }
}

function statusLabel(status: RecordStatus): string {
  switch (status) {
    case 'borrador':
      return 'Borrador';
    case 'en_revision':
      return 'En revision';
    case 'aprobado':
      return 'Aprobado';
    case 'rechazado':
      return 'Rechazado';
    case 'obsoleto':
      return 'Obsoleto';
    case 'anulado':
      return 'Anulado';
    default:
      return status;
  }
}

function formatShortDate(value: string): string {
  if (!value) return '-';

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;

  return dt.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatIsoLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function safeErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;

  return fallback;
}

const RECORDS_PAGE_SIZE = 50;

const DynamicRecordsPanel: React.FC = () => {
  const [recordTypes, setRecordTypes] = React.useState<RecordType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = React.useState('');
  const [definition, setDefinition] = React.useState<RecordDefinition | null>(null);
  const [records, setRecords] = React.useState<RecordInstance[]>([]);
  const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(null);
  const [recordTitle, setRecordTitle] = React.useState('');
  const [seedValues, setSeedValues] = React.useState<Record<string, RecordValueInput>>({});
  const [formResetKey, setFormResetKey] = React.useState(0);
  const [mode, setMode] = React.useState<RecordEditMode>('new');
  const [recordsPage, setRecordsPage] = React.useState(0);
  const [recordsTotalPages, setRecordsTotalPages] = React.useState(0);
  const [recordsTotal, setRecordsTotal] = React.useState(0);

  const [loadingTypes, setLoadingTypes] = React.useState(false);
  const [loadingDefinition, setLoadingDefinition] = React.useState(false);
  const [loadingRecords, setLoadingRecords] = React.useState(false);
  const [loadingMoreRecords, setLoadingMoreRecords] = React.useState(false);
  const [loadingTransitions, setLoadingTransitions] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [definitionError, setDefinitionError] = React.useState('');
  const [transitionOptions, setTransitionOptions] = React.useState<RecordTransitionOption[]>([]);

  const actorForAutoDefaults = React.useMemo(() => resolveActor(), [formResetKey]);
  const formAutoContext = React.useMemo(() => {
    const now = new Date();
    return {
      userId: actorForAutoDefaults.id,
      userName: actorForAutoDefaults.nombre,
      today: formatIsoLocalDate(now),
      nowIso: now.toISOString(),
    };
  }, [actorForAutoDefaults.id, actorForAutoDefaults.nombre, formResetKey]);

  const selectedRecord = React.useMemo(
    () => records.find(record => record.id === selectedRecordId) || null,
    [records, selectedRecordId]
  );

  const hasMoreRecords = recordsPage > 0 && recordsPage < recordsTotalPages;
  const readOnlyRecord = Boolean(selectedRecord && selectedRecord.status !== 'borrador');

  const loadTransitions = React.useCallback(async (record: RecordInstance | null) => {
    if (!record) {
      setTransitionOptions([]);
      return;
    }

    const actor = resolveActor();
    setLoadingTransitions(true);

    try {
      const options = await window.records.getTransitions({
        recordId: record.id,
        userId: actor.id,
        role: actor.rol,
      });

      setTransitionOptions(Array.isArray(options) ? options : []);
    } catch {
      setTransitionOptions([]);
    } finally {
      setLoadingTransitions(false);
    }
  }, []);

  const loadRecordTypes = React.useCallback(async () => {
    setLoadingTypes(true);

    try {
      const response = await window.repo.call('RegistroDinamicoRepo', 'listRecordTypes', false);
      const rows = Array.isArray(response) ? (response as RecordType[]) : [];

      setRecordTypes(rows);
      if (rows.length > 0) {
        setSelectedTypeId(prev => (prev && rows.some(row => row.id === prev) ? prev : rows[0].id));
      } else {
        setSelectedTypeId('');
      }
    } catch (error) {
      toast.error(safeErrorMessage(error, 'No fue posible cargar los tipos de registro.'));
      setRecordTypes([]);
      setSelectedTypeId('');
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const refreshRecords = React.useCallback(
    async (typeId: string, preferredSelection: string | null = null) => {
      if (!typeId) {
        setRecords([]);
        setSelectedRecordId(null);
        setRecordsPage(0);
        setRecordsTotalPages(0);
        setRecordsTotal(0);
        return;
      }

      setLoadingRecords(true);
      setLoadingMoreRecords(false);

      try {
        const response = await window.records.getByType({
          recordTypeId: typeId,
          page: 1,
          pageSize: RECORDS_PAGE_SIZE,
          sortBy: 'updatedAt',
          sortDirection: 'desc',
          includeValues: true,
        });

        const rows = response.data || [];
        setRecords(rows);
        setRecordsPage(Number(response.page || 1));
        setRecordsTotalPages(Number(response.totalPages || 0));
        setRecordsTotal(Number(response.total || rows.length));

        setSelectedRecordId(current => {
          const nextSelection = preferredSelection ?? current;

          if (nextSelection && rows.some(record => record.id === nextSelection)) {
            return nextSelection;
          }

          if (preferredSelection && rows.length > 0) {
            return rows[0].id;
          }

          if (rows.length === 0) {
            return null;
          }

          return current && rows.some(record => record.id === current) ? current : null;
        });
      } catch (error) {
        toast.error(safeErrorMessage(error, 'No fue posible cargar la lista de registros.'));
        setRecords([]);
        setSelectedRecordId(null);
        setRecordsPage(0);
        setRecordsTotalPages(0);
        setRecordsTotal(0);
      } finally {
        setLoadingRecords(false);
      }
    },
    []
  );

  const loadMoreRecords = React.useCallback(async () => {
    if (!selectedTypeId || loadingRecords || loadingMoreRecords || !hasMoreRecords) {
      return;
    }

    const nextPage = recordsPage + 1;
    setLoadingMoreRecords(true);

    try {
      const response = await window.records.getByType({
        recordTypeId: selectedTypeId,
        page: nextPage,
        pageSize: RECORDS_PAGE_SIZE,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
        includeValues: true,
      });

      const rows = response.data || [];
      setRecords(previous => {
        const byId = new Map(previous.map(record => [record.id, record]));
        rows.forEach(record => byId.set(record.id, record));
        return Array.from(byId.values());
      });

      setRecordsPage(Number(response.page || nextPage));
      setRecordsTotalPages(Number(response.totalPages || recordsTotalPages));
      setRecordsTotal(Number(response.total || recordsTotal));
    } catch (error) {
      toast.error(safeErrorMessage(error, 'No fue posible cargar mas registros.'));
    } finally {
      setLoadingMoreRecords(false);
    }
  }, [selectedTypeId, loadingRecords, loadingMoreRecords, hasMoreRecords, recordsPage, recordsTotalPages, recordsTotal]);

  const loadDefinitionAndRecords = React.useCallback(
    async (typeId: string) => {
      if (!typeId) {
        setDefinition(null);
        setRecords([]);
        setSelectedRecordId(null);
        setRecordsPage(0);
        setRecordsTotalPages(0);
        setRecordsTotal(0);
        return;
      }

      setLoadingDefinition(true);
      setDefinitionError('');

      try {
        const loadedDefinition = await window.records.getDefinition({ recordTypeId: typeId });

        if (!loadedDefinition) {
          setDefinition(null);
          setDefinitionError('El tipo seleccionado no tiene una definicion activa.');
          setRecords([]);
          setSelectedRecordId(null);
          setRecordsPage(0);
          setRecordsTotalPages(0);
          setRecordsTotal(0);
          return;
        }

        setDefinition(loadedDefinition);
        await refreshRecords(typeId);
      } catch (error) {
        setDefinition(null);
        setRecords([]);
        setSelectedRecordId(null);
        setRecordsPage(0);
        setRecordsTotalPages(0);
        setRecordsTotal(0);
        setDefinitionError(safeErrorMessage(error, 'No se pudo cargar la definicion del tipo.'));
      } finally {
        setLoadingDefinition(false);
      }
    },
    [refreshRecords]
  );

  React.useEffect(() => {
    loadRecordTypes();
  }, [loadRecordTypes]);

  React.useEffect(() => {
    if (!selectedTypeId) {
      setDefinition(null);
      setRecords([]);
      setSelectedRecordId(null);
      setRecordsPage(0);
      setRecordsTotalPages(0);
      setRecordsTotal(0);
      return;
    }

    loadDefinitionAndRecords(selectedTypeId);
  }, [loadDefinitionAndRecords, selectedTypeId]);

  React.useEffect(() => {
    if (!selectedRecord) {
      setMode('new');
      setRecordTitle('');
      setSeedValues({});
      setTransitionOptions([]);
      setFormResetKey(prev => prev + 1);
      return;
    }

    setMode('edit');
    setRecordTitle(selectedRecord.title || '');
    setSeedValues(selectedRecord.fieldValues || {});
    void loadTransitions(selectedRecord);
    setFormResetKey(prev => prev + 1);
  }, [loadTransitions, selectedRecord]);

  const handleCreateNew = () => {
    setSelectedRecordId(null);
    setMode('new');
    setRecordTitle('');
    setSeedValues({});
    setFormResetKey(prev => prev + 1);
  };

  const handleSubmit = async (values: Record<string, RecordValueInput>) => {
    if (!definition) return;

    const actor = resolveActor();
    setSubmitting(true);

    try {
      if (mode === 'edit' && selectedRecord) {
        const payload: UpdateRecordInput = {
          recordId: selectedRecord.id,
          title: recordTitle.trim(),
          values,
          updatedBy: actor.id,
          updatedByName: actor.nombre,
          role: actor.rol,
          comment: 'Actualizacion desde modulo beta de registros dinamicos.',
          metadata: {
            source: 'renderer.dynamic-beta',
          },
        };

        await window.records.update(payload);
        toast.success('Registro actualizado correctamente.');
        await refreshRecords(definition.recordType.id, selectedRecord.id);
        return;
      }

      const createPayload: CreateRecordInput = {
        recordTypeId: definition.recordType.id,
        title: recordTitle.trim(),
        values,
        createdBy: actor.id,
        createdByName: actor.nombre,
        role: actor.rol,
        source: 'dynamic',
        metadata: {
          source: 'renderer.dynamic-beta',
        },
      };

      const createdId = await window.records.create(createPayload);
      toast.success('Registro creado correctamente.');
      await refreshRecords(definition.recordType.id, createdId);
    } catch (error) {
      toast.error(safeErrorMessage(error, 'No fue posible guardar el registro.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (option: RecordTransitionOption) => {
    if (!definition || !selectedRecord) return;

    const actor = resolveActor();
    setSubmitting(true);

    try {
      const payload: TransitionRecordInput = {
        recordId: selectedRecord.id,
        toStatus: option.toStatus,
        action: option.action,
        comments: `Transicion ejecutada desde modulo beta: ${option.label}.`,
        performedBy: actor.id,
        performedByName: actor.nombre,
        role: actor.rol,
      };

      await window.records.transition(payload);
      toast.success(`Transicion aplicada: ${option.label}.`);
      await refreshRecords(definition.recordType.id, selectedRecord.id);
      await loadTransitions({ ...selectedRecord, status: option.toStatus });
    } catch (error) {
      toast.error(safeErrorMessage(error, 'No fue posible aplicar la transicion.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTypes) {
    return (
      <div className="dr-shell">
        <EmptyState
          icon="clock"
          title="Cargando tipos de registro"
          description="Un momento, estamos consultando la configuracion del motor dinamico."
        />
      </div>
    );
  }

  if (!recordTypes.length) {
    return (
      <div className="dr-shell">
        <EmptyState
          icon="registry"
          title="Motor dinamico sin tipos configurados"
          description="Aun no existen tipos de registro en base de datos. Crea uno desde administracion para empezar."
        />
      </div>
    );
  }

  return (
    <div className="dr-shell" aria-label="Registros dinamicos beta">
      <aside className="dr-sidebar" aria-label="Lista de registros">
        <div className="dr-sidebar-header">
          <h3>Registros Dinamicos</h3>
          <span>BETA</span>
        </div>

        <label className="dr-type-picker" htmlFor="dr-type-picker">
          <span>Tipo de registro</span>
          <select
            id="dr-type-picker"
            className="dr-input"
            value={selectedTypeId}
            onChange={event => setSelectedTypeId(event.target.value)}
            aria-label="Seleccionar tipo de registro"
          >
            {recordTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </label>

        <div className="dr-sidebar-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => refreshRecords(selectedTypeId)}>
            Refrescar
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateNew}>
            Nuevo
          </button>
        </div>

        <div className="dr-record-list" role="list" aria-label="Registros del tipo seleccionado">
          {loadingRecords ? (
            <p className="dr-muted">Cargando registros...</p>
          ) : records.length === 0 ? (
            <p className="dr-muted">No hay registros para este tipo.</p>
          ) : (
            <>
              {records.map(record => (
                <button
                  key={record.id}
                  type="button"
                  role="listitem"
                  className={`dr-record-item${record.id === selectedRecordId ? ' dr-record-item--active' : ''}`}
                  onClick={() => setSelectedRecordId(record.id)}
                >
                  <strong>{record.title || 'Sin titulo'}</strong>
                  <small>{formatShortDate(record.updatedAt)}</small>
                  <span className={`dr-status dr-status--${record.status}`}>{statusLabel(record.status)}</span>
                </button>
              ))}

              <p className="dr-muted">Mostrando {records.length} de {recordsTotal} registros.</p>

              {hasMoreRecords && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void loadMoreRecords()}
                  disabled={loadingMoreRecords}
                >
                  {loadingMoreRecords ? 'Cargando mas...' : 'Cargar mas'}
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      <section className="dr-main" aria-label="Detalle del registro dinamico">
        {loadingDefinition ? (
          <EmptyState
            icon="clock"
            title="Cargando definicion"
            description="Estamos preparando el formulario dinamico para el tipo seleccionado."
          />
        ) : definitionError ? (
          <EmptyState
            icon="warning"
            title="No se pudo cargar la definicion"
            description={definitionError}
          />
        ) : !definition ? (
          <EmptyState
            icon="document"
            title="Sin definicion activa"
            description="Selecciona otro tipo o activa la version vigente de esta plantilla."
          />
        ) : (
          <>
            <header className="dr-main-header">
              <div>
                <h3>{definition.recordType.name}</h3>
                <p>{definition.recordType.description || 'Formulario dinamico configurado desde base de datos.'}</p>
              </div>

              <div className="dr-main-actions">
                {mode === 'edit' && selectedRecord && (
                  <span className={`dr-status dr-status--${selectedRecord.status}`}>
                    {statusLabel(selectedRecord.status)}
                  </span>
                )}

                {mode === 'edit' && selectedRecord && transitionOptions
                  .filter(option => option.allowed)
                  .map(option => (
                    <button
                      key={`${option.fromStatus}-${option.toStatus}`}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void handleTransition(option)}
                      disabled={submitting}
                      title={option.requiresApprover ? 'Requiere rol aprobador' : option.label}
                    >
                      {option.label}
                    </button>
                  ))}
              </div>
            </header>

            {mode === 'edit' && loadingTransitions && (
              <div className="dr-muted" role="status">Consultando transiciones disponibles...</div>
            )}

            {readOnlyRecord && (
              <div className="dr-readonly-note" role="status">
                El registro seleccionado esta en estado <strong>{statusLabel(selectedRecord!.status)}</strong>. Solo se permite lectura.
              </div>
            )}

            <DynamicRecordForm
              key={`${definition.recordType.id}-${formResetKey}`}
              definition={definition}
              initialValues={seedValues}
              autoContext={formAutoContext}
              titleValue={recordTitle}
              onTitleChange={setRecordTitle}
              submitting={submitting}
              readOnly={readOnlyRecord}
              submitLabel={mode === 'edit' ? 'Actualizar borrador' : 'Crear borrador'}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </section>
    </div>
  );
};

export function isDynamicRecordsFeatureEnabled(): boolean {
  const envValue = parseBooleanFlag((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SGC_ENABLE_DYNAMIC_RECORDS);
  const storageValue = parseBooleanFlag(localStorage.getItem('SGC_ENABLE_DYNAMIC_RECORDS'));
  const legacyStorageValue = parseBooleanFlag(localStorage.getItem('sgc.enableDynamicRecords'));
  const isLocalDevHost = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (storageValue !== null) return storageValue;
  if (legacyStorageValue !== null) return legacyStorageValue;
  if (isLocalDevHost) return true;
  return envValue === true;
}

export default DynamicRecordsPanel;
