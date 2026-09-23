# Micro-guion — Demo guiada Innovax (23/09/2026, 16:00, hora de México)

Recorrido de la **Fase 1**: una capa guiada sobre el software real.
**15 escenas · 47 micro-pasos.** Duración objetivo: 15–18 minutos + preguntas.
Runbook técnico, Plan B completo y checklist: [`DEMO_INNOVAX_2026-09-23.md`](./DEMO_INNOVAX_2026-09-23.md).

> Este guion se genera desde `src/renderer/demo/steps/scenes.ts`: la narración
> de cada micro-paso es **exactamente** el texto que muestra la aplicación y el
> que se narrará en la Fase 2 (voz). Si se cambia una frase, se cambia en
> `scenes.ts` y se regenera este documento.

**Idea que debe quedar al final:** *Tu Sistema de Gestión ya existe. Nosotros lo hacemos operativo.*

---

## Reglas al hablar

- **Funciona hoy** → "esto ya funciona". **Siguiente implementación** → "esto es
  lo que construimos a continuación". **Visión** → "hacia aquí vamos". Nunca
  "ya lo tenemos" para algo que no dice *Funciona hoy*.
- Nunca decir que GD-V2 cumple ISO 9001 ni que certifica. Lo que hace es que el
  cumplimiento **se pueda demostrar con evidencia**.
- Sin numerales de la norma en el discurso.
- Los módulos marcados **PROTOTIPO** en el menú (Auditorías, No conformidades,
  CAPA, Riesgos, Indicadores, Proveedores, Revisión por la dirección,
  Competencias, Satisfacción del cliente, Control de cambios) **no se abren**:
  sus datos ("Cliente ABC", etc.) son de ejemplo y no pertenecen a Innovax. Si
  alguien los abre, la pantalla lo dice.
- No abrir: Usuarios, lista de contactos, organigrama ni aviso de privacidad.

## Controles

| Tecla / botón | Acción |
|---|---|
| `→` / **Siguiente** | Siguiente micro-paso |
| `←` / **Anterior** | Micro-paso anterior |
| `Espacio` / **Reproducir** | Autoplay (8 s por paso); se detiene solo en las escenas marcadas |
| `Esc` / **×** | Salir: la app queda como estaba (búsqueda, diálogos y visores cerrados) |
| Puntos de escena (panel central) | Saltar a una escena |

La demo **no escribe nada**: no crea, aprueba, corrige, importa, envía ni marca
notificaciones como leídas. Solo navega, filtra, abre diálogos informativos y,
si el presentador lo pide, el visor protegido.

## Antes de pulsar el botón (30 s)

> "Antes de enseñarles software, una aclaración: no venimos a pedirles que
> cambien su forma de trabajar. Venimos a enseñarles cómo su Sistema de Gestión,
> el que ya tienen, puede funcionar como una operación digital."

Pulsar **▶ Demo guiada Innovax**.

---

## ESCENA 1 · Innovax ya tiene su Sistema de Gestión

**Estado:** Contexto Innovax · **Panel:** central (sin pantalla real)

### MICROSTEP 1.1 — Innovax ya tiene su Sistema de Gestión

- **Id:** `intro-innovax` (paso 1 de 47)
- **Target:** — (panel central)
- **Origen:** Dato de Innovax (Lista Maestra)
- **Narración:** Innovax ya tiene su Sistema de Gestión: procedimientos, formatos, responsables y una Lista Maestra. GD-V2 parte de lo que ya existe.

### MICROSTEP 1.2 — No lo reemplazamos: lo hacemos operativo

- **Id:** `intro-promise` (paso 2 de 47)
- **Target:** — (panel central)
- **Origen:** Dato de Innovax (Lista Maestra)
- **Narración:** No venimos a sustituir su sistema ni su nomenclatura. Venimos a convertir lo que ya tienen en una operación digital y trazable.

## ESCENA 2 · Cada persona opera con su propia sesión

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** dashboard

### MICROSTEP 2.1 — Identidad y puesto

- **Id:** `session-identity` (paso 3 de 47)
- **Target:** `app-user-chip`
- **Origen:** Dato real del sistema
- **Narración:** Cada persona accede con su propia sesión. El sistema conoce quién está operando y con qué puesto, y usa esa identidad para dejar trazabilidad.

