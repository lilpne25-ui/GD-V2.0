import React, { useState } from 'react';
import type { RolUsuario } from '../../shared/types/common';

type SessionUser = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: string;
  activo: number;
};

type LoginProps = {
  onLoginSuccess: (user: SessionUser) => void;
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Captura usuario/email y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const user = await (window as any).repo.call('UsuarioRepo', 'authenticate', email.trim(), password);
      if (!user) {
        setError('Credenciales inválidas o usuario inactivo.');
        return;
      }

      localStorage.setItem('sgc.currentRole', user.rol);
      localStorage.setItem('sgc.currentUser', JSON.stringify({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        departamento: user.departamento,
        activo: user.activo === 1,
      }));
      localStorage.setItem('sgc.session', JSON.stringify({
        usuario: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          departamento: user.departamento,
        },
        startedAt: new Date().toISOString(),
      }));

      window.dispatchEvent(new Event('storage'));
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError('No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Iniciar sesión</h1>
        <p className="auth-subtitle">Sistema de Gestión de Calidad</p>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="sgc-login-email">Email o usuario</label>
            <input id="sgc-login-email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" placeholder="correo@empresa.com o nombre" />
          </div>

          <div className="form-group">
            <label htmlFor="sgc-login-password">Contraseña</label>
            <input id="sgc-login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
