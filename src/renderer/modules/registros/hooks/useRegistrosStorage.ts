import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_DOC_HTML, STORAGE_KEY } from '../constants';
import type { Registro, RegistroTemplate, RegistroTipo } from '../types';

const uid = () => `reg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const ensureRectangular = (headers: string[], rows: string[][]): string[][] => {
  const cols = Math.max(headers.length, 1);
  if (rows.length === 0) return [Array.from({ length: cols }, () => '')];
  return rows.map(row => {
    const next = [...row];
    while (next.length < cols) next.push('');
    return next.slice(0, cols);
  });
};

const createEmptyRegistro = (nombre = 'Nuevo registro', tipo: RegistroTipo = 'hoja'): Registro => ({
  id: uid(),
  nombre,
  tipo,
  encabezados: ['Columna A', 'Columna B', 'Columna C'],
  filas: [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ],
  contenidoHtml: DEFAULT_DOC_HTML,
  updatedAt: new Date().toISOString(),
});

const createTemplateRegistro = (nombre: string, template: RegistroTemplate, tipo: RegistroTipo): Registro => {
  if (tipo === 'documento') {
    const base = createEmptyRegistro(nombre || 'Documento', 'documento');
    if (template === 'bitacora') {
      base.contenidoHtml = '<h2>Bitácora diaria</h2><p>Fecha:</p><p>Responsable:</p><h3>Actividades</h3><ul><li></li></ul><h3>Observaciones</h3><p></p>';
    }
    return base;
  }

  const base = createEmptyRegistro(nombre || 'Hoja', 'hoja');
  if (template === 'bitacora') {
    base.encabezados = ['Fecha', 'Responsable', 'Actividad', 'Estatus', 'Observaciones'];
    base.filas = [
      ['', '', '', 'Pendiente', ''],
      ['', '', '', 'En proceso', ''],
      ['', '', '', 'Completado', ''],
    ];
  } else if (template === 'asistencia') {
    base.encabezados = ['Fecha', 'Empleado', 'Hora entrada', 'Hora salida', 'Asistencia'];
    base.filas = [
      ['', '', '', '', 'Sí'],
      ['', '', '', '', 'Sí'],
      ['', '', '', '', 'No'],
    ];
  } else if (template === 'inspeccion') {
    base.encabezados = ['Ítem', 'Criterio', 'Resultado', 'Evidencia', 'Acción'];
    base.filas = [
      ['1', '', 'OK', '', ''],
      ['2', '', 'NC', '', ''],
      ['3', '', 'OK', '', ''],
    ];
  }

  base.filas = ensureRectangular(base.encabezados, base.filas);
  return base;
};

const normalizeRegistro = (raw: unknown): Registro | null => {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<Registro>;
  if (typeof obj.id !== 'string' || typeof obj.nombre !== 'string') return null;

  const tipo: RegistroTipo = obj.tipo === 'documento' ? 'documento' : 'hoja';

  const encabezados = Array.isArray(obj.encabezados)
    ? obj.encabezados.filter((x): x is string => typeof x === 'string').map((x: string) => x || 'Sin título')
    : [];

  const headers = encabezados.length > 0 ? encabezados : ['Columna A'];

  const filasBase = Array.isArray(obj.filas) ? obj.filas : [];
  const filas = filasBase.map((row: unknown) => {
    const arr = Array.isArray(row) ? row : [];
    return headers.map((_: string, idx: number) => {
      const value = arr[idx];
      return typeof value === 'string' ? value : '';
    });
  });

  return {
    id: obj.id,
    nombre: obj.nombre || 'Registro sin nombre',
    tipo,
    encabezados: headers,
    filas: ensureRectangular(headers, filas),
    contenidoHtml: typeof obj.contenidoHtml === 'string' ? obj.contenidoHtml : DEFAULT_DOC_HTML,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
};

const loadFromStorage = (): Registro[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createEmptyRegistro('Hoja principal', 'hoja')];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [createEmptyRegistro('Hoja principal', 'hoja')];

    const list = parsed
      .map(normalizeRegistro)
      .filter((x): x is Registro => Boolean(x))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return list.length > 0 ? list : [createEmptyRegistro('Hoja principal', 'hoja')];
  } catch {
    return [createEmptyRegistro('Hoja principal', 'hoja')];
  }
};

export const useRegistrosStorage = () => {
  const [registros, setRegistros] = useState<Registro[]>(() => loadFromStorage());
  const [selectedId, setSelectedId] = useState<string>(() => loadFromStorage()[0]?.id || '');
  const [newRegistroName, setNewRegistroName] = useState('');
  const [newRegistroTipo, setNewRegistroTipo] = useState<RegistroTipo>('hoja');
  const [newRegistroTemplate, setNewRegistroTemplate] = useState<RegistroTemplate>('blank');
  const [search, setSearch] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<string>(() => new Date().toISOString());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
    setLastSavedAt(new Date().toISOString());
  }, [registros]);

  useEffect(() => {
    if (!registros.find(r => r.id === selectedId) && registros[0]) {
      setSelectedId(registros[0].id);
    }
  }, [registros, selectedId]);

  const selected = useMemo(() => registros.find(r => r.id === selectedId) || null, [registros, selectedId]);

  const filteredRegistros = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return registros;
    return registros.filter(r => r.nombre.toLowerCase().includes(term));
  }, [registros, search]);

  const updateSelected = (updater: (r: Registro) => Registro) => {
    setRegistros(prev => prev.map(r => (r.id === selectedId ? { ...updater(r), updatedAt: new Date().toISOString() } : r)));
  };

  const createRegistro = (): string => {
    const nombre = newRegistroName.trim() || `${newRegistroTipo === 'hoja' ? 'Hoja' : 'Documento'} ${registros.length + 1}`;
    const next = createTemplateRegistro(nombre, newRegistroTemplate, newRegistroTipo);
    setRegistros(prev => [next, ...prev]);
    setSelectedId(next.id);
    setNewRegistroName('');
    return next.id;
  };

  const duplicateRegistro = () => {
    if (!selected) return;
    const copy: Registro = {
      ...selected,
      id: uid(),
      nombre: `${selected.nombre} (copia)`,
      encabezados: [...selected.encabezados],
      filas: selected.filas.map(row => [...row]),
      updatedAt: new Date().toISOString(),
    };
    setRegistros(prev => [copy, ...prev]);
    setSelectedId(copy.id);
  };

  const deleteRegistro = () => {
    if (!selected) return;
    if (!window.confirm(`¿Eliminar el registro "${selected.nombre}"?`)) return;

    setRegistros(prev => {
      const next = prev.filter(r => r.id !== selected.id);
      return next.length > 0 ? next : [createEmptyRegistro('Hoja principal', 'hoja')];
    });
  };

  return {
    registros,
    selected,
    selectedId,
    setSelectedId,
    newRegistroName,
    setNewRegistroName,
    newRegistroTipo,
    setNewRegistroTipo,
    newRegistroTemplate,
    setNewRegistroTemplate,
    search,
    setSearch,
    filteredRegistros,
    lastSavedAt,
    updateSelected,
    createRegistro,
    duplicateRegistro,
    deleteRegistro,
  };
};
