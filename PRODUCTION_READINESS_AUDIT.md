# Production Readiness Audit

## 1. Resultado final
Categoria: Listo solo para demo

## 2. Resumen ejecutivo
El proyecto compila y empaqueta correctamente para Windows (`npm run build` OK), usa SQL Server como runtime principal y mantiene respaldos versionados via Git LFS. Sin embargo, hoy no es apto para produccion real por tres bloqueadores criticos: bypass de login activo, credenciales en texto plano con default debil, y fallback de credenciales `sa` en build empaquetado. Ademas, varios modulos clave siguen en modo demo con datos en memoria, sin persistencia operativa real.

## 3. Checklist general
| Area | Estado | Evidencia | Riesgo |
|---|---|---|---|
| Build y empaquetado | Correcto | `npm run build` genera `dist\\sgc-desktop-app Setup 0.1.0.exe` | Bajo |
| Runtime de datos (SQL Server + migraciones) | Correcto | `src/database/db.ts`, `src/database/db-sqlserver.ts` | Medio |
| Autenticacion y control de acceso | Riesgoso | `src/renderer/App.tsx:28`, `src/database/repositories/usuarioRepo.ts:74` | Critico |
| Gestion de secretos | Riesgoso | `src/database/db-sqlserver.ts:27-30`, `README.md:49` | Critico |
| Seguridad IPC/Electron | Parcial | `src/main/main.ts:497-503`, `src/main/preload.ts:41` | Alta |
| Manejo de archivos locales desde renderer | Parcial | `src/main/main.ts:603-640`, `src/main/preload.ts:33-35` | Alta |
| Persistencia funcional por modulo | Parcial | Modulos demo en `src/renderer/modules/*` (riesgos/capa/auditorias/no-conformidades) | Alta |
| Backups y restauracion | Correcto | `backups/20260303-101847/*`, `.gitattributes` | Medio |
| Observabilidad y alertas | No encontrado | No se encontro stack de monitoreo/alertas productivas | Media |
| Testing automatizado | No encontrado | Sin `npm test`; solo `scripts/test-auth-local.js` | Alta |
| CI/CD | No encontrado | No existe `.github/workflows` | Media |
| Runbook operativo de incidente/rollback | Parcial | Hay docs de deploy demo, no runbook de incidentes productivos | Media |

Estados permitidos: Correcto / Parcial / No encontrado / Riesgoso

## 4. Bloqueadores de produccion
| Severidad | Bloqueador | Archivo/Ruta | Impacto | Accion requerida |
|---|---|---|---|---|
| Critica | Login bypass forzado con sesion admin demo | `src/renderer/App.tsx` | Cualquier usuario entra como admin; no hay control real de acceso | Desactivar bypass por entorno y forzar login real en produccion |
| Critica | Passwords en texto plano + default `123456` | `src/database/repositories/usuarioRepo.ts`, `src/database/migrations-mssql/001_users_auth.sql` | Riesgo alto de compromiso de cuentas | Migrar a hash seguro (Argon2/Bcrypt), politica de password y rotacion |
| Critica | Credenciales `sa` hardcodeadas como fallback empaquetado | `src/database/db-sqlserver.ts`, `README.md`, `documentacion/DEPLOY-DEMO-OTRA-PC.md` | Exposicion de credenciales privilegiadas y acceso total a BD | Eliminar fallback, exigir variables de entorno seguras y secretos externos |
| Alta | Puente IPC generico para invocar metodos por nombre | `src/main/main.ts`, `src/main/preload.ts` | Superficie amplia para abuso via renderer/XSS | Reemplazar por API IPC tipada por caso de uso y allowlist estricta |
| Alta | Lectura/apertura de archivos locales desde renderer sin allowlist de rutas | `src/main/main.ts:603-640` | Exfiltracion de archivos locales si hay XSS o actor malicioso | Restringir rutas permitidas + validar extension + auditoria |
| Alta | Modulos clave aun operan con datos demo en memoria | `src/renderer/modules/riesgos/Riesgos.tsx` y modulos pares | Producto no confiable para operacion diaria real | Conectar modulos a repos SQL y desactivar seeds demo en produccion |
| Alta | No hay suite de pruebas automatizadas de regresion | `package.json` | Alto riesgo de romper flujo al desplegar | Definir smoke E2E + pruebas de seguridad y contratos IPC |

