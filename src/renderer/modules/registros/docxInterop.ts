import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
const mammoth: any = require('mammoth/mammoth.browser');

const sanitizeHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';

  tmp.querySelectorAll('script, style, iframe, object').forEach(el => el.remove());

  return tmp.innerHTML;
};

type InlineStyle = {
  bold?: boolean;
  italics?: boolean;
  underline?: true;
  strike?: boolean;
  subScript?: boolean;
  superScript?: boolean;
};

const mergeStyle = (base: InlineStyle, patch: InlineStyle): InlineStyle => ({ ...base, ...patch });

const textRunsFromNode = (node: ChildNode, style: InlineStyle = {}): TextRun[] => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return [];
    return [
      new TextRun({
        text,
        bold: style.bold,
        italics: style.italics,
        underline: style.underline ? { type: 'single' } : undefined,
        strike: style.strike,
        subScript: style.subScript,
        superScript: style.superScript,
      }),
    ];
  }

  if (!(node instanceof HTMLElement)) return [];

  const tag = node.tagName.toLowerCase();
  const nextStyle = (() => {
    if (tag === 'strong' || tag === 'b') return mergeStyle(style, { bold: true });
    if (tag === 'em' || tag === 'i') return mergeStyle(style, { italics: true });
    if (tag === 'u') return mergeStyle(style, { underline: true });
    if (tag === 's' || tag === 'strike') return mergeStyle(style, { strike: true });
    if (tag === 'sub') return mergeStyle(style, { subScript: true });
    if (tag === 'sup') return mergeStyle(style, { superScript: true });
    return style;
  })();

  if (tag === 'br') {
    return [
      new TextRun({
        text: '\n',
        bold: nextStyle.bold,
        italics: nextStyle.italics,
        underline: nextStyle.underline ? { type: 'single' } : undefined,
        strike: nextStyle.strike,
        subScript: nextStyle.subScript,
        superScript: nextStyle.superScript,
      }),
    ];
  }

  const runs: TextRun[] = [];
  node.childNodes.forEach(child => {
    runs.push(...textRunsFromNode(child, nextStyle));
  });

  return runs;
};

const paragraphFromElement = (el: HTMLElement, options?: { bullet?: { level: number } }): Paragraph => {
  const tag = el.tagName.toLowerCase();
  const heading =
    tag === 'h1' ? HeadingLevel.HEADING_1
      : tag === 'h2' ? HeadingLevel.HEADING_2
        : tag === 'h3' ? HeadingLevel.HEADING_3
          : undefined;

  const align = (() => {
    const textAlign = el.style.textAlign;
    if (textAlign === 'center') return AlignmentType.CENTER;
    if (textAlign === 'right') return AlignmentType.RIGHT;
    if (textAlign === 'justify') return AlignmentType.JUSTIFIED;
    return AlignmentType.LEFT;
  })();

  const children = textRunsFromNode(el);
  if (children.length === 0) {
    children.push(new TextRun(''));
  }

  return new Paragraph({
    children,
    heading,
    alignment: align,
    ...options,
  });
};

const tableFromElement = (tableEl: HTMLTableElement): Table => {
  const rows = Array.from(tableEl.querySelectorAll('tr')).map(tr => {
    const cells = Array.from(tr.children)
      .filter((n): n is HTMLTableCellElement => n instanceof HTMLTableCellElement)
      .map(cell => {
        const text = (cell.textContent || '').trim();
        return new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun(text)] })],
        });
      });

    return new TableRow({ children: cells.length > 0 ? cells : [new TableCell({ children: [new Paragraph('')] })] });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.length > 0 ? rows : [new TableRow({ children: [new TableCell({ children: [new Paragraph('')] })] })],
  });
};

const buildDocChildren = (html: string): Array<Paragraph | Table> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizeHtml(html), 'text/html');
  const bodyChildren = Array.from(doc.body.children);
  const out: Array<Paragraph | Table> = [];

  if (bodyChildren.length === 0) {
    out.push(new Paragraph(''));
    return out;
  }

  bodyChildren.forEach(node => {
    const tag = node.tagName.toLowerCase();

    if (tag === 'table') {
      out.push(tableFromElement(node as HTMLTableElement));
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll(':scope > li'));
      items.forEach((li, idx) => {
        const itemEl = li as HTMLElement;
        if (tag === 'ul') {
          out.push(paragraphFromElement(itemEl, { bullet: { level: 0 } }));
        } else {
          out.push(paragraphFromElement(itemEl, { bullet: { level: 0 } }));
          if (idx === items.length - 1) out.push(new Paragraph(''));
        }
      });
      return;
    }

    out.push(paragraphFromElement(node as HTMLElement));
  });

  return out;
};

const triggerDownload = (fileBlob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(fileBlob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
};

export const exportHtmlAsDocx = async (html: string, fileNameBase: string): Promise<void> => {
  const blob = await buildDocxBlob(html);
  const name = `${fileNameBase.replace(/\s+/g, '_').toLowerCase() || 'documento'}.docx`;
  triggerDownload(blob, name);
};

export const buildDocxBlob = async (html: string): Promise<Blob> => {
  const children = buildDocChildren(html);
  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
};

export const importDocxAsHtml = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return sanitizeHtml(result.value || '<p></p>');
};
