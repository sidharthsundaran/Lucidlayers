const User=require('../models/userModel')
const tempUser=require('../models/tempUser')
const OtpModel=require('../models/otpmodel')
const bcrypt = require('bcryptjs')
const nodemailer=require('nodemailer')
const jwt = require('jsonwebtoken')
const { check, validationResult } = require('express-validator');
const {generateotp,sendOtpMail,sendOtpMail2} =require('../utility/otputility')
const {generateaccessToken,generateRefreshToken,generateAdminaccessToken,generateAdminRefreshToken}=require('../middleware/accessToken')
const getFormattedDate=require('../utility/dateFormat')
const otpModel = require('../models/otpmodel')
const Wallet = require('../models/walletModel')
const Transactions = require('../models/transactions')
require('dotenv').config()
const securePassword = async(password)=>{
    try{
      const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    }catch(error){
        console.log(error.message)
    }
}


const googleAuth =async (req, res) => {
    
    const user = req.user;
    if (!user) {
        return res.status(403).render('login', { message: info.message }); // Render an error page or send a message
    }
    const accessToken = generateaccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000 // 10 mins
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30*24*60*60*1000 // 20 mins
    });

    res.redirect('/user/home');
};

const registerUser = [
  check('name').isLength({ min: 5 }).withMessage('Name must be at least 5 characters long.'),
  check('email').isEmail().withMessage('Please enter a valid email address.'),
  check('password').isLength({ min: 5 }).withMessage('Password must be at least 8 characters long.'),
  check('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match.');
    }
    return true;
  }),

async(req, res) => {

    const {email}=req.body
    
    const exist= await User.findOne({email})

    
    const errors = validationResult(req);
    if(exist){
        return res.render('signup',{message:"user already exist"})
    }
    if (!errors.isEmpty()) {
      return res.render('signup',{message:'user does not exist'})
    }
    try {
        const spassword = await securePassword(req.body.password) 
        const refcode = req.body.referal
        
        if (refcode) {
           const refUser = await User.findOne({referalCode:refcode}) 
           if(!refUser){
            return res.render('signup',{message:'Use valid referal code'})
           }
        }       
        const user = new tempUser({
            name: req.body.name,
            email,
            password: spassword,
            phone: req.body.number,
            referal:req.body.referal

        })
         await user.save()
         const {otp, otpExpiresAt } = generateotp()
     
         
        user.otp = otp;
        user.otpExpiredAt = otpExpiresAt;
        await user.save();
        
        await sendOtpMail(user.email, otp);

        const userId = user._id
        const token = jwt.sign({userId}, process.env.JWT_OTP_TOKEN, {expiresIn:'10m'})
        console.log(token);
        
        res.cookie('token',token,{
            httpOnly:false,
            secure:false,
            maxAge: 10 * 60 *1000
        })
       return  res.redirect('/auth/signup/otp')
    } catch (error) {
        console.log(error.message);
    }
  }
];

const verifyOtp = async(req, res)=>{
    try {
        const userId = req.userId 
        const {otp} = req.body
        const tempUserData = await tempUser.findById(userId)
        
        if(!tempUserData.otp){
           return res.render('verificationMail',{message: "No otp found for this email"})
        }
        if(otp===tempUserData.otp){
            if(Date.now()>tempUserData.otpExpiresAt){
               return res.render('verificationMail',{message: "Server error occured"})
            }
            const user = new User({
                name:tempUserData.name,
                email:tempUserData.email,
                password:tempUserData.password,
                phone:tempUserData.phone,
                isAdmin:tempUserData.isAdmin,
                dateJoined:getFormattedDate(Date.now())
            })

            await user.save()
            const wallet= new Wallet({
                user:user._id
            })
            await wallet.save()
            if(tempUserData.referal){
                wallet.balance+=100
                const newtransaction= new Transactions({
                    user: user._id,
                    amount: 100,
                    type: 'credit',
                    description: `Signup bonus credited for using a referral code`,
                });
                newtransaction.save()
                wallet.transactions.push(newtransaction._id);
                await wallet.save(); 
                const refUSer= await User.findOne({referalCode:tempUserData.referal})
               if(refUSer){
                const refWallet= await Wallet.findOne({user:refUSer._id})
                console.log(refWallet)
                refWallet.balance += 300
                const refTransaction =  new Transactions({
                    user: refUSer._id,
                    amount: 300,
                    type: 'credit',
                    description: `Referral bonus credited for successful signup using your referral code`,
                })
                console.log(refTransaction);
                
                await refTransaction.save()
                refWallet.transactions.push(refTransaction._id)
                await refWallet.save()
               }
                
            }
            return res.redirect('/auth/login')
        }
        else{
            return res.render('verificationMail',{ message: "Invalid OTP"})

        }
    } catch (error) {
        console.log(error);
        res.render('verificationMail',{success:false, message: "Server error occured"})
    }
}

const verifyForgotOtp= async(req,res)=>{
    const token= req.cookies.token
    const otp=req.body.otp
    const decoded=jwt.verify(token,process.env.JWT_OTP_TOKEN)
    const email=decoded.email
    const userData= await otpModel.findOne({email})
    
    if(!userData){
        res.render('forgotOtp',{message:"no otp found for this mail"})
    }
    if(otp===userData.otp){
        if(Date.now>userData.otpExpiredAt){
            res.render('forgotOtp',{message:"time expired!!try again"})
        }
        return res.redirect('/auth/resetpassword')
    }
}

