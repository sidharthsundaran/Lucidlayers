const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User ',
        required: true,
        unique: true 
    },
    cartItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CartItem',
        required:true //
    }],
    totalQuantity: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    appliedCoupon:{
        type:String,
    },
    discount:{
        type:Number,
        default:0
    }
});

const cartItemSchema = new mongoose.Schema({
   
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    size:{
        type:String,
        required:true
    },
    createdAt: {
        type: String,
        default: () => new Date().toISOString()
    }
});

cartSchema.virtual('formattedCreatedAt').get(function() {
    const date = this.createdAt;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
});
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });


const CartItem = mongoose.model('CartItem', cartItemSchema);
const Cart = mongoose.model('Cart', cartSchema);

module.exports = { CartItem, Cart };