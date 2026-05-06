# ISO 9001 Dynamic Records Engine - Plan Afinado Para GD-V2.0

## 1) Objetivo Real Del Proyecto

Construir un motor de registros dinamico para ISO 9001 en la app actual (Electron + React + TypeScript + SQL Server), reemplazando gradualmente el flujo tipo Excel/macros SIN romper:

- Modulo actual de Documentacion (workflow, permisos, auditoria)
- Modulo actual de Registros Studio
- Arquitectura IPC existente
- Compatibilidad de base de datos y arranque de la app

Resultado esperado:

- Crear nuevos tipos de registro por configuracion en DB (sin programar nuevas pantallas)
- Soportar 50+ tipos de registro
- Trazabilidad completa (quien, cuando, que cambio)
- Mantener buena UX/UI operativa (no solo backend)

---

## 2) Mapa Del Repositorio (Contexto Exacto)

Puntos del proyecto que se deben respetar en toda implementacion:

- Runtime DB: src/database/db-sqlserver.ts
- Migrations SQL Server: src/database/migrations-mssql
- Repositorios backend: src/database/repositories
- Registro de repos en barrel: src/database/repositories/index.ts
- Bridge IPC principal: src/main/main.ts (repo:call)
- Bridge preload: src/main/preload.ts
- UI actual de Registros: src/renderer/modules/registros/Registros.tsx
- Storage actual de Registros Studio: src/renderer/modules/registros/hooks/useRegistrosStorage.ts

Nota critica:

- El runner de migraciones en src/database/db-sqlserver.ts enumera archivos hasta 012.
- Ya existe 013_document_trash.sql en disco.
- Antes de agregar nuevas migraciones del motor de registros, hay que corregir esa lista para no dejar scripts fuera de ejecucion.

---

## 3) Reglas Antiruptura (No Negociables)

1. No eliminar ni romper el modulo actual Registros Studio.
2. No reemplazar de golpe la UI actual; usar rollout progresivo con feature flag.
3. No introducir formularios hardcodeados por tipo de registro.
4. No crear un modulo por cada formato ISO.
5. No depender de Excel, macros o upload de plantillas para el motor nuevo.
6. No tocar Documentacion/Workflow existente salvo integracion controlada.
7. No romper el canal IPC existente repo:call (compatibilidad hacia atras).
8. Todo cambio debe incluir auditoria y control de estado.
9. Evitar cambios masivos de estilos; usar el lenguaje visual actual.
10. Si una fase falla build o migracion, detener avance y corregir antes de continuar.

---

## 4) Balance Tecnico + UX/UI (Para No Perder Objetivo)

Prioridad por fase:

- 70% motor de negocio/datos (schema, repositorio, reglas, workflow, auditoria)
- 30% UX/UI funcional (usabilidad, validaciones, feedback, accesibilidad)

Requisito UX/UI minimo en cada entrega:

- Estados loading/empty/error
- Validacion clara de campos
- Mensajes no bloqueantes (preferir toast sobre alert nativa)
- Layout usable en desktop y resoluciones medianas
- Sin rediseño cosmetico que desvie del objetivo de trazabilidad y control

---

## 5) Prompt Maestro (Usar Al Inicio De Cada Fase)

Copia y pega este prompt antes de ejecutar cualquier sub-tarea:

"""
Actua como ingeniero senior en este repositorio (GD-V2.0). Tu meta es implementar un motor de registros dinamico ISO 9001 sin romper funcionalidad existente.

Reglas obligatorias:
1) No romper modulos existentes, en especial Documentacion y Registros Studio.
2) Mantener compatibilidad con IPC actual (repo:call) mientras agregas APIs tipadas nuevas.
3) No hardcodear formularios por formato.
4) Implementar de forma incremental, con cambios pequenos y verificables.
5) Incluir consideraciones UX/UI funcionales, pero sin desviar el foco de negocio.
6) Si detectas riesgo alto de regresion, detente y propon alternativa segura.

Formato de respuesta requerido:
- Resumen breve de objetivo de la fase
- Archivos exactos a tocar
- Cambios concretos
- Riesgos y mitigaciones
- Verificacion (build/migraciones/smoke)
"""

---

## 6) Fases Con Prompts Exactos A Este Proyecto

### Fase 0 - Baseline y seguridad de arranque

Objetivo:

- Preparar terreno sin romper app actual.

Prompt exacto:

"""
En este repo GD-V2.0, haz un baseline tecnico para el motor de registros dinamicos sin editar logica funcional aun.

Lee y analiza:
- src/database/db-sqlserver.ts
- src/database/migrations-mssql
- src/main/main.ts
- src/main/preload.ts
- src/renderer/modules/registros/Registros.tsx
- src/renderer/modules/registros/hooks/useRegistrosStorage.ts

Entrega:
1) Riesgos de regresion detectados.
2) Lista minima de archivos que se modificaran por fase.
3) Estrategia de feature flag para rollout gradual (ej. SGC_ENABLE_DYNAMIC_RECORDS).
4) Checklist de verificacion por fase.

No implementes codigo todavia.
"""

