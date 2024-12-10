const mongoose = require('mongoose');


const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    orderNo:{
        type:Number,
        required:true
    },
    address: {
        type: Object, 
        required: true
    },
    items: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderItem', 
    
    }],
    totalQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Pay On Delivery', 'credit card', 'bank transfer','Razorpay','Wallet'], 
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'canceled','confirmed','returned','refunded',],
        default: 'pending'
    },
    razorpayOrderId:{
        type:String
    },
    discount:{
        type:Number,
        default:0
    },
    offer:{
        type:Number
    },
    
});

OrderSchema.statics.getNextOrderNumber = async function () {
    const lastOrder = await this.findOne().sort({ orderNo: -1 });
    return lastOrder ? lastOrder.orderNo + 1 : 1; 
};


OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;