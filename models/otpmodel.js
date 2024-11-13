const mongoose=require('mongoose')
const otpSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true,'please enter an email'],
        unique:true,
        lowercase:true
    },
    otp:{
        type:String,
        default:null
    },
    otpExpiresAt:{
        type:Date,
        default:Date.now()
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires:300
    },
    otpLastSend:{
        type:Date,
        default:Date.now,

    }
})


const otpModel = mongoose.model('otpSchema' ,otpSchema)
module.exports = otpModel
