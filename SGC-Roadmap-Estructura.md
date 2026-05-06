# SGC Desktop App — Roadmap de Desarrollo v2.0

> Sistema de Gestión de Calidad conforme a **ISO 9001:2015**
> Electron + React + TypeScript + SQLite

---

## 1. Arquitectura del Proyecto

```
src/
├── main/               # Proceso principal Electron (ventana, menú, IPC)
│   ├── main.ts
│   └── preload.ts
├── renderer/           # Interfaz de usuario (React + TypeScript)
│   ├── App.tsx
│   ├── components/     # Componentes reutilizables (DataGrid, Buttons, etc.)
│   ├── modules/        # Módulos de negocio (cada uno con su carpeta)
│   │   ├── documentacion/
│   │   ├── auditorias/
│   │   ├── no-conformidades/
│   │   ├── capa/
│   │   ├── riesgos/
│   │   ├── indicadores/
│   │   ├── proveedores/
│   │   ├── competencias/
│   │   ├── revision-direccion/
│   │   ├── satisfaccion-cliente/
│   │   └── control-cambios/
│   ├── layouts/        # Layouts (AppShell, AuthLayout)
│   ├── hooks/          # Custom hooks
│   ├── context/        # React Context (auth, permisos, notificaciones)
│   ├── styles/         # Estilos globales y variables CSS
│   └── assets/         # Imágenes, fuentes
├── shared/             # Tipos, constantes, utilidades compartidas
│   ├── types/          # Interfaces y tipos TypeScript
│   ├── constants/      # Constantes del sistema (estados, roles, etc.)
│   └── utils/          # Funciones utilitarias
├── database/           # Capa de datos SQLite
│   ├── db.ts           # Conexión
│   ├── migrations/     # Migraciones de esquema
│   ├── models/         # Modelos de datos
│   └── repositories/   # Repositorios (CRUD por entidad)
└── sync/               # Sincronización remota
    ├── api.ts
    ├── firebase.ts
    └── queue.ts         # Cola offline
```

---

## 2. Módulos de Negocio — Alineados a ISO 9001:2015

### 2.1. Documentación (Cláusulas 7.5, 8.5)

- 2.1.1 Lista maestra de documentos (código, versión, estado, responsable)
- 2.1.2 Gestión jerárquica por departamento/proceso
- 2.1.3 Control de versiones con historial completo
- 2.1.4 Workflow de aprobación: Elaboró → Revisó → Aprobó (firma electrónica)
- 2.1.5 Plantillas por tipo: procedimiento, instrucción, formato, registro, ficha de proceso
- 2.1.6 Control de copias y distribución controlada
- 2.1.7 Gestión de documentos externos (normas, regulaciones, especificaciones cliente)
- 2.1.8 Búsqueda avanzada por código, nombre, proceso, estado, fecha
- 2.1.9 Exportación a PDF/Excel
- 2.1.10 Notificaciones de vencimiento y revisión programada
- 2.1.11 Estados: Borrador → En revisión → Aprobado → Obsoleto

### 2.2. Auditorías (Cláusula 9.2)

- 2.2.1 Programa anual de auditorías (planificación, alcance, criterios)
- 2.2.2 Planificación de auditorías internas y externas
- 2.2.3 Registro de competencia de auditores (formación, experiencia, imparcialidad)
- 2.2.4 Checklist digitales configurables por proceso/cláusula
- 2.2.5 Asignación de auditores (líder, equipo, observadores)
- 2.2.6 Ejecución: registro de evidencia objetiva, notas de campo
- 2.2.7 Clasificación de hallazgos: NC mayor, NC menor, observación, oportunidad de mejora
- 2.2.8 Generación automática de informe de auditoría
- 2.2.9 Vinculación con módulo de NC/CAPA para seguimiento
- 2.2.10 Calendario integrado con vista mensual/semanal
- 2.2.11 Dashboard de estado del programa de auditorías

### 2.3. No Conformidades (Cláusula 10.2)