## ESCENA 3 · Visibilidad del sistema

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** dashboard

### MICROSTEP 3.1 — Documentos

- **Id:** `dash-documents` (paso 4 de 47)
- **Target:** `dashboard-kpi-documentos` → `dashboard-kpis`
- **Origen:** Dato real del sistema
- **Narración:** Documentos: los archivos controlados que hoy viven en el sistema. La cifra sale directamente de la base de datos.

### MICROSTEP 3.2 — Carpetas

- **Id:** `dash-folders` (paso 5 de 47)
- **Target:** `dashboard-kpi-carpetas` → `dashboard-kpis`
- **Origen:** Dato real del sistema
- **Narración:** Carpetas: la estructura con la que Innovax organiza su información por etapa y por área.

### MICROSTEP 3.3 — Pendientes de revisión

- **Id:** `dash-pending` (paso 6 de 47)
- **Target:** `dashboard-kpi-pendientes` → `dashboard-kpis`
- **Origen:** Dato real del sistema
- **Narración:** Pendientes: documentos que esperan revisión. Es la primera señal de dónde se está deteniendo el flujo.

### MICROSTEP 3.4 — Usuarios activos

- **Id:** `dash-users` (paso 7 de 47)
- **Target:** `dashboard-kpi-usuarios` → `dashboard-kpis`
- **Origen:** Dato real del sistema
- **Narración:** Usuarios: quiénes pueden operar el sistema hoy, cada uno con su propia sesión.

### MICROSTEP 3.5 — Resumen operativo

- **Id:** `dash-summary` (paso 8 de 47)
- **Target:** `dashboard-summary` → `dashboard-root`
- **Origen:** Dato real del sistema
- **Narración:** El resumen traduce esas cifras en estado operativo, para que Dirección y Calidad lo lean de un vistazo.

### MICROSTEP 3.6 — Bitácora de actividad

- **Id:** `dash-activity` (paso 9 de 47)
- **Target:** `dashboard-audit` → `dashboard-root`
- **Origen:** Dato real del sistema
- **Narración:** El sistema no solo almacena información: registra la actividad. Se sabe qué ocurrió, cuándo, quién lo hizo y en qué elemento.

## ESCENA 4 · La documentación real de Innovax

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** documentacion

_Acciones de escena (solo lectura):_ al entrar `doc.reset`

### MICROSTEP 4.1 — Estructura documental

- **Id:** `docs-tree` (paso 10 de 47)
- **Target:** `documentacion-tree` → `documentacion-root`
- **Origen:** Dato real del sistema
- **Narración:** Esta es la estructura documental real de Innovax, tal como está hoy dentro del sistema.

### MICROSTEP 4.2 — Ciclo de vida del documento

- **Id:** `docs-lifecycle` (paso 11 de 47)
- **Target:** `doc-tree-focus` → `documentacion-tree`
- **Acción:** `doc.openFolderPath` `{"path":["4.APROBADO"]}` — automática
- **Origen:** Dato real del sistema
- **Narración:** Las carpetas siguen el ciclo de vida del documento: en proceso, para revisión y aprobado.

### MICROSTEP 4.3 — Organización por área

- **Id:** `docs-areas` (paso 12 de 47)
- **Target:** `doc-grid` → `documentacion-main`
- **Origen:** Dato real del sistema
- **Narración:** Dentro de lo aprobado, la información se organiza por área: Dirección, Calidad, Ventas, Mecanizado, Ensamble y más.

### MICROSTEP 4.4 — Un procedimiento y sus formatos

- **Id:** `docs-procedure` (paso 13 de 47)
- **Target:** `doc-grid` → `documentacion-main`
- **Acción:** `doc.openFolderPath` `{"path":["4.APROBADO","1.-MANUAL DEL SISTEMA","PR-01-PROCEDIMIENTO INFORMACIÓN DOCUMENTADA"]}` — automática
- **Origen:** Dato real del sistema
- **Narración:** Aquí vive el procedimiento de información documentada, junto con sus formatos y listas maestras.

### MICROSTEP 4.5 — Dónde estamos

- **Id:** `docs-counters` (paso 14 de 47)
- **Target:** `doc-overview` → `documentacion-main`
- **Origen:** Dato real del sistema
- **Narración:** Los contadores confirman en qué carpeta estamos y cuántos documentos contiene.

