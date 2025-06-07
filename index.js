const connectDb = require('./config/db')
const express= require('express')
const app= express()
const nocache=require ('nocache')
const path= require('path')
const authRouter=require('./routes/authroutes')
const userRouter=require('./routes/userRoutes')
const adminRouter=require('./routes/adminRoutes')
const flash = require('connect-flash');
const session = require('express-session');
require('./config/googleAuth')
// Setup session and flash
const cookieParser=require('cookie-parser')
const  {verifyRefreshToken,verifyAdminRefreshToken} = require('./middleware/tokeninspect')

require('dotenv').config()

app.set('view engine','ejs')
app.set('views',['./views/user','./views/admin'])

app.use(express.static(path.join(__dirname,'public')))


app.use(nocache())
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(cookieParser())
app.use(session({secret: 'your_secret_key',resave: false,saveUninitialized: true}));
app.use(flash());



app.use('/auth',authRouter)
app.use('/user',verifyRefreshToken,userRouter)
app.use('/admin',verifyAdminRefreshToken,adminRouter)
app.use('/*',(req,res)=>{
    res.render('404')
})


async function server() {
    const DB = process.env.MONGO_URI
try {
    await connectDb(DB)
    app.listen(6612,()=>{
        console.log("listening to port 6612"); 
    })
    
} catch (error) {
    console.log(error);
    
}
    
}

server()
