// Documentos reales que la demo puede mostrar, y los que nunca debe abrir.
//
// Se eligieron con datos de SGC_Dev (22/09/2026):
//  - PR-01-A esta guardado en la BD (no en disco), asi que abre en cualquier
//    equipo. Los documentos en disco (FP-01, PR-02) apuntan a otra PC.
//  - La ruta evita los archivos de prueba (Libro1.pdf, Hoja principal.docx).
//  - Nada de lo mostrado contiene datos personales.

/** Ruta de carpetas desde la raiz del arbol documental. */
export const DEMO_APPROVED_FOLDER = ['4.APROBADO'];

export const DEMO_PROCEDURE_FOLDER = [
  '4.APROBADO',
  '1.-MANUAL DEL SISTEMA',
  'PR-01-PROCEDIMIENTO INFORMACIÓN DOCUMENTADA',
];

/** Codigo que se escribe en la busqueda real (busqueda dentro de la carpeta). */
export const DEMO_SEARCH_CODE = 'PR-01-A';

/** Lista Maestra de documentos internos: el documento que se abre en el visor. */
export const DEMO_MASTER_LIST = 'PR-01-A LISTA MAESTRA DE DOCUMENTOS INTERNOS.pdf';

/**
 * Documentos que la demo NUNCA debe abrir: contienen datos personales o son
 * archivos de prueba. Un test verifica que ninguna escena los referencia.
 */
export const FORBIDDEN_DEMO_DOCUMENTS = [
  'PR-03-A LISTA DE CONTACTOS INTERNA',
  'MA-01-A09 ORGANIGRAMA INNOVAX',
  'MA-01-A13 AVISO DE PRIVACIDAD',
  'Libro1',
  'Hoja principal',
];