## ESCENA 5 · Localizar un documento por su código

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** documentacion

### MICROSTEP 5.1 — Buscar por código

- **Id:** `search-code` (paso 15 de 47)
- **Target:** `doc-search` → `documentacion-main`
- **Acción:** `doc.setSearch` `{"text":"PR-01-A"}` — automática
- **Origen:** Dato real del sistema
- **Narración:** Buscamos por código. La búsqueda filtra los documentos de la carpeta en la que estamos.

### MICROSTEP 5.2 — Resultado inmediato

- **Id:** `search-results` (paso 16 de 47)
- **Target:** `doc-grid` → `documentacion-main`
- **Origen:** Dato real del sistema
- **Narración:** En segundos aparecen la Lista Maestra y sus formatos relacionados, sin recorrer la estructura a mano.

## ESCENA 6 · La Lista Maestra, dentro del sistema

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** documentacion · **El autoplay se detiene aquí**

_Acciones de escena (solo lectura):_ al salir `doc.closeDocumentViewers`

### MICROSTEP 6.1 — Información que Innovax ya usa

- **Id:** `master-row` (paso 17 de 47)
- **Target:** `doc-node-focus` → `doc-grid`
- **Acción:** `doc.focusNode` `{"name":"PR-01-A LISTA MAESTRA DE DOCUMENTOS INTERNOS.pdf"}` — automática
- **Origen:** Dato real del sistema
- **Si no está disponible:** El documento no está disponible en este entorno. La demo continúa.
- **Narración:** Esta es la Lista Maestra de documentos internos que Innovax ya utiliza. La diferencia es que ahora el sistema sabe dónde está y dentro de qué flujo participa.

### MICROSTEP 6.2 — Visor protegido

- **Id:** `master-viewer` (paso 18 de 47)
- **Target:** `doc-node-focus` → `doc-grid`
- **Acción:** `doc.openDocumentViewer` `{"name":"PR-01-A LISTA MAESTRA DE DOCUMENTOS INTERNOS.pdf"}` — **la dispara el presentador con el botón «Abrir en el visor protegido»**
- **Origen:** Dato real del sistema
- **Si no está disponible:** El visor no pudo abrirse en este entorno. La demo continúa.
- **Narración:** El documento se abre en un visor protegido. La marca de agua identifica al usuario, su puesto y la hora de consulta.

### MICROSTEP 6.3 — Consulta sin fuga

- **Id:** `master-protection` (paso 19 de 47)
- **Target:** `doc-node-focus` → `doc-grid`
- **Origen:** Dato real del sistema
- **Narración:** Mientras un documento está abierto, la aplicación bloquea las capturas de pantalla. La información vigente se consulta, pero no se fuga.

## ESCENA 7 · De documento a regla

**Estado:** Siguiente implementación · **Panel:** lateral sobre la app real · **Módulo:** documentacion · **El autoplay se detiene aquí**

### MICROSTEP 7.1 — Lo que hoy es texto

- **Id:** `mirror-attributes` (paso 20 de 47)
- **Target:** `doc-node-focus` → `doc-grid`
- **Origen:** Ejemplo de demo
- **Narración:** La Lista Maestra ya define para cada documento su responsable, su acceso, su revisión y su retención. Hoy eso es texto.

### MICROSTEP 7.2 — Lo que será regla

- **Id:** `mirror-rules` (paso 21 de 47)
- **Target:** `doc-node-focus` → `doc-grid`
- **Origen:** Ejemplo de demo
- **Narración:** La siguiente etapa es que esos atributos controlen el sistema: el responsable dispara el workflow, el acceso define permisos, la revisión controla versiones y la retención aplica la política.

## ESCENA 8 · Qué puede hacer cada usuario

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** documentacion

_Acciones de escena (solo lectura):_ al salir `doc.closeAccessDialog`

### MICROSTEP 8.1 — Puesto y usuario

- **Id:** `perm-identity` (paso 22 de 47)
- **Target:** `doc-access-dialog`
- **Acción:** `doc.openAccessDialog` — automática
- **Origen:** Dato real del sistema
- **Narración:** Cada usuario tiene un puesto y un conjunto de permisos propios.

### MICROSTEP 8.2 — Acciones permitidas

