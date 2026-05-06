import { useEffect, useMemo, useState } from 'react';
import type { Registro, SelectedCell } from '../types';

const isNumeric = (value: string): boolean => /^\s*-?\d+(\.\d+)?\s*$/.test(value);

const labelToCol = (label: string): number => {
  let result = 0;
  const clean = label.toUpperCase();
  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i);
    if (code < 65 || code > 90) return -1;
    result = result * 26 + (code - 64);
  }
  return result - 1;
};

const ensureRectangular = (headers: string[], rows: string[][]): string[][] => {
  const cols = Math.max(headers.length, 1);
  if (rows.length === 0) return [Array.from({ length: cols }, () => '')];
  return rows.map(row => {
    const next = [...row];
    while (next.length < cols) next.push('');
    return next.slice(0, cols);
  });
};

export const colToLabel = (index: number): string => {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
};

export const useSheetEngine = (selected: Registro | null, updateSelected: (updater: (r: Registro) => Registro) => void) => {
  const [selectedCell, setSelectedCell] = useState<SelectedCell>({ row: 0, col: 0 });
  const [formulaBar, setFormulaBar] = useState('');
  const [sheetZoom, setSheetZoom] = useState(100);

  useEffect(() => {
    if (!selected || selected.tipo !== 'hoja') {
      setFormulaBar('');
      return;
    }
    const value = selected.filas[selectedCell.row]?.[selectedCell.col] || '';
    setFormulaBar(value);
  }, [selected?.id, selected?.tipo, selectedCell.row, selectedCell.col, selected?.updatedAt]);

  const parseCellRef = (ref: string): { row: number; col: number } | null => {
    const match = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const col = labelToCol(match[1]);
    const row = Number(match[2]) - 1;
    if (col < 0 || row < 0) return null;
    return { row, col };
  };

  const evalMathExpression = (registro: Registro, expr: string, trail = new Set<string>()): number | null => {
    const replacedRefs = expr.replace(/([A-Z]+\d+)/g, (fullRef: string) => {
      const parsed = parseCellRef(fullRef);
      if (!parsed) return '0';
      const v = evalCell(registro, parsed.row, parsed.col, new Set(trail));
      return Number.isFinite(v as number) ? String(v) : '0';
    });

    if (!/^[0-9+\-*/().<>=!\s]+$/.test(replacedRefs)) return null;
    try {
      const value = Function(`"use strict"; return (${replacedRefs});`)();
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };

  const getRangeValues = (registro: Registro, fromRef: string, toRef: string, trail: Set<string>): number[] => {
    const from = parseCellRef(fromRef);
    const to = parseCellRef(toRef);
    if (!from || !to) return [];

    const minR = Math.min(from.row, to.row);
    const maxR = Math.max(from.row, to.row);
    const minC = Math.min(from.col, to.col);
    const maxC = Math.max(from.col, to.col);
    const values: number[] = [];

    for (let rr = minR; rr <= maxR; rr += 1) {
      for (let cc = minC; cc <= maxC; cc += 1) {
        const v = evalCell(registro, rr, cc, new Set(trail));
        if (Number.isFinite(v as number)) values.push(v as number);
      }
    }

    return values;
  };

  const evalCell = (registro: Registro, row: number, col: number, trail = new Set<string>()): number | null => {
    if (registro.tipo !== 'hoja') return null;
    const key = `${row}:${col}`;
    if (trail.has(key)) return null;
    trail.add(key);

    const raw = registro.filas[row]?.[col] || '';
    const text = raw.trim();
    if (!text) return 0;
    if (!text.startsWith('=')) {
      if (!isNumeric(text)) return null;
      return Number(text);
    }

    const expression = text.slice(1).toUpperCase();

    const withAgg = expression.replace(/(SUM|AVG|MAX|MIN)\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_all: string, fn: string, fromRef: string, toRef: string) => {
      const values = getRangeValues(registro, fromRef, toRef, trail);
      if (values.length === 0) return '0';
      if (fn === 'SUM') return String(values.reduce((acc, v) => acc + v, 0));
      if (fn === 'AVG') return String(values.reduce((acc, v) => acc + v, 0) / values.length);
      if (fn === 'MAX') return String(Math.max(...values));
      if (fn === 'MIN') return String(Math.min(...values));
      return '0';
    });

    const withIf = withAgg.replace(/IF\(([^,]+),([^,]+),([^\)]+)\)/g, (_all: string, conditionExpr: string, trueExpr: string, falseExpr: string) => {
      const conditionValue = evalMathExpression(registro, conditionExpr, new Set(trail));
      const branchExpr = (conditionValue as number) ? trueExpr : falseExpr;
      const branchValue = evalMathExpression(registro, branchExpr, new Set(trail));
      return String(Number.isFinite(branchValue as number) ? branchValue : 0);
    });

    return evalMathExpression(registro, withIf, new Set(trail));
  };

  const getCellDisplay = (registro: Registro, row: number, col: number): string => {
    if (registro.tipo !== 'hoja') return '';
    const raw = registro.filas[row]?.[col] || '';
    if (!raw.trim().startsWith('=')) return '';
    const value = evalCell(registro, row, col);
    return value === null ? 'ERR' : String(value);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!selected || selected.tipo !== 'hoja') return;
    updateSelected(r => ({
      ...r,
      filas: r.filas.map((row, i) => {
        if (i !== rowIndex) return row;
        return row.map((cell, j) => (j === colIndex ? value : cell));
      }),
    }));
  };

  const addHeader = () => {
    if (!selected || selected.tipo !== 'hoja') return;
    updateSelected(r => ({
      ...r,
      encabezados: [...r.encabezados, `Columna ${colToLabel(r.encabezados.length)}`],
      filas: r.filas.map(row => [...row, '']),
    }));
  };

  const insertHeaderAt = (index: number) => {
    if (!selected || selected.tipo !== 'hoja') return;
    const safeIndex = Math.max(0, Math.min(index, selected.encabezados.length));
    updateSelected(r => {
      const headers = [...r.encabezados];
      headers.splice(safeIndex, 0, `Columna ${colToLabel(headers.length)}`);
      const rows = r.filas.map(row => {
        const next = [...row];
        next.splice(safeIndex, 0, '');
        return next;
      });
      return { ...r, encabezados: headers, filas: ensureRectangular(headers, rows) };
    });
  };

  const updateHeader = (index: number, value: string) => {
    if (!selected || selected.tipo !== 'hoja') return;
    updateSelected(r => ({
      ...r,
      encabezados: r.encabezados.map((h, i) => (i === index ? value : h)),
    }));
  };

  const removeHeader = (index: number) => {
    if (!selected || selected.tipo !== 'hoja') return;
    if (selected.encabezados.length <= 1) {
      window.alert('Debes dejar al menos un encabezado.');
      return;
    }

    updateSelected(r => ({
      ...r,
      encabezados: r.encabezados.filter((_, i) => i !== index),
      filas: r.filas.map(row => row.filter((_, i) => i !== index)),
    }));
  };

  const addRow = () => {
    if (!selected || selected.tipo !== 'hoja') return;
    updateSelected(r => ({
      ...r,
      filas: [...r.filas, r.encabezados.map(() => '')],
    }));
  };

  const insertRowAt = (index: number) => {
    if (!selected || selected.tipo !== 'hoja') return;
    const safeIndex = Math.max(0, Math.min(index, selected.filas.length));
    updateSelected(r => {
      const nextRows = [...r.filas];
      nextRows.splice(safeIndex, 0, r.encabezados.map(() => ''));
      return { ...r, filas: nextRows };
    });
  };

  const deleteRow = (rowIndex: number) => {
    if (!selected || selected.tipo !== 'hoja') return;
    updateSelected(r => {
      const nextRows = r.filas.filter((_, i) => i !== rowIndex);
      return {
        ...r,
        filas: nextRows.length > 0 ? nextRows : [r.encabezados.map(() => '')],
      };
    });
  };

  const pasteMatrix = (startRow: number, startCol: number, text: string) => {
    if (!selected || selected.tipo !== 'hoja') return;

    const lines = text.replace(/\r/g, '').split('\n').filter(line => line.length > 0);
    if (lines.length === 0) return;
    const matrix = lines.map(line => line.split('\t'));
    const requiredCols = startCol + Math.max(...matrix.map(r => r.length));
    const requiredRows = startRow + matrix.length;

    updateSelected(r => {
      const headers = [...r.encabezados];
      while (headers.length < requiredCols) headers.push(`Columna ${colToLabel(headers.length)}`);

      const rows = ensureRectangular(headers, r.filas);
      while (rows.length < requiredRows) rows.push(headers.map(() => ''));

      matrix.forEach((line, rOffset) => {
        line.forEach((value, cOffset) => {
          const rr = startRow + rOffset;
          const cc = startCol + cOffset;
          rows[rr][cc] = value;
        });
      });

      return { ...r, encabezados: headers, filas: rows };
    });
  };

  const applyFormulaBar = () => {
    if (!selected || selected.tipo !== 'hoja') return;
    updateCell(selectedCell.row, selectedCell.col, formulaBar);
  };

  const currentCellRef = `${colToLabel(selectedCell.col)}${selectedCell.row + 1}`;

  const insertFormulaSnippet = (kind: 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'IF') => {
    if (!selected || selected.tipo !== 'hoja') return;
    const ref = currentCellRef;
    const snippets: Record<'SUM' | 'AVG' | 'MAX' | 'MIN' | 'IF', string> = {
      SUM: `=SUM(${ref}:${ref})`,
      AVG: `=AVG(${ref}:${ref})`,
      MAX: `=MAX(${ref}:${ref})`,
      MIN: `=MIN(${ref}:${ref})`,
      IF: `=IF(${ref}>0,1,0)`,
    };
    const next = snippets[kind];
    setFormulaBar(next);
    updateCell(selectedCell.row, selectedCell.col, next);
  };

  const moveSelection = (dRow: number, dCol: number) => {
    if (!selected || selected.tipo !== 'hoja') return;
    setSelectedCell(prev => ({
      row: Math.max(0, Math.min(selected.filas.length - 1, prev.row + dRow)),
      col: Math.max(0, Math.min(selected.encabezados.length - 1, prev.col + dCol)),
    }));
  };

  const sheetStats = useMemo(() => {
    if (!selected || selected.tipo !== 'hoja') return { count: 0, sum: 0, avg: 0 };
    const row = selected.filas[selectedCell.row] || [];
    const values = row.map(v => Number(v)).filter(v => Number.isFinite(v));
    const sum = values.reduce((acc, val) => acc + val, 0);
    return { count: values.length, sum, avg: values.length ? sum / values.length : 0 };
  }, [selected?.updatedAt, selected?.id, selected?.tipo, selectedCell.row]);

  const zoomClass = sheetZoom <= 90 ? 'reg-sheet-compact' : (sheetZoom >= 125 ? 'reg-sheet-large' : 'reg-sheet-normal');

  return {
    selectedCell,
    setSelectedCell,
    formulaBar,
    setFormulaBar,
    sheetZoom,
    setSheetZoom,
    zoomClass,
    currentCellRef,
    sheetStats,
    addHeader,
    insertHeaderAt,
    updateHeader,
    removeHeader,
    addRow,
    insertRowAt,
    deleteRow,
    updateCell,
    pasteMatrix,
    getCellDisplay,
    applyFormulaBar,
    insertFormulaSnippet,
    moveSelection,
  };
};
