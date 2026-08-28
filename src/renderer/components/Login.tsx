import React, { useState } from 'react';
<<<<<<< HEAD
import { useAuth, SessionUser } from '../context/AuthContext';
=======
import type { RolUsuario } from '../../shared/types/common';

type SessionUser = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: string;
  activo: number;
};
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6

type LoginProps = {
  onLoginSuccess: (user: SessionUser) => void;
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
<<<<<<< HEAD
  const { login, user } = useAuth();
=======
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
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
<<<<<<< HEAD
      const success = await login(email.trim(), password);
      if (!success) {
=======
      const user = await (window as any).repo.call('UsuarioRepo', 'authenticate', email.trim(), password);
      if (!user) {
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
        setError('Credenciales inválidas o usuario inactivo.');
        return;
      }

<<<<<<< HEAD
      if (user) {
        onLoginSuccess(user);
      } else {
        // Fallback en caso de que el estado asíncrono tarde un tick en actualizarse
        onLoginSuccess({
          id: 'temp-id',
          nombre: email.trim(),
          email: email.trim(),
          rol: '',
          departamento: ''
        });
      }
=======
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
>>>>>>> 52478ff5213d364e7cba58ad09ef449a955b27a6
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
