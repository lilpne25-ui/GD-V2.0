# Branding Innovax — assets de la Demo guiada

Estos archivos solo se usan dentro de la **Demo guiada Innovax**. No cambian el
tema ni la identidad de GD-V2.

## Archivos presentes

| Archivo | Origen | Estado |
|---|---|---|
| `innovax-logo.jpg` | Copia byte a byte de `Downloads/GV-2.0/SISTEMA-DE-COSTOS/innovax-logo.jpg` (2550 × 996 px). SHA-256 `03fc3a01f9a2f3293f712814161e0dc36bba3167ed4b248fa7180c8f9b5dd35f` | Oficial, sin modificar |
| `innovax-tokens.css` | Valores HEX de `INNOVAX_guia_cromatica_estilo_pantone.pdf` (Guía de color 2026) | Derivado del logo PNG, ver nota |

## Reglas de uso del logo

- **No se redibuja, no se recolorea, no se le aplican filtros** y no se cambian
  sus proporciones (`object-fit: contain`, alto fijo, ancho automático).
- El JPG **no tiene transparencia**: su fondo es blanco. Por eso siempre se
  coloca sobre una tarjeta blanca o marfil con margen de seguridad. Es la misma
  composición que la guía cromática muestra como "Muestra principal".
- Nunca se coloca directamente sobre el fondo chocolate u otro fondo oscuro.

## Nota sobre la paleta

La guía cromática declara textualmente que los valores se extrajeron del PNG
del logotipo y que un archivo vectorial original permitiría una especificación
más precisa. Se usan tal cual, pero **no deben presentarse como el manual
oficial de marca de Innovax**.

## Assets pendientes (no bloquean el build)

Si Innovax los entrega, colocarlos aquí y actualizar el import en
`src/renderer/demo/DemoBrand.tsx`:

- `innovax-logo.svg` — versión vectorial (preferente sobre el JPG).
- `innovax-logo-dark.svg` — versión para fondo oscuro.
- `innovax-isotipo.svg` — símbolo circular aislado.
- Manual de marca con paleta oficial, tipografía y área de protección.
