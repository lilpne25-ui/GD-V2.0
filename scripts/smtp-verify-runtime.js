/* eslint-disable no-console */
const sql = require('mssql/msnodesqlv8');
const nodemailer = require('nodemailer');

(async () => {
  const pool = await sql.connect({
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=SGC_Dev;Trusted_Connection=Yes;',
    options: { trustedConnection: true, trustServerCertificate: true },
  });

  try {
    const r = await pool.request().query(`
      SELECT TOP 1 user_id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass
      FROM dbo.usuario_email_config
      WHERE LTRIM(RTRIM(ISNULL(smtp_host,''))) <> ''
        AND LTRIM(RTRIM(ISNULL(smtp_user,''))) <> ''
      ORDER BY updated_at DESC
    `);

    if (!r.recordset.length) {
      console.log('NO_SMTP_CONFIG');
      return;
    }

    const c = r.recordset[0];
    const host = String(c.smtp_host || '').trim();
    const secureCfg = Number(c.smtp_secure || 0) === 1;
    const portCfg = Number(c.smtp_port || 0) || 587;

    const attempts = [
      { name: 'config', host, port: portCfg, secure: secureCfg, requireTLS: !secureCfg },
      { name: 'alt-secure-toggle', host, port: portCfg, secure: !secureCfg, requireTLS: secureCfg },
      { name: 'smtps-465', host, port: 465, secure: true, requireTLS: false },
      { name: 'starttls-587', host, port: 587, secure: false, requireTLS: true },
    ];

    const seen = new Set();
    for (const a of attempts) {
      const key = `${a.host}|${a.port}|${a.secure}|${a.requireTLS}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const t = nodemailer.createTransport({
          host: a.host,
          port: a.port,
          secure: a.secure,
          requireTLS: a.requireTLS,
          auth: { user: c.smtp_user, pass: c.smtp_pass },
          connectionTimeout: 12000,
          greetingTimeout: 12000,
          socketTimeout: 25000,
          tls: { servername: host },
        });
        await t.verify();
        console.log(`SMTP_VERIFY_OK mode=${a.name} port=${a.port} secure=${a.secure}`);
        return;
      } catch (e) {
        console.log(`SMTP_VERIFY_FAIL mode=${a.name} msg=${e?.message || String(e)}`);
      }
    }

    process.exitCode = 1;
  } finally {
    await pool.close();
  }
})().catch((e) => {
  console.error('FATAL', e?.message || e);
  process.exit(1);
});
