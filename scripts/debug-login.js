const sqlite3 = require('sqlite3');

const dbPath = 'C:/Users/TI/AppData/Roaming/sgc-desktop-app/sgc.db';
const db = new sqlite3.Database(dbPath);

const sql = `
SELECT u.id, u.nombre, u.email, u.rol, u.activo, COALESCE(uc.password, '') AS password
FROM usuarios u
LEFT JOIN usuario_credenciales uc ON uc.user_id = u.id
ORDER BY u.updated_at DESC
LIMIT 30;
`;

db.all(sql, [], (err, rows) => {
  if (err) {
    console.error('SQL error:', err);
    process.exit(1);
  }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
