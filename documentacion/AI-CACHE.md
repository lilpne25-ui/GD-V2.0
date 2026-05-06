# AI-CACHE (Bitácora viva del agente)

> **Propósito:** mantener contexto técnico continuo del proyecto, documentar decisiones, errores, correcciones y estado actual para no perder continuidad entre sesiones.
>
> **Regla principal:** cada cambio relevante debe registrarse aquí en el momento en que ocurra.

---

## 1) Estado actual del proyecto

- **Proyecto:** SGC Desktop App
- **Stack:** Electron + React + TypeScript + SQL Server
- **Workspace:** `E:\GD-V2.0`
- **Base de datos activa:** `SGC_Dev` (SQL Server)
- **Última actualización:** 2026-03-03

---

## 2) Convención de registro (obligatoria)

Cada entrada nueva debe usar este formato:

```md
### [YYYY-MM-DD HH:mm] Título corto

- Contexto:
- Acción aplicada:
- Archivos tocados:
- Resultado:
- Errores detectados:
- Lección / prevención:
- Estado siguiente:
```

---

## 3) Decisiones técnicas vigentes

- Migración operativa principal a SQL Server completada.
- `migrations-mssql` debe incluirse en empaquetado de producción.
- SMTP requiere validación estricta de `smtp_host` (no permitir correos en campo host).
- Flujo de Workflow debe reportar errores reales de envío (sin silencios).
- Historial de Documentación centralizado en Dashboard.

---

## 4) Errores históricos relevantes y cómo se resolvieron

### [2026-03-03] SMTP `Greeting never received` / `EAI_FAIL`

- **Causa raíz:** `smtp_host` guardado con formato email (ej. `usuario@dominio.com`) en lugar de host DNS.
- **Corrección:** validar `smtp_host` en backend y corregir registros inválidos.
- **Prevención:** no permitir guardado si `smtp_host` contiene `@`.

### [2026-03-03] Guardado de flags de correo no reflejado en UI

- **Causa raíz:** columnas `BIT` de SQL Server llegando como boolean y comparaciones estrictas con `=== 1`.
- **Corrección:** normalización consistente `BIT -> 0/1` en backend y frontend.
- **Prevención:** usar helper `toFlag01()` en toda lectura de flags.

### [2026-03-03] Correos de workflow sin evidencia clara de fallo

- **Causa raíz:** flujo trataba solo excepciones; ignoraba respuestas `{ success: false }`.
- **Corrección:** validar respuesta explícita, fallback de envío y alerta al usuario con detalle.
- **Prevención:** no asumir éxito por ausencia de throw.

---

## 5) Registro de avances recientes

### [2026-03-03 15:00] Homogeneización global de headers y botones (look premium)

- Contexto: se solicitó llevar la mejora visual de cabecera/botones a todo el programa, no solo a Documentación.
- Acción aplicada:
  - se reforzó el layout compartido de `.mod-header` para estandarizar agrupación de acciones;
  - se unificó diseño base de `.btn` (altura, peso tipográfico, espaciado y estados);
  - se definió jerarquía visual consistente para `btn-primary` y `btn-secondary` con estilo premium;
  - se ajustó `responsive` para conservar claridad en móviles.
- Archivos tocados:
  - `src/renderer/modules/documentacion/Documentacion.css` (estilos compartidos que consumen todos los módulos)
- Resultado: apariencia coherente de botones y cabeceras en módulos del sistema.
- Errores detectados: ninguno bloqueante (renderer compiló en verde).
- Lección / prevención: cuando estilos son compartidos, una mejora bien diseñada permite escalar cambios globales sin editar cada módulo individual.
- Estado siguiente: auditoría visual módulo por módulo para microajustes de spacing puntual donde existan wrappers inline legacy.

### [2026-03-03 14:35] Cabecera de Documentación simplificada (info por ícono)

- Contexto: la cabecera mostraba demasiados elementos visibles (puesto, usuario y permisos) generando ruido visual.
- Acción aplicada:
  - se retiraron badges persistentes de puesto/usuario/permisos;
  - se incorporó botón de información con ícono (sin texto) para abrir detalle bajo demanda;
  - se añadió modal de “Información de acceso” con puesto, usuario y permisos efectivos;
  - se ajustó comportamiento responsive para mantener botones principales sin saturación.
- Archivos tocados:
  - `src/renderer/modules/documentacion/Documentacion.tsx`
  - `src/renderer/modules/documentacion/Documentacion.css`
- Resultado: cabecera más limpia y enfocada en acciones clave.
- Errores detectados: ninguno bloqueante (build renderer en verde).
- Lección / prevención: información secundaria debe mostrarse “on demand” para reducir carga cognitiva.
- Estado siguiente: homologar patrón de “info contextual” en otras cabeceras con alta densidad.

