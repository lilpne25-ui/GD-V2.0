# Auditoría Profesional UI/UX — SGC Desktop App v2.0

**Fecha:** 7 de abril de 2026
**Producto:** Sistema de Gestión de Calidad ISO 9001 — Electron + React + TypeScript
**Usuarios objetivo:** Ingenieros, administrativos
**Alcance:** UI visual · UX (flujos, claridad, fricción) · Jerarquía de información · Accesibilidad
**Fuera de alcance:** Backend, lógica de negocio

---

## 1. Resumen ejecutivo

**Nivel actual del diseño: Intermedio-alto (entre intermedio avanzado y profesional)**

La aplicación tiene una base visual sólida y muy superior al promedio de herramientas internas corporativas. Se nota inversión real en tokens de diseño, tipografía (Plus Jakarta Sans), paleta de color coherente, border-radius generosos y sombras por capas. El sidebar oscuro, el topbar con blur y las tarjetas con gradientes son detalles que elevan la percepción.

Sin embargo, **no alcanza nivel premium tipo Stripe/Linear/Notion** por las siguientes razones:

- Inconsistencia en el design system: hay definiciones de `.btn` duplicadas entre `global.css` y `Documentacion.css` con especificaciones distintas.
- Hay 14 módulos pero no existe un componente de layout reutilizable — cada módulo reimplementa su estructura.
- La información se presenta con demasiada densidad visual en módulos complejos (Documentación, Usuarios).
- La iconografía usa SVG paths inline en el Sidebar pero emojis/caracteres en otras partes.
- Falta feedback visual profesional: no hay skeletons, no hay toasts unificados, no hay transiciones de estado.
- El topbar acumula demasiados elementos cuando se suman los botones del módulo Documentación.
- No hay sistema de notificaciones tipo toast/snackbar — los errores se muestran con `window.alert()`.

**Veredicto directo:** Se ve profesional a primera vista, pero al usar la app diariamente, la falta de consistencia, feedback y pulido acumulan fricción. Está a un 65-70% de nivel premium.

---

## 2. Problemas detectados (ordenados por impacto)

### P1 — CRÍTICO: Design system fragmentado y duplicado

**Qué está mal:**
Los estilos de `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`, etc. están definidos en DOS lugares:

- `global.css` no los define (solo noti-bell-btn y workflow-btn)
- `Documentacion.css` líneas 1077–1151 define el sistema completo de botones

**Por qué es problema:**
Cualquier módulo que no importe `Documentacion.css` no tiene estilos de botón. Los módulos que sí lo importan heredan reglas de `.mod-documentacion` que no les pertenecen. Esto causa:

- Botones sin estilo en módulos nuevos
- Cascada CSS impredecible
- Imposible mantener consistencia visual entre módulos

**Impacto en el usuario:**
Botones que se ven distintos en diferentes secciones. Sensación de app "parcheada".

---

### P2 — ALTO: Uso de `window.alert()` como feedback principal

**Qué está mal:**
Los errores y confirmaciones se manejan con `window.alert()` nativo del sistema operativo en múltiples módulos. Encontrado en: Documentación (líneas 980, 997, 1007), y probablemente replicado en otros módulos.

**Por qué es problema:**

- `window.alert()` bloquea el hilo de renderizado
- Rompe completamente la estética de la aplicación
- No tiene estilo consistente con el resto de la UI
- No transmite profesionalismo
- No diferencia visualmente entre error, advertencia y éxito

**Impacto en el usuario:**
Experiencia jarring. El usuario ve una app moderna y de pronto aparece un diálogo nativo gris del OS. Percepción inmediata de "herramienta interna sin terminar".

---

### P3 — ALTO: Ausencia de estados de carga (skeletons/spinners)

**Qué está mal:**
No existen componentes de skeleton loading. El Dashboard muestra `loading ? 'Actualizando...' : 'Actualizar panel'` — solo texto. Las tablas saltan de vacías a llenas sin transición.

**Por qué es problema:**

- El usuario no sabe si la app está trabajando o se colgó
- Viola la heurística de Nielsen #1 (visibilidad del estado del sistema)
- Las apps premium (Linear, Notion) nunca dejan un espacio en blanco durante la carga

