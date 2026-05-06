const sqlite3 = require('sqlite3');

const dbPath = 'C:/Users/TI/AppData/Roaming/sgc-desktop-app/sgc.db';
const db = new sqlite3.Database(dbPath);

function authenticate(login, password) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT u.id, u.nombre, u.email, u.rol, u.departamento, u.activo,
             COALESCE(uc.password, '') AS password
      FROM usuarios u
      LEFT JOIN usuario_credenciales uc ON uc.user_id = u.id
      WHERE lower(trim(u.email)) = lower(?)
         OR lower(trim(u.nombre)) = lower(?)
         OR lower(trim(u.id)) = lower(?)
      LIMIT 1`;

    const normalized = String(login || '').trim();
    db.get(sql, [normalized, normalized, normalized], (err, user) => {
      if (err) return reject(err);
      if (!user || user.activo !== 1) return resolve(false);

      const provided = String(password || '');
      const providedTrimmed = provided.trim();
      const stored = String(user.password || '');
      const storedTrimmed = stored.trim();
      resolve(stored === provided || storedTrimmed === providedTrimmed);
    });
  });
}

(async () => {
  const cases = [
    ['admin@empresa.com', '1'],
    ['Administrador', '1'],
    ['usr-admin', '1'],
    [' admin@empresa.com ', '1'],
    ['admin@empresa.com', ' 1 '],
  ];

  for (const [login, pass] of cases) {
    const ok = await authenticate(login, pass);
    console.log(`${login} -> ${ok ? 'OK' : 'FAIL'}`);
  }

  db.close();
})();
