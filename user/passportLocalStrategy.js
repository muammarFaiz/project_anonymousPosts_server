const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const {userModel} = require('./userModel')
const bcrypt = require('bcrypt')

const c = console.log;

passport.use(new LocalStrategy({usernameField: 'email'}, async (email, password, done) => {
  c('authentication running...')
  let user;
  try {
    user = await userModel.findOne({email: email})
  } catch (error) {
    c('error in findOne')
    c(error)
    done(error, false)
  }
  if(!user) {
    c('user not found')
    done(null, {_id: 'no user'}, {failInfo: 'user not found'})
  } else {
    const b = await bcrypt.compare(password, user.hashed_password)
    if(b) {
      c('user found and password correct')
      done(null, user)
    } else {
      c('user found and password incorrect')
      done(null, user, {failInfo: 'wrong password'})
    }
  }
}))
passport.serializeUser((user, done) => done(null, user._id))
passport.deserializeUser(async (id, done) => {
  const user = await userModel.findById(id)
  done(null, user)
})