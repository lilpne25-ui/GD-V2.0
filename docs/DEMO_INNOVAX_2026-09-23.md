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
| Commit de la demo | `fc4a620a0df27f8ce5d4e277b706e8b831ba38ac` (`feat: add Innovax guided product demo`) |

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

## 9. Dónde está el botón

Barra superior, a la izquierda del usuario con sesión:
**▶ Demo guiada Innovax**. Solo existe después de iniciar sesión.

Controles del presentador:

| Tecla | Acción |
|---|---|
| `→` | Siguiente (recorre primero los focos del paso) |
| `←` | Anterior |
| `Espacio` | Reproducir / pausar |
| `Esc` | Salir |

La demo arranca **en pausa**: la controla el presentador. Con `Espacio` avanza
sola cada 8–10 s y **se detiene sola** en los pasos que se explican en vivo
(2, 5, 6, 7 y 8). Las teclas no se interceptan mientras se escribe en un campo.

---

## 10. Recorrido de 8 pasos

| # | Título | Estado | Qué muestra |
|---|---|---|---|
| 1 | Innovax ya tiene un Sistema de Gestión | Contexto Innovax | Composición de marca, 197 documentos de la Lista Maestra |
| 2 | SGC Mirror: conservar lo que ya funciona | Siguiente implementación | PR-01-A: metadata → reglas ejecutables |
| 3 | Lo que ya ocurre, ya queda registrado | **Funciona hoy** | Dashboard real: KPIs y trazabilidad |
| 4 | Un solo lugar para el control documental | **Funciona hoy** | Documentación real: estructura y documentos |
| 5 | Un motor, muchos formatos | **Funciona hoy** | Registros → Dynamic Records → FP-05-C real |
| 6 | FP-15-C · Registro de paros CNC | Siguiente implementación | Formato actual vs registro operativo (ejemplo) |
| 7 | Cerrar el ciclo de calidad | Visión | Ciclo NC → CAPA → KPI → Revisión por la dirección |
| 8 | Cómo llegamos de aquí a operación real | Plan | Hoy / Siguiente / Piloto / Escala |

### Qué es real (live)

Pasos **3, 4 y 5**: iluminan pantallas reales conectadas a SQL Server. Los
valores del Dashboard, los documentos y la definición de FP-05-C salen de la
base en ese momento, etiquetados **"Datos del sistema"**.

### Qué es visión o siguiente implementación

Pasos **2, 6, 7 y 8** son vistas locales etiquetadas. FP-15-C usa datos
anonimizados con la etiqueta **"Ejemplo de demo"**; NC, CAPA y Riesgo llevan
**"Siguiente etapa"**. La respuesta de "Inteligencia sobre evidencia" es fija,
sin IA, y lo dice en pantalla.

### Garantías de la demo

- **No escribe en la base de datos.** Solo usa canales de lectura ya protegidos
  por `withAuth`. Un test lo impide a nivel de código.
- **No toca autenticación.** El botón solo existe tras iniciar sesión.
- **No bloquea la app.** La capa oscura no intercepta clics; si falla, un Error
  Boundary la cierra y la app sigue operativa.
- **Tolera fallos.** Sin BD, sin FP-05-C o con un módulo lento, muestra un aviso
  discreto y la historia continúa.

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
| Paso 5 sin pestaña "Registros Dinámicos" | Flag desactivado a mano en `localStorage` | Salir y volver a abrir la demo, o activar el flag (sección 8) |
| Paso 5 dice "FP-05-C no está sembrado" | Migración 016 no aplicada | Arrancar la app una vez; `npm run demo:preflight` |
| Aviso "La base de datos no respondió a tiempo" | SQL Server detenido o lento | Iniciar el servicio `MSSQLSERVER`; la demo continúa mientras tanto |
| La app no abre | Puerto 3002 ocupado | Cerrar la instancia anterior de `npm start` |

---

## 13. Plan B si RAG no funciona

No se necesita. La demo **no depende de RAG**: el paso 7 usa una respuesta fija
etiquetada como ejemplo. Mantener `SGC_RAG_ENABLED=0`.

