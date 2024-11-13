const jwt = require('jsonwebtoken')
require('dotenv').config()
const User = require('../models/userModel')

// const isLogin = async(req,res,next)=>{

//     try {

//         if(req.session.user_Id){
//         }
//         else{
//             return res.redirect('/')
//         }
//         next() 
//     } catch (error) {
//         console.log(error.message);

//     }

// }
const isLogin = async (req, res, next) => {
    const token = req.cookies.refreshToken;
    if (token) {
        console.log('token found');
        
      try {
        try {
          const decoded = await jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
          );
          if (decoded) {
            console.log("going home");
            
            return res.redirect("/user/home");
          } else {
            next();
          }
        } catch (error) {
          next();
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      next();
    }
  };
  const adminPreventLogin = async (req, res, next) => {
    const token = req.cookies.adminRefreshToken;
    if (token) {
      try {
        try {
          const decoded = await jwt.verify(
            token,
            process.env.JWT_ADMIN_REFRESH_SECRET
          );
          if (decoded) {
            return res.redirect("/admin/dashboard");
          } else {
            next();
          }
        } catch (error) {
          next();
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      next();
    }
  };

// const isLogin = async (req, res, next) => {
//     const token = req.cookies.accessToken
//     if (token) {
//         try {
//             const access = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
//             if (access) {
//                 return res.redirect('/user/home')
//             } else {
//              next()
//             }

//         } catch (error) {
//             console.log(error);
        
//     }
    
// }else {
//     next()
// }
// }
console.log('hello')
// const adminPreventLogin = async (req, res, next) => {
//     const token = req.cookies.adminAccessToken
//     if (token) {
//         try {
//             const access = jwt.verify(token, process.env.JWT_ADMIN_ACCESS_SECRET)
//             if (!access) {
//                 return res.redirect('/auth/admin/login')
//             } else {
//                 return res.redirect('/admin/dashboard')
//             }

//         } catch (error) {
//             console.log(error);
//         }
//     }
//     next()
// }

// const adminPreventLogin = async(req,res,next)=>{
//       const token=req.cookies.accessToken
//       if(token){
//           try {
//               const access=jwt.verify(token,process.env.JWT_ACCESS_SECRET)
//              if(access){
//                  return res.redirect('/admin/Dashboard')
//              }
//               next()
//           } catch (error) {
//               console.log(error);  
//           }
//       }
//       next()
//       }

// const adminPreventLogin = async (req, res, next) => {
//     const token = req.cookies.accessToken;

//     if (token) {
//       try {
//         const access = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//         console.log('hi from adminPreventLogin');
//         if (access) {
//           return res.redirect('/admin/Dashboard');
//         }
//       } catch (error) {
//         console.log("JWT verification error:", error);
//       }
//     }

//     next();
//   };

// 
// const adminPreventLogin = async (req, res, next) => {
//     const token = req.cookies.accessToken;
//     console.log(token);


//     if (token) {
//         // If no access token is found, proceed to the next middleware
//         try {
//             // Verify the access token
//             const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
//             console.log('Token decoded:', decoded);

//             if (decoded) {
//                 const checkingUser = decoded.userId;
//                 const user = await User.findById(checkingUser);

//                 if (!user) {
//                     console.log('User not found');
//                     return res.redirect('/auth/admin/login');
//                 }

//                 // If user is an admin, redirect to the admin dashboard
//                 if (user.isAdmin === 1) {
//                     return res.redirect('/admin/dashboard');
//                 } else {
//                     // If not an admin, allow them to proceed
//                     return next();
//                 }
//             } else {
//                 console.log('Invalid token');
//                 return res.redirect('/auth/admin/login');
//             }
//         } catch (error) {
//             console.log('Error in token verification:', error);
//             return res.redirect('/auth/admin/login');
//         }
//     }

//     return next ()

// };  




module.exports = { isLogin, adminPreventLogin }