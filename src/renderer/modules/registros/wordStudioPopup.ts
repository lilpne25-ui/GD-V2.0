type OpenWordStudioPopupParams = {
  registroId: string;
  nombre: string;
  contenidoHtml: string;
  defaultHtml: string;
  onSync: (html: string) => void;
};

export const openWordStudioPopup = ({
  registroId,
  nombre,
  contenidoHtml,
  defaultHtml,
  onSync,
}: OpenWordStudioPopupParams): void => {
  const draftKey = `sgc.wordstudio.draft.${registroId}`;
  const resultKey = `${draftKey}.result`;

  localStorage.setItem(draftKey, contenidoHtml || defaultHtml);
  localStorage.removeItem(resultKey);

  const popup = window.open('', `sgc-wordstudio-${registroId}`, 'width=1450,height=920,resizable=yes,scrollbars=yes');
  if (!popup) {
    window.alert('No se pudo abrir la ventana emergente. Revisa el bloqueo de ventanas.');
    return;
  }

  const popupHtml = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${nombre} · Word Studio</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #d9d9d9; color: #111827; }
    .app { min-height: 100vh; display: flex; flex-direction: column; }
    .titlebar {
      height: 30px;
      background: #f1f1f1;
      border-bottom: 1px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      font-size: 12px;
      color: #4b5563;
    }
    .tabs {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #ffffff;
      border-bottom: 1px solid #d1d5db;
      padding: 6px 14px;
      font-size: 13px;
    }
    .tabs .active { color: #2563eb; font-weight: 700; }
    .ribbon {
      background: #f8fafc;
      border-bottom: 1px solid #d1d5db;
      padding: 6px 10px 4px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: stretch;
    }
    .group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 2px 8px 0;
      border-right: 1px solid #dbeafe;
      min-height: 72px;
    }
    .group:last-child { border-right: none; }
    .group.clipboard {
      min-width: 290px;
      position: relative;
    }
    .group-tools {
      display: flex;
      gap: 5px;
      align-items: center;
      flex-wrap: wrap;
      min-height: 48px;
    }
    .clipboard-main {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 8px;
      align-items: stretch;
      min-height: 56px;
    }
    .clipboard-left,
    .clipboard-right {
      display: flex;
      flex-direction: column;
      gap: 4px;
      justify-content: center;
    }
    .group-title {
      text-align: center;
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    .btn {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #0f172a;
      border-radius: 4px;
      padding: 4px 7px;
      font-size: 11px;
      cursor: pointer;
    }
    .btn:hover { background: #eff6ff; }
    .btn.primary { background: #2563eb; border-color: #1d4ed8; color: #fff; }
    .btn.big {
      min-height: 40px;
      min-width: 62px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      font-size: 11px;
    }
    .btn.paste {
      min-height: 56px;
      font-size: 12px;
      font-weight: 700;
      gap: 2px;
    }
    .btn.paste .sub {
      font-size: 10px;
      color: #475569;
      font-weight: 500;
    }
    .btn.toggle-on {
      border-color: #2563eb;
      background: #dbeafe;
      color: #1d4ed8;
    }
    .ribbon-select {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #111827;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 11px;
      height: 28px;
    }
    .ribbon-select.font { min-width: 150px; }
    .ribbon-select.size { min-width: 58px; }
    .ribbon-help {
      position: absolute;
      left: 0;
      top: calc(100% + 4px);
      width: 282px;
      background: #fff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
      border-radius: 4px;
      padding: 8px 10px;
      display: none;
      z-index: 999;
      font-size: 12px;
      line-height: 1.45;
      color: #334155;
    }
    .ribbon-help.visible { display: block; }
    .ribbon-help h5 {
      margin: 0 0 6px;
      font-size: 13px;
      color: #0f172a;
    }
    .ribbon-help p { margin: 0 0 5px; }
    .ribbon-help p:last-child { margin-bottom: 0; }
    .work {
      flex: 1;
      display: flex;
      justify-content: center;
      padding: 22px;
      overflow: auto;
      background: #d9d9d9;
    }
    .page {
      width: min(900px, 96vw);
      min-height: 1140px;
      background: #fff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
      padding: 48px 52px;
      outline: none;
      line-height: 1.65;
      font-size: 15px;
    }
    .page table { width: 100%; border-collapse: collapse; }
    .page th, .page td { border: 1px solid #cbd5e1; padding: 6px 8px; }
    .status {
      height: 28px;
      background: #1d4ed8;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      font-size: 12px;
    }
    .status .left, .status .right { display: flex; gap: 12px; align-items: center; }
    .zoom { width: 120px; }
  </style>
</head>
<body>
  <div class="app">
    <div class="titlebar">
      <span>${nombre} · Word Studio</span>
      <span>Ventana emergente</span>
    </div>

    <div class="tabs">
      <span class="active">INICIO</span>
      <span>INSERTAR</span>
      <span>DISEÑO</span>
      <span>REVISAR</span>
      <span>VISTA</span>
    </div>

    <div class="ribbon">
      <div class="group clipboard">
        <div class="group-tools clipboard-main">
          <div class="clipboard-left">
            <button class="btn big paste" id="cmdPaste" title="Pegar (Ctrl+V)">
              <span>📋</span>
              <span>Pegar</span>
              <span class="sub">▼</span>
            </button>
          </div>
          <div class="clipboard-right">
            <button class="btn" id="cmdCut">Cortar</button>
            <button class="btn" id="cmdCopy">Copiar</button>
            <button class="btn" id="cmdFormatPainter">Copiar formato</button>
          </div>
        </div>
        <div class="group-title">Portapapeles</div>
        <div id="helpPaste" class="ribbon-help">
          <h5>Pegar (Ctrl+V)</h5>
          <p>Agrega contenido del Portapapeles al documento.</p>
        </div>
        <div id="helpFormat" class="ribbon-help">
          <h5>Copiar formato (Ctrl+Mayús+C)</h5>
          <p>1) Elija contenido con el formato que quiere copiar.</p>
          <p>2) Haga clic en Copiar formato (doble clic para mantenerlo activo).</p>
          <p>3) Seleccione el contenido destino para aplicar el formato.</p>
        </div>
      </div>

      <div class="group">
        <div class="group-tools">
          <select id="fontName" class="ribbon-select font">
            <option value="Calibri">Calibri</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Segoe UI">Segoe UI</option>
            <option value="Verdana">Verdana</option>
          </select>
          <select id="fontSize" class="ribbon-select size">
            <option value="2">10</option>
            <option value="3" selected>11</option>
            <option value="4">12</option>
            <option value="5">14</option>
            <option value="6">18</option>
          </select>
          <button class="btn" data-cmd="bold"><b>N</b></button>
          <button class="btn" data-cmd="italic"><i>K</i></button>
          <button class="btn" data-cmd="underline"><u>S</u></button>
          <button class="btn" data-cmd="strikeThrough"><s>abc</s></button>
          <button class="btn" data-cmd="subscript">x₂</button>
          <button class="btn" data-cmd="superscript">x²</button>
          <button class="btn" data-cmd="foreColor" data-val="#1d4ed8">A</button>
          <button class="btn" data-cmd="hiliteColor" data-val="#fef08a">✎</button>
        </div>
        <div class="group-title">Fuente</div>
      </div>

      <div class="group">
        <div class="group-tools">
          <button class="btn" data-cmd="insertUnorderedList">• Lista</button>
          <button class="btn" data-cmd="insertOrderedList">1. Lista</button>
          <button class="btn" data-cmd="outdent">← Sangría</button>
          <button class="btn" data-cmd="indent">Sangría →</button>
          <button class="btn" data-cmd="justifyLeft">Izq</button>
          <button class="btn" data-cmd="justifyCenter">Centro</button>
          <button class="btn" data-cmd="justifyRight">Der</button>
          <button class="btn" data-cmd="justifyFull">Justificar</button>
          <button class="btn" data-cmd="formatBlock" data-val="H2">Título</button>
          <button class="btn" data-cmd="formatBlock" data-val="H3">Subtítulo</button>
        </div>
        <div class="group-title">Párrafo</div>
      </div>

      <div class="group">
        <div class="group-tools">
          <button class="btn" id="insertDate">Fecha</button>
          <button class="btn" id="insertTable">Tabla</button>
          <button class="btn" data-cmd="insertHorizontalRule">Línea</button>
          <button class="btn" data-cmd="removeFormat">Limpiar</button>
          <button class="btn" data-cmd="undo">↶</button>
          <button class="btn" data-cmd="redo">↷</button>
          <button class="btn primary" id="saveClose">Guardar y cerrar</button>
        </div>
        <div class="group-title">Edición</div>
      </div>
    </div>

    <div class="work">
      <div id="editor" class="page" contenteditable="true"></div>
    </div>

    <div class="status">
      <div class="left">
        <span id="wordCount">0 palabras</span>
        <span>Español (México)</span>
      </div>
      <div class="right">
        <span id="savedHint">Auto guardado</span>
        <input class="zoom" id="zoom" type="range" min="80" max="140" value="100" />
      </div>
    </div>
  </div>

  <script>
    (function () {
      const draftKey = ${JSON.stringify(draftKey)};
      const resultKey = ${JSON.stringify(resultKey)};
      const editor = document.getElementById('editor');
      const wordCount = document.getElementById('wordCount');
      const zoom = document.getElementById('zoom');
      const savedHint = document.getElementById('savedHint');
      const helpPaste = document.getElementById('helpPaste');
      const helpFormat = document.getElementById('helpFormat');
      const cmdPaste = document.getElementById('cmdPaste');
      const cmdFormatPainter = document.getElementById('cmdFormatPainter');

      const formatPainter = {
        active: false,
        locked: false,
        snapshot: null,
      };

      const initial = localStorage.getItem(draftKey) || '<h2>Documento nuevo</h2>';
      editor.innerHTML = initial;

      function updateWords() {
        const text = (editor.innerText || '').trim();
        const count = text ? text.split(/\s+/).length : 0;
        wordCount.textContent = count + ' palabras';
      }

      function save() {
        localStorage.setItem(resultKey, editor.innerHTML || '');
        if (savedHint) {
          savedHint.textContent = 'Guardado ' + new Date().toLocaleTimeString('es-MX');
        }
      }

      function hideHelp() {
        helpPaste.classList.remove('visible');
        helpFormat.classList.remove('visible');
      }

      function setPainterState(active, locked) {
        formatPainter.active = active;
        formatPainter.locked = Boolean(locked);

        if (active) {
          cmdFormatPainter.classList.add('toggle-on');
          cmdFormatPainter.textContent = locked ? 'Copiar formato (fijo)' : 'Copiar formato';
          editor.style.cursor = 'copy';
        } else {
          cmdFormatPainter.classList.remove('toggle-on');
          cmdFormatPainter.textContent = 'Copiar formato';
          editor.style.cursor = 'text';
          formatPainter.snapshot = null;
        }
      }

      function selectedText() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return '';
        return (sel.toString() || '').trim();
      }

      function captureFormatSnapshot() {
        return {
          fontName: String(document.queryCommandValue('fontName') || '').replace(/"/g, ''),
          fontSize: String(document.queryCommandValue('fontSize') || '3'),
          foreColor: String(document.queryCommandValue('foreColor') || '#000000'),
          backColor: String(document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || ''),
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          subscript: document.queryCommandState('subscript'),
          superscript: document.queryCommandState('superscript'),
        };
      }

      function applyFormatSnapshot(snapshot) {
        if (!snapshot) return;
        document.execCommand('removeFormat');
        if (snapshot.fontName) document.execCommand('fontName', false, snapshot.fontName);
        if (snapshot.fontSize) document.execCommand('fontSize', false, snapshot.fontSize);
        if (snapshot.foreColor) document.execCommand('foreColor', false, snapshot.foreColor);
        if (snapshot.backColor) document.execCommand('hiliteColor', false, snapshot.backColor);
        if (snapshot.bold) document.execCommand('bold');
        if (snapshot.italic) document.execCommand('italic');
        if (snapshot.underline) document.execCommand('underline');
        if (snapshot.strikeThrough) document.execCommand('strikeThrough');
        if (snapshot.subscript) document.execCommand('subscript');
        if (snapshot.superscript) document.execCommand('superscript');
      }

      document.querySelectorAll('[data-cmd]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const cmd = btn.getAttribute('data-cmd');
          const val = btn.getAttribute('data-val');
          editor.focus();
          document.execCommand(cmd, false, val || undefined);
          save();
          updateWords();
        });
      });

      document.getElementById('insertDate').addEventListener('click', function () {
        editor.focus();
        document.execCommand('insertText', false, new Date().toLocaleDateString('es-MX'));
        save();
        updateWords();
      });

      document.getElementById('insertTable').addEventListener('click', function () {
        editor.focus();
        document.execCommand('insertHTML', false, '<table><tr><th>Columna 1</th><th>Columna 2</th><th>Columna 3</th></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></table>');
        save();
        updateWords();
      });

      document.getElementById('saveClose').addEventListener('click', function () {
        save();
        window.close();
      });

      document.getElementById('cmdCut').addEventListener('click', function () {
        editor.focus();
        document.execCommand('cut');
        save();
      });

      document.getElementById('cmdCopy').addEventListener('click', function () {
        editor.focus();
        document.execCommand('copy');
      });

      cmdPaste.addEventListener('click', async function () {
        editor.focus();
        try {
          const text = await navigator.clipboard.readText();
          document.execCommand('insertText', false, text || '');
          save();
          updateWords();
        } catch {
          document.execCommand('paste');
        }
      });

      cmdFormatPainter.addEventListener('click', function () {
        editor.focus();
        if (!selectedText()) {
          alert('Seleccione primero texto con formato.');
          return;
        }
        formatPainter.snapshot = captureFormatSnapshot();
        setPainterState(true, false);
      });

      cmdFormatPainter.addEventListener('dblclick', function (e) {
        e.preventDefault();
        editor.focus();
        if (!selectedText()) {
          alert('Seleccione primero texto con formato.');
          return;
        }
        formatPainter.snapshot = captureFormatSnapshot();
        setPainterState(true, true);
      });

      editor.addEventListener('mouseup', function () {
        if (!formatPainter.active || !formatPainter.snapshot) return;
        if (!selectedText()) return;
        applyFormatSnapshot(formatPainter.snapshot);
        save();
        if (!formatPainter.locked) setPainterState(false, false);
      });

      document.getElementById('fontName').addEventListener('change', function (e) {
        const target = e.target;
        editor.focus();
        document.execCommand('fontName', false, target.value);
        save();
      });

      document.getElementById('fontSize').addEventListener('change', function (e) {
        const target = e.target;
        editor.focus();
        document.execCommand('fontSize', false, target.value);
        save();
      });

      cmdPaste.addEventListener('mouseenter', function () {
        hideHelp();
        helpPaste.classList.add('visible');
      });
      cmdPaste.addEventListener('mouseleave', function () {
        helpPaste.classList.remove('visible');
      });
      cmdFormatPainter.addEventListener('mouseenter', function () {
        hideHelp();
        helpFormat.classList.add('visible');
      });
      cmdFormatPainter.addEventListener('mouseleave', function () {
        helpFormat.classList.remove('visible');
      });
      editor.addEventListener('mouseenter', hideHelp);

      zoom.addEventListener('input', function () {
        editor.style.transform = 'scale(' + (Number(zoom.value) / 100) + ')';
        editor.style.transformOrigin = 'top center';
      });

      editor.addEventListener('input', function () {
        save();
        updateWords();
      });

      window.addEventListener('beforeunload', function () {
        save();
      });

      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && formatPainter.active) {
          setPainterState(false, false);
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault();
          save();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          cmdFormatPainter.click();
        }
      });

      updateWords();
    })();
  </script>
</body>
</html>
`;

  popup.document.open();
  popup.document.write(popupHtml);
  popup.document.close();

  const syncInterval = window.setInterval(() => {
    const latest = localStorage.getItem(resultKey);
    if (latest !== null) {
      onSync(latest);
      localStorage.removeItem(resultKey);
    }

    if (popup.closed) {
      const finalLatest = localStorage.getItem(resultKey);
      if (finalLatest !== null) {
        onSync(finalLatest);
        localStorage.removeItem(resultKey);
      }
      localStorage.removeItem(draftKey);
      window.clearInterval(syncInterval);
    }
  }, 450);
};
