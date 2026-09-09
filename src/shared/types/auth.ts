// Contrato de tipos para autenticación y sesiones
// ISO 9001:2015 - Control de Accesos y Seguridad

export interface SessionRecord {
  sessionId: string;
  userId: string;
  role: string;
  permissions: string[];
  webContentsId: number;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  securityVersion: string;
}

export interface AuthCredentials {
  login: string;
  // Regla de Seguridad: No incluir contraseñas en texto plano ni hashes en el contrato compartido.
  // La validación de la credencial confidencial se realiza a través de un canal seguro y aislado.
  authMethod: 'local_db' | 'active_directory';
  totpToken?: string;
}

export interface AuthResponse {
  success: boolean;
  session?: SessionRecord;
  error?: string;
  errorCode?: 'CREDENTIALS_INVALID' | 'USER_DISABLED' | 'SESSION_EXPIRED' | 'DB_UNAVAILABLE' | 'GENERIC_ERROR';
}

export interface AuthStatus {
  isAuthenticated: boolean;
  session: SessionRecord | null;
  lastCheckedAt: string;
  authError?: string;
}
