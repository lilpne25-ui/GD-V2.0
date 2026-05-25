# Refactor Plan

## 1. Resumen ejecutivo
- Estado del codigo: Base funcional y compilable, con mezcla de componentes productivos y modulos en modo demo.
- Riesgo de refactor: Medio-Alto (por tamano de archivos criticos y dependencias cruzadas en UI/IPC/repos).
- Areas prioritarias: seguridad de autenticacion, boundary IPC, modularizacion de monolitos y convergencia de modulos demo a persistencia real.

## 2. Deuda tecnica detectada
| Prioridad | Archivo/Ruta | Problema | Impacto | Refactor sugerido |
|---|---|---|---|---|
| P0 | `src/renderer/App.tsx` | Login bypass activo y sesion admin de desarrollo embebida | Inseguridad critica y comportamiento no productivo | Encapsular `dev-bypass` por flag de entorno estricta y desactivada por defecto |
| P0 | `src/database/repositories/usuarioRepo.ts` | Password en texto plano y comparacion directa | Alto riesgo de seguridad | Introducir servicio de hashing y migracion progresiva de credenciales |
| P0 | `src/main/main.ts`, `src/main/preload.ts` | `repo:call` generico + acceso abierto a metodos/archivos | Superficie de ataque amplia | Reemplazar por IPC tipado por dominio + allowlist por metodo |
| P1 | `src/renderer/modules/documentacion/Documentacion.tsx` | Archivo monolitico (>100 KB) con multiples responsabilidades UI + negocio | Mantenimiento lento y alto riesgo de regresion | Dividir en hooks + subcomponentes + servicios puros |
| P1 | `src/database/repositories/registroDinamicoRepo.ts` | Repositorio extenso con reglas + queries + mapeo en una sola unidad | Dificultad de pruebas y cambios seguros | Separar en capas: policy, query builders, mappers, audit writer |
| P1 | `src/renderer/modules/*` (riesgos/capa/auditorias/no-conformidades) | Dependencia de `demo*` arrays en memoria | Inconsistencia funcional y baja confiabilidad | Migrar a repos/IPC reales por fases con feature flags |
| P2 | `src/renderer/modules/registros/components/DynamicRecordsPanel.tsx` | Lectura de sesion via claves legacy (`sgc_session`, etc.) y fallback ambiguo | Identidad/rol inconsistente | Unificar lector de sesion compartido y contrato unico (`sgc.session`) |
| P2 | `src/renderer/modules/*` con `innerHTML` | Riesgo de XSS/HTML no sanitizado | Riesgo de inyeccion y abuso IPC | Introducir sanitizacion central y wrappers seguros de rendering |

## 3. Plan de refactor incremental
### Paso 1: bajo riesgo
- Crear capa de configuracion y feature flags central (`isProduction`, `enableDevBypass`).
- Unificar lectura de sesion en helper compartido sin cambiar logica de negocio.
- Agregar validaciones de entrada en IPC de archivo/local-path.

### Paso 2: riesgo medio
- Crear `AuthSecurityService` (hash/verify) y adaptar `UsuarioRepo` sin romper contrato externo.
- Extraer `repo:call` a handlers tipados por dominio (usuarios/documentos/registros).
- Mantener compatibilidad temporal con wrapper legacy marcado como deprecado.

### Paso 3: riesgo alto
- Reemplazar datos `demo*` por persistencia SQL gradual:
  1) No Conformidades
  2) CAPA
  3) Auditorias
  4) Riesgos
- Cada modulo migrado con checklist de smoke y rollback funcional.

### Paso 4: mejoras estructurales
- Particionar `Documentacion.tsx` en submodulos (tree, preview, workflow, dialogs, permissions).
- Particionar `registroDinamicoRepo.ts` en subservicios de dominio.
- Introducir pruebas de contrato para IPC + repositorios criticos.

## 4. Cambios propuestos
- Refactor de seguridad primero, sin agregar features nuevas.
- Refactor de estructura despues, guiado por pruebas smoke.
- Refactor de modulos demo hacia persistencia real antes de cualquier expansion funcional.

## 5. Archivos afectados
- `src/renderer/App.tsx`
- `src/database/repositories/usuarioRepo.ts`
- `src/main/main.ts`
- `src/main/preload.ts`
- `src/renderer/modules/documentacion/Documentacion.tsx`
- `src/database/repositories/registroDinamicoRepo.ts`
- `src/renderer/modules/riesgos/Riesgos.tsx`
- `src/renderer/modules/capa/CAPA.tsx`
- `src/renderer/modules/auditorias/Auditorias.tsx`
- `src/renderer/modules/no-conformidades/NoConformidades.tsx`
- `src/renderer/modules/registros/components/DynamicRecordsPanel.tsx`

## 6. Riesgos
- Riesgo de ruptura en permisos por rol durante cambio de auth.
- Riesgo de regresion en workflow documental por alta concentracion de logica en un solo archivo.
- Riesgo de desalineacion UI/DB al migrar modulos demo si no se hace por fases.
- Riesgo de deuda nueva si se mezcla refactor con features en el mismo sprint.

## 7. Pruebas necesarias
- Build completo (`npm run build`) en cada fase.
- Smoke funcional de login, documentacion, workflow, usuarios, registros dinamicos.
- Pruebas negativas de IPC (payload invalido, metodo no permitido, ruta no permitida).
- Pruebas de migracion de password (usuario legacy y usuario nuevo).
- Validacion manual de modulos migrados (lista, alta, edicion, transicion, auditoria).

## 8. Antes / Despues esperado
- Antes: App util para demo/piloto tecnico pero con seguridad insuficiente y deuda estructural alta.
- Despues: Base mas segura, mantenible y lista para crecimiento comercial controlado, sin cambiar objetivo de negocio ni UX operativa.

## 9. Proxima accion recomendada
Aprobar Fase 1 + Fase 2 en un solo bloque (hardening de auth/IPC y normalizacion de sesion), sin tocar aun UX mayor ni expansion de features.
