import Joi from 'joi';
import { FINANCE_CATEGORIES } from '../utils/constants.js';

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

export const validateTransaction = validate(
  Joi.object({
    type:        Joi.string().valid('income', 'expense').required(),
    amount:      Joi.number().positive().required(),
    category:    Joi.string().valid(...FINANCE_CATEGORIES).default('Other'),
    description: Joi.string().max(200).allow('', null),
    emoji:       Joi.string().max(4).default('💸'),
    date:        Joi.date().iso().default(() => new Date()),
  })
);