**Impacto en el usuario:**
Incertidumbre. Los ingenieros que trabajan con datos reales necesitan saber que el sistema responde. Sin feedback visual, perciben lentitud aunque no la haya.

---

### P4 — ALTO: Sobrecarga del header en Documentación

**Qué está mal:**
El `mod-header` del módulo Documentación tiene 7 elementos de acción en una sola fila:

1. Botón info (ⓘ)
2. Actualizar
3. Bandeja de revisión
4. Papelera
5. Nueva carpeta
6. Subir documentos
7. (más el topbar global arriba con usuario + notificaciones + pendientes + cerrar sesión)

**Por qué es problema:**

- Viola el principio de jerarquía de acciones — todas las acciones tienen el mismo peso visual
- En pantallas < 1400px, los botones se envuelven (flex-wrap) creando un header de 2-3 líneas
- La acción principal (subir documentos) compite visualmente con acciones secundarias
- Hay redundancia: "Bandeja de revisión" en el header de Documentación + botón "Pendientes" en el topbar global

**Impacto en el usuario:**
Parálisis de elección. Un administrativo nuevo tarda en encontrar la acción principal. La pantalla se siente densa antes de empezar a trabajar.

---

### P5 — ALTO: Topbar con información redundante y sin priorización

**Qué está mal:**
El topbar global siempre muestra:

- Eyebrow "SISTEMA DE GESTIÓN DE CALIDAD" (texto estático que nunca cambia)
- Título de sección + subtítulo
- Chip de usuario (avatar + nombre + rol)
- Campana de notificaciones
- Botón "Pendientes"
- Botón "Cerrar sesión"

Todo al mismo nivel visual, todo en la misma fila.

**Por qué es problema:**

- El eyebrow es ruido visual puro — ya sabes qué aplicación estás usando
- El subtítulo repite el concepto del módulo — innecesario si la sección está bien nombrada
- 88px de altura mínima es mucho espacio para un topbar, especialmente en laptops 768px/1080px
- El botón "Pendientes" descontextualizado del módulo de documentación confunde

**Impacto en el usuario:**
~90px de pantalla permanentemente ocupados por información que el usuario ya conoce. En una laptop 1080p, eso es casi el 9% de la altura vertical.

---

### P6 — MEDIO: Sidebar con 14 ítems sin priorización real

**Qué está mal:**
El sidebar tiene 14 módulos divididos en 3 grupos:

- Workspace (3): Dashboard, Documentación, Registros
- Procesos (9): Auditorías, NC, CAPA, Riesgos, Indicadores, Proveedores, Revisión dirección, Competencias, Satisfacción, Control cambios
- Administración (1): Usuarios

Todos los ítems del grupo "Procesos" tienen la misma jerarquía visual.

**Por qué es problema:**

- 9 ítems en un grupo es demasiado — se pierde en una sola columna
- No hay indicadores de uso frecuente ni atajos
- No hay favoritos ni capacidad de personalizar el orden
- En pantalla < 1180px el sidebar colapsa a 96px, perdiendo completamente los labels — solo quedan iconos sin tooltip
- El grupo "Administración" con un solo ítem se ve huérfano

**Impacto en el usuario:**
Un ingeniero de calidad que usa 3-4 módulos diariamente debe scrollear y buscar visualmente entre 14 opciones cada vez.

---

### P7 — MEDIO: Iconografía inconsistente

**Qué está mal:**

- El Sidebar usa SVG paths inline (bien)
- El módulo Documentación usa un sistema `DocUiIcon` separado (bien)
- El topbar usa un sistema `AppIcon` con `ICON_PATHS` (bien)
- Pero hay SVGs inline en el Dashboard (paths directos en JSX)
- No existe un único sistema de iconos unificado

**Por qué es problema:**

- Tres sistemas de íconos diferentes = tres APIs diferentes
- Inconsistencia en tamaños: 20px sidebar, 18px notificaciones, 16px botones
- No hay guía clara de qué sistema usar para qué contexto
- Mantenimiento costoso: cambiar un icono puede requerir tocar 3 sistemas

**Impacto en el usuario:**
Puede no notar la inconsistencia directamente, pero la percepción subconsciente de calidad baja. Algunos iconos se ven más pesados o delgados que otros.

