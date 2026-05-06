/* eslint-disable no-console */
const sql = require('mssql/msnodesqlv8');
const nodemailer = require('nodemailer');

(async () => {
  const pool = await sql.connect({
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=SGC_Dev;Trusted_Connection=Yes;',
    options: { trustedConnection: true, trustServerCertificate: true },
  });

  try {
    const senderResult = await pool.request().query(`
      SELECT TOP 1 user_id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure
      FROM dbo.usuario_email_config
      WHERE CAST(ISNULL(can_send_email, 0) AS INT) = 1
        AND LTRIM(RTRIM(ISNULL(smtp_host,''))) <> ''
        AND LTRIM(RTRIM(ISNULL(smtp_user,''))) <> ''
      ORDER BY updated_at DESC
    `);

    if (!senderResult.recordset.length) {
      console.log('NO_SENDER_CONFIG');
      process.exit(1);
    }

    const s = senderResult.recordset[0];
    const host = String(s.smtp_host || '').trim();
    const secure = Number(s.smtp_secure || 0) === 1;
    const port = Number(s.smtp_port || 0) || (secure ? 465 : 587);

    const to = String(s.smtp_user || '').trim();
    if (!to) {
      console.log('NO_RECIPIENT');
      process.exit(1);
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      auth: { user: String(s.smtp_user || '').trim(), pass: String(s.smtp_pass || '') },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 25000,
      tls: { servername: host },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: String(s.smtp_from || s.smtp_user || '').trim(),
      to,
      subject: '[SGC] Prueba backend workflow correo',
      html: `<p>Prueba de backend exitosa.</p><p>Sender user_id: ${s.user_id}</p><p>${new Date().toISOString()}</p>`,
    });

    console.log('SEND_OK', {
      senderUserId: s.user_id,
      host,
      port,
      secure,
      to,
      messageId: info && info.messageId ? info.messageId : '(sin messageId)',
      response: info && info.response ? info.response : '(sin response)',
    });
  } finally {
    await pool.close();
  }
})().catch((e) => {
  console.error('SEND_FAIL', e && e.message ? e.message : e);
  process.exit(1);
});
