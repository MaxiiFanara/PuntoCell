export const validateFields = (schema) => (req, res, next) => {
  // If body wasn't parsed (invalid or missing JSON), return a clear 400
  if (req.body === undefined) {
    return res.status(400).json({ errors: ['Request body is missing or invalid JSON'] });
  }

  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true, convert: true });

  if (error) {
    return res.status(400).json({
      errors: error.details.map((e) => e.message)
    });
  }

  // Joi (con convert:true, el default) devuelve en `value` el body ya normalizado
  // (trim/lowercase/coerciones que declare cada schema) — antes se descartaba y los
  // services recibían el body crudo, sin trim ni minúsculas.
  req.body = value;

  next();
};