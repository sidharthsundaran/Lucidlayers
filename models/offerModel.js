const mongoose = require('mongoose');


const offerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    discountType: { 
        type: String, 
        enum: ['percentage', 'fixed'], 
        required: true 
    },
    discountValue: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
    applicableTo: {
        type: String,
        enum: ['product', 'category', 'both'],
        required: true,
    },
    productId: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
    categoryId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    maxUsage: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    // updatedAt: { type: Date, default: Date.now }, 
});

module.exports = mongoose.model('Offers', offerSchema);