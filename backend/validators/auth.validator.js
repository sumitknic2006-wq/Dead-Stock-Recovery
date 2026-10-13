/**
 * StockSaathi AI — Auth Validators (Phase 11)
 *
 * Validates registration and login inputs on the server.
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createValidator() {
  const errors = [];
  return {
    errors,
    check(condition, message) {
      if (!condition) errors.push(message);
    },
    isValid() {
      return errors.length === 0;
    },
  };
}

export function validateRegister(body = {}) {
  const v = createValidator();

  v.check(
    typeof body.name === 'string' && body.name.trim().length >= 2,
    'Name is required and must be at least 2 characters'
  );

  v.check(
    typeof body.email === 'string' && emailRegex.test(body.email.trim()),
    'A valid email address is required'
  );

  v.check(
    typeof body.password === 'string' && body.password.length >= 8,
    'Password is required and must be at least 8 characters long'
  );

  if (body.businessName !== undefined && body.businessName !== null) {
    v.check(
      typeof body.businessName === 'string',
      'Business name must be a string'
    );
  }

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}

export function validateLogin(body = {}) {
  const v = createValidator();

  v.check(
    typeof body.email === 'string' && emailRegex.test(body.email.trim()),
    'A valid email address is required'
  );

  v.check(
    typeof body.password === 'string' && body.password.length > 0,
    'Password is required'
  );

  return {
    isValid: v.isValid(),
    errors: v.errors,
  };
}
