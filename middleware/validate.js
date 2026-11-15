const mongoose = require('mongoose');
const { AppError } = require('./errorHandler');

exports.validateId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError('Invalid product ID', 400));
  next();
};

exports.requireBody = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) return next(new AppError('Request body is required', 400));
  next();
};

exports.validateStockChange = (req, res, next) => {
  const { change } = req.body || {};
  if (!Number.isInteger(change) || change === 0)
    return next(new AppError('"change" must be a non-zero integer (positive = restock, negative = sale)', 400));
  next();
};