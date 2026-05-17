import Joi from 'joi';

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

export const validateCreateHabit = validate(
  Joi.object({
    name:  Joi.string().max(80).required(),
    emoji: Joi.string().max(4).default('✅'),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).default('#0ea5e9'),
  })
);

export const validateTrackHabit = validate(
  Joi.object({
    date: Joi.date().iso().default(() => new Date()),
    done: Joi.boolean().required(),
  })
);
