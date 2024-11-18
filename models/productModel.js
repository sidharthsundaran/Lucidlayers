
const mongoose = require('mongoose');


    const sizeVariationSchema = new mongoose.Schema({
        size: {
            type: String,
            
        },
        price: {
            type: Number,
            
        },
        stock: {
            type: Number,
            
        }
    });

    const productSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            default: ''
        },
        material: {
            type: String,
            default: ''
        },
        sleeveLength: {
            type: String,
            default: ''
        },
        category: {
            type: String,
            required: true
        },
        images: [String],
        color: {
            type: String,
            default: ''
        },
        gender: {
            type: String,
            default: ''
        },
        createdAt: {
            type: Date,
            default: Date.now()
        },
        sizeVariations: [sizeVariationSchema], 
        status: {
            type: Boolean,
            default: false
        },
        offers: [{ 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Offers'
        }],
        
    });



const Product = mongoose.model('Product', productSchema);
module.exports = Product;

