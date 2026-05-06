const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('C:/Users/TI/AppData/Roaming/sgc-desktop-app/sgc.db');

const login = process.argv[2] || 'lud';
const pass = process.argv[3] || '1';

const sql = `
SELECT u.id, u.nombre, u.email, u.rol, u.departamento, u.activo,
       typeof(u.activo) AS activo_type,
       COALESCE(uc.password, '') AS password,
       typeof(COALESCE(uc.password, '')) AS pass_type
FROM usuarios u
LEFT JOIN usuario_credenciales uc ON uc.user_id = u.id
WHERE lower(trim(u.email)) = lower(?)
   OR lower(trim(u.nombre)) = lower(?)
   OR lower(trim(u.id)) = lower(?)
ORDER BY u.updated_at DESC
`;

db.all(sql, [login.trim(), login.trim(), login.trim()], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('matches=', rows.length);
  console.log(JSON.stringify(rows, null, 2));

  if (rows[0]) {
    const user = rows[0];
    const provided = String(pass || '');
    const providedTrimmed = provided.trim();
    const stored = String(user.password || '');
    const storedTrimmed = stored.trim();
    const ok = Number(user.activo) === 1 && (stored === provided || storedTrimmed === providedTrimmed);
    console.log('auth_simulation=', ok);
  }

  db.close();
});
