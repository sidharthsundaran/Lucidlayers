const mongoose=require('mongoose')
const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:[true,'please enter an email'],
        unique:true,
        lowercase:true
    },
    name:{
        type:String,
        required:[true,'please enter a name']
    },
    password:{
        type:String,
    },
    phone:{
        type:String,
        
    },
    isAdmin:{
        type:Number,
        default:0
    },
    dateJoined:{
        type:String,
        default:Date.now()
    },
    blocked:{
        type:Boolean,
        default:false
    },
    googleId:{
        type:String
    },
    coupons:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'DiscountCodes'
    }],
    referalCode:{
        type:String
    }

},{timestamps:true})

const User = mongoose.model('User' ,userSchema)
module.exports=User