- **Id:** `perm-actions` (paso 23 de 47)
- **Target:** `doc-access-perms` → `doc-access-dialog`
- **Origen:** Dato real del sistema
- **Narración:** Agregar, eliminar, renombrar, mover y firmar se configuran por usuario. El SGC deja de depender de quién conoce la carpeta.

## ESCENA 9 · Revisión y aprobación

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** documentacion · **El autoplay se detiene aquí**

_Acciones de escena (solo lectura):_ al salir `doc.closeReviewInbox`

### MICROSTEP 9.1 — Bandeja de revisión

- **Id:** `review-inbox` (paso 24 de 47)
- **Target:** `doc-review-dialog`
- **Acción:** `doc.openReviewInbox` — automática
- **Origen:** Dato real del sistema
- **Narración:** Los documentos que se envían a revisión llegan a esta bandeja.

### MICROSTEP 9.2 — Quién decide

- **Id:** `review-authority` (paso 25 de 47)
- **Target:** `doc-review-rule` → `doc-review-dialog`
- **Origen:** Dato real del sistema
- **Narración:** La bandeja indica quién puede aprobar o pedir correcciones: Coordinación del SGC, Dirección o Administración.

### MICROSTEP 9.3 — Documento en revisión

- **Id:** `review-document` (paso 26 de 47)
- **Target:** `doc-review-row`
- **Origen:** Dato real del sistema
- **Si no está disponible:** Hoy no hay documentos pendientes de revisión en esta base.
- **Narración:** Cada documento muestra quién lo envió y cuándo. La revisión deja de depender de correos y seguimiento manual.

### MICROSTEP 9.4 — Aprobar o corregir

- **Id:** `review-decision` (paso 27 de 47)
- **Target:** `doc-review-actions`
- **Origen:** Dato real del sistema
- **Si no está disponible:** Sin documentos pendientes, los botones Aprobar y Corregir no se muestran.
- **Narración:** Aprobar o solicitar correcciones queda registrado con quién y cuándo. En la demo no pulsamos estos botones.

## ESCENA 10 · La conversación alrededor del documento

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** documentacion

_Acciones de escena (solo lectura):_ al salir `app.closeNotifications`

### MICROSTEP 10.1 — Avisos a quien debe actuar

- **Id:** `notif-bell` (paso 28 de 47)
- **Target:** `noti-bell`
- **Origen:** Dato real del sistema
- **Narración:** Cada envío, aprobación o corrección genera un aviso para la persona que debe actuar.

### MICROSTEP 10.2 — Historial de avisos

- **Id:** `notif-panel` (paso 29 de 47)
- **Target:** `noti-panel` → `noti-bell`
- **Acción:** `app.openNotifications` — automática
- **Origen:** Dato real del sistema
- **Narración:** Aquí queda el rastro del flujo: qué se aprobó y dónde se pidieron correcciones. Las observaciones no se pierden en mensajes externos.

### MICROSTEP 10.3 — Correcciones con contexto

- **Id:** `notif-correction` (paso 30 de 47)
- **Target:** `noti-item-correction` → `noti-panel`
- **Origen:** Dato real del sistema
- **Narración:** Una solicitud de corrección conserva qué está mal, por qué y cómo corregirlo, junto al documento.

## ESCENA 11 · Un formato que se convierte en captura

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** registros · **El autoplay se detiene aquí**

_Acciones de escena (solo lectura):_ al entrar `registros.setTab` · al entrar `dynamic.selectType` · al salir `dynamic.resetForm`

### MICROSTEP 11.1 — Tipo de registro FP-05-C

- **Id:** `fp05-type` (paso 31 de 47)
- **Target:** `dynamic-type-picker` → `dynamic-records-root`
- **Origen:** Dato real del sistema
- **Narración:** Un formato del SGC deja de ser un archivo muerto y se convierte en una captura estructurada.

### MICROSTEP 11.2 — El formulario nace de su definición

- **Id:** `fp05-definition` (paso 32 de 47)
- **Target:** `dynamic-record-form` → `dynamic-records-root`
- **Origen:** Dato real del sistema
- **Narración:** No se programó una pantalla específica para FP-05-C. El formulario nace de su definición.

### MICROSTEP 11.3 — Equipo

- **Id:** `fp05-equipment` (paso 33 de 47)
- **Target:** `dynamic-field-equipo` → `dynamic-record-form`
- **Origen:** Dato real del sistema · campo que captura el usuario
- **Narración:** Equipo: el usuario lo elige de una lista definida; no se escribe a mano.

