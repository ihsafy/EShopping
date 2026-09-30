'use strict';

/**
 * Creates the database and applies schema.sql.
 * Safe to re-run: every table is created with IF NOT EXISTS at the database
 * level and the schema itself drops + recreates when --force is passed.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'database', 'schema.sql');

/** Splits a SQL file into individual statements, ignoring comments. */
function splitStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function confirm(message) {
  if (process.env.FORCE_YES === '1') return true;
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(`${message} (yes/no): `, resolve));
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const force = process.argv.includes('--force');

  if (force) {
    const ok = await confirm(
      `This will DROP and recreate the "${env.db.name}" database. All data will be lost. Continue?`
    );
    if (!ok) {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const statements = splitStatements(sql);

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  try {
    // Database must exist before the schema can `USE` it.
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${env.db.name}\``);

    for (const statement of statements) {
      await connection.query(statement);
    }

    console.log(`✔ Database "${env.db.name}" is ready (${statements.length} statements applied).`);
  } catch (error) {
    console.error('✖ Schema failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
