const mysql = require("mysql2/promise");

async function main() {
  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "dashboard_db",
    connectionLimit: 5,
  });

  // List all tables
  const [tables] = await pool.query("SHOW TABLES");
  console.log("Tables in dashboard_db:");
  tables.forEach(t => console.log("  -", Object.values(t)[0]));

  // Check if dummydataexcel_fashion_2025_3 exists
  const target = "dummydataexcel_fashion_2025_3";
  const exists = tables.some(t => Object.values(t)[0] === target);
  console.log("\nTarget table '" + target + "' exists:", exists);

  if (exists) {
    const [createTable] = await pool.query("SHOW CREATE TABLE " + target);
    console.log("\nTable structure:");
    console.log(Object.values(createTable[0])[1]);

    const [rows] = await pool.query("SELECT * FROM " + target + " LIMIT 5");
    console.log("\nSample rows (" + rows.length + "):");
    rows.forEach(r => console.log(JSON.stringify(r)));

    const [count] = await pool.query("SELECT COUNT(*) as cnt FROM " + target);
    console.log("\nTotal rows:", count[0].cnt);
  }

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});