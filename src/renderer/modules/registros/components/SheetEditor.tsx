import React from 'react';
import type { Registro, SelectedCell } from '../types';

type SheetEditorProps = {
  selected: Registro;
  selectedCell: SelectedCell;
  formulaBar: string;
  sheetZoom: number;
  zoomClass: string;
  currentCellRef: string;
  sheetStats: { count: number; sum: number; avg: number };
  colToLabel: (index: number) => string;
  setSheetZoom: (zoom: number) => void;
  setFormulaBar: (value: string) => void;
  setSelectedCell: (cell: SelectedCell) => void;
  insertRowAt: (index: number) => void;
  insertHeaderAt: (index: number) => void;
  applyFormulaBar: () => void;
  insertFormulaSnippet: (kind: 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'IF') => void;
  updateHeader: (index: number, value: string) => void;
  removeHeader: (index: number) => void;
  addHeader: () => void;
  addRow: () => void;
  getCellDisplay: (registro: Registro, row: number, col: number) => string;
  updateCell: (rowIndex: number, colIndex: number, value: string) => void;
  pasteMatrix: (startRow: number, startCol: number, text: string) => void;
  moveSelection: (dRow: number, dCol: number) => void;
  deleteRow: (rowIndex: number) => void;
};

const SheetEditor: React.FC<SheetEditorProps> = ({
  selected,
  selectedCell,
  formulaBar,
  sheetZoom,
  zoomClass,
  currentCellRef,
  sheetStats,
  colToLabel,
  setSheetZoom,
  setFormulaBar,
  setSelectedCell,
  insertRowAt,
  insertHeaderAt,
  applyFormulaBar,
  insertFormulaSnippet,
  updateHeader,
  removeHeader,
  addHeader,
  addRow,
  getCellDisplay,
  updateCell,
  pasteMatrix,
  moveSelection,
  deleteRow,
}) => {
  return (
    <>
      <div className="reg-ribbon">
        <div className="reg-ribbon-group">
          <span className="reg-ribbon-title">Insertar</span>
          <button className="btn btn-sm btn-secondary" onClick={() => insertRowAt(selectedCell.row)}>Fila arriba</button>
          <button className="btn btn-sm btn-secondary" onClick={() => insertRowAt(selectedCell.row + 1)}>Fila abajo</button>
          <button className="btn btn-sm btn-secondary" onClick={() => insertHeaderAt(selectedCell.col)}>Columna izq</button>
          <button className="btn btn-sm btn-secondary" onClick={() => insertHeaderAt(selectedCell.col + 1)}>Columna der</button>
        </div>
        <div className="reg-ribbon-group">
          <span className="reg-ribbon-title">Vista</span>
          <label className="reg-zoom-wrap">
            Zoom {sheetZoom}%
            <input
              type="range"
              min={80}
              max={140}
              step={5}
              value={sheetZoom}
              onChange={e => setSheetZoom(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="reg-formula-bar">
        <span className="reg-formula-cell">{currentCellRef}</span>
        <input
          className="reg-formula-input"
          value={formulaBar}
          onChange={e => setFormulaBar(e.target.value)}
          onBlur={applyFormulaBar}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              applyFormulaBar();
              moveSelection(1, 0);
            }
          }}
          placeholder="Escribe datos o fórmula: =A1+B1, =SUM(A1:A5)"
        />
        <div className="reg-formula-actions">
          <button className="btn btn-sm btn-secondary" onClick={() => insertFormulaSnippet('SUM')}>SUM</button>
          <button className="btn btn-sm btn-secondary" onClick={() => insertFormulaSnippet('AVG')}>AVG</button>
          <button className="btn btn-sm btn-secondary" onClick={() => insertFormulaSnippet('MAX')}>MAX</button>
          <button className="btn btn-sm btn-secondary" onClick={() => insertFormulaSnippet('MIN')}>MIN</button>
          <button className="btn btn-sm btn-secondary" onClick={() => insertFormulaSnippet('IF')}>IF</button>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={applyFormulaBar}>Aplicar</button>
      </div>

      <div className="reg-headers-box">
        <div className="reg-headers-title">Columnas</div>
        <div className="reg-headers-grid">
          {selected.encabezados.map((header, index) => (
            <div className="reg-header-item" key={`${selected.id}-h-${index}`}>
              <input value={header} onChange={e => updateHeader(index, e.target.value)} placeholder={`Columna ${index + 1}`} />
              <div className="reg-header-actions">
                <button className="btn-icon btn-icon--danger" title="Eliminar columna" onClick={() => removeHeader(index)}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="reg-inline-actions">
          <button className="btn btn-sm btn-secondary" onClick={addHeader}>+ Agregar columna</button>
          <button className="btn btn-sm btn-secondary" onClick={addRow}>+ Agregar fila</button>
        </div>
      </div>

      <div className="mod-table-wrap">
        <table className={`mod-table reg-sheet-table ${zoomClass}`}>
          <thead>
            <tr>
              <th className="cell-center">#</th>
              {selected.encabezados.map((h, i) => (
                <th key={`${selected.id}-th-${i}`}>
                  <span className="reg-col-tag">{colToLabel(i)}</span> {h || `Columna ${i + 1}`}
                </th>
              ))}
              <th className="cell-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {selected.filas.map((row, rowIndex) => (
              <tr key={`${selected.id}-row-${rowIndex}`}>
                <td className="cell-center reg-row-index">{rowIndex + 1}</td>
                {selected.encabezados.map((_, colIndex) => {
                  const isSel = selectedCell.row === rowIndex && selectedCell.col === colIndex;
                  const calc = getCellDisplay(selected, rowIndex, colIndex);
                  return (
                    <td key={`${selected.id}-cell-${rowIndex}-${colIndex}`} className={isSel ? 'reg-cell-selected' : ''}>
                      <input
                        className="reg-cell-input"
                        value={row[colIndex] || ''}
                        onFocus={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                        onChange={e => {
                          updateCell(rowIndex, colIndex, e.target.value);
                          if (isSel) setFormulaBar(e.target.value);
                        }}
                        onPaste={e => {
                          const text = e.clipboardData.getData('text/plain');
                          if (text.includes('\t') || text.includes('\n')) {
                            e.preventDefault();
                            pasteMatrix(rowIndex, colIndex, text);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1, 0); }
                          if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1, 0); }
                          if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelection(0, -1); }
                          if (e.key === 'ArrowRight') { e.preventDefault(); moveSelection(0, 1); }
                          if (e.key === 'Enter') { e.preventDefault(); moveSelection(1, 0); }
                          if (e.key === 'Tab') { e.preventDefault(); moveSelection(0, e.shiftKey ? -1 : 1); }
                        }}
                        placeholder={`${colToLabel(colIndex)}${rowIndex + 1}`}
                      />
                      {calc && <span className="reg-cell-calc">= {calc}</span>}
                    </td>
                  );
                })}
                <td className="cell-center">
                  <button className="btn btn-sm btn-danger" onClick={() => deleteRow(rowIndex)}>Eliminar fila</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="reg-statusbar">
        <span>Selección: {currentCellRef}</span>
        <span>Valores numéricos en fila: {sheetStats.count}</span>
        <span>Suma: {sheetStats.sum.toFixed(2)}</span>
        <span>Promedio: {sheetStats.avg.toFixed(2)}</span>
      </div>
    </>
  );
};

export default SheetEditor;
