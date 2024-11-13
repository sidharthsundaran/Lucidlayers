
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
        }
    });

// productSchema.virtual('formattedCreatedAt').get(function() {
//     const date = this.createdAt;
//     const day = date.getDate().toString().padStart(2, '0');
//     const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
//     const year = date.getFullYear();
//     return `${day}/${month}/${year}`;
// });
// productSchema.set('toJSON', { virtuals: true });
// productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;

// const sizeVariationschema = mongoose.model('sizeVariationSchema', sizeVariationSchema);
// module.exports = sizeVariationschema;
