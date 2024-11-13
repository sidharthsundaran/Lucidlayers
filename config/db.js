const mongoose = require('mongoose')

const connectDb = async(URI)=>{
    mongoose.connection.on('connected',()=>{
        console.log('connected to database');
        
    })
    mongoose.connection.on('disconnect',()=>{
        console.log('disconnected from the database');
        
    })
    try {
        await mongoose.connect(URI)
    } catch (error) {
        console.log(error);
        
    }
}

module.exports = connectDb