#!/usr/bin/env node
/**
 * Prueba controlada del correo de workflow (demo Innovax).
 *
 *   npm run demo:email-test            -> solo muestra destinatario y contenido (no envia)
 *   npm run demo:email-test -- --send  -> envia UN correo de prueba
 *
 * Usa exactamente la funcion del backend que usa el workflow
 * (CorreoRepo.sendNotificationEmail). No imprime credenciales SMTP.
 * El destinatario se resuelve de la configuracion; si no es inequivoco, aborta.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

async function main() {
  const { dbAll } = require('../dist-test/database/db-sqlserver');
  const { CorreoRepo } = require('../dist-test/database/repositories/correoRepo');
  const { resolveProyectosTiRecipient, buildDemoTestEmail } = require('../dist-test/shared/demoEmailTest');

  const rows = await dbAll(
    `SELECT smtp_user AS address FROM usuario_email_config
     UNION ALL SELECT email AS address FROM usuarios`
  );
  const resolution = resolveProyectosTiRecipient(rows.map(r => r.address));
  if (!resolution.ok) {
    console.error(`[demo-email-test] ${resolution.reason}`);
    if (resolution.candidates.length) console.error(`[demo-email-test] candidatos: ${resolution.candidates.join(', ')}`);
    process.exit(2);
  }

  const now = new Date();
  const email = buildDemoTestEmail(now);
  console.log(`[demo-email-test] destinatario: ${resolution.address}`);
  console.log(`[demo-email-test] asunto final: [SGC] ${email.subject}`);

  if (!process.argv.includes('--send')) {
    console.log('[demo-email-test] modo revision: no se envio nada (usa --send para enviar UNO).');
    process.exit(0);
  }

  const started = new Date();
  const result = await CorreoRepo.sendNotificationEmail(resolution.address, email.subject, email.message);
  const finished = new Date();
  console.log(JSON.stringify({
    enviado: !!result.success,
    error: result.error || null,
    destinatario: resolution.address,
    inicio: started.toISOString(),
    fin: finished.toISOString(),
  }, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error('[demo-email-test] fallo:', err && err.message ? err.message : err);
  process.exit(1);
});
