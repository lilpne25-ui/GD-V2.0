# Guion verbal — Demo guiada Innovax (23/09/2026, 16:00)

Duración objetivo: **12–15 minutos** de demo + preguntas.
Runbook técnico: [`DEMO_INNOVAX_2026-09-23.md`](./DEMO_INNOVAX_2026-09-23.md).

**Idea que debe quedar al final:** *Tu Sistema de Gestión ya existe. Nosotros
lo hacemos operativo.*

**Reglas de honestidad al hablar**

- Cuando la pantalla diga **Funciona hoy**, se puede decir "esto ya funciona".
- Cuando diga **Siguiente implementación** o **Visión**, se dice "esto es lo que
  construimos a continuación" o "hacia aquí vamos". Nunca "ya lo tenemos".
- Nunca decir que GD-V2 certifica ISO ni que garantiza el cumplimiento. Lo que
  hace es que el cumplimiento **se pueda demostrar con evidencia**.

---

## Antes de pulsar el botón (30 s)

> "Antes de enseñarles software, una aclaración: no venimos a pedirles que
> cambien su forma de trabajar. Venimos a enseñarles cómo su Sistema de Gestión,
> el que ya tienen, puede funcionar como una operación digital."

Pulsar **▶ Demo guiada Innovax**.

---

## Paso 1 · Innovax ya tiene un Sistema de Gestión — *Contexto*

> "Innovax no parte de cero. Su Lista Maestra ya identifica **197 documentos**,
> con códigos, áreas, responsables, accesos, permisos, revisiones y retenciones.
> Ese trabajo ya está hecho y tiene mucho valor. Nuestro objetivo no es
> sustituirlo: es convertirlo en operación."

Pulsar **Ver cómo lo convertimos en sistema** o `→`.

---

## Paso 2 · SGC Mirror — *Siguiente implementación*

> "Tomemos un documento como el PR-01-A. Hoy su metadata vive en una tabla: quién
> es responsable, quién puede verlo, qué revisión está vigente, cuánto se
> conserva. Lo que proponemos es que esa misma metadata **se convierta en reglas
> que el sistema ejecuta**: el responsable define el workflow, el acceso define
> los permisos, la revisión controla la versión y la retención se vuelve
> política."
>
> "Y un punto importante: el sistema tiene que hablar su idioma. FP-05-C, FP-15-C,
> PR-01-A. No les vamos a pedir que renombren nada."

Aclarar: *"Esto es lo que construimos a continuación; los datos de la tarjeta
son ilustrativos."*

---

## Paso 3 · Dashboard — *Funciona hoy*

> "A partir de aquí, todo lo que ven es la aplicación real, conectada a su base
> de datos. Este panel consolida documentos, carpetas, pendientes de revisión y
> usuarios activos."

`→` pasa el foco a la trazabilidad:

> "Y aquí está lo importante para una auditoría: cada acción sobre un documento
> queda registrada — quién, qué y cuándo. Eso es evidencia, no una declaración."

---

## Paso 4 · Documentación — *Funciona hoy*

> "El primer cambio práctico es dejar de depender de saber dónde está el archivo
> correcto. La estructura, los documentos, sus revisiones, sus responsables y su
> workflow viven en un mismo sistema."

*Opcional:* abrir un documento real para mostrarlo. La demo no aprueba ni
modifica nada por sí misma.

---

## Paso 5 · Un motor, muchos formatos — *Funciona hoy*

> "Este es, técnicamente, el paso más importante. FP-05-C es un formato real de
> mantenimiento. **No programamos una pantalla para él.** El formulario que ven se
> genera a partir de su definición: equipo, preventivo o correctivo, actividad,
> y el responsable y la fecha se llenan solos."

`→` para el formulario, `→` para el importador:

> "Y si el formato vive hoy en Excel, el importador lo convierte en definición y
> registros sin construir otra aplicación. Eso significa que digitalizar el
> siguiente formato cuesta configuración, no desarrollo."

*Opcional:* crear un registro FP-05-C en vivo (es real y se guarda).

---

## Paso 6 · FP-15-C — *Siguiente implementación* · **momento principal**

Hacer una pausa antes de hablar.

> "Este es su FP-15, el registro de paros de CNC. A la izquierda, el formato como
> lo llenan hoy: máquina, área, parte, evento, inicio, fin y los cinco porqués."
>
> "A la derecha, el mismo registro en GD-V2. **Ese sigue siendo su FP-15. Pero
> ahora produce información**: la duración se calcula sola, el estado se sigue,
> la evidencia se adjunta, el responsable se asigna por rol y el historial no se
> pierde."
>
> "Y en cuanto hay datos, aparece lo que hoy es difícil de ver: el Pareto de
> paros, la recurrencia. Y el siguiente paso natural: que un paro recurrente
> abra una no conformidad, una CAPA, actualice un riesgo y mueva un KPI."

Aclarar: *"Los datos son un ejemplo anonimizado. No conformidad, CAPA y Riesgo
están marcados como siguiente etapa: todavía no están conectados."*

---

## Paso 7 · Cerrar el ciclo de calidad — *Visión*

> "Hacia aquí vamos. Hoy un paro, una inspección, una queja o un problema con un
> proveedor se registran en lugares distintos y hay que volver a escribirlos en
> cada paso. La visión es un ciclo cerrado: de la no conformidad a la
> contención, al análisis de causa, a la CAPA, a verificar su efectividad, al
> riesgo, al indicador y hasta la revisión por la dirección — con la evidencia
> viajando todo el camino."
>
> "Y cuando la evidencia está conectada, se le pueden hacer preguntas. La
> respuesta que ven es un ejemplo fijo. La meta es que el sistema responda
> **citando siempre su evidencia**, no inventando."

---

## Paso 8 · Cómo llegamos de aquí a operación real — *Plan*

> "No proponemos hacerlo todo a la vez. Hoy ya existe una base sólida: la
> aplicación, SQL Server, la seguridad, la documentación, el workflow y el motor
> dinámico. Lo siguiente es el SGC Mirror sobre su Lista Maestra. Después, un
> piloto operativo con FP-15-C, Pareto, NC, CAPA, riesgos e indicadores. Y solo
> entonces, escalar."
>
> "**Su Sistema de Gestión ya existe. Nosotros lo hacemos operativo.** Empezamos
> con procesos concretos, medimos el resultado y escalamos."
>
> "La propuesta concreta para hoy: **definir juntos el piloto de Innovax**."

Pulsar **Terminar demo**. Quedarse en la aplicación para preguntas.

---

## Preguntas probables

| Pregunta | Respuesta honesta |
|---|---|
| ¿Reemplaza a Global Shop? | No. GD-V2 gestiona el Sistema de Gestión; los conectores con Global Shop están en el horizonte de escala. |
| ¿Nos certifica en ISO 9001? | No. Ningún software certifica. GD-V2 hace que la evidencia de cumplimiento exista, esté conectada y se pueda mostrar. |
| ¿Cuánto de esto funciona hoy? | Lo marcado como "Funciona hoy": dashboard, documentación, workflow, registros y el motor dinámico con FP-05-C. El resto está etiquetado como siguiente implementación o visión. |
| ¿Dónde viven los datos? | En su SQL Server, en su infraestructura. |
| ¿Y la IA? | Existe una base de análisis sobre registros, pero no la presentamos como producto terminado. El principio es que toda respuesta cite su evidencia. |
| ¿Cuánto tarda digitalizar un formato? | Con el motor dinámico, un formato como FP-05-C es configuración. El piloto sirve para medirlo con sus formatos reales. |
