'use strict';

const { query } = require('../config/db');

const DEFAULTS = {
  store_name: 'EShopping',
  store_tagline: 'Everything you love, delivered',
  store_logo: '',
  store_favicon: '',
  store_phone: '',
  store_email: '',
  store_address: '',
  inside_dhaka_fee: '60',
  outside_dhaka_fee: '120',
  free_delivery_over: '5000',
  low_stock_threshold: '5',
  allow_cancel: '1',
  default_order_status: 'pending',
  featured_limit: '8',
  best_seller_limit: '8',
  new_arrival_limit: '8',
  per_page: '12',
};

let cache = null;

/** Loads all store settings, cached in memory for 60 seconds. */
async function getSettings(force = false) {
  if (cache && !force && Date.now() - cache.loadedAt < 60_000) return cache.values;

  const rows = await query('SELECT setting_key, setting_value FROM store_settings');
  const values = { ...DEFAULTS };
  rows.forEach((row) => {
    values[row.setting_key] = row.setting_value;
  });

  cache = { values, loadedAt: Date.now() };
  return values;
}

async function getSetting(key, fallback = null) {
  const settings = await getSettings();
  return settings[key] !== undefined && settings[key] !== null ? settings[key] : fallback;
}

async function getNumber(key, fallback = 0) {
  const value = Number(await getSetting(key, fallback));
  return Number.isFinite(value) ? value : fallback;
}

async function saveSettings(patch) {
  const keys = Object.keys(patch);
  for (const key of keys) {
    await query(
      'INSERT INTO store_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [key, patch[key] === null || patch[key] === undefined ? '' : String(patch[key])]
    );
  }
  cache = null;
  return getSettings(true);
}

const clearCache = () => {
  cache = null;
};

module.exports = { getSettings, getSetting, getNumber, saveSettings, clearCache, DEFAULTS };
