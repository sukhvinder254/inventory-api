const Product = require('../models/Product');
const { AppError } = require('../middleware/errorHandler');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/products
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

// GET /api/products
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, supplier, search, minPrice, maxPrice, inStock, sort } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const filter = {};
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (supplier) filter.supplier = new RegExp(escapeRegex(supplier), 'i');
  if (search) filter.name = new RegExp(escapeRegex(search), 'i');
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (inStock === 'true') filter.quantity = { $gt: 0 };
  if (inStock === 'false') filter.quantity = 0;

  const sortBy = sort ? sort.split(',').join(' ') : '-createdAt';

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
  ]);

  res.json({ total, page, totalPages: Math.ceil(total / limit), count: products.length, products });
});

// GET /api/products/:id
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
});

// PUT /api/products/:id
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
});

// PATCH /api/products/:id/stock
exports.adjustStock = asyncHandler(async (req, res) => {
  const { change } = req.body;
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, quantity: { $gte: -change } },
    { $inc: { quantity: change } },
    { new: true }
  );
  if (!product) {
    const exists = await Product.exists({ _id: req.params.id });
    if (!exists) throw new AppError('Product not found', 404);
    throw new AppError('Insufficient stock for this sale', 400);
  }
  res.json({ message: 'Stock updated', product });
});

// DELETE /api/products/:id
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json({ message: 'Product deleted', id: product.id });
});

// GET /api/products/low-stock
exports.getLowStock = asyncHandler(async (req, res) => {
  const lowStockItems = await Product.find({ $expr: { $lte: ['$quantity', '$reorderLevel'] } }).sort('quantity');
  res.json({ count: lowStockItems.length, lowStockItems });
});

// GET /api/products/summary
exports.getCategorySummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
      },
    },
    { $sort: { totalStockValue: -1 } },
  ]);
  res.json({ categories: summary.length, summary });
});
