'use strict';

/**
 * Seeds (or updates) the default admin account.
 * The password is read from ADMIN_PASSWORD in the environment, hashed with
 * bcrypt, and never stored or logged in plain text.
 */
const bcrypt = require('bcryptjs');
const { query, queryOne, pool } = require('../src/config/db');

const BCRYPT_ROUNDS = 12;

async function main() {
  // No defaults on purpose. A fallback credential would end up committed in
  // source control and would silently recreate the same known admin password on
  // any machine that runs this script.
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Store Administrator';
  const mobile = process.env.ADMIN_MOBILE || '';

  if (!email || !password || !mobile) {
    console.error('✖ ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_MOBILE must be set in backend/.env');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = await queryOne(
    "SELECT id FROM users WHERE role = 'admin' AND email = ? LIMIT 1",
    [email]
  );

  if (existing) {
    await query('UPDATE users SET name = ?, password_hash = ?, status = ? WHERE id = ?', [
      name,
      passwordHash,
      'active',
      existing.id,
    ]);
    console.log(`✔ Admin account "${email}" password updated.`);
  } else {
    const mobileTaken = await queryOne('SELECT id FROM users WHERE mobile = ?', [mobile]);
    const result = await query(
      "INSERT INTO users (name, mobile, email, password_hash, role, status) VALUES (?,?,?,?, 'admin', 'active')",
      [name, mobileTaken ? `${mobile}A` : mobile, email, passwordHash]
    );
    console.log(`✔ Admin account created (id ${result.insertId}) for "${email}".`);
  }

  console.log('  Sign in at /admin/login — credentials come from your .env, not from source code.');
}

main()
  .catch((error) => {
    console.error('✖ Seeding admin failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
