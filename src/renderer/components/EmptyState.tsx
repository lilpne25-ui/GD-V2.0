import React from 'react';
import SgcIcon from './SgcIcon';
import type { SgcIconName } from './SgcIcon';

type EmptyStateProps = {
  icon: SgcIconName;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
};

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, compact }) => (
  <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
    <span className="empty-state-circle">
      <SgcIcon name={icon} size={compact ? 22 : 28} />
    </span>
    <p className="empty-state-title">{title}</p>
    {description && <p className="empty-state-desc">{description}</p>}
    {action && (
      <button className="btn btn-outline btn-sm" onClick={action.onClick} type="button">
        {action.label}
      </button>
    )}
  </div>
);

export default EmptyState;
