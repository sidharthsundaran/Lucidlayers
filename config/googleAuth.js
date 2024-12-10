const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User=require('../models/userModel')
const jwt = require('jsonwebtoken');
const Wallet= require('../models/walletModel')
require('dotenv').config()

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'  
},                    
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
            if (user.blocked) {
                return done(null, false, { message: 'User  is blocked.' });
            }   
        } else {
            user = new User({
                googleId: profile.id,
                email: profile.emails[0].value, 
                name: profile.displayName
            });
            await user.save();

            const wallet = new Wallet({
                user: user._id
            });
            await wallet.save();
        }

        return done(null, user);
    } catch (error) {
        console.error("Error during Google authentication:", error);
        return done(error);
    }
}));
