const mongoose = require('mongoose');
const products = require('../models/productModel')

const OrderItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product', 
        required: true
    },
    productName: {
        type:String,
        required:true
    },
    
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['pending','processing', 'shipped', 'delivered', 'canceled','returned','refunded'],
        default: 'pending'
    },
    reason:{
        type:String
    }
});

const OrderItem = mongoose.model('OrderItem', OrderItemSchema);
module.exports=OrderItem