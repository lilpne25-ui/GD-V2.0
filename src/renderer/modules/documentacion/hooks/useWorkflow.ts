import { useState } from 'react';

type WorkflowNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children: WorkflowNode[];
};

type WorkflowMapItem = {
  id: string;
  status: string;
  submitted_by_name: string | null;
  node_name: string | null;
};

type PendingReviewItem = {
  id: string;
  node_id: string;
  node_name: string | null;
  status: string;
  submitted_by_name: string | null;
  created_at: string;
};

type WorkflowCorrectionRow = {
  id: string;
  reviewer_name: string;
  que_esta_mal: string;
  por_que: string;
  como_corregir: string;
  observaciones: string;
  destinatario_name: string;
  created_at: string;
};

type UsuarioLite = { id: string; nombre: string; rol: string; activo?: number };

type UseWorkflowParams = {
  currentUserId: string;
  currentUserName: string;
  currentRole: string;
  callTreeRepo: (method: string, ...args: any[]) => Promise<any>;
  refreshTree: (preferredFolderId?: string) => Promise<void>;
};

export const WF_STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  revision: 'En Revisión',
  correcciones: 'Correcciones',
  aprobado: 'Aprobado',
  obsoleto: 'Obsoleto',
};

export function useWorkflow({
  currentUserId,
  currentUserName,
  currentRole,
  callTreeRepo,
  refreshTree,
}: UseWorkflowParams) {
  const [workflowMap, setWorkflowMap] = useState<Record<string, WorkflowMapItem>>({});
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(false);
  const [pendingReview, setPendingReview] = useState<PendingReviewItem[]>([]);
  const [wfApproveDialog, setWfApproveDialog] = useState<{
    workflowId: string;
    nodeId: string;
    nodeName: string;
  } | null>(null);
  const [wfApproveTargetFolder, setWfApproveTargetFolder] = useState('');
  const [wfApproveSendEmail, setWfApproveSendEmail] = useState(false);
  const [wfApproveDestinatarioIds, setWfApproveDestinatarioIds] = useState<string[]>([]);
  const [wfCorrectionDialog, setWfCorrectionDialog] = useState<{
    workflowId: string;
    nodeId: string;
    nodeName: string;
  } | null>(null);
  const [wfCorr, setWfCorr] = useState({ queEstaMal: '', porQue: '', comoCorregir: '', observaciones: '', destinatarioIds: [] as string[] });
  const [wfCorrectionHistory, setWfCorrectionHistory] = useState<WorkflowCorrectionRow[]>([]);
  const [allUsuarios, setAllUsuarios] = useState<UsuarioLite[]>([]);

  const toFlag01 = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined) return fallback ? 1 : 0;
    if (typeof value === 'boolean') return value ? 1 : 0;
    const n = Number(value);
    if (Number.isFinite(n)) return n === 1 ? 1 : 0;
    const raw = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'si', 'sí', 'on'].includes(raw)) return 1;
    if (['0', 'false', 'no', 'off'].includes(raw)) return 0;
    return fallback ? 1 : 0;
  };

  const uniqueValues = (items: Array<string | null | undefined>): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
      const v = String(item || '').trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
    return out;
  };

  const resolveUserEmails = async (userIds: string[]): Promise<string[]> => {
    const emails: string[] = [];
    for (const id of userIds) {
      try {
        const u = await (window as any).repo.call('UsuarioRepo', 'getById', id) as any;
        const email = String(u?.email || '').trim();
        if (/.+@.+\..+/.test(email)) emails.push(email);
      } catch {
        // ignore individual lookup errors
      }
    }
    return uniqueValues(emails);
  };

  const sendWorkflowEmailBestEffort = async (subject: string, message: string, recipientUserIds: string[]): Promise<{ ok: boolean; error?: string; recipients: string[] }> => {
    const recipientEmails = await resolveUserEmails(recipientUserIds);
    if (!recipientEmails.length) {
      return { ok: false, error: 'No hay correos válidos en los destinatarios seleccionados.', recipients: [] };
    }

    const to = recipientEmails.join('; ');
    let firstError = '';

    try {
      const r1 = await (window as any).repo.call('CorreoRepo', 'sendNotificationEmail', to, subject, message) as { success?: boolean; error?: string };
      if (r1?.success) {
        return { ok: true, recipients: recipientEmails };
      }
      firstError = String(r1?.error || 'sendNotificationEmail devolvió success=false.');
    } catch (err: any) {
      firstError = String(err?.message || err || 'Error en sendNotificationEmail.');
    }

    try {
      const r2 = await (window as any).repo.call('CorreoRepo', 'sendEmail', currentUserId, {
        to,
        subject: `[SGC] ${subject}`,
        html: `<pre style="font-family:Segoe UI,Arial,sans-serif;white-space:pre-wrap;line-height:1.4;">${message}</pre>`,
      }) as { success?: boolean; error?: string };

      if (r2?.success) {
        return { ok: true, recipients: recipientEmails };
      }

      const secondError = String(r2?.error || 'sendEmail devolvió success=false.');
      return {
        ok: false,
        recipients: recipientEmails,
        error: `Fallo envío principal (${firstError}) y fallback (${secondError}).`
      };
    } catch (err: any) {
      const secondError = String(err?.message || err || 'Error en sendEmail fallback.');
      return {
        ok: false,
        recipients: recipientEmails,
        error: `Fallo envío principal (${firstError}) y fallback (${secondError}).`
      };
    }
  };

  const flattenFiles = (nodes: WorkflowNode[]): WorkflowNode[] => {
    const result: WorkflowNode[] = [];
    const walk = (n: WorkflowNode) => {
      if (n.type === 'file') result.push(n);
      n.children.forEach(walk);
    };
    nodes.forEach(walk);
    return result;
  };

  const loadWorkflowForNodes = async (nodes: WorkflowNode[]) => {
    try {
      const fileNodes = flattenFiles(nodes);
      const map: Record<string, WorkflowMapItem> = {};
      for (const f of fileNodes) {
        const wf = await (window as any).repo.call('WorkflowRepo', 'getByNodeId', f.id) as any;
        if (wf) {
          map[f.id] = { id: wf.id, status: wf.status, submitted_by_name: wf.submitted_by_name, node_name: wf.node_name };
        }
      }
      setWorkflowMap(prev => ({ ...prev, ...map }));
    } catch {
      // workflow tables may not exist yet
    }
  };

  const loadPendingReview = async () => {
    try {
      const items = await (window as any).repo.call('WorkflowRepo', 'listByStatus', 'revision', 50) as PendingReviewItem[];
      setPendingReview(items || []);
    } catch {
      setPendingReview([]);
    }
  };

  const loadAllUsuarios = async () => {
    try {
      const users = await (window as any).repo.call('UsuarioRepo', 'getAll') as UsuarioLite[];
      const normalized = (users || []).map((u: any) => ({
        ...u,
        activo: toFlag01(u?.activo, 1),
      }));
      setAllUsuarios(normalized);
    } catch {
      // ignore
    }
  };

  const submitForReview = async (nodeId: string, nodeName: string) => {
    try {
      let wf = workflowMap[nodeId];
      if (!wf) {
        const wfId = await (window as any).repo.call('WorkflowRepo', 'create', {
          nodeId,
          nodeName,
          submittedBy: currentUserId,
          submittedByName: currentUserName,
        }) as string;
        wf = { id: wfId, status: 'borrador', submitted_by_name: currentUserName, node_name: nodeName };
      }
      if (wf.status === 'borrador' || wf.status === 'correcciones') {
        await (window as any).repo.call('WorkflowRepo', 'submitForReview', wf.id);
        try {
          await (window as any).repo.call('NotificacionRepo', 'createForRole', 'coordinador del sgc', {
            tipo: 'workflow',
            titulo: 'Nuevo documento para revisión',
            mensaje: `${currentUserName} envió "${nodeName}" a revisión.`,
            referenciaId: wf.id,
            referenciaTipo: 'workflow',
          });
        } catch {
          // notifications table may not exist
        }
        setWorkflowMap(prev => ({ ...prev, [nodeId]: { ...wf!, status: 'revision' } }));
        window.alert(`"${nodeName}" enviado a revisión.`);
        void loadPendingReview();
      } else {
        window.alert(`El documento ya está en estado "${wf.status}".`);
      }
    } catch (err) {
      console.error(err);
      window.alert('No se pudo enviar a revisión.');
    }
  };

  const approveWorkflow = async () => {
    if (!wfApproveDialog) return;
    try {
      await (window as any).repo.call('WorkflowRepo', 'approve', wfApproveDialog.workflowId, {
        approvedBy: currentUserId,
        approvedByName: currentUserName,
        targetFolderId: wfApproveTargetFolder || null,
      });
      if (wfApproveTargetFolder) {
        await callTreeRepo('moveNode', wfApproveDialog.nodeId, wfApproveTargetFolder);
        await refreshTree();
      }
      const wf = await (window as any).repo.call('WorkflowRepo', 'getById', wfApproveDialog.workflowId) as any;
      if (wf?.submitted_by) {
        try {
          await (window as any).repo.call('NotificacionRepo', 'create', {
            userId: wf.submitted_by,
            tipo: 'aprobacion',
            titulo: 'Documento aprobado',
            mensaje: `"${wfApproveDialog.nodeName}" fue aprobado por ${currentUserName}.`,
            referenciaId: wfApproveDialog.workflowId,
            referenciaTipo: 'workflow',
          });
        } catch {
          // ignore
        }
      }
      setWorkflowMap(prev => {
        const updated = { ...prev };
        const nodeId = wfApproveDialog.nodeId;
        if (updated[nodeId]) updated[nodeId] = { ...updated[nodeId], status: 'aprobado' };
        return updated;
      });
      setWfApproveDialog(null);
      setWfApproveTargetFolder('');

      if (wfApproveSendEmail && wf) {
        const recipientIds = uniqueValues([wf.submitted_by, ...wfApproveDestinatarioIds]);
        const mailResult = await sendWorkflowEmailBestEffort(
          `Documento aprobado: ${wfApproveDialog.nodeName}`,
          `El documento "${wfApproveDialog.nodeName}" fue aprobado por ${currentUserName}.`,
          recipientIds
        );
        if (!mailResult.ok) {
          window.alert(`Documento aprobado, pero el correo no se pudo enviar. Detalle: ${mailResult.error || 'Error desconocido.'}`);
        }
      }

      setWfApproveSendEmail(false);
      setWfApproveDestinatarioIds([]);
      void loadPendingReview();
      window.alert(`"${wfApproveDialog.nodeName}" aprobado exitosamente.`);
    } catch (err) {
      console.error(err);
      window.alert('Error al aprobar el documento.');
    }
  };

  const requestCorrection = async () => {
    if (!wfCorrectionDialog) return;
    if (!wfCorr.queEstaMal.trim() || !wfCorr.comoCorregir.trim()) {
      window.alert('Debes indicar qué está mal y cómo corregirlo.');
      return;
    }
    try {
      const wf = await (window as any).repo.call('WorkflowRepo', 'getById', wfCorrectionDialog.workflowId) as any;
      const primaryDestId = String(wfCorr.destinatarioIds?.[0] || wf?.submitted_by || '').trim();
      const primaryDest = primaryDestId
        ? allUsuarios.find(u => u.id === primaryDestId)
        : null;

      await (window as any).repo.call('WorkflowRepo', 'requestCorrection', wfCorrectionDialog.workflowId, {
        reviewerId: currentUserId,
        reviewerName: currentUserName,
        queEstaMal: wfCorr.queEstaMal,
        porQue: wfCorr.porQue,
        comoCorregir: wfCorr.comoCorregir,
        observaciones: wfCorr.observaciones,
        destinatarioId: primaryDestId,
        destinatarioName: primaryDest?.nombre || '',
      });

      if (wf?.submitted_by) {
        try {
          await (window as any).repo.call('NotificacionRepo', 'create', {
            userId: wf.submitted_by,
            tipo: 'correccion',
            titulo: 'Correcciones solicitadas',
            mensaje: `Se solicitaron correcciones para "${wfCorrectionDialog.nodeName}": ${wfCorr.queEstaMal}`,
            referenciaId: wfCorrectionDialog.workflowId,
            referenciaTipo: 'workflow',
          });
        } catch {
          // ignore
        }
      }

      const correctionRecipients = uniqueValues([wf?.submitted_by, ...(wfCorr.destinatarioIds || [])]);
      const correctionMailResult = await sendWorkflowEmailBestEffort(
        `Correcciones requeridas: ${wfCorrectionDialog.nodeName}`,
        `Se solicitaron correcciones para "${wfCorrectionDialog.nodeName}".\n\n¿Qué está mal?: ${wfCorr.queEstaMal}\n¿Por qué?: ${wfCorr.porQue || 'N/A'}\n¿Cómo corregir?: ${wfCorr.comoCorregir}\nObservaciones: ${wfCorr.observaciones || 'N/A'}\n\nRevisado por: ${currentUserName}`,
        correctionRecipients
      );
      if (!correctionMailResult.ok) {
        window.alert(`Correcciones registradas, pero el correo no se pudo enviar. Detalle: ${correctionMailResult.error || 'Error desconocido.'}`);
      }

      setWorkflowMap(prev => {
        const updated = { ...prev };
        const nodeId = wfCorrectionDialog.nodeId;
        if (updated[nodeId]) updated[nodeId] = { ...updated[nodeId], status: 'correcciones' };
        return updated;
      });
      setWfCorrectionDialog(null);
      setWfCorr({ queEstaMal: '', porQue: '', comoCorregir: '', observaciones: '', destinatarioIds: [] });
      void loadPendingReview();
      window.alert(`Correcciones solicitadas para "${wfCorrectionDialog.nodeName}".`);
    } catch (err) {
      console.error(err);
      window.alert('Error al solicitar correcciones.');
    }
  };

  const loadCorrectionHistory = async (workflowId: string) => {
    try {
      const rows = await (window as any).repo.call('WorkflowRepo', 'getCorrections', workflowId) as WorkflowCorrectionRow[];
      setWfCorrectionHistory(rows || []);
    } catch {
      setWfCorrectionHistory([]);
    }
  };

  return {
    workflowMap,
    setWorkflowMap,
    showWorkflowPanel,
    setShowWorkflowPanel,
    pendingReview,
    wfApproveDialog,
    setWfApproveDialog,
    wfApproveTargetFolder,
    setWfApproveTargetFolder,
    wfApproveSendEmail,
    setWfApproveSendEmail,
    wfApproveDestinatarioIds,
    setWfApproveDestinatarioIds,
    wfCorrectionDialog,
    setWfCorrectionDialog,
    wfCorr,
    setWfCorr,
    wfCorrectionHistory,
    allUsuarios,
    loadWorkflowForNodes,
    loadPendingReview,
    loadAllUsuarios,
    submitForReview,
    approveWorkflow,
    requestCorrection,
    loadCorrectionHistory,
  };
}
