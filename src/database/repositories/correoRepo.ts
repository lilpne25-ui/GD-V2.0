/**
 * CorreoRepo – Configuración y envío de correo electrónico POR USUARIO
 *
 * Cada usuario tiene su propia configuración SMTP.
 * Usa nodemailer si está disponible; si no, registra el intento y genera
 * notificación interna como fallback.
 */
import { dbAll, dbGet, dbRun, dbHasColumn, dbTableExists } from '../db';

function normalizeRecipients(raw: unknown): string[] {
  const input = String(raw ?? '').trim();
  if (!input) return [];
  return input
    .split(/[;,]+/)
    .map(v => v.trim())
    .filter(Boolean)
    .filter(v => /.+@.+\..+/.test(v));
}

function isLikelyEmail(value: unknown): boolean {
  const v = String(value || '').trim();
  return /.+@.+\..+/.test(v);
}

function toFlag01(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const n = Number(value);
  if (Number.isFinite(n)) return n === 1 ? 1 : 0;
  const raw = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'si', 'sí', 'on'].includes(raw)) return 1;
  if (['0', 'false', 'no', 'off'].includes(raw)) return 0;
  return fallback ? 1 : 0;
}

export interface EmailConfigRow {
  user_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: number;
  imap_host: string;
  imap_port: number;
  imap_secure: number;
  pop_host: string;
  pop_port: number;
  pop_secure: number;
  can_send_email: number;
  can_receive_email: number;
  updated_at: string;
}

type SmtpVerifyResult = {
  ok: boolean;
  mode: string;
  error?: string;
};

function parseErrorMessage(error: any): string {
  return String(error?.message || error?.code || error || 'Error SMTP desconocido.');
}