## 5. Seguridad de produccion
- Password handling: inseguro (texto plano y defaults debiles).
- Session model: vulnerable por bypass local y almacenamiento en `localStorage` manipulable.
- Secrets: expuestos en documentacion y fallback de runtime.
- IPC trust boundary: demasiado abierta para un contexto Electron.
- HTML injection surface: uso de `innerHTML` en flujos de editor/documentacion requiere sanitizacion defensiva.

## 6. Infraestructura y despliegue
- Build desktop: funcional (webpack + electron-builder).
- Entrega: instalador NSIS y `win-unpacked` disponibles.
- Configuracion runtime: depende de `%APPDATA%\\sgc-desktop-app\\.env`.
- Gap: estrategia formal de entornos (dev/staging/prod) no encontrada en el proyecto.

## 7. Datos, backups y recuperacion
- Punto fuerte: respaldos `SGC_Dev_precutover.bak` y `sgc_precutover.db` versionados con LFS.
- Punto debil: no se encontro procedimiento automatizado probado de restore/DR con evidencia de RTO/RPO.
- Recomendado: script de restauracion validado + checklist post-restore + prueba mensual.

## 8. Observabilidad
- Logs: mayormente `console.log`/`console.error`.
- Metricas: No encontrado en el proyecto.
- Alertas: No encontrado en el proyecto.
- Trazabilidad: parcial (hay audit logs funcionales en varios dominios).

## 9. Testing minimo requerido
1. Auth y permisos: login correcto/incorrecto, bloqueo rol no autorizado, cambio de password.
2. Migraciones: idempotencia, rollback y compatibilidad entre versiones.
3. IPC: contratos tipados, rechazo de payload invalido, pruebas de abuso.
4. Documentacion/workflow: crear/aprobar/corregir/eliminar/restaurar.
5. Registros dinamicos: create/update/transition/audit timeline.
6. Seguridad basica: pruebas de acceso a archivos locales y sanitizacion HTML.

## 10. Requisitos antes de venderlo
- Cerrar los 3 bloqueadores criticos de seguridad.
- Quitar modo demo forzado y habilitar autenticacion real obligatoria.
- Sustituir modulos demo por persistencia real en SQL Server.
- Definir paquete de observabilidad minima (logs persistentes + alertas basicas).
- Implementar smoke test automatizado previo a cada release.

## 11. Plan de estabilizacion
### Critico
- Eliminar bypass de login en produccion.
- Migrar passwords a hash y reset forzado de credenciales iniciales.
- Retirar fallback `sa` y mover secretos a config segura por entorno.

### Alta prioridad
- Cerrar `repo:call` generico y exponer solo endpoints IPC tipados.
- Restringir acceso a archivos locales con allowlist y validaciones.
- Integrar persistencia real de modulos demo prioritarios (NC, CAPA, Auditorias, Riesgos).
- Crear suite smoke automatizada de release.

### Media prioridad
- Estandarizar logs estructurados por evento clave.
- Definir pipeline CI minimo (build + smoke + checks de seguridad basicos).
- Resolver warning de bundle pesado (`226.chunk.js` > 244 KiB) para mejorar UX/performance.

### Mejoras posteriores
- Observabilidad avanzada (dashboards operativos + alertas proactivas).
- Endurecimiento de cumplimiento (politicas de retencion, auditoria extendida, trazabilidad avanzada).

## 12. Proxima accion recomendada
Ejecutar un hardening sprint de 10 dias enfocado solo en auth, secretos e IPC; no abrir nuevas features hasta cerrar esos bloqueadores.
