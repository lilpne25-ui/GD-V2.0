import React from 'react';
import innovaxLogo from '../assets/branding/innovax/innovax-logo.jpg';
import { STATUS_META } from './demoStory';
import type { DemoStatus } from './demoStory';

/**
 * Logo oficial de Innovax.
 *
 * El JPG no tiene transparencia, asi que siempre va sobre una tarjeta blanca con
 * margen de seguridad. `object-fit: contain` + alto fijo preservan la proporcion.
 * Sin filtros ni recoloreado. Si falla la carga, se oculta sin romper el layout.
 */
export const InnovaxLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return <span className="gd-logo-fallback">INNOVAX</span>;
  }
  return (
    <span className={`gd-logo-card gd-logo-card--${size}`}>
      <img
        src={innovaxLogo}
        alt="Innovax Grupo Industrial"
        className="gd-logo-img"
        draggable={false}
        onError={() => setFailed(true)}
      />
    </span>
  );
};

/** Co-branding sobrio: Innovax es el contexto, GD-V2 la plataforma. */
export const DemoBrand: React.FC<{ size?: 'sm' | 'md' | 'lg'; showTagline?: boolean }> = ({
  size = 'md',
  showTagline = true,
}) => (
  <div className={`gd-brand gd-brand--${size}`}>
    <InnovaxLogo size={size} />
    <span className="gd-brand-divider" aria-hidden="true" />
    <div className="gd-brand-product">
      <strong>GD-V2</strong>
      <span>Quality Operating System</span>
      {showTagline && <em>Demo de transformación del Sistema de Gestión de Innovax</em>}
    </div>
  </div>
);

export const StatusBadge: React.FC<{ status: DemoStatus }> = ({ status }) => (
  <span className={`gd-status gd-status--${status}`} title={STATUS_META[status].description}>
    <span className="gd-status-dot" aria-hidden="true" />
    {STATUS_META[status].label}
  </span>
);

export type SourceKind = 'system' | 'example' | 'innovax';

const SOURCE_LABEL: Record<SourceKind, string> = {
  system: 'Datos del sistema',
  example: 'Ejemplo de demo',
  innovax: 'Dato de Innovax',
};

/** Etiqueta obligatoria del origen de cada dato mostrado. */
export const SourceTag: React.FC<{ kind: SourceKind; detail?: string }> = ({ kind, detail }) => (
  <span className={`gd-source gd-source--${kind}`}>
    {SOURCE_LABEL[kind]}
    {detail ? <small>{detail}</small> : null}
  </span>
);

/** Marca de etapa para capacidades que aun no estan integradas. */
export const StageTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="gd-stage-tag">{children}</span>
);