const forgotPasswordMail = async(req,res)=>{
  const {email}=req.body
  
  const exist= await User.findOne({email})
  if(!exist){
    return res.render('forgotPassword',{message:"user with this mail does not exist"})
  }
  try {
    const {otp,otpExpiresAt } = generateotp()
    const otpData= new OtpModel({
        email:email,
        otp:otp,
        otpExpiredAt:otpExpiresAt,
        createdAt:Date.now()
        
    })
    await otpData.save()
    await sendOtpMail2(email, otp);
    const token = jwt.sign({email}, process.env.JWT_OTP_TOKEN, {expiresIn:'10m'})
    
    res.cookie('token',token,{
        httpOnly:false,
        secure:false,
        maxAge: 10 * 60 *1000
    })
    return res.redirect("/auth/forgotpassword/otp")
  } catch (error) {
    console.log(error.message)
  }
}

const resetpassword = async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.render('resetPassword', { message: "Token not found. Please try again." });
    }

    console.log('Token:', token);

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('resetPassword', { message: "Passwords do not match." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_OTP_TOKEN);
        const email = decoded.email;
        console.log('Email:', email);
        const hashedPassword = await bcrypt.hash(password, 10);
        const userdata = await User.findOneAndUpdate(
            { email: email },
            { $set: { password: hashedPassword } },
            { new: true } 
        );

        if (userdata) {
    
            return res.redirect('/auth/login');
        } else {
            return res.render('resetPassword', { message: "User not found." });
        }

    } catch (error) {
        console.log('Error:', error.message);
        // Handle invalid or expired token
        return res.render('resetPassword', { message: "An error occurred or token is invalid." });
    }
};



const renderUserLogin = async(req,res)=>{
    try{
        res.render("login")
    } catch (error) {
        console.log('cannot render',error)
    }
}

const renderUserSignup =async(req,res)=>{
    try{
        res.render("signup")
    } catch (error) {
        console.log('cannot render',error)
    }
}

const renderOtp = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.redirect('/auth/signup');
        }

        const decode = jwt.verify(token, process.env.JWT_OTP_TOKEN);
        const checkingUser = decode.userId;
        const user = await tempUser.findById(checkingUser);

        if (!user || !user.otpExpiredAt) {
            return res.redirect('/auth/signup');
        }

        return res.render('verificationMail', { expiresAt: user.otpExpiredAt.getTime() });
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.redirect('/auth/signup');
    }
};

const renderForgotMail=async(req,res)=>{
    res.render('forgotPassword')
}

const renderResetPassword=async(req,res)=>{
    res.render('resetPassword')
}

const userLogin = async(req,res)=>{
    
    const{email,password} = req.body
    console.log(email, password)
    try {
        const user = await User.findOne({email})
        if(user.blocked==true){
            return res.render('login',{message:"This user is banned by Admin"})
        }
        const passwordMatch = await  bcrypt.compare(password,user.password)
        if(!user || !passwordMatch){
            return res.render('login',{message:'Invalid email or password'})
        }
        const accessToken = generateaccessToken(user._id)
        const refreshToken = generateRefreshToken(user._id)


        res.cookie('accessToken',accessToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV ==='production',
            maxAge: 10*60*1000  
        })

        res.cookie('refreshToken',refreshToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV==='production',
            maxAge: 30*24*60*60*1000 
        })

        
        return res.redirect('/user/home')
        
    } catch (error) {
        console.log(error);
        return res.render('login',{message:'server error'})
    }
}
const renderHome = async(req,res)=>{
    res.render('landingPage')
}
const renderforgotOtp =async(req,res)=>{
    res.render('forgotOtp')
}

const renderAdminLogin = async(req,res)=>{
    res.render('adminLogin')
}

const adminLogin = async(req,res)=>{
    
    const{email,password} = req.body
    
    try {
        const user = await User.findOne({email})

        if(user.isAdmin!=1){
            return res.render('adminLogin',{message:"your not supposed to be  here"})   
        }
        const passwordMatch = await  bcrypt.compare(password,user.password)
        if(!user || !passwordMatch){
            return res.render('adminLogin',{message:'Invalid email or password'})
        }
        
        
        
        const adminAccessToken = generateAdminaccessToken(user._id)
        
        const admniRefreshToken = generateAdminRefreshToken(user._id)

        res.cookie('adminAccessToken',adminAccessToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV ==='production',
            sameSite: 'Strict',
            maxAge: 10*60*1000 
        })

        res.cookie('adminRefreshToken',admniRefreshToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV==='production',
            sameSite:'Strict',
            maxAge: 30*24*60*60*1000 
        })

        return res.redirect('/admin/dashboard')
        
    } catch (error) {
        console.log(error);
        // return res.status(500).json({success:false,message:'server error'})
    }
}

const resendOtp = async (req, res) => {
    try {
        const userId = req.userId
        const user = await OtpModel.findById(userId)


        
        const currentTime = Date.now()
        const lastOtpTime = currentTime - user.otpLastSend
        if(lastOtpTime<60*1000){
           return res.render('verificationMail',{ message: "Invalid OTP"})
        }
        
        // if(!user){
        //    return res.render("otp", {errorMessage:"No user found"})
        // }
        

        const { otp, otpExpiresAt } = generateOtp();
        user.otp = otp;
        user.otpExpiredAt = otpExpiresAt
        user.otpLastSend = currentTime
        

        await user.save();


        await sendOtpEmail(user.email, otp)
        // req.flash('error-message', 'OTP has been resent')
        // return res.redirect("/auth/signup/otp");
        return res.render('verificationMail',{ message: "Invalid OTP"})
    } catch (error) {
        console.log(error);

    }
}

module.exports ={
    renderUserLogin,
    renderUserSignup,
    registerUser,
    verifyOtp,
    renderOtp,
    renderHome,
    userLogin,
    renderForgotMail,
    forgotPasswordMail,
    renderResetPassword,
    resetpassword,
    renderforgotOtp,
    verifyForgotOtp,
    renderAdminLogin,
    adminLogin,
    resendOtp,
    googleAuth
}