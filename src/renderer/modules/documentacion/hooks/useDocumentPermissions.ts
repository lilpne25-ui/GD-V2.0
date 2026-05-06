import { useState } from 'react';

type DocumentoPermisos = {
  can_add_documents: number;
  can_delete_documents: number;
  can_rename_documents: number;
  can_move_documents: number;
  can_sign_documents: number;
};

const DEFAULT_PERMS: DocumentoPermisos = {
  can_add_documents: 1,
  can_delete_documents: 0,
  can_rename_documents: 0,
  can_move_documents: 0,
  can_sign_documents: 0,
};

export function useDocumentPermissions() {
  const [documentPerms, setDocumentPerms] = useState<DocumentoPermisos>(DEFAULT_PERMS);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const refreshDocumentPermissions = async (userId: string | null | undefined) => {
    if (!userId) {
      setDocumentPerms(DEFAULT_PERMS);
      return;
    }

    setLoadingPerms(true);
    try {
      const perms = await (window as any).repo.call('UsuarioRepo', 'getDocumentPermissions', userId) as DocumentoPermisos;
      setDocumentPerms({
        can_add_documents: Number(perms?.can_add_documents || 0),
        can_delete_documents: Number(perms?.can_delete_documents || 0),
        can_rename_documents: Number((perms as any)?.can_rename_documents || 0),
        can_move_documents: Number((perms as any)?.can_move_documents || 0),
        can_sign_documents: Number((perms as any)?.can_sign_documents || 0),
      });
    } catch {
      setDocumentPerms(DEFAULT_PERMS);
    } finally {
      setLoadingPerms(false);
    }
  };

  return {
    documentPerms,
    setDocumentPerms,
    loadingPerms,
    refreshDocumentPermissions,
  };
}