---

### P8 — MEDIO: Login con credenciales pre-llenadas en producción

**Qué está mal:**
El componente `Login.tsx` inicializa el estado con credenciales de demo:

```typescript
const [email, setEmail] = useState("admin@empresa.com");
const [password, setPassword] = useState("123456");
```

**Por qué es problema:**

- No es solo un problema de seguridad — es un problema de UX
- Transmite falta de profesionalismo
- El usuario ve credenciales ajenas al abrir la app
- Viola la expectativa de un producto terminado

**Impacto en el usuario:**
Primera impresión dañada. Un auditor ISO o un director de calidad abriendo la app verá credenciales de prueba. Percepción inmediata: "esto no está listo".

---

### P9 — MEDIO: Ausencia de estados vacíos diseñados

**Qué está mal:**
Los estados vacíos son texto plano sin diseño:

- Dashboard: `"Sin eventos todavía."`
- Notificaciones: `"Sin notificaciones"`
- Papelera: `"La papelera está vacía."` con estilo inline
- Tablas de módulos: celdas con colSpan y texto centrado

**Por qué es problema:**

- Las apps premium usan estados vacíos como oportunidad para guiar al usuario
- Un estado vacío sin ilustración ni CTA se siente roto, no vacío
- El usuario no sabe qué hacer para "llenar" esa tabla vacía

**Impacto en el usuario:**
"¿Está roto o no hay datos?" — incertidumbre. Especialmente en onboarding cuando todo está vacío.

---

### P10 — MEDIO: Responsive deficiente en componentes clave

**Qué está mal:**

- El sidebar colapsa a 96px sin tooltips — los iconos no son suficientemente descriptivos solos
- El `mod-header` de Documentación hace `flex-wrap` pero no rediseña la jerarquía
- Las tablas de auditoría con 6 columnas se comprimen sin responsive claro
- El FileManager asume `height: 100vh` que es incorrecto dentro de un layout con topbar

**Por qué es problema:**

- En laptops 13"-14" (1366×768 o 1920×1080 con scaling 125%), el sidebar colapsado + header envuelto consume hasta 30% del viewport
- Las tablas horizontales no tienen scroll horizontal ni se adaptan

**Impacto en el usuario:**
Ingenieros y administrativos con laptops estándar ven una versión degradada de la app. El contenido útil se comprime mientras chrome y headers ocupan espacio desproporcionado.

---

### P11 — BAJO-MEDIO: Acentos y encoding ausentes en textos de UI

**Qué está mal:**
Textos sin acentos a lo largo de toda la aplicación:

- "Documentacion" → "Documentación"
- "Revision direccion" → "Revisión por la Dirección"
- "Administracion" → "Administración"
- "Se elimino" → "Se eliminó"
- "Se movio" → "Se movió"
- "Actualizando datos" → OK pero "Vision general" → "Visión general"

**Por qué es problema:**

- Para un sistema ISO 9001 que maneja documentación formal, la propia app tiene errores ortográficos
- Un auditor externo notaría esto
- Transmite descuido

**Impacto en el usuario:**
Percepción de producto no terminado. Especialmente sensible en un sistema de calidad.

---

### P12 — BAJO: Focus states y accesibilidad keyboard

**Qué está mal:**

- El `:focus-visible` global aplica un box-shadow con `--color-ring` — correcto pero genérico
- Los botones del sidebar no tienen atributos `aria-label` descriptivos (solo `title`)
- El sidebar colapsado pierde completamente la accesibilidad por texto
- Las tablas no usan `scope="col"` en los headers
- Los formularios de Login no tienen asociación `<label>` semántica correcta (usa `<label>` wrapper pero sin `for`/`id`)
- No hay skip-links

**Por qué es problema:**

- Cumplimiento WCAG 2.1 AA incompleto
- Usuarios que navegan con teclado pierden contexto
- No hay forma de saltar al contenido principal

**Impacto en el usuario:**
Usuarios con discapacidades o preferencia de teclado tendrán fricción. En un sistema corporativo, esto puede ser requisito legal.

---

### P13 — BAJO: z-index sin sistema formal

**Qué está mal:**
Los z-index están esparcidos sin convención:

