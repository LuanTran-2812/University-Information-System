const sql = require('mssql');

// Singleton pool instance
let poolPromise = null;

function getPool() {
  if (poolPromise) return poolPromise;

  const connStr = process.env.MSSQL_CONNECTION_STRING;
  if (!connStr) {
    throw new Error('MSSQL_CONNECTION_STRING is not set in environment');
  }

  const pool = new sql.ConnectionPool(connStr).connect().then((p) => {
    p.on('error', (err) => console.error('MSSQL Pool Error', err));
    return p;
  });

  poolPromise = pool;
  return poolPromise;
}

module.exports = { sql, getPool };
