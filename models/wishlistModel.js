const mongoose= require ('mongoose')
const User=require('./userModel')

const wishlistSchema= new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User ', 
        required: true
    },
    products :[{
        type:mongoose.Schema.Types.ObjectId,
        ref: 'Product', 
    }],
    createdAt: {
        type:Date,
        default:Date.now
    }
})

const WishList = mongoose.model('wishList', wishlistSchema);
module.exports = WishList