### MICROSTEP 11.4 — Preventivo o correctivo

- **Id:** `fp05-kind` (paso 34 de 47)
- **Target:** `dynamic-field-tipo` → `dynamic-record-form`
- **Origen:** Dato real del sistema · campo que captura el usuario
- **Narración:** Preventivo o correctivo: una clasificación que después permite medir.

### MICROSTEP 11.5 — Actividad realizada

- **Id:** `fp05-activity` (paso 35 de 47)
- **Target:** `dynamic-field-actividad` → `dynamic-record-form`
- **Origen:** Dato real del sistema · campo que captura el usuario
- **Narración:** Actividad: el detalle técnico lo captura quien hizo el trabajo.

### MICROSTEP 11.6 — Responsable automático

- **Id:** `fp05-owner` (paso 36 de 47)
- **Target:** `dynamic-field-responsable` → `dynamic-record-form`
- **Origen:** Dato real del sistema · campo que asigna el sistema
- **Narración:** Responsable: lo asigna el sistema a partir de la sesión. El usuario no lo escribe.

### MICROSTEP 11.7 — Fecha automática

- **Id:** `fp05-date` (paso 37 de 47)
- **Target:** `dynamic-field-fecha` → `dynamic-record-form`
- **Origen:** Dato real del sistema · campo que asigna el sistema
- **Narración:** Fecha: la registra el sistema al guardar. No depende de que alguien la recuerde.

### MICROSTEP 11.8 — Validación antes de guardar

- **Id:** `fp05-validation` (paso 38 de 47)
- **Target:** `dynamic-field-actividad` → `dynamic-record-form`
- **Acción:** `dom.touchField` `{"target":"dynamic-field-actividad"}` — automática
- **Origen:** Dato real del sistema
- **Narración:** Si falta información obligatoria, el formulario lo señala antes de guardar. Nada incompleto llega como evidencia.

### MICROSTEP 11.9 — Desde Excel

- **Id:** `fp05-import` (paso 39 de 47)
- **Target:** `dynamic-fp05-import` → `dynamic-records-root`
- **Origen:** Dato real del sistema
- **Narración:** Los formatos que hoy viven en Excel pueden importarse como definición y registros. En la demo no ejecutamos importaciones.

## ESCENA 12 · Estados y trazabilidad del registro

**Estado:** Funciona hoy · **Panel:** lateral sobre la app real · **Módulo:** registros · **El autoplay se detiene aquí**

### MICROSTEP 12.1 — Ciclo de vida del registro

- **Id:** `record-lifecycle` (paso 40 de 47)
- **Target:** `dynamic-record-list` → `dynamic-records-root`
- **Origen:** Capacidad implementada · sin dato de demo en esta base
- **Narración:** Cada registro recorre un ciclo de vida: borrador, en revisión, aprobado, rechazado u obsoleto.

### MICROSTEP 12.2 — Evidencia protegida

- **Id:** `record-protection` (paso 41 de 47)
- **Target:** `dynamic-submit` → `dynamic-record-form`
- **Origen:** Capacidad implementada · sin dato de demo en esta base
- **Narración:** Todo registro nace como borrador y solo se edita en ese estado. Después queda protegido y cada cambio se audita con su antes y su después.

## ESCENA 13 · FP-15-C · Registro de paros CNC

**Estado:** Siguiente implementación · **Panel:** central (sin pantalla real) · **El autoplay se detiene aquí**

### MICROSTEP 13.1 — Ese sigue siendo su FP-15

- **Id:** `fp15-format` (paso 42 de 47)
- **Target:** — (panel central)
- **Origen:** Real anonimizado
- **Narración:** Ese sigue siendo su FP-15. Pero ahora produce información.

### MICROSTEP 13.2 — De captura a decisión

- **Id:** `fp15-data` (paso 43 de 47)
- **Target:** — (panel central)
- **Origen:** Real anonimizado
- **Narración:** Con datos estructurados, cada paro calcula su duración y alimenta la recurrencia y el Pareto. La no conformidad, la acción y el indicador son la siguiente etapa.

## ESCENA 14 · Cerrar el ciclo de calidad

**Estado:** Visión · **Panel:** central (sin pantalla real) · **El autoplay se detiene aquí**

