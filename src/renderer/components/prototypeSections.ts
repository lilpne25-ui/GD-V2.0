// Modulos que hoy son prototipos de pantalla con datos de ejemplo.
//
// Se marcan como tales en el Sidebar y con un aviso dentro del modulo para que
// ningun dato de ejemplo (p. ej. "Cliente ABC") pueda confundirse con
// informacion real. No cambia su funcionamiento.

export const PROTOTYPE_SECTIONS: readonly string[] = [
  'auditorias',
  'no-conformidades',
  'capa',
  'riesgos',
  'indicadores',
  'proveedores',
  'revision-direccion',
  'competencias',
  'satisfaccion',
  'control-cambios',
];

export function isPrototypeSection(section: string): boolean {
  return PROTOTYPE_SECTIONS.includes(section);
}