- 2.3.1 Registro de NC con categorización (auditoría, proceso, producto, cliente)
- 2.3.2 Clasificación: NC mayor / NC menor
- 2.3.3 Corrección inmediata (contención)
- 2.3.4 Análisis de causa raíz (5 Porqués, Ishikawa, 8D)
- 2.3.5 Vinculación automática con módulo CAPA
- 2.3.6 Seguimiento de cierre con evidencia
- 2.3.7 Alertas de tiempos límite y escalamiento
- 2.3.8 Dashboard de tendencias (por proceso, tipo, período)
- 2.3.9 Reportes estadísticos

### 2.4. Acciones Correctivas y Preventivas — CAPA (Cláusula 10.2, 10.3)

- 2.4.1 Registro de acciones correctivas derivadas de NC
- 2.4.2 Registro de acciones preventivas y de mejora
- 2.4.3 Plan de acción (responsable, fecha compromiso, recursos)
- 2.4.4 Seguimiento de implementación (% avance)
- 2.4.5 Verificación de eficacia (después de cierre)
- 2.4.6 Cierre formal con evidencia
- 2.4.7 Dashboard de estado de acciones (abiertas, vencidas, cerradas, eficaces)

### 2.5. Gestión de Riesgos y Oportunidades (Cláusula 6.1)

- 2.5.1 Matriz de riesgos por proceso (identificación, análisis, evaluación)
- 2.5.2 Evaluación de probabilidad × impacto (mapa de calor)
- 2.5.3 Planes de mitigación y contingencia
- 2.5.4 Identificación de oportunidades de mejora
- 2.5.5 Seguimiento y reevaluación periódica
- 2.5.6 Vinculación con objetivos de calidad

### 2.6. Indicadores y Objetivos de Calidad (Cláusula 6.2, 9.1)

- 2.6.1 Definición de indicadores por proceso (KPI, fórmula, meta, frecuencia)
- 2.6.2 Tablero de control ejecutivo
- 2.6.3 Gráficos: tendencia, barras, gauge, semáforo
- 2.6.4 Líneas base, metas y rangos de aceptación
- 2.6.5 Cálculo automático desde datos del sistema
- 2.6.6 Reportes periódicos (mensual, trimestral, anual)
- 2.6.7 Vinculación con objetivos de calidad y mapa de procesos

### 2.7. Proveedores (Cláusula 8.4)

- 2.7.1 Registro y catálogo de proveedores
- 2.7.2 Evaluación y calificación (criterios configurables)
- 2.7.3 Reevaluación periódica con historial
- 2.7.4 Documentación requerida por proveedor
- 2.7.5 Lista de proveedores aprobados / rechazados / condicionales
- 2.7.6 Registro de incidencias y desempeño
- 2.7.7 Comunicación y notificaciones

### 2.8. Revisión por la Dirección (Cláusula 9.3)

- 2.8.1 Programación de reuniones de revisión
- 2.8.2 Entradas automáticas: estado de NC, auditorías, indicadores, riesgos, CAPA
- 2.8.3 Registro de acta (asistentes, temas, decisiones)
- 2.8.4 Salidas: acciones, recursos, cambios al SGC
- 2.8.5 Seguimiento de compromisos adquiridos
- 2.8.6 Historial de revisiones anteriores

### 2.9. Competencias y Capacitación (Cláusula 7.2, 7.3)

- 2.9.1 Matriz de competencias por puesto/proceso
- 2.9.2 Perfil de competencias requeridas vs reales
- 2.9.3 Plan anual de capacitación
- 2.9.4 Registro de capacitaciones (asistencia, evaluación, evidencia)
- 2.9.5 Evaluación de eficacia de la capacitación
- 2.9.6 Alertas de competencias vencidas o incompletas

### 2.10. Satisfacción del Cliente (Cláusula 9.1.2)

- 2.10.1 Diseño de encuestas de satisfacción
- 2.10.2 Aplicación y recolección de respuestas
- 2.10.3 Análisis de resultados y tendencias
- 2.10.4 Registro de quejas y reclamaciones
- 2.10.5 Vinculación con NC y acciones de mejora
- 2.10.6 Dashboard de satisfacción

### 2.11. Control de Cambios (Cláusula 8.5.6)