### MICROSTEP 14.1 — Del evento a la mejora

- **Id:** `loop-chain` (paso 44 de 47)
- **Target:** — (panel central)
- **Origen:** Visión
- **Narración:** La visión es que un evento en planta llegue hasta la mejora sin reescribirse en cada paso: no conformidad, contención, causa, acción, eficacia, riesgo, indicador y revisión por la dirección.

### MICROSTEP 14.2 — Evidencia conectada

- **Id:** `loop-value` (paso 45 de 47)
- **Target:** — (panel central)
- **Origen:** Visión
- **Narración:** ISO 9001 no termina al almacenar un documento. El valor aparece cuando la evidencia, el problema, la acción y la mejora quedan conectados.

## ESCENA 15 · Cómo llegamos de aquí a operación real

**Estado:** Plan · **Panel:** central (sin pantalla real) · **El autoplay se detiene aquí**

### MICROSTEP 15.1 — Hoy, siguiente y después

- **Id:** `plan-horizons` (paso 46 de 47)
- **Target:** — (panel central)
- **Origen:** Visión
- **Narración:** Hoy ya hay control documental, workflow, seguridad, trazabilidad y registros dinámicos. Después vienen procesos, FP-15, acciones, riesgos e indicadores, y finalmente auditorías, revisión por la dirección e integración.

### MICROSTEP 15.2 — Tu Sistema de Gestión ya existe

- **Id:** `plan-close` (paso 47 de 47)
- **Target:** — (panel central)
- **Origen:** Visión
- **Narración:** Tu Sistema de Gestión ya existe. Nosotros lo hacemos operativo. El siguiente paso es definir juntos el piloto de Innovax.

---

## Plan B por punto crítico (qué decir y hacer)

| Punto | Si falla… | Qué hacer |
|---|---|---|
| Escena 3 · KPIs | "No disponible en este entorno" | Seguir. "Las cifras salen de la base en vivo; hoy el entorno no responde." |
| Escena 4 · abrir `4.APROBADO` | La carpeta no se ilumina | La demo sigue sobre el árbol. Abrir la carpeta con doble clic manual si se quiere. |
| Escena 5 · búsqueda `PR-01-A` | Sin resultados | Explicar que la búsqueda filtra **la carpeta actual**; abrir a mano `4.APROBADO › 1.-MANUAL DEL SISTEMA › PR-01-…` y repetir. |
| Escena 6 · visor protegido | Pantalla compartida por Teams/Zoom | **No pulsar** «Abrir en el visor protegido»: la protección anticapturas pone en negro **todas** las ventanas en la pantalla compartida. Narrar el paso sin abrirlo, o presentar en pantalla física/proyector. |
| Escena 6 · visor | "El visor no pudo abrirse" | Seguir; el paso siguiente explica la protección igualmente. |
| Escena 9 · bandeja vacía | "Hoy no hay documentos pendientes de revisión en esta base." | Es honesto: decirlo tal cual. **No pulsar** Aprobar ni Corregir aunque aparezcan. |
| Escena 10 · notificaciones | Panel vacío o sin corrección | Seguir. **No pulsar** ninguna notificación (pulsarla la marca como leída). |
| Escena 11 · FP-05-C | "No disponible" o sin pestaña Registros Dinámicos | Salir con `Esc` y volver a abrir la demo; si persiste, saltar a la escena 13 con `→`. **No pulsar** Guardar, Nuevo ni Importar. |
| Escena 12 · estados | Sin registros | Esperado: la pantalla lo etiqueta "capacidad implementada · sin registro de demo en esta base". |
| Cualquier error visual | La capa se cierra sola | Un Error Boundary protege la app; volver a pulsar **▶ Demo guiada Innovax**. |

## Preguntas probables

- **"¿Esto ya cumple ISO 9001?"** — "GD-V2 no certifica ni sustituye a la
  auditoría. Lo que hace es que la evidencia que la auditoría pide exista y se
  encuentre."
- **"¿Y los módulos de Auditorías, CAPA, Riesgos…?"** — "Hoy son prototipos de
  pantalla con datos de ejemplo; están marcados así en el menú. Son la siguiente
  implementación, empezando por lo que el piloto priorice."
- **"¿Se integra con Global Shop?"** — "Está en el horizonte *Después*. No lo
  sustituimos: lo conectamos."