### [2026-03-03 14:10] Rediseño UI del modal “Solicitar correcciones”

- Contexto: el modal de correcciones se percibía saturado, poco legible y con mala jerarquía visual.
- Acción aplicada:
  - se reorganizó la estructura del modal con encabezado claro, bloque del documento y grid uniforme;
  - se incrementó legibilidad de campos de texto y selector de destinatarios;
  - se estilizó el historial de correcciones con contenedor dedicado y mejor contraste;
  - se mejoró respuesta en pantallas pequeñas (layout responsive a una columna).
- Archivos tocados:
  - `src/renderer/modules/documentacion/Documentacion.tsx`
  - `src/renderer/modules/documentacion/Documentacion.css`
- Resultado: formulario más limpio, escaneable y cómodo para captura operativa.
- Errores detectados: ninguno bloqueante (build renderer en verde).
- Lección / prevención: modales de operación crítica deben priorizar jerarquía visual y densidad controlada de información.
- Estado siguiente: homologar este mismo patrón visual en modales de aprobación y bandeja de revisión.

### [2026-03-03 12:30] Se crea versión ejecutiva de memoria

- Contexto: necesidad de tener también una vista no técnica para dirección/seguimiento.
- Acción aplicada: creación de `documentacion/AI-CACHE-EXECUTIVE.md`.
- Archivos tocados:
  - `documentacion/AI-CACHE-EXECUTIVE.md`
  - `documentacion/AI-CACHE.md`
- Resultado: ya existen dos memorias complementarias (técnica y ejecutiva).
- Errores detectados: ninguno.
- Lección / prevención: mantener sincronizadas ambas memorias al cierre de cada bloque relevante.
- Estado siguiente: continuar actualizando ambas bitácoras en paralelo según el tipo de audiencia.

### [2026-03-03 10:18] Build instalable validado

- Contexto: validación de empaquetado producción.
- Acción aplicada: build completo (`main`, `renderer`, `electron-builder`).
- Archivos tocados: `package.json` (extraResources).
- Resultado: instalador generado correctamente y recursos de migración incluidos.
- Errores detectados: ninguno bloqueante.
- Lección / prevención: asegurar inclusión explícita de migraciones en recursos.
- Estado siguiente: smoke test funcional por módulos.

### [2026-03-03 11:30] Workflow + correo opcional reforzado

- Contexto: correcciones y aprobaciones no enviaban correo de forma confiable.
- Acción aplicada: destinatario automático + destinatarios extra + fallback y mensajes de error.
- Archivos tocados:
  - `src/renderer/modules/documentacion/hooks/useWorkflow.ts`
  - `src/renderer/modules/documentacion/Documentacion.tsx`
- Resultado: flujo más trazable y con diagnóstico en UI.
- Errores detectados: usuarios con emails placeholder/no válidos.
- Lección / prevención: validar calidad de datos de destinatarios.
- Estado siguiente: fortalecer validación de emails en flujo operativo.

### [2026-03-03 12:00] Dashboard funcional con historial

- Contexto: historial de Documentación estaba duplicado en `Usuarios`.
- Acción aplicada: se centralizó en `Dashboard` con datos reales y tabla de auditoría.
- Archivos tocados:
  - `src/renderer/components/Dashboard.tsx`
  - `src/renderer/components/Dashboard.css`
  - `src/renderer/modules/usuarios/Usuarios.tsx`
- Resultado: observabilidad funcional en una vista única.
- Errores detectados: warnings de estilos inline en módulos legacy.
- Lección / prevención: concentrar trazabilidad transversal en componentes de monitoreo.
- Estado siguiente: agregar filtros por fecha/usuario/acción.

### [2026-03-03 13:35] Papelera documental + acceso directo desde notificaciones/revisión

- Contexto: se solicitó evitar pérdida definitiva al eliminar documentos/carpetas y abrir documentos directamente desde centro de notificaciones y bandeja de revisión.
- Acción aplicada:
  - se implementó papelera lógica con retención de 30 días y restauración a ubicación original;
  - se agregó purga automática de expirados;
  - se añadió modal de Papelera en Documentación con restaurar/borrado definitivo;
  - se habilitó apertura directa de documento desde notificación (workflow -> node) y desde la bandeja de revisión.
- Archivos tocados:
  - `src/database/migrations-mssql/013_document_trash.sql`
  - `src/database/repositories/documentoTreeRepo.ts`
  - `src/renderer/App.tsx`
  - `src/renderer/modules/documentacion/Documentacion.tsx`
- Resultado: eliminación segura (recuperable) y navegación operativa más rápida para revisión/aprobación.
- Errores detectados:
  - advertencias de estilos inline en módulos legacy (preexistentes, no bloqueantes);
  - diagnósticos de IDE sobre imports no reproducidos en compilación real.