- 2.11.1 Solicitud de cambio (proceso, producto, documento, sistema)
- 2.11.2 Análisis de impacto
- 2.11.3 Aprobación/rechazo con justificación
- 2.11.4 Plan de implementación
- 2.11.5 Verificación post-cambio
- 2.11.6 Registro histórico de cambios

---

## 3. Infraestructura Transversal

### 3.1. Sistema de Permisos y Roles

- 3.1.1 Roles: Administrador, Responsable de Calidad, Auditor Líder, Auditor, Jefe de Área, Operativo, Gerencial, Solo lectura
- 3.1.2 Permisos granulares por módulo (crear, leer, editar, aprobar, eliminar)
- 3.1.3 Workflow de firmas electrónicas (elaboró, revisó, aprobó)
- 3.1.4 Gestión de usuarios y asignación de roles

### 3.2. Trazabilidad y Log de Auditoría

- 3.2.1 Registro automático: quién, qué, cuándo, desde dónde
- 3.2.2 Log inmutable de acciones críticas (aprobaciones, eliminaciones, cambios)
- 3.2.3 Consulta y exportación de logs
- 3.2.4 Retención configurable

### 3.3. Notificaciones Inteligentes

- 3.3.1 Centro de notificaciones in-app
- 3.3.2 Alertas por: documentos por vencer, NC abiertas, auditorías próximas, acciones vencidas, indicadores fuera de meta
- 3.3.3 Configuración por usuario (qué recibir, frecuencia)
- 3.3.4 Notificaciones push / email (futuro)

### 3.4. Motor de Reportes

- 3.4.1 Lista maestra de documentos
- 3.4.2 Programa y resultados de auditorías
- 3.4.3 Estado de NC y CAPA
- 3.4.4 Informe de revisión por la dirección
- 3.4.5 Reporte de indicadores por período
- 3.4.6 Evaluación de proveedores
- 3.4.7 Matriz de riesgos
- 3.4.8 Exportación a PDF, Excel, CSV

### 3.5. Mapa de Procesos

- 3.5.1 Diagrama interactivo de procesos (estratégicos, operativos, soporte)
- 3.5.2 Ficha de proceso por cada proceso (entradas, salidas, recursos, indicadores, riesgos)
- 3.5.3 Interacciones entre procesos
- 3.5.4 Vinculación con documentos, indicadores y riesgos de cada proceso

---

## 4. Componentes UI

| #    | Componente          | Descripción                                                  |
| ---- | ------------------- | ------------------------------------------------------------ |
| 4.1  | Sidebar Navigation  | Navegación por módulos, iconos, badges de pendientes         |
| 4.2  | DataGrid            | Tablas con ordenamiento, filtros, paginación, edición inline |
| 4.3  | Dashboard Cards     | KPIs con mini-gráficos y semáforo                            |
| 4.4  | Wizard Forms        | Formularios multi-paso para procesos complejos               |
| 4.5  | Rich Text Editor    | Editor de documentos con formato                             |
| 4.6  | Calendar View       | Vista mensual/semanal para auditorías y vencimientos         |
| 4.7  | File Manager        | Explorador de documentos tipo tabla con panel lateral        |
| 4.8  | Notification Center | Panel de alertas centralizadas                               |
| 4.9  | Search Omnibar      | Búsqueda global (Ctrl+K) por documentos, NC, auditorías      |
| 4.10 | Export Tools        | Generación de PDF, Excel, CSV                                |
| 4.11 | Risk Matrix         | Mapa de calor interactivo para riesgos                       |
| 4.12 | Process Map         | Diagrama visual de mapa de procesos                          |
| 4.13 | Approval Flow       | Visualización de estado de workflow                          |
| 4.14 | Activity Log        | Timeline de actividad reciente                               |
| 4.15 | Charts              | Gráficos de tendencia, barras, pie, gauge                    |

---

## 5. Flujos Principales de Usuario

