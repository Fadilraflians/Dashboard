const mysql = require("mysql2/promise");

async function main() {
  // First ensure database exists (no database specified)
  const rootPool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    connectionLimit: 1,
  });

  const [databases] = await rootPool.query("SHOW DATABASES LIKE 'dashboard_db'");
  if (databases.length === 0) {
    console.log("Database dashboard_db not found, creating...");
    await rootPool.query("CREATE DATABASE dashboard_db");
  }
  await rootPool.end();

  // Now use dashboard_db
  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "dashboard_db",
    connectionLimit: 5,
  });

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboard_summary (
      id INT AUTO_INCREMENT PRIMARY KEY,
      totalPendapatan BIGINT DEFAULT 0,
      totalTransaksi INT DEFAULT 0,
      totalUser INT DEFAULT 0,
      pertumbuhan DECIMAL(5,2) DEFAULT 0,
      period VARCHAR(20) DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dashboard_transactions (
      id VARCHAR(50) PRIMARY KEY,
      date DATE,
      amount BIGINT DEFAULT 0,
      status VARCHAR(20) DEFAULT '',
      user VARCHAR(100) DEFAULT ''
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) DEFAULT '',
      description TEXT,
      userCount INT DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) DEFAULT '',
      email VARCHAR(100) DEFAULT '',
      role VARCHAR(100) DEFAULT '',
      status VARCHAR(20) DEFAULT ''
    )
  `);

  // Insert sample data (only if empty)
  const [summaryRows] = await pool.query("SELECT COUNT(*) as cnt FROM dashboard_summary");
  if (summaryRows[0].cnt === 0) {
    await pool.query(`
      INSERT INTO dashboard_summary (totalPendapatan, totalTransaksi, totalUser, pertumbuhan, period)
      VALUES (1250000000, 4523, 1234, 12.5, '2026-10')
    `);
  }

  const [txnRows] = await pool.query("SELECT COUNT(*) as cnt FROM dashboard_transactions");
  if (txnRows[0].cnt === 0) {
    await pool.query(`
      INSERT INTO dashboard_transactions (id, date, amount, status, user) VALUES
      ('TXN-001', '2026-10-10', 2500000, 'success', 'dev@bni.co.id'),
      ('TXN-002', '2026-10-10', 1800000, 'pending', 'admin@bni.co.id'),
      ('TXN-003', '2026-10-09', 3200000, 'success', 'user@bni.co.id'),
      ('TXN-004', '2026-10-09', 950000, 'failed', 'test@bni.co.id'),
      ('TXN-005', '2026-10-08', 4100000, 'success', 'dev@bni.co.id')
    `);
  }

  const [roleRows] = await pool.query("SELECT COUNT(*) as cnt FROM roles");
  if (roleRows[0].cnt === 0) {
    await pool.query(`
      INSERT INTO roles (id, name, description, userCount) VALUES
      ('role-1', 'Super Admin', 'Full access', 2),
      ('role-2', 'Admin', 'Admin access', 5),
      ('role-3', 'User', 'Regular user', 120),
      ('role-4', 'Viewer', 'Read-only', 34)
    `);
  }

  const [userRows] = await pool.query("SELECT COUNT(*) as cnt FROM users");
  if (userRows[0].cnt === 0) {
    await pool.query(`
      INSERT INTO users (id, name, email, role, status) VALUES
      ('user-1', 'Dev User', 'dev@bni.co.id', 'Super Admin', 'active'),
      ('user-2', 'Admin User', 'admin@bni.co.id', 'Admin', 'active'),
      ('user-3', 'Regular User', 'user@bni.co.id', 'User', 'active')
    `);
  }

  console.log("Database dashboard_db ready with sample data");
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});