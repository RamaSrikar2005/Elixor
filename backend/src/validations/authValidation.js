/**
 * src/validations/authValidation.js
 * Joi schemas for auth routes.
 */

import Joi from 'joi';

// Returns Express middleware that validates req.body against a Joi schema
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

export const validateRegister = validate(
  Joi.object({
    name:     Joi.string().min(2).max(50).required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).max(72).required(),
  })
);

export const validateLogin = validate(
  Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().required(),
  })
);
