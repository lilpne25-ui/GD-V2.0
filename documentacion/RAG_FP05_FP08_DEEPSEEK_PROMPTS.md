# RAG FP-05 / FP-08 DeepSeek — Plan corregido para GD-V2.0

## 0. Estado real del repo
- App desktop con Electron + React + TypeScript.
- Main process en `src/main/main.ts`.
- Preload en `src/main/preload.ts`.
- Renderer principal de registros en `src/renderer/modules/registros/Registros.tsx`.
- Panel real de registros dinamicos en `src/renderer/modules/registros/components/DynamicRecordsPanel.tsx`.
- Tipos compartidos actuales en `src/shared/types/registros-dinamicos.ts`.
- Source of truth de datos: SQL Server.
- `src/database/db.ts` reexporta desde `db-sqlserver`.
- Migraciones MSSQL en `src/database/migrations-mssql`.
- Descubrimiento de migraciones no dinamico: `migrationFiles` esta hardcodeado en `src/database/db-sqlserver.ts`.
- Bridge generico `repo:call` depende de whitelist de `RepoName` + `repoLoaders` en `src/main/main.ts`.
- Preload expone `window.electronAPI`, `window.repo`, `window.records`; actualmente no existe `window.rag`.
- `DynamicRecordsPanel` consume `window.records` y `window.repo.call`.
- Feature toggle actual de dinamicos usa `SGC_ENABLE_DYNAMIC_RECORDS` / localStorage / localhost.
- Extraccion documental real:
  - `DocumentoTreeRepo` usa `mammoth` para DOCX.
  - `DocumentoTreeRepo` usa `xlsx` para XLS/XLSX.
  - `.doc` tiene advertencia y no es extraccion de alta precision.
  - PDF no esta garantizado por default en el stack actual.
- `package.json` no trae framework de tests formal (Jest/Vitest) ni script `typecheck`.
- Webpack usa `ts-loader` con `transpileOnly: true`; por eso build puede pasar aunque TypeScript tenga errores.

## 1. Decisiones de arquitectura
- SQL Server se mantiene como source of truth.
- RAG entra como modulo adicional; no reemplaza el motor de registros dinamicos existente.
- Fase inicial solo FP-05.
- FP-08 queda desactivado por feature flag al inicio.
- DeepSeek se usa para generacion/analisis (chat/completion), no como embedding provider asumido.
- Embeddings desacoplados por interface `EmbeddingsProvider`.
- Recuperacion vectorial con `VectorIndexAdapter` en modo baseline SQL/Node primero.
- Cache RAG propio en DB para reducir costo y latencia, independiente del cache del proveedor.
- IPC tipado `rag:*` + `window.rag` en preload.
- Integracion de UI dentro de `DynamicRecordsPanel` (flujo beta), no modulo paralelo nuevo.

## 2. Feature flags y ENV
Variables objetivo:
- `SGC_RAG_ENABLED=0`
- `SGC_RAG_FP05_ENABLED=1`
- `SGC_RAG_FP08_ENABLED=0`
- `SGC_RAG_ONLY_CACHE_MODE=0`
- `SGC_RAG_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY=`
- `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- `DEEPSEEK_MODEL=deepseek-v4-flash`
- `SGC_RAG_EMBEDDINGS_PROVIDER=local|openai_compatible|ollama`
- `SGC_RAG_EMBEDDINGS_BASE_URL=`
- `SGC_RAG_EMBEDDINGS_MODEL=`
- `SGC_RAG_TOP_K=8`
- `SGC_RAG_CONTEXT_TOKEN_BUDGET=6000`
- `SGC_RAG_MAX_FILE_MB=15`
- `SGC_RAG_DAILY_BUDGET_USD=1`
- `SGC_RAG_MONTHLY_BUDGET_USD=20`

Nota operativa:
- Al implementar, actualizar `.env.example` con defaults seguros y comentarios por variable.

## 3. Fases corregidas

### PROMPT 00 — Auditoría repo-aware antes de tocar código
```text
Actua como Staff Engineer Electron + React + TypeScript + SQL Server.
Tarea: auditar el repo GD-V2.0 antes de implementar RAG.

Inspeccion obligatoria:
- package.json
- src/database/db-sqlserver.ts
- src/main/main.ts
- src/main/preload.ts
- src/renderer/modules/registros/components/DynamicRecordsPanel.tsx
- src/database/repositories/documentoTreeRepo.ts
- src/shared/types/registros-dinamicos.ts

Entregables:
1) lista de archivos exactos a modificar por fase,
2) confirmar si ya existe o no: RagRepo, window.rag, migraciones RAG, tipos RAG,
3) riesgos tecnicos y de compatibilidad,
4) estrategia para no romper records actuales.

Restriccion: no escribir codigo en esta fase.
Si algo no se puede comprobar en repo, marcar [No verificado].
```

### PROMPT 01 — Migración RAG mínima SQL Server
```text
Implementa migracion RAG minima para SQL Server.

