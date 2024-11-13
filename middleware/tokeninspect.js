const jwt = require('jsonwebtoken')
const {generateaccessToken,generateAdminaccessToken} = require('../middleware/accessToken')
require('dotenv').config()
const User=require('../models/userModel')


const verifyRefreshToken = async (req, res, next)=>{
    const refreshToken = req.cookies.refreshToken
    const accessToken = req.cookies.accessToken 
    try {
        if(accessToken){
            try {
                const decode = jwt.verify(accessToken,process.env.JWT_ACCESS_SECRET)
                if(!decode){
                    return res.redirect('/auth/login')
                }
                req.userId = decode.userId
                const userId = decode.userId

                const user = await User.findById(userId)
                if(!user){
                    res.clearCookie("accessToken");
                    res.clearCookie('refreshToken')
                    return res.redirect("/auth/login")
                }
                if(user.blocked==true){
                    res.clearCookie("accessToken");
                    res.clearCookie('refreshToken')
                    return res.redirect("/auth/login")
                }

                return next()

            } catch (error) {
                return res.redirect('/auth/login')
                console.log(error);
                
            }  
        }
        else{
            if(!refreshToken){
                console.log("Refresh token expired");
                return res.redirect('/auth/login')
                
                
            }
            else{
                const decode = jwt.verify(refreshToken,process.env.JWT_REFRESH_SECRET)
                req.userId = decode.userId
                const userId = decode.userId
                
                if(decode){

                    const newAccessToken = generateaccessToken(userId)
                    res.cookie('accessToken', newAccessToken, {
                        httpOnly:true,
                        secure:process.env.NODE_ENV==='production',
                        maxAge: 10 * 60 * 1000
                    })
                    next()
                }
            }
        }
    } catch (error) {
        console.log("Access token expired or invalid", error);
        
    }
}

const verifyAdminRefreshToken = async (req, res, next)=>{
    const refreshToken = req.cookies.adminRefreshToken
    const accessToken = req.cookies.adminAccessToken
    try {
        if(accessToken){
            try {
                const decode = jwt.verify(accessToken,process.env.JWT_ADMIN_ACCESS_SECRET)
                if(!decode){
                    return res.redirect('/auth/admin/login')
                }
                req.userId = decode.userId
                const userId = decode.userId

                const user = await User.findById(userId)

                if(user.isBlocked){
                    res.clearCookie("adminRefreshToken");
                    res.clearCookie('adminAccessToken')
                    return res.redirect("/auth/admin/login")
                }

                return next()

            } catch (error) {
                return res.redirect('/auth/admin/login')
                console.log(error);
                
            }  
        }
        else{
            if(!refreshToken){
                console.log("Refresh token expired");
                return res.redirect('/auth/admin/login')
                
                
            }
            else{
                const decode = jwt.verify(refreshToken,process.env.JWT_ADMIN_REFRESH_SECRET)
                req.userId = decode.userId
                const userId = decode.userId
                
                if(decode){

                    const newAccessToken = generateAdminaccessToken(userId)
                    res.cookie('adminAccessToken', newAccessToken, {
                        httpOnly:true,
                        secure:process.env.NODE_ENV==='production',
                        maxAge: 10 * 60 * 1000
                    })
                    next()
                }
            }
        }
    } catch (error) {
        console.log("Access token expired or invalid", error);
        
    }
}




module.exports = {verifyRefreshToken,verifyAdminRefreshToken}