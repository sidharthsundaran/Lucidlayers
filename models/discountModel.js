const mongoose = require('mongoose');

const DiscountCodesSchema = mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true 
    },
    name:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true
    },
    isPercent: { 
        type: Boolean, 
        required: true, 
        default: true 
    },
    amount: {
         type: Number,
         required: true 
        },
    expireDate: {
         type: Date, 
         required: true 
        },
    isActive: {
         type: Boolean,
         required: true,
         default: true
     },
    minPurchase :{
        type : Number,
        required:true
    },
    
});

const Discounts = mongoose.model('DiscountCodes', DiscountCodesSchema);
module.exports = Discounts;