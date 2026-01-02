//import mysql from "mysql2/promise" → async/await වලින් MySQL වැඩ කරන්න
import mysql from "mysql2/promise";
//createPool(...) → connections එකතු කරලා keep කරනවා
const pool = mysql.createPool({
  host: process.env.DB_HOST, //.env.local වල values read කරනවා
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql, params = []) {
  //API route එකකට SQL run කරන්න
  const [rows] = await pool.execute(sql, params);
  return rows;
}
