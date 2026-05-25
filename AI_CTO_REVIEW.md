# AI CTO Review

## 1. Diagnostico ejecutivo
- Que es el producto: App desktop SGC (ISO 9001) en Electron + React + TypeScript con SQL Server como runtime principal, mas motor de registros dinamicos en avance.
- Que problema resuelve: Control documental, workflow, trazabilidad y operacion de calidad en empresas que hoy usan procesos manuales/dispersos.
- Estado actual: Funcional para demo y pilotos tecnicos, pero con gaps criticos de seguridad y madurez operativa.
- Riesgo general: Alto para produccion comercial hoy.
- Potencial comercial: Alto si se productiza como implementacion ISO acelerada (no como clon completo de Sofidya).

## 2. Decision CTO
Decision: Refactorizar antes de crecer

Justificacion:
El PDF `Vlux_vs_Sofidya_Estrategia_ISO9001.pdf` plantea bien la tesis comercial: vender resultado operativo + IA + automatizacion, no competir modulo por modulo. El repo ya tiene base tecnica util (SQL Server, migraciones, workflow, build instalable), pero hoy no soporta escalamiento comercial seguro por bypass de login, credenciales inseguras y modulos aun en modo demo. Escalar ventas sin cerrar eso elevaria riesgo legal, operativo y reputacional.

## 3. Prioridades tecnicas
| Prioridad | Accion | Impacto | Riesgo si no se hace | Esfuerzo |
|---|---|---|---|---|
| P0 | Quitar bypass de login y forzar auth real en produccion | Muy alto | Acceso no autorizado inmediato | Bajo-Medio |
| P0 | Migrar password a hash + eliminar defaults debiles | Muy alto | Compromiso de cuentas y auditoria fallida | Medio |
| P0 | Eliminar fallback de `sa` y secretos embebidos | Muy alto | Exposicion total de BD | Bajo |
| P1 | Sustituir `repo:call` generico por IPC tipado/allowlist | Alto | Abuso de superficie IPC | Medio |
| P1 | Integrar persistencia real en modulos demo prioritarios | Alto | Producto no vendible para operacion real | Medio-Alto |
| P2 | Suite smoke automatizada + CI minimo | Alto | Regresiones en cada release | Medio |
| P2 | Reducir tamaño de bundles mas pesados | Medio | UX lenta en equipos objetivo | Medio |

## 4. Prioridades de negocio
| Prioridad | Accion | Justificacion | Resultado esperado |
|---|---|---|---|
| B0 | Vender sprint de implementacion (30-45 dias) antes de SaaS completo | Valida demanda y financia roadmap | Flujo de caja temprano + feedback real |
| B0 | Posicionamiento: ISO 9001 operativo + IA contextual + automatizacion | Diferenciador directo frente a suites genericas | Mayor tasa de cierre por valor, no por precio |
| B1 | Estandarizar paquete comercial MVP (Documentos + CAPA + Dashboard + IA) | Reduce variabilidad de ejecucion | Entrega repetible y margen mas predecible |
| B1 | Definir ICP (manufactura pyme/mediana con dolor documental) | Evita dispersion comercial | Mejor conversion y menor CAC operativo |
| B2 | Crear playbook de onboarding por sector | Escala implementacion sin crecer mucho equipo | Menor tiempo de puesta en marcha |

## 5. Lo que NO conviene construir todavia
- ERP/CRM propio.
- App movil nativa completa.
- Plataforma multi-norma desde dia uno.
- Motor no-code publico general.
- Integraciones complejas ERP/CRM antes de cerrar product-market fit del core ISO 9001.

## 6. Riesgos principales
### Tecnicos
- Seguridad base insuficiente para entorno productivo.
- Monolitos grandes (`Documentacion.tsx`, `registroDinamicoRepo.ts`) que elevan costo de cambio.

### Comerciales
- Sobreprometer SaaS robusto sin hardening previo.
- Competir por feature-count contra jugadores mas maduros.

### Operativos
- Dependencia de configuraciones manuales por cliente sin runbooks estandar.
- Falta de pruebas automatizadas en releases.

### Seguridad
- Password en texto plano y defaults inseguros.
- Superficie IPC amplia y funciones de acceso a archivos locales desde renderer.

### Escalabilidad
- Mezcla de modulos reales y demo dificulta estandarizacion de entrega.
- Ausencia de pipeline CI/CD y observabilidad productiva.

## 7. Arquitectura recomendada
- Mantener corto plazo: desktop como canal de entrega para pilotos donde ya hay traccion.
- Extraer core de dominio (auth, permisos, workflow, records, auditoria) hacia contratos claros y servicios reutilizables.
- Definir boundary limpio para evolucion a arquitectura web/SaaS modular sin reescribir todo.
- Estandarizar APIs internas (IPC tipado hoy, API HTTP futura) con trazabilidad y control de permisos por rol.

## 8. Equipo minimo necesario
- Frontend: 1 dev (React + UX operacional).
- Backend: 1 dev (Node/TS + SQL Server + seguridad).
- DevOps: 0.5 (part-time) para CI, releases, observabilidad y secretos.
- QA: 0.5 (part-time) para smoke/regresion guiada por riesgo.
- Producto: 1 owner funcional/comercial.
- Diseno: 0.5 (part-time) enfocado en flujos operativos, no solo look-and-feel.

## 9. Roadmap CTO
### 7 dias
- Cerrar P0 de seguridad (login, passwords, secretos).
- Congelar nuevas features.
- Definir checklist release minimo.

### 30 dias
- Hardening IPC + smoke tests automatizados.
- Convertir 1-2 modulos demo a persistencia real (prioridad: NC/CAPA).
- Paquete comercial MVP cerrado y demostrable.

### 90 dias
- Persistencia real del core completo (Documentos, NC, CAPA, Auditorias, Riesgos).
- Observabilidad minima + pipeline CI basico.
- 2-4 implementaciones reales para validar repetibilidad y pricing.

### 6 meses
- Estandarizacion multiempresa inicial.
- Integraciones selectivas de alto ROI (correo, Drive/SharePoint, WhatsApp segun segmento).
- Version producto mas estable para expansion comercial.

## 10. Metricas que deben medirse
- Tiempo de implementacion por cliente (dias a go-live).
- % de workflows cerrados dentro de SLA.
- % de evidencia documental vigente por auditoria.
- Defectos criticos por release.
- Disponibilidad percibida por usuario operativo.
- Margen por implementacion + margen mensual de soporte.

## 11. Proxima accion recomendada
Ejecutar un Sprint P0 de hardening y luego lanzar un piloto comercial pagado de 30-45 dias con alcance cerrado (Documentos + CAPA + Dashboard + IA documental), usando ese piloto como filtro para decidir expansion de producto.
