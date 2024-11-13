const { Cart, CartItem } = require('../models/cartModels');

const cartMiddleware = async (doc) => {
    const cart = await Cart.findById(doc.cart);
    if (cart) {
        // Update total quantity and price
        const items = await CartItem.find({ cart: doc.cart });
        cart.totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        cart.totalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
        cart.updatedAt = Date.now();
        await cart.save();
    }
};

module.exports = cartMiddleware;