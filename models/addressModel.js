const mongoose= require ('mongoose')
const User=require('./userModel')


const addressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    firstName :{type: String, required: true},
    lastName :{type: String, required: true},
    companyName: { type: String},
    street: { type: String, required: true },
    apartment: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    phone: { type: String, required: true },
    district: { type: String, required: true },
    country: { type: String, required: true },
});
const Address = mongoose.model("address",addressSchema);
module.exports = Address