async function verifySmtpWithFallback(cfg: EmailConfigRow): Promise<SmtpVerifyResult> {
  const nodemailer = require('nodemailer');
  const host = String(cfg.smtp_host || '').trim();
  const port = Number(cfg.smtp_port || 0) || 587;
  const secureFromCfg = Number(cfg.smtp_secure || 0) === 1;

  const attempts = [
    {
      mode: `config secure=${secureFromCfg ? 1 : 0} port=${port}`,
      opts: {
        host,
        port,
        secure: secureFromCfg,
        requireTLS: !secureFromCfg,
      },
    },
    {
      mode: `fallback secure=${secureFromCfg ? 0 : 1} port=${port}`,
      opts: {
        host,
        port,
        secure: !secureFromCfg,
        requireTLS: secureFromCfg,
      },
    },
    {
      mode: 'fallback SMTPS 465',
      opts: {
        host,
        port: 465,
        secure: true,
        requireTLS: false,
      },
    },
    {
      mode: 'fallback STARTTLS 587',
      opts: {
        host,
        port: 587,
        secure: false,
        requireTLS: true,
      },
    },
  ];

  const seen = new Set<string>();
  const uniqueAttempts = attempts.filter((a) => {
    const key = `${a.opts.host}|${a.opts.port}|${a.opts.secure}|${a.opts.requireTLS}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let lastError = 'Error SMTP desconocido.';

  for (const attempt of uniqueAttempts) {
    try {
      const transporter = nodemailer.createTransport({
        ...attempt.opts,
        auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 25000,
        tls: {
          servername: host,
        },
      });
      await transporter.verify();
      return { ok: true, mode: attempt.mode };
    } catch (err: any) {
      lastError = parseErrorMessage(err);
    }
  }

  return { ok: false, mode: 'none', error: lastError };
}

const ROLES_CAN_SEND = [
  '1 director',
  '1.1 recursos humanos',
  '8 coordinador del sgc',
  '4.3 técnico ti',
];

export const CorreoRepo = {
  /**
   * Asegura que exista una fila de configuración de correo para todos los usuarios.
   * No copia una misma cuenta SMTP a todos; sólo crea la estructura base por usuario.
   */
  async ensureConfigForAllUsers(): Promise<void> {
    const ensure = async (col: string, def: string) => {
      if (!(await dbHasColumn('usuario_email_config', col))) {
        try { await dbRun(`ALTER TABLE usuario_email_config ADD COLUMN ${col} ${def}`); } catch { /* */ }
      }
    };
    if (!(await dbTableExists('usuario_email_config'))) {
      await dbRun(
        `CREATE TABLE dbo.usuario_email_config (
          user_id NVARCHAR(64) NOT NULL PRIMARY KEY,
          smtp_host NVARCHAR(255) NOT NULL DEFAULT '',
          smtp_port INT NOT NULL DEFAULT 465,
          smtp_user NVARCHAR(255) NOT NULL DEFAULT '',
          smtp_pass NVARCHAR(255) NOT NULL DEFAULT '',
          smtp_from NVARCHAR(255) NOT NULL DEFAULT '',
          smtp_secure INT NOT NULL DEFAULT 1,
          can_send_email INT NOT NULL DEFAULT 0,
          can_receive_email INT NOT NULL DEFAULT 1,
          updated_at DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
          imap_host NVARCHAR(255) NOT NULL DEFAULT '',
          imap_port INT NOT NULL DEFAULT 993,
          imap_secure INT NOT NULL DEFAULT 1,
          pop_host NVARCHAR(255) NOT NULL DEFAULT '',
          pop_port INT NOT NULL DEFAULT 995,
          pop_secure INT NOT NULL DEFAULT 1,
          CONSTRAINT FK_usuario_email_config_user_correo FOREIGN KEY (user_id) REFERENCES dbo.usuarios(id) ON DELETE CASCADE
        )`
      );
    }
    await ensure('can_receive_email', 'INTEGER DEFAULT 1');
    await ensure('imap_host', "TEXT DEFAULT ''");
    await ensure('imap_port', 'INTEGER DEFAULT 993');
    await ensure('imap_secure', 'INTEGER DEFAULT 1');
    await ensure('pop_host', "TEXT DEFAULT ''");
    await ensure('pop_port', 'INTEGER DEFAULT 995');
    await ensure('pop_secure', 'INTEGER DEFAULT 1');

    const users = await dbAll<{ id: string; rol: string }>(
      'SELECT id, rol FROM usuarios'
    );

    for (const user of users) {
      const rolLower = String(user.rol || '').toLowerCase().trim();
      const canSend = ROLES_CAN_SEND.some(r => rolLower.includes(r) || r.includes(rolLower)) ? 1 : 0;

      await dbRun(
        `IF NOT EXISTS (SELECT 1 FROM usuario_email_config WHERE user_id = ?)
         INSERT INTO usuario_email_config
            (user_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure,
             imap_host, imap_port, imap_secure, pop_host, pop_port, pop_secure,
             can_send_email, can_receive_email, updated_at)
         VALUES (?, '', 465, '', '', '', 1, '', 993, 1, '', 995, 1, ?, 1, SYSDATETIME())`,
        [user.id, user.id, canSend]
      );
    }
  },

  /**
   * Verifica si un usuario tiene permitido enviar correo.
   */
  async canSend(userId: string): Promise<boolean> {
    // Check explicit config
    const cfg = await dbGet<{ can_send_email: number }>(
      'SELECT can_send_email FROM usuario_email_config WHERE user_id = ?',
      [userId]
    );
    if (cfg) return toFlag01(cfg.can_send_email, 0) === 1;

    // Fallback: check role
    const user = await dbGet<{ rol: string }>(
      'SELECT rol FROM usuarios WHERE id = ?',
      [userId]
    );
    if (!user) return false;
    const rolLower = user.rol.toLowerCase().trim();
    return ROLES_CAN_SEND.some(r => rolLower.includes(r) || r.includes(rolLower));
  },

  /**
   * Seed de datos por defecto para Técnico TI (org-016).
   * Se ejecuta una sola vez al iniciar si no existe configuración para ese usuario.
   */
  async ensureSeedData(seed?: {
    userId?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    smtpSecure?: number;
    imapHost?: string;
    imapPort?: number;
    imapSecure?: number;
    popHost?: string;
    popPort?: number;
    popSecure?: number;
    canSendEmail?: number;
    canReceiveEmail?: number;
    forceApply?: boolean;
  }): Promise<void> {
    // Ensure new columns exist first
    const ensure = async (col: string, def: string) => {
      if (!(await dbHasColumn('usuario_email_config', col))) {
        try { await dbRun(`ALTER TABLE usuario_email_config ADD COLUMN ${col} ${def}`); } catch { /* */ }
      }
    };
    await ensure('can_receive_email', 'INTEGER DEFAULT 1');
    await ensure('imap_host', "TEXT DEFAULT ''");
    await ensure('imap_port', 'INTEGER DEFAULT 993');
    await ensure('imap_secure', 'INTEGER DEFAULT 1');
    await ensure('pop_host', "TEXT DEFAULT ''");
    await ensure('pop_port', 'INTEGER DEFAULT 995');
    await ensure('pop_secure', 'INTEGER DEFAULT 1');

    const userId = String(seed?.userId || 'org-016').trim() || 'org-016';
    const smtpHost = String(seed?.smtpHost || 'mail.innovax.com.mx').trim() || 'mail.innovax.com.mx';
    const smtpPort = Number(seed?.smtpPort || 465) || 465;
    const smtpUser = String(seed?.smtpUser || '').trim();
    const smtpPass = String(seed?.smtpPass || '');
    const smtpFrom = String(seed?.smtpFrom || '').trim();
    const smtpSecure = Number(seed?.smtpSecure ?? 1) === 1 ? 1 : 0;
    const imapHost = String(seed?.imapHost || smtpHost).trim() || smtpHost;
    const imapPort = Number(seed?.imapPort || 993) || 993;
    const imapSecure = Number(seed?.imapSecure ?? 1) === 1 ? 1 : 0;
    const popHost = String(seed?.popHost || smtpHost).trim() || smtpHost;
    const popPort = Number(seed?.popPort || 995) || 995;
    const popSecure = Number(seed?.popSecure ?? 1) === 1 ? 1 : 0;
    const canSendEmail = Number(seed?.canSendEmail ?? 1) === 1 ? 1 : 0;
    const canReceiveEmail = Number(seed?.canReceiveEmail ?? 1) === 1 ? 1 : 0;
    const forceApply = seed?.forceApply === true;

    const existing = await dbGet<{ user_id: string }>(
      'SELECT user_id FROM usuario_email_config WHERE user_id = ?',
      [userId]
    );

    if (!existing || forceApply) {
      await dbRun(
        `MERGE usuario_email_config AS target
         USING (
           SELECT ? AS user_id, ? AS smtp_host, ? AS smtp_port, ? AS smtp_user, ? AS smtp_pass, ? AS smtp_from,
                  ? AS smtp_secure, ? AS imap_host, ? AS imap_port, ? AS imap_secure,
                  ? AS pop_host, ? AS pop_port, ? AS pop_secure,
                  ? AS can_send_email, ? AS can_receive_email
         ) AS source
           ON target.user_id = source.user_id
         WHEN MATCHED THEN
           UPDATE SET smtp_host = source.smtp_host,
                      smtp_port = source.smtp_port,
                      smtp_user = source.smtp_user,
                      smtp_pass = source.smtp_pass,
                      smtp_from = source.smtp_from,
                      smtp_secure = source.smtp_secure,
                      imap_host = source.imap_host,
                      imap_port = source.imap_port,
                      imap_secure = source.imap_secure,
                      pop_host = source.pop_host,
                      pop_port = source.pop_port,
                      pop_secure = source.pop_secure,
                      can_send_email = source.can_send_email,
                      can_receive_email = source.can_receive_email,
                      updated_at = SYSDATETIME()
         WHEN NOT MATCHED THEN
           INSERT (user_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure, imap_host, imap_port, imap_secure, pop_host, pop_port, pop_secure, can_send_email, can_receive_email, updated_at)
           VALUES (source.user_id, source.smtp_host, source.smtp_port, source.smtp_user, source.smtp_pass, source.smtp_from, source.smtp_secure, source.imap_host, source.imap_port, source.imap_secure, source.pop_host, source.pop_port, source.pop_secure, source.can_send_email, source.can_receive_email, SYSDATETIME());`,
        [
          userId,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpFrom,
          smtpSecure,
          imapHost,
          imapPort,
          imapSecure,
          popHost,
          popPort,
          popSecure,
          canSendEmail,
          canReceiveEmail,
        ]
      );
    }
  },

  /**
   * Obtener o crear configuración para un usuario.
   */
  async getConfig(userId: string): Promise<EmailConfigRow | null> {
    let row = await dbGet<EmailConfigRow>(
      'SELECT * FROM usuario_email_config WHERE user_id = ?',
      [userId]
    );
    if (row) return row;

    const canSend = await this.canSend(userId);
    await dbRun(
      `IF NOT EXISTS (SELECT 1 FROM usuario_email_config WHERE user_id = ?)
       INSERT INTO usuario_email_config
         (user_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure,
          imap_host, imap_port, imap_secure, pop_host, pop_port, pop_secure,
          can_send_email, can_receive_email, updated_at)
       VALUES (?, '', 465, '', '', '', 1, '', 993, 1, '', 995, 1, ?, 1, SYSDATETIME())`,
      [userId, userId, canSend ? 1 : 0]
    );

    row = await dbGet<EmailConfigRow>(
      'SELECT * FROM usuario_email_config WHERE user_id = ?',
      [userId]
    );
    return row || null;
  },

  /**
   * Guardar configuración SMTP completa de un usuario (SMTP + permisos).
   */
  async saveConfig(userId: string, data: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    smtpFrom: string;
    smtpSecure: number;
    imapHost: string;
    imapPort: number;
    imapSecure: number;
    popHost: string;
    popPort: number;
    popSecure: number;
    canSendEmail: number;
    canReceiveEmail: number;
  }): Promise<void> {
    const hostTrimmed = String(data.smtpHost || '').trim();
    if (hostTrimmed && isLikelyEmail(hostTrimmed)) {
      throw new Error('Servidor SMTP inválido: parece un correo. Ejemplo correcto: mail.empresa.com');
    }

    // Ensure new columns exist
    const ensure = async (col: string, def: string) => {
      if (!(await dbHasColumn('usuario_email_config', col))) {
        try { await dbRun(`ALTER TABLE usuario_email_config ADD COLUMN ${col} ${def}`); } catch { /* */ }
      }
    };
    await ensure('can_receive_email', 'INTEGER DEFAULT 1');
    await ensure('imap_host', "TEXT DEFAULT ''");
    await ensure('imap_port', 'INTEGER DEFAULT 993');
    await ensure('imap_secure', 'INTEGER DEFAULT 1');
    await ensure('pop_host', "TEXT DEFAULT ''");
    await ensure('pop_port', 'INTEGER DEFAULT 995');
    await ensure('pop_secure', 'INTEGER DEFAULT 1');

    await dbRun(
      `MERGE usuario_email_config AS target
       USING (
         SELECT ? AS user_id, ? AS smtp_host, ? AS smtp_port, ? AS smtp_user, ? AS smtp_pass, ? AS smtp_from,
                ? AS smtp_secure, ? AS imap_host, ? AS imap_port, ? AS imap_secure,
                ? AS pop_host, ? AS pop_port, ? AS pop_secure,
                ? AS can_send_email, ? AS can_receive_email
       ) AS source
          ON target.user_id = source.user_id
       WHEN MATCHED THEN
         UPDATE SET smtp_host = source.smtp_host,
                    smtp_port = source.smtp_port,
                    smtp_user = source.smtp_user,
                    smtp_pass = source.smtp_pass,
                    smtp_from = source.smtp_from,
                    smtp_secure = source.smtp_secure,
                    imap_host = source.imap_host,
                    imap_port = source.imap_port,
                    imap_secure = source.imap_secure,
                    pop_host = source.pop_host,
                    pop_port = source.pop_port,
                    pop_secure = source.pop_secure,
                    can_send_email = source.can_send_email,
                    can_receive_email = source.can_receive_email,
                    updated_at = SYSDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (user_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure, imap_host, imap_port, imap_secure, pop_host, pop_port, pop_secure, can_send_email, can_receive_email, updated_at)
         VALUES (source.user_id, source.smtp_host, source.smtp_port, source.smtp_user, source.smtp_pass, source.smtp_from, source.smtp_secure, source.imap_host, source.imap_port, source.imap_secure, source.pop_host, source.pop_port, source.pop_secure, source.can_send_email, source.can_receive_email, SYSDATETIME());`,
      [
        userId,
        hostTrimmed,
        data.smtpPort,
        data.smtpUser,
        data.smtpPass,
        data.smtpFrom,
        data.smtpSecure,
        data.imapHost,
        data.imapPort,
        data.imapSecure,
        data.popHost,
        data.popPort,
        data.popSecure,
        data.canSendEmail,
        data.canReceiveEmail,
      ]
    );
  },

  /**
   * Probar la conexión SMTP de un usuario específico.
   */
  async testConnection(userId: string): Promise<{ success: boolean; error?: string }> {
    const cfg = await this.getConfig(userId);
    if (!cfg || !cfg.smtp_host || !cfg.smtp_user) {
      return { success: false, error: 'Faltan datos SMTP del usuario (servidor y/o usuario SMTP).' };
    }
    if (isLikelyEmail(cfg.smtp_host)) {
      return {
        success: false,
        error: 'Servidor SMTP inválido: no debe ser un correo. Usa un host como mail.empresa.com'
      };
    }
    try {
      const verified = await verifySmtpWithFallback(cfg);
      if (!verified.ok) {
        const msg = String(verified.error || 'No se pudo verificar el servidor SMTP.');
        if (/Greeting never received/i.test(msg)) {
          return {
            success: false,
            error: `${msg}. Sugerencia: revisa combinación SSL/TLS y puerto (normalmente 465=SSL, 587=STARTTLS) y valida firewall/red.`
          };
        }
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de conexión SMTP.' };
    }
  },

  /**
   * Verifica la conexión SMTP y, si es correcta, envía un correo de validación
   * al email registrado del mismo usuario.
   */
  async testConnectionAndSendValidationEmail(userId: string): Promise<{ success: boolean; error?: string; to?: string }> {
    const cfg = await this.getConfig(userId);
    if (!cfg || !cfg.smtp_host || !cfg.smtp_user) {
      return { success: false, error: 'Faltan datos SMTP del usuario (servidor y/o usuario SMTP).' };
    }

    const user = await dbGet<{ email: string; nombre: string }>(
      'SELECT email, nombre FROM usuarios WHERE id = ?',
      [userId]
    );
    const to = String(user?.email || '').trim();
    if (!to) {
      return { success: false, error: 'El usuario no tiene email registrado para recibir la prueba.' };
    }

    try {
      const nodemailer = require('nodemailer');
      const verified = await verifySmtpWithFallback(cfg);
      if (!verified.ok) {
        return { success: false, error: verified.error || 'No se pudo verificar el servidor SMTP.' };
      }

      const transporter = nodemailer.createTransport({
        host: String(cfg.smtp_host || '').trim(),
        port: Number(cfg.smtp_port || 0) || 587,
        secure: Number(cfg.smtp_secure || 0) === 1,
        requireTLS: Number(cfg.smtp_secure || 0) !== 1,
        auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 25000,
        tls: { servername: String(cfg.smtp_host || '').trim() },
      });

      await transporter.sendMail({
        from: cfg.smtp_from || cfg.smtp_user,
        to,
        subject: '[SGC] Correo de validación SMTP',
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;">
          <div style="background:#1d4ed8;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;font-size:17px;">Sistema de Gestión de Calidad</h2>
          </div>
          <div style="background:#fff;border:1px solid #dbeafe;border-top:none;padding:18px;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 10px;color:#0f172a;"><strong>Prueba de configuración SMTP exitosa ✅</strong></p>
            <p style="margin:0 0 8px;color:#334155;">Usuario: ${user?.nombre || userId}</p>
            <p style="margin:0 0 8px;color:#334155;">Email validado: ${to}</p>
            <p style="margin:0;color:#64748b;font-size:12px;">Este correo confirma que la configuración de envío del usuario es válida.</p>
          </div>
        </div>`,
      });

      return { success: true, to };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de conexión/envío SMTP.' };
    }
  },

  /**
   * Enviar correo usando la configuración SMTP del usuario indicado.
   */
  async sendEmail(userId: string, data: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; error?: string }> {
    const cfg = await this.getConfig(userId);
    if (!cfg || !cfg.smtp_host || !cfg.smtp_user) {
      return { success: false, error: 'El usuario no tiene configuración SMTP.' };
    }
    if (toFlag01(cfg.can_send_email, 0) !== 1) {
      return { success: false, error: 'El usuario no tiene permiso para enviar correo.' };
    }

    let to = String(data?.to || '').trim();
    let recipients = normalizeRecipients(to);
    if (recipients.length === 0) {
      const user = await dbGet<{ email: string }>(
        'SELECT email FROM usuarios WHERE id = ?',
        [userId]
      );
      to = String(user?.email || '').trim();
      recipients = normalizeRecipients(to);
    }
    if (recipients.length === 0) {
      to = String(cfg.smtp_user || '').trim();
      recipients = normalizeRecipients(to);
    }
    if (recipients.length === 0) {
      return { success: false, error: 'Debes indicar un destinatario válido (campo To) o registrar email en el usuario.' };
    }

    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: String(cfg.smtp_host || '').trim(),
        port: Number(cfg.smtp_port || 0) || 587,
        secure: Number(cfg.smtp_secure || 0) === 1,
        requireTLS: Number(cfg.smtp_secure || 0) !== 1,
        auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 25000,
        tls: { servername: String(cfg.smtp_host || '').trim() },
      });

      await transporter.sendMail({
        from: cfg.smtp_from || cfg.smtp_user,
        to: recipients.join(', '),
        subject: data.subject,
        html: data.html,
      });
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Error desconocido al enviar correo.';
      console.error('CorreoRepo.sendEmail error:', msg);
      return { success: false, error: msg };
    }
  },

  /**
   * Enviar notificación automática a un destinatario.
   * Busca el primer usuario con can_send_email=1 y SMTP configurado para usarlo como remitente.
   */
  async sendNotificationEmail(toEmail: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
    const recipients = normalizeRecipients(toEmail);
    if (recipients.length === 0) {
      return { success: false, error: 'No se indicó un destinatario válido para la notificación.' };
    }

    // Find a sender with SMTP configured
    const sender = await dbGet<EmailConfigRow>(
      `SELECT * FROM usuario_email_config WHERE can_send_email = 1 AND smtp_host != '' AND smtp_user != '' ORDER BY updated_at DESC LIMIT 1`
    );
    if (!sender) {
      return { success: false, error: 'No hay ningún usuario con SMTP configurado y permiso de envío.' };
    }

    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: String(sender.smtp_host || '').trim(),
        port: Number(sender.smtp_port || 0) || 587,
        secure: Number(sender.smtp_secure || 0) === 1,
        requireTLS: Number(sender.smtp_secure || 0) !== 1,
        auth: { user: sender.smtp_user, pass: sender.smtp_pass },
        connectionTimeout: 12000,
        greetingTimeout: 12000,
        socketTimeout: 25000,
        tls: { servername: String(sender.smtp_host || '').trim() },
      });

      await transporter.sendMail({
        from: sender.smtp_from || sender.smtp_user,
        to: recipients.join(', '),
        subject: `[SGC] ${subject}`,
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:#2563eb;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;font-size:18px;">Sistema de Gestión de Calidad</h2>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
            <h3 style="margin:0 0 12px;color:#1e293b;">${subject}</h3>
            <p style="color:#475569;line-height:1.6;">${message}</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
            <p style="font-size:11px;color:#94a3b8;">Este correo fue generado automáticamente por el SGC. No responder.</p>
          </div>
        </div>`,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al enviar notificación.' };
    }
  },

  /**
   * Listar todos los usuarios que pueden enviar correo.
   */
  async listEmailUsers(): Promise<Array<{ user_id: string; nombre: string; rol: string; can_send_email: number }>> {
    return dbAll(
      `SELECT u.id as user_id, u.nombre, u.rol,
              COALESCE(ec.can_send_email, 0) as can_send_email
       FROM usuarios u
       LEFT JOIN usuario_email_config ec ON ec.user_id = u.id
       WHERE u.activo = 1
       ORDER BY u.nombre COLLATE NOCASE ASC`
    );
  },
};