Acciones:
1) Crear archivo: src/database/migrations-mssql/018_rag_core.sql
2) Registrar la migracion en el arreglo migrationFiles de src/database/db-sqlserver.ts

Tablas minimas requeridas:
- rag_sources
- rag_chunks
- rag_embeddings
- rag_queries
- rag_retrievals
- rag_answers
- rag_feedback
- rag_tasks
- rag_audit_log

Reglas SQL obligatorias:
- DDL idempotente con IF OBJECT_ID(..., 'U') IS NULL
- SQL Server puro
- Prohibido usar sintaxis SQLite (datetime('now'), LIMIT, etc.)
- Timestamps con DATETIME2(0) DEFAULT SYSDATETIME()
- JSON en NVARCHAR(MAX) con CHECK ISJSON(...) cuando aplique
- Indices por hash, status, source_id, created_at, record_type_code

Agregar al final del SQL (comentado): smoke queries de validacion de insercion/lectura.
```

### PROMPT 02 — Tipos compartidos y repositorio RAG
```text
Crear capa base tipada de RAG.

Crear archivos:
- src/shared/types/rag.ts
- src/database/repositories/ragRepo.ts

Actualizar:
- RepoName en src/main/main.ts para incluir RagRepo
- repoLoaders en src/main/main.ts para incluir RagRepo

Importante:
- Aunque se agregue RagRepo al puente generico, preparar desde ya la estrategia de IPC tipado rag:* para la UI final.
- No exponer operaciones sensibles de proveedor LLM directamente por repo:call en renderer.
```

### PROMPT 03 — Servicios backend RAG en main process
```text
Crear servicios backend de RAG bajo main process.

Crear carpeta:
- src/main/services/rag/

Crear servicios:
- ragTextExtractionService.ts
- ragChunkingService.ts
- ragHashService.ts
- ragEmbeddingProvider.ts
- ragVectorIndexService.ts
- ragRetrievalService.ts
- ragAnswerService.ts
- ragBudgetService.ts
- ragAuditService.ts

Reglas:
- Reusar extraccion existente de DocumentoTreeRepo para DOCX/XLSX cuando sea viable.
- Soporte inicial obligatorio: TXT, DOCX, XLSX.
- No prometer PDF por default.
- Si se habilita PDF, hacerlo como subfase opcional con dependencia explicita + prueba.
- Aplicar max file size y timeouts por ingesta.
- Chunking determinista con overlap configurable.
- Hash por source completo y por chunk.
```

### PROMPT 04 — DeepSeek provider
```text
Implementar proveedor DeepSeek para generacion/analisis en modo OpenAI-compatible.

Requisitos:
- Clase/servicio: DeepSeekChatProvider
- Base URL por ENV (DEEPSEEK_BASE_URL)
- Modelo por ENV (DEEPSEEK_MODEL), default deepseek-v4-flash
- Usar response_format: { type: "json_object" }
- El prompt del request debe contener la palabra "json"
- Incluir contrato JSON esperado y ejemplo de salida
- Parseo robusto con manejo de JSON invalido o vacio
- Si respuesta invalida: registrar en rag_audit_log + fallback seguro
- No usar deepseek-chat como default (evitar dependencia en modelo deprecable)
- Persistir usage incluyendo prompt_cache_hit_tokens y prompt_cache_miss_tokens si vienen en respuesta
```

### PROMPT 05 — EmbeddingsProvider desacoplado
```text
Implementar capa de embeddings desacoplada.

Interface requerida:
embed(texts: string[]): Promise<number[][]>

Providers:
- localHashEmbeddingProvider (smoke/dev sin proveedor externo)
- openAiCompatibleEmbeddingProvider (configurable por ENV)
- ollamaEmbeddingProvider (opcional por ENV)

Persistencia minima por embedding:
- model
- dims
- checksum/hash
- embedding_json

Retrieval baseline MVP:
- prefiltrar en SQL por tipo FP, vigencia source, status
- similitud coseno en Node con limite configurable
- no implementar vector search complejo en SQL Server en esta fase
```

### PROMPT 06 — IPC tipado y preload
```text
Agregar IPC tipado para RAG.

Canales obligatorios:
- rag:analyze-record
- rag:ingest-document-node
- rag:get-answer
- rag:submit-feedback
- rag:get-evidence

Actualizar:
- src/main/main.ts o crear src/main/ragIpc.ts y registrarlo desde main
- src/main/preload.ts para exponer window.rag
- tipos globales del renderer (crear/actualizar declaraciones)

Reglas de seguridad:
- Nunca exponer API keys al renderer
- Nunca enviar secretos por payload de UI
- No llamar proveedor LLM desde renderer
- No usar window.repo.call para bypass de seguridad en llamadas LLM
```

### PROMPT 07 — UI en DynamicRecordsPanel
```text
Integrar UI RAG dentro del flujo beta existente de DynamicRecordsPanel.