- Topbar: 999 (recientemente corregido)
- Noti panel: 9990
- Noti bell wrap: 50
- Dialog overlay: 10000
- Preview overlay: 9999
- Context menu: 9999
- Table sticky header: 1

**Por qué es problema:**

- Sin una escala formal (ej: base=1, dropdown=100, modal=1000, toast=2000), cada nuevo componente inventa su propio número
- Propenso a bugs de superposición (el bug recién corregido del panel de notificaciones fue exactamente este problema)

**Impacto en el usuario:**
Elementos que quedan detrás de otros inesperadamente. Ya documentado con el panel de notificaciones en el módulo de documentación.

---

## 3. Recomendaciones específicas

### R1: Extraer design system a archivo dedicado

Crear `design-system.css` que centralice:

- Tokens (ya en `:root` — bien)
- Botones (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`, `.btn-icon`, `.btn-danger`)
- Form controls (`.form-group`, `.form-input`, `.form-select`)
- Badges (`.wf-badge`, `.role-badge`)
- Tablas (`.mod-table`)
- Estados vacíos (`.empty-state`)
- Escala de z-index como variables CSS

Eliminar las definiciones duplicadas de `Documentacion.css`.

---

### R2: Reemplazar `window.alert()` por sistema de toast

Implementar un componente `<Toast>` o `<Snackbar>` con:

- Tipos: success, error, warning, info
- Posición fija (top-right o bottom-center)
- Auto-dismiss con barra de progreso
- z-index: 15000 (por encima de todo)
- Máximo 3 toasts visibles simultáneamente
- Animación entrada/salida

Referencia visual: el toast de Linear o Vercel.

---

### R3: Rediseñar el header de Documentación con jerarquía clara

**Antes (actual):**

```
[ⓘ] [Actualizar] [Bandeja revisión] [Papelera] [Nueva carpeta] [Subir documentos]
```

**Después (propuesto):**

```
Documentación                                        [Subir documentos ↑]
Vista de carpetas                    [Actualizar] [···]
                                     (menú ··· contiene: Papelera, Info permisos)
```

- Una sola acción primaria visible: "Subir documentos"
- "Bandeja de revisión" debe ser tab o sección, no botón
- "Papelera" e "Info" van a menú overflow (···)
- "Nueva carpeta" se mueve al nivel de la carpeta actual (contextual)

---

### R4: Reducir el topbar a lo esencial

**Antes:**

```
SISTEMA DE GESTIÓN DE CALIDAD
Documentación — Vista de carpetas...            [Admin ▾] [🔔] [Pendientes] [Cerrar sesión]
```

**Después:**

```
Documentación                                   [Admin ▾] [🔔 3] [⚡ Cerrar sesión]
```

- Eliminar el eyebrow estático
- Eliminar el subtítulo (ya está en el módulo)
- Reducir `min-height` de 88px a 56-64px
- Mover "Pendientes" como badge dentro de la campana de notificaciones o como tab en el sidebar
- Separar "Cerrar sesión" en un dropdown del chip de usuario

---

### R5: Implementar skeleton loading

Para Dashboard, tablas de auditoría, lista de documentos y cualquier carga async:

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

Componentes: `<SkeletonCard>`, `<SkeletonRow>`, `<SkeletonText>`.

---

### R6: Corregir acentos en toda la interfaz

Lista de correcciones mínimas:
| Actual | Correcto |
|--------|----------|
| Documentacion | Documentación |
| Administracion | Administración |
| Revision direccion | Revisión por la Dirección |
| Vision general | Visión general |
| Se elimino | Se eliminó |
| Se movio | Se movió |
| Se agrego | Se agregó |
| Se edito | Se editó |
| Seguimiento rapido | Seguimiento rápido |
| Operacion ISO 9001 | Operación ISO 9001 |

---

### R7: Escala de z-index como sistema

```css
:root {
  --z-base: 1;
  --z-sticky: 10;
  --z-dropdown: 100;
  --z-topbar: 200;
  --z-overlay: 500;
  --z-modal: 1000;
  --z-notification: 1500;
  --z-toast: 2000;
}
```

Todos los componentes deben referenciar estas variables en lugar de números mágicos.

---

### R8: Tooltips para sidebar colapsado

Cuando el sidebar está en modo 96px (<1180px), cada botón necesita un tooltip que muestre el nombre del módulo:

- Tooltip aparecer al hover después de 300ms
- Posición: derecha del sidebar
- Estilo consistente con `.noti-panel`

Sin esto, el sidebar colapsado es inutilizable para usuarios nuevos.

---

## 4. Quick wins (mejoras rápidas de alto impacto)

| #   | Quick win                                                      | Esfuerzo | Impacto                                  |
| --- | -------------------------------------------------------------- | -------- | ---------------------------------------- |
| 1   | Corregir acentos en todos los strings de UI                    | 30 min   | Alto — profesionalismo inmediato         |
| 2   | Mover `.btn` al `global.css` y eliminar de `Documentacion.css` | 45 min   | Alto — consistencia cross-módulo         |
| 3   | Eliminar credenciales pre-llenadas del Login                   | 5 min    | Alto — percepción de producto terminado  |
| 4   | Reducir `min-height` del topbar de 88px a 60px                 | 10 min   | Medio — más espacio para contenido       |
| 5   | Eliminar eyebrow estático del topbar                           | 5 min    | Medio — menos ruido visual               |
| 6   | Agregar `cursor: pointer` y `:hover` states faltantes          | 20 min   | Medio — interactividad percibida         |
| 7   | Crear escala de z-index con CSS variables                      | 30 min   | Medio — prevenir futuros bugs de overlay |
| 8   | Agregar `aria-label` a botones del sidebar colapsado           | 15 min   | Bajo-medio — accesibilidad básica        |

---

## 5. Nivel actual vs nivel esperado

| Dimensión               | Nivel actual   | Nivel premium esperado                          | Gap                                                                            |
| ----------------------- | -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| **Paleta de color**     | ██████████ 85% | Definida, coherente, con semántica              | Falta dark mode toggle, estados semánticos completos                           |
| **Tipografía**          | ████████░░ 80% | Plus Jakarta Sans bien elegida                  | Falta escala tipográfica formal (h1-h6), line-heights inconsistentes           |
| **Spacing / Layout**    | ███████░░░ 70% | Padding/margin coherente                        | Falta grid system, el módulo Documentación tiene padding distinto al Dashboard |
| **Componentes base**    | ██████░░░░ 60% | Botones, inputs, badges unificados              | Botones duplicados, inputs sin estilo global, badges ad-hoc                    |
| **Iconografía**         | ██████░░░░ 60% | Un solo sistema de iconos                       | 3 sistemas separados, tamaños inconsistentes                                   |
| **Feedback / States**   | ████░░░░░░ 40% | Toast, skeleton, transiciones, error boundaries | Solo `window.alert()`, sin skeletons, sin transiciones de estado               |
| **Accesibilidad**       | █████░░░░░ 50% | WCAG 2.1 AA completo                            | Focus visible genérico, sin skip-links, sin aria completo                      |
| **Responsive**          | ██████░░░░ 60% | Funcional en 1024px-1920px+                     | Sidebar pierde usabilidad colapsado, tablas no se adaptan                      |
| **Consistencia visual** | ██████░░░░ 60% | Todos los módulos idénticos en estructura       | Cada módulo reimplementa header, tabla, acciones                               |
| **Percepción premium**  | ██████░░░░ 65% | "Este software es de clase mundial"             | Buenos cimientos, falta pulido, coherencia y feedback                          |

### Conclusión de gap

Para llegar a nivel premium tipo Linear/Notion:

1. **Inmediato:** Unificar design system, corregir textos, eliminar `window.alert()`
2. **Corto plazo:** Skeleton loading, toast system, header de Documentación simplificado, topbar compacto
3. **Medio plazo:** Iconografía unificada, responsive real con tooltips, accesibilidad completa
4. **Largo plazo:** Animaciones de transición entre módulos, dark mode, personalización de sidebar

El producto tiene un **65% del camino recorrido**. Los cimientos son correctos. Lo que falta no es rediseñar, sino completar y unificar.

---

_Auditoría realizada sobre el código fuente real del repositorio E:\GD-V2.0_
_20 archivos de componentes y estilos analizados — ~9,260 líneas de código UI_
