// ✅ MySQL (TiDB Cloud) connection helper
// TiDB Serverless එක production වල SSL (secure) connection එක අනිවාර්යයි.

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 4000);
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS || process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

// ✅ SSL CA file path
const CA_PATH = path.join(process.cwd(), "certs", "ca.pem");

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,

  // ✅ IMPORTANT: SSL enable
  ssl: {
    ca: fs.readFileSync(CA_PATH),
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
