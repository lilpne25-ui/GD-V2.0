# Demo guiada Innovax — 23 de septiembre de 2026, 16:00 (hora de México)

Runbook técnico de la presentación ejecutiva de GD-V2 para **Operadora Comercial
Innovax**. El guion verbal está en
[`DEMO_INNOVAX_SCRIPT_2026-09-23.md`](./DEMO_INNOVAX_SCRIPT_2026-09-23.md).

---

## 1. Objetivo

Que Innovax vea, dentro de la propia aplicación, que GD-V2 puede convertir su
Sistema de Gestión actual en una plataforma operativa **sin sustituir** sus
procesos, su nomenclatura ni Global Shop.

> **Tu Sistema de Gestión ya existe. Nosotros lo hacemos operativo.**

Qué **no** se afirma en ningún momento: que GD-V2 certifique ISO, que garantice
cumplimiento, que el producto esté terminado o que todos los módulos estén en
producción. La demo marca cada pantalla con su estado real.

---

## 2. Rama y commit

| | |
|---|---|
| Rama de la demo | `demo/innovax-guided-2026-09-23` |
| Base | `fix/auth-hardening-0.5` @ `c633d9d` (PR #2, **abierto y sin mergear**) |
| Commit de la demo (v1, 8 pasos) | `fc4a620` (`feat: add Innovax guided product demo`) |
| Fase 1 (15 escenas, 47 micro-pasos) | `cc68c6f` |
| Fase 2 (voz) | último commit de la rama: `git log -1 --oneline` |

La demo **depende** de Auth & Security Foundation 0.5: por eso parte de la rama
del PR #2 y no de `main`. No se ha hecho merge a `main`.

---

## 3. Requisitos

- Windows con **SQL Server** local accesible (instancia usada en la preparación:
  `LAPTOP-3U644U1G`, base `SGC_Dev`, autenticación integrada de Windows).
- **Node.js 22** y dependencias instaladas (`npm ci`).
- Archivo `.env` local en la raíz de `GD-V2.0` (no se versiona).
- Un usuario activo con contraseña conocida por el presentador.

---

## 4. Cómo arrancar

```bash
npm start
```

`npm start` levanta el renderer en `localhost:3002`, compila el proceso main en
modo watch y abre Electron. Es la ruta más estable para presentar.

**No hace falta empaquetar el instalador.** `electron-builder` sigue fallando en
Windows al extraer `winCodeSign` (privilegio de enlaces simbólicos); es un
problema de entorno ya documentado y no afecta a la demo.

---

## 5. Variables necesarias (sin valores)

| Variable | Valor esperado | Para qué |
|---|---|---|
| `SGC_DB_SERVER` | servidor local | Conexión SQL Server |
| `SGC_DB_DATABASE` | `SGC_Dev` | Base de la demo |
| `SGC_DB_TRUSTED` | `1` | Autenticación de Windows |
| `SGC_ALLOWED_FILE_ROOTS` | `%APPDATA%\sgc-desktop-app\document-storage` | Vista previa de documentos (FileAccessPolicy) |
| `SGC_RAG_ENABLED` | `0` | **Mantener en 0.** La demo no necesita IA |

En la máquina de preparación `SGC_ALLOWED_FILE_ROOTS` ya se añadió al `.env`
local apuntando a
`C:\Users\Ludwing\AppData\Roaming\sgc-desktop-app\document-storage`.

> ⚠️ **Clave comprometida en el `.env` local.** `DEEPSEEK_API_KEY` y
> `SGC_RAG_EMBEDDINGS_API_KEY` contienen la clave histórica que se publicó en
> git. Hoy **no se usa** (`SGC_RAG_ENABLED=0`, embeddings `local`). **No
> actives RAG con esa clave.** Recomendado: vaciar esas dos líneas y rotar la
> clave en el proveedor.

---

## 6. Comprobar SQL, FP-05-C y documentos

```bash
npm run demo:preflight
```

Solo lectura. No escribe en la base ni imprime secretos. Resultado esperado:

```
[OK     ] SQL Server               conectado a <servidor> / SGC_Dev
[OK     ] Migraciones              motor dinamico y FP-05-C aplicados
[OK     ] FP-05-C                  FP-05-C · Reporte de mantenimiento TI
[OK     ] Usuarios activos         5
[OK     ] Documentos               49 para mostrar en Documentacion.
LISTO para presentar.
```

`Migracion 019 pendiente` es un aviso normal antes del primer arranque: se
aplica sola al iniciar la app.

---

## 7. Comprobar el login

Las 5 credenciales de `SGC_Dev` estaban en **texto plano legacy**. Con Auth 0.5
eso impedía iniciar sesión. El 22/09 se resolvió con el mecanismo seguro
existente:

1. Respaldo verificado `SGC_Dev_pre_password_migration_20260922.bak`
   (`COPY_ONLY`, `RESTORE VERIFYONLY` con `CHECKSUM`) en el directorio de
   backups de la instancia.
2. `npm run migrate:passwords -- --dry` → 5 por migrar, 0 errores.
3. `npm run migrate:passwords` → 5 migradas; segunda ejecución: 0 migradas,
   5 ya seguras.

**Las contraseñas siguen siendo las mismas que antes**; solo cambió su
almacenamiento a bcrypt. Para comprobarlo:

```bash
npm run migrate:passwords -- --dry
```

Esperado: `migradas : 0` y `ya-seguras : 5`. Después, iniciar sesión en la app.

Si la contraseña del presentador es débil o desconocida, fijar una nueva con el
mecanismo de bootstrap (mínimo 12 caracteres, sin valores por defecto):

```bash
SGC_BOOTSTRAP_ADMIN_LOGIN=<email-o-id> SGC_BOOTSTRAP_ADMIN_PASSWORD='<nueva>' npm run bootstrap:admin
```

---

## 8. Dynamic Records

- En `npm start` (renderer en `localhost`) Dynamic Records está activo por
  defecto.
- Al pulsar **▶ Demo guiada Innovax**, la demo fuerza el feature flag existente
  `SGC_ENABLE_DYNAMIC_RECORDS=1` **solo mientras está abierta**, y al salir
  restaura el valor anterior.
- Activarlo a mano, si hiciera falta: en DevTools,
  `localStorage.setItem('SGC_ENABLE_DYNAMIC_RECORDS', '1')` y volver a entrar a
  Registros.

---

## 9. Dónde está el botón y cómo se controla

Barra superior, a la izquierda del usuario con sesión:
**▶ Demo guiada Innovax**. Solo existe después de iniciar sesión. Abre la
portada **sin hablar**; el recorrido empieza con **▶ Iniciar recorrido**.

| Tecla | Acción |
|---|---|
| `→` | Siguiente micro-paso (corta la voz en curso) |
| `←` | Micro-paso anterior (corta la voz en curso) |
| `Espacio` | Pausar / reanudar voz y avance |
| `Esc` | Salir (corta la voz) |

Voz, modos **Automático / Manual**, pasos que esperan al presentador y
troubleshooting: **sección 19 (Fase 2 — Voz)**. Las teclas no se interceptan
mientras se escribe en un campo. En el panel central, los puntos inferiores
saltan a cualquier escena.

---

## 10. Recorrido: 15 escenas, 47 micro-pasos

Micro-guion completo (target, acción, origen y narración de cada paso):
[`DEMO_INNOVAX_SCRIPT_2026-09-23.md`](./DEMO_INNOVAX_SCRIPT_2026-09-23.md).

| # | Escena | Estado | Pasos | Qué muestra |
|---|---|---|---|---|
| 1 | Innovax ya tiene su Sistema de Gestión | Contexto | 2 | 197 documentos de la Lista Maestra; promesa |
| 2 | Cada persona opera con su propia sesión | **Funciona hoy** | 1 | Chip de usuario y puesto |
| 3 | Visibilidad del sistema | **Funciona hoy** | 6 | Documentos, Carpetas, Pendientes, Usuarios, Resumen, Bitácora |
| 4 | La documentación real de Innovax | **Funciona hoy** | 5 | Árbol, `4.APROBADO`, áreas, carpeta PR-01, contadores |
| 5 | Localizar un documento por su código | **Funciona hoy** | 2 | Búsqueda `PR-01-A` en la carpeta actual |
| 6 | La Lista Maestra, dentro del sistema | **Funciona hoy** | 3 | PR-01-A; visor protegido (botón del presentador) |
| 7 | De documento a regla | Siguiente implementación | 2 | SGC Mirror: responsable → workflow, acceso → permisos… |
| 8 | Qué puede hacer cada usuario | **Funciona hoy** | 2 | Diálogo *Información de acceso* |
| 9 | Revisión y aprobación | **Funciona hoy** | 4 | Bandeja de revisión (sin pulsar Aprobar/Corregir) |
| 10 | La conversación alrededor del documento | **Funciona hoy** | 3 | Centro de notificaciones (sin marcar leídas) |
| 11 | Un formato que se convierte en captura | **Funciona hoy** | 9 | FP-05-C campo a campo; usuario vs sistema; validación; importador |
| 12 | Estados y trazabilidad del registro | **Funciona hoy** · sin dato de demo | 2 | Ciclo de vida; etiquetado "capacidad implementada" |
| 13 | FP-15-C · Registro de paros CNC | Siguiente implementación | 2 | Formato vs registro; datos anonimizados |
| 14 | Cerrar el ciclo de calidad | Visión | 2 | Evento → … → Mejora |
| 15 | Cómo llegamos de aquí a operación real | Plan | 2 | Hoy / Siguiente / Después; CTA *Definir piloto Innovax* |

### Origen de cada dato (`dataSource`)

| Etiqueta | Significado |
|---|---|
| (sin etiqueta) / Datos del sistema | `REAL`: pantalla y datos reales de `SGC_Dev` |
| Dato real anonimizado | `ANONYMIZED_REAL`: FP-15-C con estructura real y datos anonimizados |
| Ejemplo de demo | `DEMO_EXAMPLE`: SGC Mirror (escena 7) |
| Visión | `VISION`: ciclo cerrado |
| Sin dato de demo | `NO_DATA`: capacidad construida sin registros en esta base (escena 12) |

### Módulos prototipo

Auditorías, No conformidades, CAPA, Riesgos, Indicadores, Proveedores,
Revisión por la dirección, Competencias, Satisfacción del cliente y Control de
cambios llevan el distintivo **PROTOTIPO** en el menú y, dentro, el aviso
*"Prototipo de pantalla · Siguiente implementación. Los datos que ves son de
ejemplo y no pertenecen a Innovax."* No se convirtieron ni rediseñaron. La demo
no los abre.

### Garantías de la demo

- **No escribe en la base de datos.** Toda acción pasa por la política central
  `src/renderer/demo/actions/policy.ts` (lista blanca de 18 acciones de lectura
  o navegación + rechazo de verbos de escritura: create, update, delete,
  approve, reject, correct, send, publish, import, upload, transition, submit,
  mark-read, rename, move, sign, restore, purge, save…). `demoBus` repite la
  comprobación antes de entregar cada comando. Hay tests para ambas.
- **No marca notificaciones como leídas**: solo abre y cierra el panel.
- **No toca autenticación.** El botón solo existe tras iniciar sesión.
- **No bloquea la app.** La capa oscura no intercepta clics; un Error Boundary
  la cierra si falla.
- **Deja la app como estaba** al salir: limpia búsqueda, cierra diálogos,
  visores abiertos por la demo y el panel de notificaciones, y restaura el flag
  de Dynamic Records.
- **Nunca abre** documentos con información personal (lista de contactos,
  organigrama, aviso de privacidad, `Libro1`, `Hoja principal`): la lista
  `FORBIDDEN_DEMO_DOCUMENTS` se comprueba también dentro de Documentación.

### Arquitectura

| Carpeta | Responsabilidad |
|---|---|
| `demo/types/` | Tipos: `Scene`, `MicroStep` (id, title, narrationText, target, action, cleanup, status, dataSource…) |
| `demo/steps/` | Guion: `scenes.ts`, etiquetas de estado |
| `demo/actions/` | Política de solo lectura y ejecutor con timeout |
| `demo/engine/` | Motor por eventos (limpieza → navegación → acción → spotlight) y reproducción con voz (`usePlayback`) |
| `demo/spotlight/` | Localizar, revelar e iluminar el objetivo |
| `demo/narration/` | Línea de tiempo, motor de voz local y controlador de narración (Fase 2) |
| `demo/data/` | Datos reales de solo lectura, ejemplo FP-15 y documentos seguros |

---

## 11. Identidad visual


**Logo:** `src/renderer/assets/branding/innovax/innovax-logo.jpg`, copia byte a
byte (verificada por SHA-256) de `Downloads/GV-2.0/SISTEMA-DE-COSTOS/innovax-logo.jpg`,
2550 × 996 px. No se redibujó, recoloreó ni filtró. Como el JPG no tiene
transparencia, **siempre va sobre tarjeta blanca**, igual que la "Muestra
principal" de la guía cromática.

**Paleta:** `src/renderer/assets/branding/innovax/innovax-tokens.css`, tomada de
`INNOVAX_guia_cromatica_estilo_pantone.pdf` (Guía de color 2026):

| Token | HEX | Rol en la demo |
|---|---|---|
| `--innovax-chocolate` | `#1F130F` | Color principal: botón, CTA, textos |
| `--innovax-amarillo` | `#FDD000` | Acento: spotlight, icono de reproducción |
| `--innovax-oro-luminoso` | `#F0BB09` | Inicio del degradado de progreso |
| `--innovax-oro-medio` | `#BF7A08` | Fin del degradado de progreso |
| `--innovax-bronce` | `#7B4114` | Texto de acento sobre fondo claro |
| `--innovax-marfil` | `#FDFBF8` | Fondo de los paneles |

> La propia guía declara que la paleta **se extrajo del logotipo PNG**, no de un
> manual vectorial oficial. Se usa tal cual, pero no debe presentarse como el
> manual de marca de Innovax.

Los estados funcionales (Funciona hoy, Siguiente implementación, Visión) usan
los colores de GD-V2, no los de Innovax: un color corporativo nunca se usa como
éxito, aviso o error.

**Co-branding:** Innovax es el contexto; GD-V2 · Quality Operating System es la
plataforma. La identidad de GD-V2 se conserva en toda la aplicación.

**Faltan (no bloquean):** logo SVG, versión para fondo oscuro, isotipo aislado y
manual de marca. Ver `src/renderer/assets/branding/innovax/README.md`.

---

## 12. Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| "Credenciales incorrectas" con la contraseña de siempre | Credenciales sin migrar en otra base | `npm run migrate:passwords -- --dry`; si `migradas > 0`, respaldar y ejecutar sin `--dry` |
| El botón de la demo no aparece | No hay sesión iniciada | Iniciar sesión: el botón solo existe tras autenticar |
| La vista previa de un documento dice "fuera de las carpetas autorizadas" | `SGC_ALLOWED_FILE_ROOTS` ausente o incorrecta | Revisar la variable y reiniciar la app |
| Escena 11 sin pestaña "Registros Dinámicos" | Flag desactivado a mano en `localStorage` | Salir y volver a abrir la demo, o activar el flag (sección 8) |
| Escena 11 sin FP-05-C | Migración 016 no aplicada | Arrancar la app una vez; `npm run demo:preflight` |
| Aviso "La base de datos no respondió a tiempo" | SQL Server detenido o lento | Iniciar el servicio `MSSQLSERVER`; la demo continúa mientras tanto |
| La app no abre | Puerto 3002 ocupado | Cerrar la instancia anterior de `npm start` |

---

## 13. Plan B si RAG no funciona

No se necesita. La demo **no depende de RAG** ni lo menciona. Mantener
`SGC_RAG_ENABLED=0`. **No activar RAG con la clave histórica.**

---

## 14. Plan B por punto crítico

| Punto | Síntoma | Plan B |
|---|---|---|
| SQL no disponible antes de empezar | No hay login | Iniciar `MSSQLSERVER`; `npm run demo:preflight`. Si no es posible, presentar con las **capturas** de las 15 escenas (checklist, punto 10) y decirlo con honestidad. |
| SQL cae a mitad | Avisos "No disponible en este entorno" | La demo sigue; las escenas 13–15 no dependen de la base. |
| Escena 6 en pantalla compartida | Todas las ventanas se ven en negro | Es la protección anticapturas (content protection en todas las ventanas mientras hay un visor abierto). **No pulsar** el botón del visor al compartir por Teams/Zoom; narrar el paso. Si se abrió: cerrar el visor (o avanzar de escena: la demo lo cierra) y la imagen vuelve. |
| Escena 6 · documento en disco inaccesible | "El visor no pudo abrirse" | Seguir. Hay 6 documentos en disco con rutas `C:\Users\TI\…` que no se abren en esta máquina. PR-01-A **no** es uno de ellos: está guardado en la base (verificado el 23/09). |
| Escena 9 · bandeja vacía | Mensaje de bandeja vacía | Esperado en `SGC_Dev`. Opcional: **el presentador** envía a revisión un documento limpio antes de la demo (es una escritura: decisión del presentador, no de la demo). |
| Escena 10 · corrección con datos sensibles | — | La demo solo ilumina la notificación; no abre el detalle de la corrección. No pulsarla. |
| Escena 11 · FP-05-C | Sin pestaña o sin tipo | `Esc`, volver a abrir la demo; si persiste, saltar a la escena 13. |
| Error de la capa | La demo se cierra | Error Boundary; la app sigue. Volver a pulsar el botón. |

---

## 15. Papelera: purga automática a los 30 días (documentado, **no modificado**)

**No se ejecutó ninguna purga ni se borró nada.** Hallazgo de la revisión:

- **Dónde:** `purgeExpiredTrashInternal()` en
  `src/database/repositories/documentoTreeRepo.ts`. Borra de
  `documento_papelera` las filas con `expires_at <= ahora` y elimina del disco
  sus archivos.
- **Cuándo se dispara:** no hay temporizador. Se ejecuta de forma implícita en
  `getAll` (cada carga del Dashboard y de Documentación), `deleteNode`,
  `listTrash`, `restoreTrashItem` y `purgeExpiredTrash`.
- **Plazo:** `expires_at = fecha de borrado + 30 días`.
- **Estado hoy en `SGC_Dev`:** 2 carpetas en papelera (`PRUEBA`, expira
  2026-10-05; otra de prueba, expira 2026-10-08). **Nada caduca el día de la
  demo**, así que abrir Documentación durante la presentación no borra nada.
- **Propuesta (pendiente de aprobación, no aplicada):** condicionar la purga
  implícita a una variable, p. ej. `SGC_TRASH_AUTO_PURGE` (desactivada por
  defecto), manteniendo `purgeExpiredTrash` como acción explícita. Cambio
  pequeño, local y reversible, en un commit separado y fuera de la demo.

---

## 16. Checklist de 30 minutos antes (15:30)

1. [ ] Portátil con cargador; pantalla externa probada a 1366 × 768 o superior.
2. [ ] Windows en "No molestar".
3. [ ] Servicio `MSSQLSERVER` en ejecución.
4. [ ] `git branch --show-current` → `demo/innovax-guided-2026-09-23`.
5. [ ] `npm run demo:preflight` → **LISTO para presentar**.
6. [ ] `npm start` → iniciar sesión con el usuario del presentador.
7. [ ] Decidir el modo de presentación: **pantalla física/proyector** (se puede
       abrir el visor en la escena 6) o **Teams/Zoom** (no pulsar el botón del
       visor).
8. [ ] Recorrer las 15 escenas una vez con `→`; en la escena 6 comprobar que
       PR-01-A se ilumina (y, si se presenta en físico, que el visor abre).
       Salir con `Esc` y comprobar que la app queda en su estado normal.
9. [ ] Comprobar la escena 10: qué notificaciones aparecen (no pulsar ninguna).
10. [ ] Guardar capturas de las 15 escenas (plan B sin SQL).
11. [ ] Dejar la app en el Dashboard, sesión iniciada, demo cerrada.
12. [ ] Confirmar que **197 documentos** sigue siendo la cifra vigente de la Lista Maestra.
13. [ ] Cerrar DevTools, el explorador de archivos y cualquier otra ventana.

---

## 17. Riesgos conocidos

- **Nombres reales en pantalla.** El chip de usuario y la bitácora del Dashboard
  muestran nombres de `SGC_Dev`. La demo no abre Usuarios (contiene nombres
  reales en el catálogo de puestos) ni documentos con datos personales.
- **Archivos de prueba visibles** en el árbol y en notificaciones de `SGC_Dev`
  (p. ej. carpetas de prueba). La demo no se detiene en ellos.
- **Bandeja de revisión vacía** hoy (escena 9 usa su mensaje de respaldo).
- **FP-05-C sin registros** (escena 12 lo etiqueta como capacidad sin dato).
- **Visor protegido y pantalla compartida** (sección 14).
- **Clave comprometida** en el `.env` local (sección 5). RAG desactivado.
- **Bundle cargado dos veces (preexistente, no tocado).**
- **Purga implícita de la papelera** (sección 15): sin efecto el día de la demo.

---

## 18. Verificación realizada (Fase 1)

| Verificación | Resultado |
|---|---|
| `git diff --check` | Sin errores |
| `npm run typecheck` | 0 errores |
| `npm test` | 91/91 (31 de la demo) |
| webpack renderer (producción) | Compila; solo warnings de tamaño preexistentes |
| webpack main (producción) | Compila sin warnings |
| Arnés visual (App real con IPC simulado, 1366 × 768) | 47/47 micro-pasos; spotlight encontrado en todos los pasos en vivo; 0 escrituras registradas; cierre limpio |
| `npm start` real | Ver el informe de entrega: el login y el recorrido con sesión real los hace el presentador (checklist, puntos 6–9) |

---

## 19. FASE 2 — VOZ

La demo puede contarse sola: **la voz sigue a la interfaz**.

```
acción → interfaz estable → spotlight → pausa breve → narración
      → fin REAL de la voz → pausa natural → siguiente micro-paso
```

No hay tiempos fijos por paso: la duración la marca la voz (`onend`). Las
pausas breves (≈0,45 s antes de hablar y ≈0,65 s después) son secundarias.

### Motor de voz

- **100 % local:** Web Speech API (`speechSynthesis`) con las voces instaladas
  en Windows. **Sin internet, sin API keys, sin cuentas.** Las voces remotas se
  ignoran.
- **Selección por capacidad, nunca por nombre:** `es-MX` → voz en español de
  México/Latinoamérica → cualquier `es-*` → voz predeterminada del sistema.
- **En esta PC:** hay instaladas *Microsoft Raúl* y *Microsoft Sabina*
  (es-MX) y *Helena, Laura, Pablo* (es-ES), todas locales. Se elige la primera
  voz es-MX que ofrece Windows (en la prueba: **Microsoft Raúl – Spanish
  (Mexico)**), salvo que la voz predeterminada de Windows sea es-MX: entonces se
  usa esa. **Para usar Sabina:** *Configuración › Hora e idioma › Voz › Voz
  predeterminada → Microsoft Sabina* y reiniciar la app. La consola registra
  `[GuidedDemo] Voz seleccionada: …`.
- **Tono:** velocidad 0,95, pitch 1,0, volumen 1,0.
- **Robustez:** se habla frase a frase; un *watchdog* corta una locución colgada
  (sin `onend`) y la demo sigue; cualquier fallo muestra
  *"Voz no disponible. Continuando en modo manual."*

Código: `src/renderer/demo/narration/` (`VoiceEngine.ts`, `VoiceController.ts`,
`voiceEngineFactory.ts`, `FakeVoiceEngine.ts` para pruebas) y
`src/renderer/demo/engine/usePlayback.ts` (sustituye al autoplay de 8 s).

### Inicio

**▶ Demo guiada Innovax** abre la portada **sin hablar**. La voz se prepara y
empieza al pulsar **▶ Iniciar recorrido** (también `→`, `Espacio` o el botón de
la portada). Arranca en **Automático** con voz.

### Controles

| Control | Efecto |
|---|---|
| `→` / **Siguiente** | Corta la voz y pasa al siguiente micro-paso (que se narra) |
| `←` / **Anterior** | Igual, hacia atrás |
| `Espacio` / **❚❚ Pausar** | Pausa la voz **y** el avance; el spotlight se queda |
| `Espacio` / **▶ Reanudar** | Continúa la frase y la secuencia |
| `Esc` / **×** | Corta la voz, limpia y sale |
| **🔊 Voz activada / 🔇 Voz desactivada** | Activa o silencia la voz. Sin voz, el texto sigue en pantalla |
| **Automático / Manual** | Automático: avanza al terminar la voz. Manual: narra y espera `→` |
| **↻ Repetir** | Vuelve a narrar el paso actual |

El texto de cada paso (`narrationText`) está **siempre visible** como
subtítulo: la demo funciona igual sin audio.

### Modos (internos)

| Modo | Cuándo | Avance |
|---|---|---|
| `VOICE_SYNC` | Automático + voz | Al terminar la voz |
| `AUTOPLAY` | Automático sin voz | Tiempo de lectura del texto (3,5–14 s) |
| `MANUAL` | Manual (o la voz falló) | Solo con `→` |

### Pasos que no avanzan solos

La narración termina, el spotlight se queda y aparece *"Pulsa Siguiente (→)
para continuar"*:

| Paso | Motivo |
|---|---|
| `master-viewer` (6.2) | El presentador decide si abre el visor protegido |
| `review-decision` (9.4) | Recordar que no se pulsan Aprobar/Corregir |
| `record-protection` (12.2) | Capacidad sin dato de demo: el presentador comenta |
| `fp15-data` (13.2) | Momento clave de FP-15-C |
| `loop-value` (14.2) | Cierre de la visión |
| `plan-close` (15.2) | Cierre y CTA |

Además, **cualquier paso cuyo objetivo no aparece** en este entorno (p. ej.
bandeja de revisión vacía) narra también el aviso honesto
(*"Hoy no hay documentos pendientes…"*) y espera `→`.

### Visor protegido y videollamada

El visor **sigue abriéndose solo con el botón del presentador**. En 6.2 la voz
explica el visor y la demo espera. En **Teams/Zoom** no pulses el botón (las
ventanas se ven en negro por la protección anticapturas): pulsa `→` y la demo
continúa. La voz sale por los altavoces de la PC: en videollamada, **comparte
también el audio del sistema** (Teams: "Incluir audio del sistema"; Zoom:
"Compartir sonido") o presenta en **Manual con la voz desactivada** y narra tú.

### Pronunciación

Los códigos se muestran tal cual y solo cambia lo que se pronuncia
(`speechText`, auditable en el micro-guion):

| En pantalla | Se pronuncia |
|---|---|
| GD-V2 | "ge de ve dos" |
| FP-05-C | "efe pe cero cinco ce" |
| FP-15 | "efe pe quince" |
| ISO 9001 | "la norma iso nueve mil uno" |
| SGC | "ese ge ce" / "sistema de gestión" |
| workflow | "flujo de revisión" |

### Troubleshooting de voz

| Síntoma | Qué hacer |
|---|---|
| "Voz no disponible. Continuando en modo manual." | La demo sigue en Manual. Pulsa **🔇 Voz desactivada** para reintentar; si no, presenta sin voz |
| Windows no ofrece voz es-MX | Se usa otra voz en español (es-ES) o la predeterminada. Para instalar Sabina: *Configuración › Hora e idioma › Voz › Agregar voces › Español (México)* **antes** de la demo, y reiniciar la app |
| La voz se oye en inglés | No hay ninguna voz en español instalada: instalar Español (México) o desactivar la voz |
| Deja de hablar a mitad | `Espacio` dos veces (pausa/reanudar) o **↻ Repetir**. Si no, `→` |
| Reiniciar la narración de un paso | **↻ Repetir** |
| Sigue hablando tras salir | No debería ocurrir (la voz se corta al salir, cerrar sesión o cerrar la ventana). Si pasa, cerrar la app |
| No se oye nada | Volumen de Windows y dispositivo de salida; el botón debe decir **🔊 Voz activada** |

### Checklist de voz (antes de presentar)

1. [ ] Volumen de Windows al 60–80 % y la salida en los altavoces correctos.
2. [ ] Abrir la demo, **▶ Iniciar recorrido** y oír la portada. Revisar en
       DevTools la línea `Voz seleccionada` (debe ser es-MX).
3. [ ] Oír 2–3 pasos del Dashboard y pulsar `Espacio` (pausa) y `→` (siguiente)
       para confirmar que la voz se corta al instante.
4. [ ] Decidir el modo: **Automático con voz** (la demo se cuenta sola) o
       **Manual** (tú hablas; con o sin voz).
5. [ ] En videollamada: probar que el audio del sistema se comparte.
6. [ ] Salir con `Esc` y comprobar que no sigue hablando.

### Verificación realizada (Fase 2)

| Verificación | Resultado |
|---|---|
| `git diff --check` · `npm run typecheck` | Sin errores |
| `npm test` | 125/125 (34 de voz) |
| `npm run secret:scan` | 0 hallazgos |
| webpack renderer / main (producción) | Compilan (solo warnings de tamaño preexistentes) |
| `npm run demo:preflight` | LISTO para presentar |
| Arnés con voz simulada (`FakeVoiceEngine`) | 47/47 narrados, sin bloqueos, 0 escrituras; se detiene en los 6 pasos manuales |
| Arnés sin voces / TTS que falla | "Voz no disponible. Continuando en modo manual." y la demo sigue |
| Arnés con **voz real** de Windows (Chromium, sin internet) | Voz `Microsoft Raul - Spanish (Mexico)`; 47/47 narrados; spotlight visible al empezar cada narración; **recorrido completo ≈ 7 min 30 s** (452 s, en automático, pulsando `→` en los pasos manuales); 0 escrituras |
| Interrupciones con voz real | No habla antes de *Iniciar*; Pausa detiene la voz; Reanudar continúa; `→` corta y narra el siguiente; `Esc` deja el sintetizador en silencio |
| `npm start` con sesión real | Pendiente del presentador (checklist de voz, puntos 1–6): el login no lo hace el asistente |
