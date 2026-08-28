import React from 'react';
import { useAuth } from '../context/AuthContext';
import Login from './Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#64748b',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px auto'
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <span>Verificando credenciales...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    // Si no está autenticado, mostramos el login de forma predeterminada
    // Esto asegura que la ruta protegida actúe como barrera infranqueable
    return <Login onLoginSuccess={() => {}} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
