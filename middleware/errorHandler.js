class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const notFound = (req, res, next) => next(new AppError(`Route not found: ${req.originalUrl}`, 404));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  let errors;

  if (err.name === 'ValidationError') {
    status = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyValue).join(', ')}`;
  } else if (err instanceof SyntaxError && err.status === 400) {
    message = 'Invalid JSON body';
  }

  res.status(status).json({ success: false, message, ...(errors && { errors }) });
};

module.exports = { AppError, notFound, errorHandler };
