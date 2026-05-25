import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { DocumentoTreeRepo } from '../../../database/repositories/documentoTreeRepo';
import { RagHashService } from './ragHashService';

export type RagSupportedExtension = 'txt' | 'docx' | 'xlsx' | 'xls';

export interface RagTextExtractionInput {
  fileName: string;
  buffer: Buffer;
  mimeType?: string | null;
  timeoutMs?: number;
  maxFileMb?: number;
}

export interface RagDocumentNodeExtractionInput {
  nodeId: string;
  actorRole?: string;
  timeoutMs?: number;
  maxFileMb?: number;
}

export interface RagTextExtractionResult {
  fileName: string;
  extension: RagSupportedExtension;
  mimeType: string | null;
  sizeBytes: number;
  sourceHash: string;
  text: string;
  warnings: string[];
  metadata: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_MAX_FILE_MB = Number(process.env.SGC_RAG_MAX_FILE_MB || 15);

function normalizeExtension(fileName: string): string {
  return path.extname(fileName || '').replace('.', '').trim().toLowerCase();
}

function normalizeText(value: string): string {
  return String(value || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function assertSupportedExtension(extension: string): asserts extension is RagSupportedExtension {
  if (!['txt', 'docx', 'xlsx', 'xls'].includes(extension)) {
    throw new Error('RAG soporta inicialmente TXT, DOCX, XLSX y XLS. PDF queda fuera de esta fase.');
  }
}

function assertFileSize(buffer: Buffer, maxFileMb: number): void {
  const maxBytes = Math.max(1, maxFileMb) * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error(`Archivo demasiado grande para RAG. Maximo configurado: ${maxFileMb} MB.`);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} excedio timeout de ${timeoutMs} ms.`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function bufferFromDataUrl(dataUrl: string): Buffer {
  const comma = String(dataUrl || '').indexOf(',');
  if (comma < 0) throw new Error('Data URL invalida para extraccion RAG.');
  return Buffer.from(String(dataUrl).slice(comma + 1), 'base64');
}

async function extractTxt(buffer: Buffer): Promise<{ text: string; warnings: string[]; metadata: Record<string, unknown> }> {
  return {
    text: normalizeText(buffer.toString('utf8')),
    warnings: [],
    metadata: { parser: 'text' },
  };
}

async function extractDocx(buffer: Buffer): Promise<{ text: string; warnings: string[]; metadata: Record<string, unknown> }> {
  const parsed = await mammoth.extractRawText({ buffer });
  return {
    text: normalizeText(parsed.value || ''),
    warnings: parsed.messages.map(message => message.message),
    metadata: { parser: 'mammoth', messageCount: parsed.messages.length },
  };
}

async function extractWorkbook(buffer: Buffer): Promise<{ text: string; warnings: string[]; metadata: Record<string, unknown> }> {
  const workbook = XLSX.read(buffer, { type: 'buffer', dense: true });
  const sections = workbook.SheetNames.map(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<Array<string | number | boolean | null>>(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    const lines = matrix
      .filter(row => row.some(cell => String(cell ?? '').trim()))
      .map(row => row.map(cell => String(cell ?? '').trim()).join(' | '));

    return [`# Hoja: ${sheetName}`, ...lines].join('\n');
  });

  return {
    text: normalizeText(sections.join('\n\n')),
    warnings: [],
    metadata: { parser: 'xlsx', sheetNames: workbook.SheetNames },
  };
}

export const RagTextExtractionService = {
  async extractFromBuffer(input: RagTextExtractionInput): Promise<RagTextExtractionResult> {
    const fileName = String(input.fileName || 'documento').trim();
    const extension = normalizeExtension(fileName);
    assertSupportedExtension(extension);

    const maxFileMb = Number.isFinite(Number(input.maxFileMb)) ? Number(input.maxFileMb) : DEFAULT_MAX_FILE_MB;
    assertFileSize(input.buffer, maxFileMb);

    const timeoutMs = Math.max(1000, Number(input.timeoutMs || DEFAULT_TIMEOUT_MS));
    const parsed = await withTimeout((async () => {
      if (extension === 'txt') return extractTxt(input.buffer);
      if (extension === 'docx') return extractDocx(input.buffer);
      return extractWorkbook(input.buffer);
    })(), timeoutMs, `Extraccion RAG ${fileName}`);

    return {
      fileName,
      extension,
      mimeType: input.mimeType || null,
      sizeBytes: input.buffer.length,
      sourceHash: RagHashService.hashBuffer(input.buffer),
      text: parsed.text,
      warnings: parsed.warnings,
      metadata: {
        ...parsed.metadata,
        maxFileMb,
        timeoutMs,
      },
    };
  },

  async extractFromDocumentNode(input: RagDocumentNodeExtractionInput): Promise<RagTextExtractionResult> {
    const node = await DocumentoTreeRepo.getById(input.nodeId, input.actorRole);
    if (!node || node.node_type !== 'file') {
      throw new Error('Nodo documental no encontrado o no es archivo.');
    }

    const fileName = node.file_name || node.name || 'documento';
    const extension = normalizeExtension(fileName);
    assertSupportedExtension(extension);

    let officeAnalysis: Awaited<ReturnType<typeof DocumentoTreeRepo.analyzeOfficeNode>> | null = null;
    if (extension === 'docx' || extension === 'xlsx' || extension === 'xls') {
      // Reusa el analizador existente para mantener las mismas advertencias de soporte Office.
      officeAnalysis = await DocumentoTreeRepo.analyzeOfficeNode(input.nodeId, input.actorRole);
      if (officeAnalysis.parser === 'unsupported') {
        throw new Error(officeAnalysis.warnings[0] || officeAnalysis.summary);
      }
    }

    let buffer: Buffer;
    if (node.storage_mode === 'disk' && node.file_disk_path) {
      buffer = await fs.promises.readFile(node.file_disk_path);
    } else if (node.file_data_url) {
      buffer = bufferFromDataUrl(node.file_data_url);
    } else {
      throw new Error('El nodo documental no tiene contenido disponible para RAG.');
    }

    const result = await this.extractFromBuffer({
      fileName,
      buffer,
      mimeType: node.mime_type,
      timeoutMs: input.timeoutMs,
      maxFileMb: input.maxFileMb,
    });

    return {
      ...result,
      warnings: Array.from(new Set([...(officeAnalysis?.warnings || []), ...result.warnings])),
      metadata: {
        ...result.metadata,
        documentNodeId: node.id,
        storageMode: node.storage_mode,
        officeAnalysisSummary: officeAnalysis?.summary || null,
      },
    };
  },
};
