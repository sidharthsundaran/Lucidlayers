const mongoose=require('mongoose')
const tempUserSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true,'please enter an email'],
        lowercase:true
    },
    name:{
        type:String,
        required:[true,'please enter a name']
    },
    password:{
        type:String,
        required:[true,'please enter a password']
    },
    phone:{
        type:String,
        required:[true,'please enter a phone number']
    },
    isAdmin :{
        type:Number,
        default:0
    },
    otp:{
        type:String,
        default:null
    },
    otpExpiredAt:{
        type:Date,
        default:Date.now
    },
    otpLastSend:{
        type:Date,
        default:Date.now
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires:300
    }
})


const tempUser = mongoose.model('tempUser',tempUserSchema)
module.exports = tempUser
