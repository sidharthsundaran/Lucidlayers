const express=require('express')
const router= express.Router()
const {isLogin,adminPreventLogin} =require("../middleware/auth")
const passport = require('passport');

router.use(passport.initialize())
router.use(passport.session())



const {renderAdminLogin,adminLogin,renderUserLogin,renderUserSignup,registerUser,renderOtp,verifyOtp,userLogin,renderForgotMail,forgotPasswordMail,renderResetPassword,resetpassword,renderforgotOtp,verifyForgotOtp,resendOtp,googleAuth}=require('../controllers/authController')
const {verifyToken,verifyTokenPassword} =require('../middleware/verifyotpToken')


router.route('/login').get(isLogin,renderUserLogin).post(userLogin)
router.route('/signup').get(isLogin,renderUserSignup).post(registerUser)
router.route('/signup/otp').get(verifyToken,renderOtp).post(verifyToken,verifyOtp)
router.route('/forgotpassword').get(isLogin,renderForgotMail).post(forgotPasswordMail)
router.route('/forgotpassword/otp').get(verifyTokenPassword,renderforgotOtp).post(verifyTokenPassword,verifyForgotOtp)
router.route('/resetpassword').get(verifyTokenPassword,renderResetPassword).post(resetpassword)
router.route('/admin/login').get(adminPreventLogin,renderAdminLogin).post(adminPreventLogin,adminLogin)
router.route('/resendotp').get(isLogin,verifyToken,renderOtp,resendOtp)
router.route('/google').get(passport.authenticate('google', { scope: ['profile', 'email'] }));
router.route('/google/callback').get(isLogin,passport.authenticate('google', {session:false, failureRedirect: '/login' }),googleAuth)

module.exports = router