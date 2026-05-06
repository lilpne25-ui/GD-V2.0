import React from 'react';

/* ------------------------------------------------------------------ */
/*  Catálogo unificado de iconos SVG path del SGC                      */
/* ------------------------------------------------------------------ */

export const SGC_ICONS = {
  // — Navigation / general
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
  document: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 4h7l5 5v11H6V4zm2 7h8v1.5H8V11zm0 3h8v1.5H8V14zm0 3h5v1.5H8V17z',
  registry: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 4h8M8 11h8M8 15h5',
  users: 'M17 21v-2a4 4 0 0 0-3-3.87M7 21v-2a4 4 0 0 1 3-3.87M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 10v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87',

  // — Quality & compliance
  audit: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6m-5 5l2 2 4-4',
  warning: 'M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 0 0 1.74-2.97L13.74 4.03a2 2 0 0 0-3.48 0L3.33 16.03A2 2 0 0 0 5.07 19z',
  capa: 'M4 4h16v16H4V4zm4 8h8M8 12l3 3 5-5',
  risk: 'M13 10V3L4 14h7v7l9-11h-7z',
  chart: 'M3 3v18h18M7 16l4-4 4 4 5-5',
  supplier: 'M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  review: 'M12 14l9-5-9-5-9 5 9 5zm0 0v6m-4-3l4 3 4-3',
  competence: 'M12 2a3 3 0 0 0-3 3v1H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-4V5a3 3 0 0 0-3-3zm0 2a1 1 0 0 1 1 1v1h-2V5a1 1 0 0 1 1-1zm-4 8h8v1H8v-1zm0 3h5v1H8v-1z',
  satisfaction: 'M14 9V5a3 3 0 0 0-6 0v4H5v11h14V9h-5zM8 9V5a4 4 0 1 1 8 0v4M12 14l-2 2 2 2 2-2-2-2z',
  changes: 'M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15',

  // — Actions
  bell: 'M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.17V11a6 6 0 1 0-12 0v3.17c0 .53-.21 1.04-.59 1.43L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  file: 'M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zm0 0v6h6M9 13h6M9 17h4',
  info: 'M12 8h.01M11 12h1v4h1',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  workflow: 'M8 7h8M8 12h8M8 17h5M6 3h9l3 3v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  trash: 'M3 6h18M8 6V4h8v2m-7 0v12m4-12v12m5-12-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 6h12z',
  upload: 'M12 16V6m0 0-4 4m4-4 4 4M5 18v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1',
  plus: 'M12 5v14M5 12h14',
  star: 'M12 3.5l2.77 5.61 6.19.9-4.48 4.36 1.06 6.16L12 17.77 6.46 20.53l1.06-6.16L3.04 10l6.19-.9L12 3.5z',
  starFilled: 'M12 3.5l2.77 5.61 6.19.9-4.48 4.36 1.06 6.16L12 17.77 6.46 20.53l1.06-6.16L3.04 10l6.19-.9L12 3.5z',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  open: 'M14 3h7v7M10 14 21 3M19 14v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4',
  download: 'M12 3v10m0 0 4-4m-4 4-4-4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3',
  send: 'M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z',
  approve: 'M20 6 9 17l-5-5',
  correction: 'M12 9v4m0 4h.01M5.07 19h13.86A2 2 0 0 0 20.67 16L13.74 4a2 2 0 0 0-3.48 0L3.33 16A2 2 0 0 0 5.07 19z',
  status: 'M12 20V10m0 0-4 4m4-4 4 4M5 4h14',
  move: 'M8 5H5v3M19 8V5h-3M16 19h3v-3M5 16v3h3M8 8l8 8M16 8l-8 8',
  copy: 'M9 9h10v12H9zM5 3h10v12',
  shield: 'M12 3l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V6l7-3z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  role: 'M12 2l3 7h7l-5.5 4.3 2.1 7L12 16.8 5.4 20.6l2.1-7L2 9h7l3-7z',
  restore: 'M3 12a9 9 0 1 0 3-6.71M3 4v5h5',
  email: 'M4 6h16v12H4zM4 7l8 6 8-6',
  queue: 'M4 6h16M4 12h16M4 18h10',
  arrowLeft: 'M15 18l-6-6 6-6',
  arrowRight: 'M9 18l6-6-6-6',
  arrowUp: 'M12 19V5m0 0-5 5m5-5 5 5',
  delete: 'M3 6h18M8 6V4h8v2m-7 0v12m4-12v12m5-12-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 6h12z',
  clock: 'M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  checkCircle: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  inbox: 'M3 9l4-4h10l4 4v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zm0 0h5l2 3h4l2-3h5',
  clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6',
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
} as const;

export type SgcIconName = keyof typeof SGC_ICONS;

/* ------------------------------------------------------------------ */
/*  Tamaños estandarizados                                             */
/* ------------------------------------------------------------------ */

const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
} as const;

export type SgcIconSize = keyof typeof SIZE_MAP | number;

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */

type SgcIconProps = {
  name: SgcIconName;
  size?: SgcIconSize;
  className?: string;
  filled?: boolean;
  color?: string;
};

const SgcIcon: React.FC<SgcIconProps> = ({ name, size = 'md', className, filled = false, color }) => {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  return (
    <svg
      className={className}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={color || 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={SGC_ICONS[name]} />
    </svg>
  );
};

export default SgcIcon;
