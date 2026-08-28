import React from 'react';
import { useAuth } from '../context/AuthContext';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { authenticated, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  if (authenticated) {
    // Si ya está autenticado, no permitimos ver pantallas públicas como Login
    return null;
  }

  return <>{children}</>;
};

export default PublicOnlyRoute;
