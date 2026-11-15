const router = require('express').Router();
const c = require('../controllers/productController');
const { validateId, requireBody, validateStockChange } = require('../middleware/validate');

// Static routes MUST come before "/:id"
router.get('/low-stock', c.getLowStock);
router.get('/summary', c.getCategorySummary);

router.route('/').get(c.getProducts).post(requireBody, c.createProduct);
router.route('/:id').get(validateId, c.getProductById).put(validateId, requireBody, c.updateProduct).delete(validateId, c.deleteProduct);
router.patch('/:id/stock', validateId, validateStockChange, c.adjustStock);

module.exports = router;
