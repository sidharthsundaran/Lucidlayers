const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User=require('../models/userModel')
const jwt = require('jsonwebtoken');
require('dotenv').config()


// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'  // Ensure the callback URL matches your Google Console config
},                    
async (accessToken, refreshToken, profile, done) => {
    try {
        
        // Check if user exists in DB, if not, create a new one
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
            user = new User({
                googleId: profile.id,
                email: profile.emails[0].value, // Google returns email
                name: profile.displayName
            });
            await user.save();
            return done(null, user);
        }

        // Pass the user to the next step (generate JWT token)
        return done(null, user);
    } catch (error) {
        console.log(error,false);
        
    }
}));