---

### Fase 1 - Schema SQL Server (motor dinamico)

Objetivo:

- Crear base de datos configurable y auditable para registros.

Prompt exacto:

"""
Implementa el schema del motor de registros dinamicos en SQL Server para GD-V2.0.

Requisitos:
1) Crear migration nueva en src/database/migrations-mssql/014_dynamic_records_engine.sql.
2) Corregir src/database/db-sqlserver.ts para incluir TODAS las migraciones existentes (incluida 013_document_trash.sql) y la nueva 014.
3) No alterar tablas existentes del sistema fuera de lo necesario.
4) Usar convenciones actuales: NVARCHAR(64) para IDs, DATETIME2(0), SYSDATETIME().

Tablas minimas:
- record_types
- record_fields
- record_instances
- record_values
- record_workflow
- record_audit_log

Incluye:
- PK/FK
- indices para consultas por tipo, estado, fecha, usuario
- columnas JSON como NVARCHAR(MAX) cuando aplique

Entrega:
- script SQL completo
- justificacion de indices
- plan de rollback simple
"""

---

### Fase 2 - Tipos compartidos TypeScript

Objetivo:

- Tipado fuerte frontend/backend para registros dinamicos.

Prompt exacto:

"""
Implementa tipos compartidos para el motor de registros dinamicos en GD-V2.0.

Cambios requeridos:
1) Crear src/shared/types/registros-dinamicos.ts
2) Exportarlo en src/shared/types/index.ts

Definir interfaces/tipos:
- RecordType
- RecordField (fieldType: text|textarea|select|number|date|checkbox|computed)
- RecordInstance
- RecordValue
- RecordWorkflowState
- RecordAuditLog
- DTOs para IPC: CreateRecordInput, UpdateRecordInput, QueryRecordsInput

Condiciones:
- Mantener naming consistente con el repo.
- Evitar any.
- Preparado para render dinamico en React.

Entrega:
- tipos finales
- ejemplos de payload validos
"""

---

### Fase 3 - Repositorio backend tipado

Objetivo:

- Crear capa de datos robusta con auditoria automatica.

Prompt exacto:

"""
Implementa repositorio backend para registros dinamicos en GD-V2.0 sin romper repositorios actuales.

Archivos objetivo:
1) Crear src/database/repositories/registroDinamicoRepo.ts
2) Exportar en src/database/repositories/index.ts
3) Integrar carga en src/main/main.ts (RepoName + repoLoaders) sin afectar repos existentes

Metodos minimos:
- createRecordType
- getRecordTypeById
- getRecordTypeByCode
- listRecordTypes
- createRecordInstance
- updateRecordInstanceDraft
- getRecordsByType
- getRecordInstanceDetail
- transitionRecordState

Requisitos tecnicos:
- SQL Server (mssql)
- operaciones atomicas en create/update/transition
- escribir record_audit_log automaticamente
- validar permisos basicos por rol/usuario recibido

Condicion de compatibilidad:
- No eliminar ni cambiar contrato de repositorios existentes.
"""

---

### Fase 4 - IPC seguro y API tipada para renderer

Objetivo:

- Exponer API dedicada de records sin romper repo:call.

Prompt exacto:

"""
Integra IPC para records dinamicos en GD-V2.0 con enfoque seguro y compatible.

Cambios requeridos:
1) Agregar handlers IPC especificos en src/main/main.ts:
   - records:create
   - records:update
   - records:get-by-type
   - records:get-definition
   - records:transition
2) Agregar API tipada en src/main/preload.ts como window.records.*
3) Mantener window.repo.call intacto para modulos legacy.

Validaciones obligatorias:
- session/userId/role requeridos en operaciones de escritura
- validacion basica de payload antes de invocar repositorio
- errores controlados para UI

Entrega:
- contratos IPC
- ejemplos de uso desde renderer
"""

---

### Fase 5 - Dynamic Form Engine + UX/UI funcional

Objetivo:

- Render dinamico por definicion de campos, con experiencia usable.

Prompt exacto:

"""
Implementa Dynamic Form Engine en React para GD-V2.0 sin romper Registros Studio actual.

Requisitos de integracion:
1) Crear componentes nuevos bajo src/renderer/modules/registros/components/ (no reescribir todo Registros.tsx).
2) Agregar tab/entry beta con feature flag (SGC_ENABLE_DYNAMIC_RECORDS).
3) Mantener tabs actuales Studio y Workflow funcionando igual.

Componente principal:
- DynamicRecordForm

Soportar tipos de campo:
- text
- textarea
- select
- number
- date
- checkbox

Requisitos UX/UI minimos:
- estados loading/empty/error
- validacion inline por campo requerido
- mensajes con toast (evitar window.alert para flujos nuevos)
- labels y aria basica
- responsive funcional

Salida esperada:
- formulario dinamico controlado
- submit con payload estructurado
- vista lista + detalle simple (no sobre-disenar)
"""