Agregar:
- boton "Analizar con RAG"
- seccion/panel de evidencia con:
  - hallazgos
  - campos faltantes
  - inconsistencias
  - acciones sugeridas
  - fuentes/chunks usados
  - estado cache hit/miss
  - version de conocimiento
- botones de feedback: "Fue útil" y "Corregir"

Reglas:
- no romper crear/editar/transicionar registros
- errores de RAG no deben romper render ni bloquear formulario
- si SGC_RAG_ENABLED=0 ocultar UI RAG
- si SGC_RAG_ONLY_CACHE_MODE=1 no llamar proveedor externo
```

### PROMPT 08 — Hardening costo, seguridad y auditoría
```text
Implementar controles operativos de RAG:
- budget diario y mensual
- cambio automatico a modo solo-cache cuando se exceda budget
- rate limit por usuario
- PII masking antes de proveedor externo
- auditoria por llamada RAG (request/response metadata minimizada)
- no guardar API keys en DB
- no loggear prompts completos con secretos
- registrar errores sin romper UI

Entregar matriz de riesgo residual + mitigaciones aplicadas.
```

### PROMPT 09 — Tests / validación realista del repo
```text
Como el repo no trae framework formal de tests, ejecutar validacion realista.

Primero:
- agregar script npm `typecheck`: `tsc --noEmit`
- agregar smoke script para verificar migraciones RAG y operaciones minimas (si no se integra Jest/Vitest)

Criterios minimos de validacion:
- npm run typecheck
- npm run build
- migracion 018 registrada en migrationFiles
- tablas RAG creadas
- reingesta de mismo contenido no duplica chunks
- query repetida usa cache propio
- con DeepSeek apagado funciona solo-cache/fallback
- UI no se rompe con RAG desactivado

Reportar PASS/FAIL por criterio con evidencia.
```

### PROMPT 10 — Rollout y rollback
```text
Crear RUNBOOK_RAG_GD_V2.md con operacion y contingencia.

Debe incluir:
- activar solo FP-05
- FP-08 apagado por default
- desactivar total con SGC_RAG_ENABLED=0
- activar solo-cache con SGC_RAG_ONLY_CACHE_MODE=1
- revisar auditoria RAG
- revisar consumo budget
- rollback de UI sin borrar datos RAG
- checklist operativa primeras 72 horas
```

## 4. Prompt operativo único corregido
> NO recomendado para primera corrida. Ejecutar solo cuando las fases 00 a 03 ya pasaron con evidencia.

```text
Implementa RAG FP-05 en GD-V2.0 de punta a punta, pero respetando guardrails del repo.
Precondiciones obligatorias: fases 00, 01, 02 y 03 completadas con PASS.

Reglas:
- No introducir feedback loop avanzado hasta validar cache + retrieval + answer en QA.
- FP-08 debe permanecer desactivado por flag.
- PDF no es obligatorio; solo habilitar si se agrega dependencia y prueba.
- No romper records dinamicos existentes.
- Entregar evidencia PASS/FAIL por subfase.
```

## 5. Riesgos residuales
| Riesgo | Impacto | Mitigacion recomendada |
|---|---|---|
| Migracion no registrada en `migrationFiles` | RAG no inicializa en runtime | Verificar `db-sqlserver.ts` en PR checklist |
| Fuga de PII a proveedor externo | Riesgo legal/seguridad | Masking previo + auditoria + minimizacion de contexto |
| Costo API fuera de control | Sobrecosto operativo | Budget diario/mensual + solo-cache automatico |
| JSON invalido del proveedor | Respuesta inutil o crash de parseo | Parser robusto + fallback + auditoria de error |
| Embeddings lentos | Latencia alta en analisis | Batch + limites + provider local para dev |
| SQL Server no vectorial nativo en MVP | Recall semantico limitado | Coseno en Node + evolucion posterior a motor vectorial |
| UI rota por feature flag | Bloqueo operativo en registros | Feature gating defensivo y fallback visual |
| Perdida de trazabilidad | Dificultad de soporte/auditoria | `rag_audit_log` + metadata de queries/retrievals |
| Feedback contaminando conocimiento | Degradacion de calidad | Flujo de revision y versionado de parches antes de consolidar |

## 6. Criterios de aceptación del documento corregido
- Menciona archivos reales del repo.
- Elimina supuestos no verificados como si fueran hechos.
- Define fases implementables y seguras.
- Indica explicitamente donde registrar migraciones (`migrationFiles`).
- Indica donde registrar IPC tipado y preload.
- Separa DeepSeek chat de embeddings.
- Mueve aprendizaje continuo completo a fase posterior a baseline estable.
- Deja FP-08 desactivado por default.
- Incluye smoke tests realistas para este repo.