- Lección / prevención: toda eliminación de negocio debe ser reversible por política temporal antes de destrucción física.
- Estado siguiente: complementar con filtros en papelera/historial y registrar métricas de restauración.

---

## 6) Pendientes activos (corto plazo)

- [ ] Validación estricta de emails reales para usuarios críticos de workflow.
- [ ] Log persistente de resultado de envío (éxito/fallo + detalle técnico).
- [ ] Filtros y exportación del historial en Dashboard.
- [ ] Filtros por tipo/fecha en papelera documental.

---

## 7) Reglas de mantenimiento de este archivo

1. No borrar historial: solo agregar entradas nuevas.
2. Registrar también intentos fallidos (siempre con causa y aprendizaje).
3. Si se revierte un cambio, dejar rastro explícito de por qué.
4. Al cerrar sesión de trabajo, actualizar:
   - última entrada,
   - pendientes,
   - estado siguiente.

---

## 8) Nota operativa

Este archivo se considera **fuente de memoria técnica del agente** para mantener continuidad y reducir reincidencia de errores.

---

## 9) Implementación propuesta — AI-CACHE (requisitos y pasos)

### Objetivos

- Mantener una bitácora estructurada y consultable de eventos técnicos, decisiones, correcciones, migraciones y estados para mejorar continuidad entre sesiones y soportar auditoría.
- Proveer un caché/registro que permita a asistentes (humanos o agentes) recuperar contexto reciente y recomendaciones basadas en historial.
- Permitir consultas rápidas (por documento, por usuario, por tipo de evento) y políticas de expiración automáticas.

### Qué datos guardar

- Identificador único (id).
- Tipo de evento (decisión, error, corrección, migración, deploy, nota ejecutiva, pruebas).
- Resumen breve (texto corto, 256 chars).
- Payload JSON (detalles, diffs, stacktraces, comandos ejecutados). Limitar tamaño por entrada (p.ej. 1 MB).
- Metadata: autor/actor (user id), módulo/archivo afectado, tags, severidad, correlación (request id, migration id).
- Timestamps: created_at, updated_at, expires_at.
- Origen: automático (agente) o manual (usuario).

### Caducidad y retención

- Política por defecto: TTL 90 días para entradas de baja relevancia. Entradas marcadas como "permanente" o "audit" no expiran automáticamente.
- Purga programada diaria para entradas expiradas.
- Soporte para retención legal (etiqueta `keep_until: YYYY-MM-DD`) que evita purga automática.

### Privacidad y seguridad

- Restricción de datos sensibles: nunca almacenar credenciales, secretos o PII sin tokenización. Si es necesario, almacenar sólo referencia (ej. key id) y registrar variable en vault seguro.
- Encriptación en tránsito (TLS) y en reposo (TDE o cifrado de columna según DB) para payloads sensibles.
- Control de acceso: RBAC para lectura/escritura de AI-CACHE. Auditar accesos (quién leyó/qué) en logs de auditoría.

### Diseño de almacenamiento (sugerido)

- Tabla SQL `ai_cache`:
  - id NVARCHAR(64) PK
  - event_type NVARCHAR(40)
  - title NVARCHAR(256)
  - payload NVARCHAR(MAX) / JSON
  - actor_id NVARCHAR(64)
  - module NVARCHAR(128)
  - tags NVARCHAR(255)
  - severity INT
  - created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  - updated_at DATETIME2 NULL
  - expires_at DATETIME2 NULL
  - is_permanent BIT NOT NULL DEFAULT 0

- Índices en (`event_type`), (`module`), (`expires_at`) y (`actor_id`).

### API mínima necesaria

- writeEntry(payload): valida, sanitiza y publica entrada (agente o UI).
- readEntries(filters, pagination): consultar por tags/module/type/date.
- markPermanent(id) / extendTTL(id, days).
- purgeExpired(): job programado.

### Operacional y backups

- Incluir `ai_cache` en backups regulares, pero considerar backups diferencial/full por volumen.
- Métricas a monitorear: tasa de escrituras, tamaño total en DB, latencia de consultas clave, número de entradas permanentes.

### Rollout y pruebas

- Fase 1 (staging): implementar tabla y API, almacenar logs de prueba por 30 días.
- Fase 2 (pilot): activar para 10–15 usuarios/agents, medir uso y rendimiento 2 semanas.
- Fase 3 (producción): habilitar globalmente, activar purga y alertas.

### Migración y limpieza

- Proveer script para normalizar entradas viejas (migrar datos de `documento_auditoria` o `documento_papelera` que deban conservarse).

### Notas finales

- Prioridad: alta (según solicitud). Empezar por diseño de tabla y API, luego instrumentar agentes para escribir entradas importantes.
- Riesgo principal: crecimiento de tamaño de DB si no se controla TTL/evicción. Monitorear y ajustar políticas.

---
