import { useState } from 'react';

type UseDocumentTreeParams<TTree, TRow> = {
  initialTree: TTree;
  defaultFolderId?: string;
  callTreeRepo: (method: string, ...args: any[]) => Promise<any>;
  mapRowsToTree: (rows: TRow[]) => TTree;
  findNodeById: (tree: TTree, id: string) => any | null;
  treeLoadErrorMessage?: string;
};

export function useDocumentTree<TTree, TRow>({
  initialTree,
  defaultFolderId = 'root',
  callTreeRepo,
  mapRowsToTree,
  findNodeById,
  treeLoadErrorMessage = 'No se pudo cargar la estructura de carpetas desde la base de datos.',
}: UseDocumentTreeParams<TTree, TRow>) {
  const [tree, setTree] = useState<TTree>(initialTree);
  const [currentFolderId, setCurrentFolderId] = useState(defaultFolderId);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState(defaultFolderId);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([defaultFolderId]));
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [treeError, setTreeError] = useState('');

  const refreshTree = async (preferredFolderId?: string) => {
    setIsLoadingTree(true);
    setTreeError('');
    try {
      const rows = await callTreeRepo('getAll') as TRow[];
      const nextTree = mapRowsToTree(rows);
      setTree(nextTree);

      const folderToUse = preferredFolderId || currentFolderId;
      const exists = !!findNodeById(nextTree, folderToUse);
      setCurrentFolderId(exists ? folderToUse : defaultFolderId);

      if (selectedNodeId && !findNodeById(nextTree, selectedNodeId)) {
        setSelectedNodeId(null);
      }
    } catch (err) {
      console.error(err);
      setTreeError(treeLoadErrorMessage);
    } finally {
      setIsLoadingTree(false);
    }
  };

  return {
    tree,
    setTree,
    currentFolderId,
    setCurrentFolderId,
    selectedNodeId,
    setSelectedNodeId,
    uploadTargetFolderId,
    setUploadTargetFolderId,
    expandedFolders,
    setExpandedFolders,
    isLoadingTree,
    treeError,
    refreshTree,
  };
}
