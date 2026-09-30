'use strict';

const { query, queryOne } = require('../config/db');

const list = ({ onlyActive = false } = {}) => {
  const where = onlyActive ? "WHERE status = 'active'" : '';
  return query(`SELECT * FROM banners ${where} ORDER BY sort_order ASC, id ASC`);
};

const findById = (id) => queryOne('SELECT * FROM banners WHERE id = ?', [id]);

const create = async (data) => {
  const result = await query(
    `INSERT INTO banners (title, subtitle, image_url, mobile_image_url, button_text, button_link, theme, status, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      data.title,
      data.subtitle || null,
      data.imageUrl || null,
      data.mobileImageUrl || null,
      data.buttonText || null,
      data.buttonLink || null,
      data.theme || 'default',
      data.status === 'inactive' ? 'inactive' : 'active',
      Number(data.sortOrder) || 0,
    ]
  );
  return result.insertId;
};

const update = async (id, data) => {
  const current = await findById(id);
  if (!current) return false;
  await query(
    `UPDATE banners SET title = ?, subtitle = ?, image_url = ?, mobile_image_url = ?,
      button_text = ?, button_link = ?, theme = ?, status = ?, sort_order = ? WHERE id = ?`,
    [
      data.title !== undefined ? data.title : current.title,
      data.subtitle !== undefined ? data.subtitle : current.subtitle,
      data.imageUrl !== undefined ? data.imageUrl : current.image_url,
      data.mobileImageUrl !== undefined ? data.mobileImageUrl : current.mobile_image_url,
      data.buttonText !== undefined ? data.buttonText : current.button_text,
      data.buttonLink !== undefined ? data.buttonLink : current.button_link,
      data.theme !== undefined ? data.theme : current.theme,
      data.status !== undefined ? data.status : current.status,
      data.sortOrder !== undefined ? Number(data.sortOrder) || 0 : current.sort_order,
      id,
    ]
  );
  return true;
};

const remove = (id) => query('DELETE FROM banners WHERE id = ?', [id]);

module.exports = { list, findById, create, update, remove };
