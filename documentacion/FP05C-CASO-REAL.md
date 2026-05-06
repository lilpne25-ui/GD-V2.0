# Caso real FP-05-C (motor dinamico por configuracion)

## Objetivo
Configurar el tipo FP-05-C sin crear pantalla especifica y demostrar que el formulario dinamico existente lo renderiza por datos.

## Configuracion aplicada
- Tipo: FP-05-C
- Nombre: Reporte de mantenimiento TI
- Campos:
  - equipo (select)
  - tipo (select: preventivo/correctivo)
  - actividad (textarea)
  - responsable (auto usuario por token @@actor.name)
  - fecha (auto fecha por token @@now.date)

## Seed SQL
La configuracion se incluye en la migracion:
- src/database/migrations-mssql/016_seed_record_type_fp05c.sql
- src/database/migrations-mssql/017_record_values_allow_scalar_json.sql

Las migraciones son idempotentes:
- 016 inserta o actualiza el tipo y campos sin duplicar por codigo.
- 017 habilita compatibilidad de value_json con JSON escalar para evitar bloqueos al guardar strings/fechas.

## Ejemplo de alta de una instancia
### Opcion A (API tipada, recomendada)
Desde DevTools del renderer:

```ts
const allTypes = await window.repo.call('RegistroDinamicoRepo', 'listRecordTypes', false);
const fp05c = Array.isArray(allTypes)
  ? allTypes.find(t => String(t.code).toUpperCase() === 'FP-05-C')
  : null;

if (!fp05c) throw new Error('No existe FP-05-C');

const session = JSON.parse(localStorage.getItem('sgc_session') || '{}');

const newId = await window.records.create({
  recordTypeId: fp05c.id,
  title: 'FP-05-C - Mantenimiento switch core',
  values: {
    equipo: 'switch_core',
    tipo: 'preventivo',
    actividad: 'Limpieza de interfaces y validacion de conectividad.'
  },
  createdBy: session.id || 'usr-admin',
  createdByName: session.nombre || 'Administrador',
  role: session.rol || 'administrador',
  source: 'dynamic',
  metadata: {
    source: 'manual.fp05c.demo'
  }
});

console.log('Instancia creada:', newId);
```

Nota:
- responsable y fecha se completan automaticamente por configuracion (tokens), sin hardcode de pantalla.

### Opcion B (SQL de ejemplo)
- scripts/fp05c-create-example-instance.sql

## Ejemplo de visualizacion en DynamicRecordForm
1. Activar modulo de Registros Dinamicos (si aplica feature flag local).
2. Ir al panel de Registros Dinamicos.
3. Seleccionar el tipo FP-05-C.
4. Crear un nuevo registro.
5. Verificar en el mismo DynamicRecordForm:
   - equipo y tipo como select.
   - actividad como textarea.
   - responsable autocompletado con usuario actual.
   - fecha autocompletada con fecha actual.

## Validacion de reutilizacion del formulario (sin tocar UI)
1. Cambiar en el selector de tipo a otro record_type activo.
2. Confirmar que el mismo componente DynamicRecordForm renderiza los nuevos campos segun su definicion.
3. Confirmar que no hay cambios por tipo en el codigo de UI.

## Smoke SQL
- scripts/fp05c-smoke.sql

Valida existencia de FP-05-C, estructura de campos, tokens automaticos y listado de tipos activos para confirmar reutilizacion del formulario por configuracion.
