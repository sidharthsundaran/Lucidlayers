const mongoose = require('mongoose');


const walletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User ',
        required: true,
    },
    balance: {
        type: Number,
        default: 0, 
    },
    currency: {
        type: String,
        default: 'INR', 
    },
    transactions: [{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Transactions'
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

walletSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