---

### Fase 6 - Rules Engine (reemplazo de macros)

Objetivo:

- Mover logica IF/THEN al backend.

Prompt exacto:

"""
Implementa un rules engine simple para records dinamicos en backend GD-V2.0.

Requisitos:
- Reglas configurables por tipo de registro
- Evaluacion IF/THEN
- Soporte de campos calculados
- Ejecutar en backend antes de persistir cambios

Caso ejemplo:
if tipo == 'correctivo' then prioridad = 'ALTA'

Entrega:
- modelo de regla
- evaluador extensible
- integracion en create/update record
- registro en audit log de campos auto-calculados
"""

---

### Fase 7 - Workflow ISO 9001 para registros

Objetivo:

- Control de estados y bloqueos por aprobacion.

Prompt exacto:

"""
Extiende records dinamicos con workflow en GD-V2.0.

Estados minimos:
- BORRADOR
- EN_REVISION
- APROBADO

Requisitos:
- transiciones por rol
- bloquear edicion cuando estado = APROBADO
- registrar cada transicion en record_audit_log
- exponer transiciones por IPC tipado

No romper workflow documental existente.
"""

---

### Fase 8 - Auditoria completa y trazabilidad

Objetivo:

- Cumplimiento ISO con before/after por accion.

Prompt exacto:

"""
Implementa auditoria completa para records dinamicos en GD-V2.0.

Registrar acciones:
- CREATE
- UPDATE
- DELETE (si aplica soft delete)
- TRANSITION

Guardar:
- user_id
- user_name (si disponible)
- role
- timestamp
- before_json
- after_json
- changed_fields

Entrega:
- repositorio con logging automatico
- consulta de historial por registro
- payload listo para render de timeline en UI
"""

---

### Fase 9 - Caso real FP-05-C (sin hardcode de UI)

Objetivo:

- Probar que el motor funciona por configuracion.

Prompt exacto:

"""
Configura un tipo de registro real FP-05-C en GD-V2.0 usando solo datos (sin crear pantalla especifica).

Tipo:
- code: FP-05-C
- name: Reporte de mantenimiento TI

Campos:
- equipo (select)
- tipo (preventivo/correctivo)
- actividad (textarea)
- responsable (auto usuario)
- fecha (auto fecha)

Implementa:
1) seed SQL o script de insercion de configuracion
2) ejemplo de alta de una instancia
3) ejemplo de visualizacion en DynamicRecordForm

Validar que el mismo formulario dinamico sirve para otro tipo sin tocar codigo de UI.
"""

---

### Fase 10 - Performance, escalabilidad y hardening

Objetivo:

- Escalar a alto volumen sin degradar UX.

Prompt exacto:

"""
Optimiza records dinamicos en GD-V2.0 para escala operativa.

Requisitos:
- evitar N+1 en carga de instancias + valores
- consultas paginadas por tipo/estado/fecha
- cache en memoria para definiciones record_types/record_fields
- invalidacion simple de cache al actualizar definiciones
- lazy load en renderer para datasets grandes

Entrega:
- mejoras aplicadas
- puntos de medicion
- recomendaciones de limites (pageSize, max filtros)
"""

---

## 7) Criterios De Aceptacion (No Cerrar Sin Esto)

Tecnico:

1. Se pueden crear tipos de registro por DB sin nuevas pantallas.
2. Se pueden crear/editar instancias dinamicas con validaciones.
3. Workflow y auditoria funcionan de extremo a extremo.
4. No hay regresion en Documentacion ni Registros Studio.

UX/UI:

1. Flujo de captura entendible para usuario operativo.
2. Errores y validaciones claros.
3. Estados visuales completos (loading/empty/error/success).
4. Sin rediseño distractor ni deuda visual adicional.

---

## 8) Checklist De Verificacion Por Fase

Obligatorio al cerrar cada fase:

1. Build sin errores de TypeScript.
2. Migraciones aplican sin romper arranque.
3. Smoke manual en Registros, Documentacion y login/sesion actual.
4. Lista de archivos tocados y razon.
5. Riesgos pendientes y siguiente paso recomendado.

---

## 9) Estrategia De Ejecucion Recomendada

No implementar todo junto.

Orden real sugerido:

1. Fase 0 (baseline)
2. Fase 1 (schema)
3. Fase 2 (types)
4. Fase 3 (repo)
5. Fase 4 (IPC)
6. Fase 5 (UI dinamica minima)
7. Fase 7 y 8 (workflow + auditoria)
8. Fase 6 (rules)
9. Fase 9 (FP-05-C)
10. Fase 10 (performance)

---

## 10) Resultado Final Esperado

El sistema debe permitir crear nuevos formatos ISO de registros sin programar vistas nuevas, con control de estado, trazabilidad completa y experiencia de uso clara para operacion diaria.
