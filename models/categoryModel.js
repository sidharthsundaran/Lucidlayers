const mongoose=require('mongoose')
const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
    },
    description:{
        type:String,
        required:true,
    },
    order:{
        type:Number,
        default:0
    }
})


const categoryModel = mongoose.model('categorySchema' ,categorySchema)
module.exports = categoryModel
