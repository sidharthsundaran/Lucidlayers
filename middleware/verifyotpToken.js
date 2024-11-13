const jwt =require("jsonwebtoken")
require('dotenv').config()
const verifyToken=(req,res,next)=>{
    const token=req.cookies.token
    // console.log('tokken middleware',token);
    
    if(!token){
        return res.status(401).json({success:false,message:"no token provided,authorization denied"})
    }try {
        const decoded=jwt.verify(token,process.env.JWT_OTP_TOKEN)
        // console.log(decoded);
        
        req.userId=decoded.userId
        // console.log(req.userId);
        
        next()
    } catch (error) {
        console.error('jwt verification failed',error)
        return res.status(401),json({success:false,message:"invalid token"})
    }

}

const verifyTokenPassword=(req,res,next)=>{
    const token=req.cookies.token
    // console.log('tokken middleware',token);
    
    if(!token){
        return res.status(401).json({success:false,message:"no token provided,authorization denied"})
    }try {
        const decoded=jwt.verify(token,process.env.JWT_OTP_TOKEN)
        // console.log(decoded);
        
        req.email=decoded.email
        // console.log(req.userId);
        
        next()
    } catch (error) {
        console.error('jwt verification failed',error)
        return res.status(401),json({success:false,message:"invalid token"})
    }

}


module.exports = {verifyToken,verifyTokenPassword}