Si alguien pide ver IA real: explicar que el análisis RAG existe sobre registros
de Dynamic Records y que se mostrará en una sesión técnica con una clave nueva.
**No activar RAG con la clave histórica.**

---

## 14. Plan B si SQL no está disponible

1. Intentar iniciar el servicio `MSSQLSERVER` (Servicios de Windows) y volver a
   ejecutar `npm run demo:preflight`.
2. Si no es posible, **sin SQL no hay login**, así que no se puede abrir la app.
   Presentar con las **capturas de respaldo** de los 8 pasos preparadas antes
   (checklist, punto 9), narrando con el guion. Decirlo con honestidad: "el
   entorno de demo no tiene base de datos disponible".
3. Si la app ya estaba abierta y la base cae a mitad: la demo sigue funcionando;
   los pasos 3–5 muestran un aviso discreto de entorno.

---

## 15. Checklist de 30 minutos antes (15:30)

1. [ ] Portátil con cargador, pantalla externa probada a 1366 × 768 o superior.
2. [ ] Notificaciones de Windows silenciadas (modo "No molestar").
3. [ ] Servicio `MSSQLSERVER` en ejecución.
4. [ ] `git branch --show-current` → `demo/innovax-guided-2026-09-23`.
5. [ ] `npm run demo:preflight` → **LISTO para presentar**.
6. [ ] `npm run migrate:passwords -- --dry` → `migradas : 0`.
7. [ ] `npm start` → iniciar sesión con el usuario del presentador.
8. [ ] Recorrer los 8 pasos una vez con `→` y salir con `Esc`.
9. [ ] Guardar capturas de los 8 pasos (plan B sin SQL).
10. [ ] Dejar la app en el Dashboard, sesión iniciada, demo cerrada.
11. [ ] Confirmar que la cifra **197 documentos** sigue siendo la vigente de la
        Lista Maestra.
12. [ ] Revisar qué nombres reales muestra la bitácora del Dashboard (paso 3):
        son datos del sistema. Si no deben mostrarse, usar una base de demo.
13. [ ] Cerrar DevTools y cualquier otra ventana.

---

## 16. Riesgos conocidos

- **Nombres reales en pantalla.** La bitácora del Dashboard y el chip de usuario
  muestran nombres de `SGC_Dev`, que proviene del organigrama sembrado. La demo
  no los inventa ni los oculta: son datos del sistema.
- **FP-05-C sin registros.** Hay 0 instancias: el paso 5 muestra la definición
  y el formulario vacío. Crear un registro en vivo es posible (es real), pero la
  demo no lo hace por sí misma.
- **Logo en JPG.** Correcto para pantalla, pero sin transparencia ni versión
  vectorial.
- **Tamaño del chunk de la demo.** 284 KiB (el logo va incrustado). Se carga solo
  al pulsar el botón; en local es instantáneo.
- **Clave comprometida** en el `.env` local (sección 5).
- **Bundle cargado dos veces (preexistente).** `src/renderer/index.html` incluye
  `renderer.bundle.js` a mano y HtmlWebpackPlugin lo inyecta de nuevo, así que se
  montan dos copias de la app y la segunda sustituye a la primera. Ya ocurría en
  `main` y la app funciona así; no afecta a la demo. Arreglo de una línea
  (quitar la etiqueta manual), **no aplicado la víspera** para no alterar el
  arranque sin poder probar el login real.

---

## 17. Verificación realizada

| Verificación | Resultado |
|---|---|
| `git diff --check` | Sin errores |
| `npm run typecheck` | 0 errores |
| `npm test` | 80/80 (20 de la demo) |
| webpack renderer (producción) | Compila; warnings de tamaño documentados |
| webpack main (producción) | Compila sin warnings |
| Arnés visual (App real con IPC simulado) | 8 pasos, spotlight, autoplay, BD caída, salida limpia |
| `npm start` real | Arranca, aplica la migración 019 y carga el renderer sin errores. El login y el recorrido con sesión real los hace el presentador (checklist, punto 7–8) |
