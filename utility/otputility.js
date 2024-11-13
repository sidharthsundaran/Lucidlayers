const nodemailer =require('nodemailer')
require('dotenv').config()

// const tempdata= require('..models/tempUser')
// const User = require('../models/userModel')

const generateotp =()=>{
    const otp=Math.floor(100000+Math.random()*900000)
    const otpExpiresAt = new Date(Date.now()+5*60*1000)
    return {otp,otpExpiresAt}
}

const sendOtpMail=async(email,otp)=>{
    const transporter=nodemailer.createTransport({
        service:'Gmail',
        auth:{
            user:process.env.EMAIL,
            pass:process.env.PASSWORD
        }
    })
    const mailOption ={
        from:process.env.EMAIL,
        to:email,
        subject:"otp for account verification",
        text:`yoour otp is ${otp},valid for  10 minuites`,
    }
try {
    await transporter.sendMail(mailOption)
    console.log(`otp send to ${email}`);
    
} 
catch(error){
    console.log(`error sending email to ${email}`);
    throw new Error('failed to send otp')   
}   
}

const sendOtpMail2=async(email,otp)=>{
    const transporter=nodemailer.createTransport({
        service:'Gmail',
        auth:{
            user:process.env.EMAIL,
            pass:process.env.PASSWORD
        }
    })
    const mailOption ={
        from:process.env.EMAIL,
        to:email,
        subject:"otp for reseting the password",
        text:`your otp is ${otp},valid for  10 minuites`,
    }
try {
    await transporter.sendMail(mailOption)
    console.log(`otp send to ${email}`);
    
} 
catch(error){
    console.log(`error sending email to ${email}`);
    throw new Error('failed to send otp')   
}   
}
module.exports = {
    generateotp,
    sendOtpMail,
    sendOtpMail2
}
