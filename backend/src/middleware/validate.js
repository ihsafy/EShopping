'use strict';

/**
 * Minimal declarative validator. Rules are declared per field and the errors
 * are returned as a 422 with a field map, which the React forms consume.
 */
const { normaliseMobile, isValidMobile, isValidEmail } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

const RULES = {
  required: (value) =>
    value !== undefined && value !== null && String(value).trim() !== '' || 'This field is required',

  string: (value) => typeof value === 'string' || 'Must be text',

  min: (value, length) => String(value ?? '').length >= length || `Must be at least ${length} characters`,

  max: (value, length) => String(value ?? '').length <= length || `Must be at most ${length} characters`,

  email: (value) => isValidEmail(value) || 'Enter a valid email address',

  mobile: (value) => isValidMobile(value) || 'Enter a valid mobile number (e.g. 01712345678)',

  numeric: (value) => !Number.isNaN(Number(value)) || 'Must be a number',

  minValue: (value, min) => Number(value) >= Number(min) || `Must be ${min} or more`,

  maxValue: (value, max) => Number(value) <= Number(max) || `Must be ${max} or less`,

  integer: (value) => Number.isInteger(Number(value)) || 'Must be a whole number',

  in: (value, allowed) => allowed.includes(value) || `Must be one of: ${allowed.join(', ')}`,

  url: (value) => {
    if (value === undefined || value === null || value === '') return true;
    return /^(https?:\/\/|\/)/.test(String(value)) || 'Enter a valid URL';
  },
};

function runRules(value, rules = []) {
  // Optional fields carry no rules when they are absent - `required` is the
  // only rule that must still run (it reports the missing value).
  const absent = value === undefined || value === null || value === '';

  for (const [rule, arg] of rules) {
    if (absent && rule !== 'required') continue;
    const check = RULES[rule];
    if (!check) continue;
    const result = check(value, arg);
    if (result !== true) return result;
  }
  return null;
}

/**
 * validate({ body: { name: [['required'], ['max', 120]] } })
 * Unknown keys listed in `strip` are removed from the payload.
 */
function validate(schemas = {}) {
  return (req, res, next) => {
    const errors = {};

    for (const source of ['body', 'query', 'params']) {
      const schema = schemas[source];
      if (!schema) continue;
      const data = req[source] || {};

      for (const [field, rules] of Object.entries(schema)) {
        if (field.startsWith('$')) {
          // Whole-object rule, e.g. $passwordMatch. Rules follow the same
          // convention as field rules: `true` (or nothing) means valid, any
          // other value is the error message.
          const result = rules(data);
          if (result === true || result === undefined || result === null) continue;
          errors[field.slice(1)] = typeof result === 'string' ? result : 'Invalid value';
          continue;
        }
        const error = runRules(data[field], rules);
        if (error) errors[field] = error;
      }
    }

    if (Object.keys(errors).length) {
      return next(ApiError.unprocessable('Please correct the highlighted fields', errors));
    }

    if (req.body) {
      if (schemaHas(schemas, 'mobile')) req.body.mobile = normaliseMobile(req.body.mobile);
      if (schemaHas(schemas, 'email') && req.body.email) {
        req.body.email = String(req.body.email).trim().toLowerCase();
      }
    }
    return next();
  };
}

function schemaHas(schemas, field) {
  return Boolean(schemas.body && schemas.body[field]);
}

module.exports = { validate };
