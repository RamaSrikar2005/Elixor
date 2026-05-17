import Joi from 'joi';
import { TASK_PRIORITIES, TASK_TAGS } from '../utils/constants.js';

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

export const validateCreateTask = validate(
  Joi.object({
    text:     Joi.string().max(200).required(),
    tag:      Joi.string().valid(...TASK_TAGS).default('Work'),
    priority: Joi.string().valid(...TASK_PRIORITIES).default('medium'),
    dueDate:  Joi.date().iso().allow(null),
    notes:    Joi.string().max(1000).allow('', null),
    xp:       Joi.number().min(0).max(500),
  })
);

export const validateUpdateTask = validate(
  Joi.object({
    text:     Joi.string().max(200),
    tag:      Joi.string().valid(...TASK_TAGS),
    priority: Joi.string().valid(...TASK_PRIORITIES),
    done:     Joi.boolean(),
    dueDate:  Joi.date().iso().allow(null),
    notes:    Joi.string().max(1000).allow('', null),
  })
);
