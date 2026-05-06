import React from 'react';
import SgcIcon from './SgcIcon';
import type { SgcIconName } from './SgcIcon';
import './Sidebar.css';

type SidebarProps = {
  active: string;
  onSelect: (section: string) => void;
};

type SectionGroupId = 'workspace' | 'quality' | 'management' | 'admin';

type SectionDefinition = {
  id: string;
  label: string;
  icon: SgcIconName;
  group: SectionGroupId;
};

const sectionGroups: Array<{ id: SectionGroupId; label: string }> = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'quality', label: 'Calidad' },
  { id: 'management', label: 'Gestión' },
  { id: 'admin', label: 'Administración' },
];

const sections: SectionDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'workspace', icon: 'home' },
  { id: 'documentacion', label: 'Documentación', group: 'workspace', icon: 'document' },
  { id: 'registros', label: 'Registros', group: 'workspace', icon: 'registry' },
  { id: 'auditorias', label: 'Auditorías', group: 'quality', icon: 'audit' },
  { id: 'no-conformidades', label: 'No conformidades', group: 'quality', icon: 'warning' },
  { id: 'capa', label: 'CAPA', group: 'quality', icon: 'capa' },
  { id: 'control-cambios', label: 'Control cambios', group: 'quality', icon: 'changes' },
  { id: 'riesgos', label: 'Riesgos', group: 'management', icon: 'risk' },
  { id: 'indicadores', label: 'Indicadores', group: 'management', icon: 'chart' },
  { id: 'proveedores', label: 'Proveedores', group: 'management', icon: 'supplier' },
  { id: 'revision-direccion', label: 'Revisión dirección', group: 'management', icon: 'review' },
  { id: 'competencias', label: 'Competencias', group: 'management', icon: 'competence' },
  { id: 'satisfaccion', label: 'Satisfacción', group: 'management', icon: 'satisfaction' },
  { id: 'usuarios', label: 'Usuarios', group: 'admin', icon: 'users' },
];

const Sidebar: React.FC<SidebarProps> = ({ active, onSelect }) => (
  <aside className="sidebar" aria-label="Navegación principal">
    <div className="sidebar-brand">
      <span className="sidebar-brand-mark">SGC</span>
      <div className="sidebar-brand-copy">
        <span className="sidebar-logo">Sistema de Calidad</span>
        <span className="sidebar-subtitle">Operación ISO 9001</span>
      </div>
    </div>

    <nav className="sidebar-nav">
      {sectionGroups.map(group => (
        <div key={group.id} className="sidebar-group">
          <span className="sidebar-group-label">{group.label}</span>
          <div className="sidebar-group-items">
            {sections.filter(section => section.group === group.id).map(section => (
              <button
                key={section.id}
                type="button"
                className={`sidebar-item${active === section.id ? ' sidebar-item--active' : ''}`}
                onClick={() => onSelect(section.id)}
                aria-label={section.label}
                aria-current={active === section.id ? 'page' : undefined}
              >
                <span className="sidebar-item-indicator" aria-hidden="true" />
                <SgcIcon name={section.icon} size="lg" className="sidebar-icon" />
                <span className="sidebar-label">{section.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>

    <div className="sidebar-footer">
      <span className="sidebar-footer-status">
        <span className="sidebar-status-dot" aria-hidden="true" />
        Base operativa
      </span>
      <span className="sidebar-version">v2.0</span>
    </div>
  </aside>
);

export default Sidebar;