| #   | Flujo                                        | Módulos involucrados                                 |
| --- | -------------------------------------------- | ---------------------------------------------------- |
| 5.1 | Creación, revisión y aprobación de documento | Documentación, Permisos, Notificaciones              |
| 5.2 | Registro y gestión de no conformidad         | NC, CAPA, Notificaciones                             |
| 5.3 | Ciclo completo de auditoría interna          | Auditorías, NC, CAPA, Reportes                       |
| 5.4 | Evaluación de proveedor                      | Proveedores, Indicadores                             |
| 5.5 | Revisión por la dirección                    | Rev. Dirección, Indicadores, NC, Auditorías, Riesgos |
| 5.6 | Gestión de riesgo de proceso                 | Riesgos, Indicadores, Control de Cambios             |
| 5.7 | Plan de capacitación                         | Competencias, Notificaciones                         |
| 5.8 | Análisis de satisfacción del cliente         | Satisfacción, NC, CAPA                               |
| 5.9 | Solicitud de cambio                          | Control de Cambios, Documentación, Permisos          |

---

## 6. Perfiles y Estados

### 6.1. Roles del Sistema

| Rol                    | Acceso                                               |
| ---------------------- | ---------------------------------------------------- |
| Administrador          | Acceso total, configuración del sistema              |
| Responsable de Calidad | Todos los módulos, aprobaciones, reportes            |
| Auditor Líder          | Auditorías, NC, CAPA, programa de auditorías         |
| Auditor                | Ejecución de auditorías asignadas                    |
| Jefe de Área           | Documentos de su área, indicadores, NC de su proceso |
| Operativo              | Consulta de documentos, registro de NC               |
| Gerencial              | Dashboards, reportes, revisión por dirección         |
| Solo lectura           | Consulta sin edición                                 |

### 6.2. Estados de Conexión

- Online: sincronización en tiempo real
- Offline: trabajo local con cola de sincronización
- Modo Auditor: vista optimizada para ejecución de auditoría

---

## 7. Estándares de Diseño

- **Tipografía:** Inter / Segoe UI, 14px base
- **Paleta:** Neutros (#111827, #6b7280, #f5f6f8), Primario (#1d4ed8), Success (#059669), Warning (#d97706), Danger (#dc2626)
- **Bordes:** 1px solid #e2e5ea, radius 4-8px
- **Sombras:** Sutiles (0 1px 3px rgba(0,0,0,0.1))
- **Iconos:** SVG outline, 18-20px, stroke 1.8
- **Layout:** Sidebar fijo + contenido flexible, sin scroll horizontal
- **Responsivo:** Mínimo 1024px para desktop

---

## 8. Fases de Desarrollo

### Fase 1 — Fundamentos (actual)

- [x] Estructura del proyecto
- [x] Sidebar + navegación entre módulos
- [x] File Manager (explorador de documentos)
- [x] Dashboard con KPIs
- [ ] Sistema de permisos básico
- [ ] Base de datos SQLite con migraciones

### Fase 2 — Documentación completa

- [ ] Lista maestra de documentos
- [ ] Workflow de aprobación (elaboró/revisó/aprobó)
- [ ] Control de versiones
- [ ] Plantillas de documentos
- [ ] Búsqueda avanzada

### Fase 3 — Auditorías y NC

- [ ] Programa anual de auditorías
- [ ] Ejecución de auditorías con checklist
- [ ] Registro de NC con categorización
- [ ] Análisis de causa raíz
- [ ] Módulo CAPA

### Fase 4 — Gestión de riesgos e indicadores

- [ ] Matriz de riesgos por proceso
- [ ] Mapa de procesos interactivo
- [ ] Indicadores vinculados a procesos
- [ ] Dashboards con gráficos

### Fase 5 — Módulos complementarios

- [ ] Proveedores
- [ ] Competencias y capacitación
- [ ] Satisfacción del cliente
- [ ] Control de cambios
- [ ] Revisión por la dirección

### Fase 6 — Infraestructura avanzada

- [ ] Motor de reportes (PDF, Excel)
- [ ] Log de auditoría completo
- [ ] Notificaciones inteligentes
- [ ] Sincronización offline/online
- [ ] Búsqueda global (Omnibar)

---

> **Metodología:** Desarrollo incremental. Cada funcionalidad se subdivide en niveles (2.1.1, 2.1.1.1, etc.) según complejidad. Este documento es la guía maestra del proyecto.
