SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

/* 2.6 Indicadores y Objetivos */
IF OBJECT_ID('dbo.indicadores','U') IS NULL
BEGIN
  CREATE TABLE dbo.indicadores (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    nombre NVARCHAR(255) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL DEFAULT '',
    proceso_id NVARCHAR(64) NULL,
    responsable_id NVARCHAR(64) NULL,
    formula NVARCHAR(MAX) NOT NULL DEFAULT '',
    unidad NVARCHAR(60) NOT NULL DEFAULT '%',
    fuente_datos NVARCHAR(MAX) NOT NULL DEFAULT '',
    frecuencia NVARCHAR(60) NOT NULL DEFAULT 'mensual',
    tendencia_deseada NVARCHAR(60) NOT NULL DEFAULT 'subir',
    meta FLOAT NOT NULL DEFAULT 0,
    limite_inferior FLOAT NOT NULL DEFAULT 0,
    limite_superior FLOAT NOT NULL DEFAULT 100,
    linea_base FLOAT NOT NULL DEFAULT 0,
    tipo_grafico NVARCHAR(60) NOT NULL DEFAULT 'linea',
    objetivo_calidad NVARCHAR(MAX) NOT NULL DEFAULT '',
    activo INT NOT NULL DEFAULT 1,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

IF OBJECT_ID('dbo.mediciones_indicador','U') IS NULL
BEGIN
  CREATE TABLE dbo.mediciones_indicador (
    id NVARCHAR(64) PRIMARY KEY,
    indicador_id NVARCHAR(64) NOT NULL,
    periodo NVARCHAR(80) NOT NULL,
    valor FLOAT NOT NULL,
    meta FLOAT NOT NULL DEFAULT 0,
    semaforo NVARCHAR(40) NOT NULL DEFAULT 'verde',
    observaciones NVARCHAR(MAX) NOT NULL DEFAULT '',
    registrado_por NVARCHAR(120) NOT NULL DEFAULT '',
    fecha DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_mediciones_indicador_indicador FOREIGN KEY (indicador_id) REFERENCES dbo.indicadores(id)
  );
END;

IF OBJECT_ID('dbo.objetivos_calidad','U') IS NULL
BEGIN
  CREATE TABLE dbo.objetivos_calidad (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    descripcion NVARCHAR(MAX) NOT NULL,
    meta NVARCHAR(MAX) NOT NULL DEFAULT '',
    plazo NVARCHAR(120) NOT NULL DEFAULT '',
    responsable_id NVARCHAR(64) NULL,
    proceso_id NVARCHAR(64) NULL,
    estado NVARCHAR(60) NOT NULL DEFAULT 'definido',
    avance FLOAT NOT NULL DEFAULT 0,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

/* 2.7 Proveedores */
IF OBJECT_ID('dbo.proveedores','U') IS NULL
BEGIN
  CREATE TABLE dbo.proveedores (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    razon_social NVARCHAR(255) NOT NULL,
    nombre_comercial NVARCHAR(255) NOT NULL DEFAULT '',
    rfc NVARCHAR(40) NOT NULL DEFAULT '',
    contacto NVARCHAR(255) NOT NULL DEFAULT '',
    telefono NVARCHAR(80) NOT NULL DEFAULT '',
    email NVARCHAR(255) NOT NULL DEFAULT '',
    direccion NVARCHAR(MAX) NOT NULL DEFAULT '',
    producto_servicio NVARCHAR(MAX) NOT NULL DEFAULT '',
    categoria NVARCHAR(120) NOT NULL DEFAULT '',
    estatus NVARCHAR(80) NOT NULL DEFAULT 'en_evaluacion',
    calificacion_actual FLOAT NOT NULL DEFAULT 0,
    fecha_alta DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    fecha_ultima_evaluacion DATETIME2(0) NULL,
    fecha_proxima_evaluacion DATETIME2(0) NULL,
    observaciones NVARCHAR(MAX) NOT NULL DEFAULT '',
    activo INT NOT NULL DEFAULT 1,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

IF OBJECT_ID('dbo.evaluaciones_proveedor','U') IS NULL
BEGIN
  CREATE TABLE dbo.evaluaciones_proveedor (
    id NVARCHAR(64) PRIMARY KEY,
    proveedor_id NVARCHAR(64) NOT NULL,
    periodo NVARCHAR(80) NOT NULL,
    fecha DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    evaluador_id NVARCHAR(64) NULL,
    calificacion_global FLOAT NOT NULL DEFAULT 0,
    resultado NVARCHAR(80) NOT NULL DEFAULT 'en_evaluacion',
    observaciones NVARCHAR(MAX) NOT NULL DEFAULT '',
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT '',
    CONSTRAINT FK_evaluaciones_proveedor_proveedor FOREIGN KEY (proveedor_id) REFERENCES dbo.proveedores(id)
  );
END;

IF OBJECT_ID('dbo.criterios_evaluacion_prov','U') IS NULL
BEGIN
  CREATE TABLE dbo.criterios_evaluacion_prov (
    id NVARCHAR(64) PRIMARY KEY,
    evaluacion_id NVARCHAR(64) NOT NULL,
    criterio NVARCHAR(255) NOT NULL,
    peso FLOAT NOT NULL DEFAULT 0,
    calificacion FLOAT NOT NULL DEFAULT 0,
    ponderado FLOAT NOT NULL DEFAULT 0,
    evidencia NVARCHAR(MAX) NOT NULL DEFAULT '',
    CONSTRAINT FK_criterios_eval_prov_eval FOREIGN KEY (evaluacion_id) REFERENCES dbo.evaluaciones_proveedor(id)
  );
END;

IF OBJECT_ID('dbo.incidencias_proveedor','U') IS NULL
BEGIN
  CREATE TABLE dbo.incidencias_proveedor (
    id NVARCHAR(64) PRIMARY KEY,
    proveedor_id NVARCHAR(64) NOT NULL,
    fecha DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    tipo NVARCHAR(80) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL DEFAULT '',
    impacto NVARCHAR(40) NOT NULL DEFAULT 'bajo',
    accion_tomada NVARCHAR(MAX) NOT NULL DEFAULT '',
    registrado_por NVARCHAR(120) NOT NULL DEFAULT '',
    CONSTRAINT FK_incidencias_proveedor_proveedor FOREIGN KEY (proveedor_id) REFERENCES dbo.proveedores(id)
  );
END;

/* 2.8 Revisión por la Dirección */
IF OBJECT_ID('dbo.revisiones_direccion','U') IS NULL
BEGIN
  CREATE TABLE dbo.revisiones_direccion (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    titulo NVARCHAR(255) NOT NULL,
    fecha DATETIME2(0) NOT NULL,
    hora_inicio NVARCHAR(30) NOT NULL DEFAULT '',
    hora_fin NVARCHAR(30) NOT NULL DEFAULT '',
    estado NVARCHAR(60) NOT NULL DEFAULT 'programada',
    convocado_por NVARCHAR(120) NOT NULL DEFAULT '',
    lugar NVARCHAR(255) NOT NULL DEFAULT '',
    resumen_ejecutivo NVARCHAR(MAX) NOT NULL DEFAULT '',
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

IF OBJECT_ID('dbo.entradas_revision','U') IS NULL
BEGIN
  CREATE TABLE dbo.entradas_revision (
    id NVARCHAR(64) PRIMARY KEY,
    revision_id NVARCHAR(64) NOT NULL,
    tema NVARCHAR(255) NOT NULL,
    resumen NVARCHAR(MAX) NOT NULL DEFAULT '',
    datos NVARCHAR(MAX) NOT NULL DEFAULT '',
    CONSTRAINT FK_entradas_revision_revision FOREIGN KEY (revision_id) REFERENCES dbo.revisiones_direccion(id)
  );
END;

IF OBJECT_ID('dbo.salidas_revision','U') IS NULL
BEGIN
  CREATE TABLE dbo.salidas_revision (
    id NVARCHAR(64) PRIMARY KEY,
    revision_id NVARCHAR(64) NOT NULL,
    tipo NVARCHAR(80) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL,
    responsable_id NVARCHAR(64) NULL,
    fecha_compromiso DATETIME2(0) NULL,
    estado NVARCHAR(60) NOT NULL DEFAULT 'pendiente',
    CONSTRAINT FK_salidas_revision_revision FOREIGN KEY (revision_id) REFERENCES dbo.revisiones_direccion(id)
  );
END;

IF OBJECT_ID('dbo.asistentes_revision','U') IS NULL
BEGIN
  CREATE TABLE dbo.asistentes_revision (
    id NVARCHAR(64) PRIMARY KEY,
    revision_id NVARCHAR(64) NOT NULL,
    nombre NVARCHAR(255) NOT NULL,
    cargo NVARCHAR(255) NOT NULL DEFAULT '',
    presente INT NOT NULL DEFAULT 1,
    CONSTRAINT FK_asistentes_revision_revision FOREIGN KEY (revision_id) REFERENCES dbo.revisiones_direccion(id)
  );
END;

/* 2.9 Competencias */
IF OBJECT_ID('dbo.competencias','U') IS NULL
BEGIN
  CREATE TABLE dbo.competencias (
    id NVARCHAR(64) PRIMARY KEY,
    nombre NVARCHAR(255) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL DEFAULT '',
    categoria NVARCHAR(120) NOT NULL DEFAULT '',
    nivel_requerido NVARCHAR(60) NOT NULL DEFAULT 'basico',
    vigencia_meses INT NOT NULL DEFAULT 12
  );
END;

IF OBJECT_ID('dbo.puestos_competencia','U') IS NULL
BEGIN
  CREATE TABLE dbo.puestos_competencia (
    id NVARCHAR(64) PRIMARY KEY,
    puesto NVARCHAR(255) NOT NULL,
    proceso_id NVARCHAR(64) NULL
  );
END;

IF OBJECT_ID('dbo.puesto_competencia_rel','U') IS NULL
BEGIN
  CREATE TABLE dbo.puesto_competencia_rel (
    id NVARCHAR(64) PRIMARY KEY,
    puesto_comp_id NVARCHAR(64) NOT NULL,
    competencia_id NVARCHAR(64) NOT NULL,
    nivel_requerido NVARCHAR(60) NOT NULL DEFAULT 'basico',
    critica INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_puesto_comp_rel_puesto FOREIGN KEY (puesto_comp_id) REFERENCES dbo.puestos_competencia(id),
    CONSTRAINT FK_puesto_comp_rel_comp FOREIGN KEY (competencia_id) REFERENCES dbo.competencias(id)
  );
END;

IF OBJECT_ID('dbo.personal_competencia','U') IS NULL
BEGIN
  CREATE TABLE dbo.personal_competencia (
    id NVARCHAR(64) PRIMARY KEY,
    personal_id NVARCHAR(64) NOT NULL,
    personal_nombre NVARCHAR(255) NOT NULL,
    puesto NVARCHAR(255) NOT NULL DEFAULT '',
    departamento NVARCHAR(255) NOT NULL DEFAULT '',
    brechas INT NOT NULL DEFAULT 0,
    cumplimiento FLOAT NOT NULL DEFAULT 0,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

IF OBJECT_ID('dbo.evaluaciones_competencia','U') IS NULL
BEGIN
  CREATE TABLE dbo.evaluaciones_competencia (
    id NVARCHAR(64) PRIMARY KEY,
    personal_comp_id NVARCHAR(64) NOT NULL,
    competencia_id NVARCHAR(64) NOT NULL,
    nivel_requerido NVARCHAR(60) NOT NULL DEFAULT 'basico',
    nivel_actual NVARCHAR(60) NULL,
    estado NVARCHAR(60) NOT NULL DEFAULT 'no_evaluada',
    fecha_evaluacion DATETIME2(0) NULL,
    fecha_vencimiento DATETIME2(0) NULL,
    evidencia NVARCHAR(MAX) NOT NULL DEFAULT '',
    evaluado_por NVARCHAR(120) NOT NULL DEFAULT '',
    CONSTRAINT FK_eval_comp_personal FOREIGN KEY (personal_comp_id) REFERENCES dbo.personal_competencia(id),
    CONSTRAINT FK_eval_comp_comp FOREIGN KEY (competencia_id) REFERENCES dbo.competencias(id)
  );
END;

IF OBJECT_ID('dbo.capacitaciones','U') IS NULL
BEGIN
  CREATE TABLE dbo.capacitaciones (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    titulo NVARCHAR(255) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL DEFAULT '',
    tipo NVARCHAR(80) NOT NULL DEFAULT 'interna',
    instructor NVARCHAR(255) NOT NULL DEFAULT '',
    fecha DATETIME2(0) NOT NULL,
    duracion_horas FLOAT NOT NULL DEFAULT 0,
    lugar NVARCHAR(255) NOT NULL DEFAULT '',
    estado NVARCHAR(60) NOT NULL DEFAULT 'programada',
    evaluacion_eficacia NVARCHAR(MAX) NOT NULL DEFAULT '',
    eficaz INT NULL,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

IF OBJECT_ID('dbo.participantes_capacitacion','U') IS NULL
BEGIN
  CREATE TABLE dbo.participantes_capacitacion (
    id NVARCHAR(64) PRIMARY KEY,
    capacitacion_id NVARCHAR(64) NOT NULL,
    personal_id NVARCHAR(64) NOT NULL,
    nombre NVARCHAR(255) NOT NULL,
    asistio INT NOT NULL DEFAULT 0,
    calificacion FLOAT NULL,
    observaciones NVARCHAR(MAX) NOT NULL DEFAULT '',
    CONSTRAINT FK_participantes_capacitacion FOREIGN KEY (capacitacion_id) REFERENCES dbo.capacitaciones(id)
  );
END;

IF OBJECT_ID('dbo.planes_capacitacion','U') IS NULL
BEGIN
  CREATE TABLE dbo.planes_capacitacion (
    id NVARCHAR(64) PRIMARY KEY,
    anio INT NOT NULL,
    titulo NVARCHAR(255) NOT NULL,
    estado NVARCHAR(60) NOT NULL DEFAULT 'borrador',
    avance FLOAT NOT NULL DEFAULT 0,
    aprobado_por NVARCHAR(120) NOT NULL DEFAULT '',
    fecha_aprobacion DATETIME2(0) NULL,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

/* 2.10 Satisfacción */
IF OBJECT_ID('dbo.encuestas','U') IS NULL
BEGIN
  CREATE TABLE dbo.encuestas (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    titulo NVARCHAR(255) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL DEFAULT '',
    estado NVARCHAR(60) NOT NULL DEFAULT 'borrador',
    fecha_inicio DATETIME2(0) NULL,
    fecha_fin DATETIME2(0) NULL,
    total_respuestas INT NOT NULL DEFAULT 0,
    promedio_general FLOAT NOT NULL DEFAULT 0,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

IF OBJECT_ID('dbo.preguntas_encuesta','U') IS NULL
BEGIN
  CREATE TABLE dbo.preguntas_encuesta (
    id NVARCHAR(64) PRIMARY KEY,
    encuesta_id NVARCHAR(64) NOT NULL,
    texto NVARCHAR(MAX) NOT NULL,
    tipo NVARCHAR(60) NOT NULL DEFAULT 'escala',
    opciones NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    escala_min INT NOT NULL DEFAULT 1,
    escala_max INT NOT NULL DEFAULT 10,
    orden INT NOT NULL DEFAULT 0,
    obligatoria INT NOT NULL DEFAULT 1,
    CONSTRAINT FK_preguntas_encuesta FOREIGN KEY (encuesta_id) REFERENCES dbo.encuestas(id)
  );
END;

IF OBJECT_ID('dbo.respuestas_encuesta','U') IS NULL
BEGIN
  CREATE TABLE dbo.respuestas_encuesta (
    id NVARCHAR(64) PRIMARY KEY,
    encuesta_id NVARCHAR(64) NOT NULL,
    cliente_id NVARCHAR(64) NULL,
    cliente_nombre NVARCHAR(255) NOT NULL DEFAULT '',
    fecha DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    comentario_general NVARCHAR(MAX) NOT NULL DEFAULT '',
    satisfaccion_global FLOAT NOT NULL DEFAULT 0,
    CONSTRAINT FK_respuestas_encuesta FOREIGN KEY (encuesta_id) REFERENCES dbo.encuestas(id)
  );
END;

IF OBJECT_ID('dbo.respuestas_pregunta','U') IS NULL
BEGIN
  CREATE TABLE dbo.respuestas_pregunta (
    id NVARCHAR(64) PRIMARY KEY,
    respuesta_encuesta_id NVARCHAR(64) NOT NULL,
    pregunta_id NVARCHAR(64) NOT NULL,
    valor NVARCHAR(MAX) NOT NULL,
    CONSTRAINT FK_respuesta_pregunta_respuesta FOREIGN KEY (respuesta_encuesta_id) REFERENCES dbo.respuestas_encuesta(id),
    CONSTRAINT FK_respuesta_pregunta_pregunta FOREIGN KEY (pregunta_id) REFERENCES dbo.preguntas_encuesta(id)
  );
END;

IF OBJECT_ID('dbo.quejas_cliente','U') IS NULL
BEGIN
  CREATE TABLE dbo.quejas_cliente (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    tipo NVARCHAR(60) NOT NULL DEFAULT 'queja',
    cliente NVARCHAR(255) NOT NULL,
    fecha DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    descripcion NVARCHAR(MAX) NOT NULL DEFAULT '',
    producto NVARCHAR(255) NOT NULL DEFAULT '',
    estado NVARCHAR(80) NOT NULL DEFAULT 'recibida',
    responsable_id NVARCHAR(64) NULL,
    analisis NVARCHAR(MAX) NOT NULL DEFAULT '',
    accion_tomada NVARCHAR(MAX) NOT NULL DEFAULT '',
    fecha_cierre DATETIME2(0) NULL,
    nc_id NVARCHAR(64) NULL,
    satisfaccion_final FLOAT NULL,
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

/* 2.11 Control de Cambios */
IF OBJECT_ID('dbo.solicitudes_cambio','U') IS NULL
BEGIN
  CREATE TABLE dbo.solicitudes_cambio (
    id NVARCHAR(64) PRIMARY KEY,
    codigo NVARCHAR(80) NOT NULL UNIQUE,
    titulo NVARCHAR(255) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL DEFAULT '',
    tipo NVARCHAR(80) NOT NULL,
    estado NVARCHAR(60) NOT NULL DEFAULT 'solicitado',
    solicitante_id NVARCHAR(64) NULL,
    solicitante_nombre NVARCHAR(255) NOT NULL DEFAULT '',
    fecha DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    impacto NVARCHAR(40) NOT NULL DEFAULT 'bajo',
    analisis_impacto NVARCHAR(MAX) NOT NULL DEFAULT '',
    procesos_afectados NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    documentos_afectados NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    riesgos_identificados NVARCHAR(MAX) NOT NULL DEFAULT '',
    recurso_requerido NVARCHAR(MAX) NOT NULL DEFAULT '',
    aprobado_por NVARCHAR(120) NOT NULL DEFAULT '',
    fecha_aprobacion DATETIME2(0) NULL,
    justificacion_decision NVARCHAR(MAX) NOT NULL DEFAULT '',
    plan_implementacion NVARCHAR(MAX) NOT NULL DEFAULT '',
    fecha_inicio_impl DATETIME2(0) NULL,
    fecha_fin_impl DATETIME2(0) NULL,
    responsable_impl_id NVARCHAR(64) NULL,
    verificacion NVARCHAR(MAX) NOT NULL DEFAULT '',
    verificado_por NVARCHAR(120) NOT NULL DEFAULT '',
    fecha_verificacion DATETIME2(0) NULL,
    resultado_verificacion NVARCHAR(MAX) NULL,
    evidencia NVARCHAR(MAX) NOT NULL DEFAULT '',
    created_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    created_by NVARCHAR(120) NOT NULL DEFAULT '',
    updated_by NVARCHAR(120) NOT NULL DEFAULT ''
  );
END;

IF OBJECT_ID('dbo.actividades_cambio','U') IS NULL
BEGIN
  CREATE TABLE dbo.actividades_cambio (
    id NVARCHAR(64) PRIMARY KEY,
    solicitud_id NVARCHAR(64) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL,
    responsable_id NVARCHAR(64) NULL,
    fecha_programada DATETIME2(0) NULL,
    fecha_real DATETIME2(0) NULL,
    estado NVARCHAR(60) NOT NULL DEFAULT 'pendiente',
    orden INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_actividades_cambio FOREIGN KEY (solicitud_id) REFERENCES dbo.solicitudes_cambio(id)
  );
END;

IF OBJECT_ID('dbo.historial_cambio_estado','U') IS NULL
BEGIN
  CREATE TABLE dbo.historial_cambio_estado (
    id NVARCHAR(64) PRIMARY KEY,
    solicitud_id NVARCHAR(64) NOT NULL,
    estado_anterior NVARCHAR(60) NOT NULL,
    estado_nuevo NVARCHAR(60) NOT NULL,
    fecha DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
    responsable_id NVARCHAR(64) NULL,
    comentario NVARCHAR(MAX) NOT NULL DEFAULT '',
    CONSTRAINT FK_historial_cambio FOREIGN KEY (solicitud_id) REFERENCES dbo.solicitudes_cambio(id)
  );
END;

PRINT 'Migration 002_modules_2.sql aplicada correctamente.';
