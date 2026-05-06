# Fase 10 - Performance, escalabilidad y hardening (Registros Dinamicos)

## Mejoras aplicadas

1. Cache en memoria para definiciones de record_types + record_fields.
- TTL configurable por entorno.
- Limite maximo de entradas configurable.
- Lookup por id y por code.
- Invalidacion simple al crear/actualizar definicion en repositorio.

2. Hardening de consultas de listado.
- pageSize limitado en backend.
- texto de busqueda truncado a longitud segura.
- filtro de estados deduplicado y acotado.

3. Lazy load en renderer para datasets grandes.
- carga inicial reducida por pagina.
- boton Cargar mas para paginacion incremental.
- indicador de progreso Mostrando X de Y.

## Variables de entorno

- SGC_RECORD_DEFINITION_CACHE_TTL_MS
  - default: 120000
  - recomendado: 60000 a 180000

- SGC_RECORD_DEFINITION_CACHE_MAX
  - default: 200
  - recomendado: 100 a 500 segun memoria disponible

## Limites operativos recomendados

- pageSize max backend: 100
- pageSize UI lazy load: 50
- filtros de estado maximos: 5 (conjunto de estados soportados)
- longitud maxima de search: 120 caracteres

## Puntos de medicion

1. Latencia getRecordsByType (P50/P95)
- objetivo inicial: P95 <= 400 ms en red local para pageSize 50
- medir por tipo de registro y con/without includeValues

2. Payload renderer por pagina
- objetivo inicial: <= 500 KB por pagina de 50 filas (dependiendo de volumen de campos)

3. Efectividad de cache de definiciones
- hit ratio objetivo: >= 80% en navegacion normal
- medir hits/misses en sesiones de uso real

4. Tiempo de primera carga del panel dinamico
- objetivo inicial: <= 2 s en entorno local de QA

5. Tiempo de crear/actualizar registro
- objetivo inicial: <= 600 ms backend en flujo borrador (sin transiciones complejas)

## Smoke sugerido de rendimiento

1. Correr build de main.
2. Abrir panel dinamico y cargar tipo con volumen alto.
3. Validar que la primera pagina cargue sin freeze de UI.
4. Ejecutar Cargar mas varias veces y verificar continuidad de seleccion.
5. Confirmar que no hay regresion en Documentacion ni Registros Studio.
