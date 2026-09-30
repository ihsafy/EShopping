'use strict';

/**
 * Applies database/seed.sql and then ensures the admin account exists.
 * Run after `npm run db:setup`.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const SEED_PATH = path.join(__dirname, '..', '..', 'database', 'seed.sql');

function splitStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const force = process.argv.includes('--force');

  if (force) {
    const connection = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
      multipleStatements: true,
    });
    // Order matters: children first because of the foreign keys.
    const tables = [
      'admin_activity_logs', 'notifications', 'messages', 'conversations', 'coupon_usage',
      'reviews', 'order_items', 'wishlists', 'cart_items', 'carts',
      'product_images', 'product_specs', 'orders', 'products', 'subcategories', 'categories',
      'users', 'banners', 'coupons', 'store_settings',
    ];
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.end();
    console.log('✔ Existing data cleared');
  }

  const sql = fs.readFileSync(SEED_PATH, 'utf8');
  const statements = splitStatements(sql);

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
  });

  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`✔ Demo data seeded (${statements.length} statements).`);
  } catch (error) {
    console.error('✖ Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }

  // The admin is created separately so the password hash always comes from
  // bcrypt at runtime and the plaintext never touches the SQL file.
  require('./seed-admin');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
