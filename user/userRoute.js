const passport = require('passport');
// const {userModel} = require('./userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = require('express').Router()
const utils = require('./userUtils')()

const c = console.log;

const signJWT = async (req, res, next) => {
  const u = req.user
  const public = {
    _id: u._id.valueOf(),
    username: u.username,
    email: u.email
  }
  c(public)
  let token
  try {
    token = jwt.sign(public, process.env.JWT_SECRET)
    c(token)
  } catch (error) {
    console.log(error);
    return res.send('jwt error')
  }
  try {
    // const user = await userModel.findById(public._id)
    // user.jwt_token.push(token)
    // const result = await user.save()
    const result = await utils.addToken(public._id, token)
    c(result)
    return res.json({
      token: token,
      userinfo: public
    })
  } catch (error) {
    res.send('database error')
  }
}

router.post('/login', passport.authenticate('local'), (req, res, next) => {
  if(req.authInfo.failInfo) {
    res.send(req.authInfo.failInfo)
  } else {
    next()
  }
}, signJWT)

router.post('/register',
// the measurements is not ideal, it is just for testing and practice
body('username').isAlphanumeric(undefined, {ignore: ' -_'}).isLength({min: 2, max: 15}),
body('email').isEmail(),
body('password').isLength({min: 3, max: 10}),
async (req, res) => {
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    return res.json({errors: errors.array()})
  }
  const d = req.body;
  // const user = await userModel.findOne({email: d.email})
  const user = await utils.findByEmail(d.email)
  if(user) {
    return res.json({errors: [{value: d.email, msg: 'email already registered'}]})
  }
  try {
    const hash = await bcrypt.hash(d.password, 10)
    // const newUser = new userModel({
    //   username: d.username,
    //   email: d.email,
    //   unhashed_password: d.password,
    //   hashed_password: hash
    // })
    // const result = await newUser.save();
    const thedoc = {
      username: d.username,
      email: d.email,
      unhashed_password: d.password,
      hashed_password: hash
    }
    const result = await utils.insertNewUser(thedoc)
    c(result)
    res.send('ok')
  } catch (error) {
    c(error)
    res.send('register fail')
  }
})

const verifyToken = async (req, res, next) => {
  c('verification running')
  const authorization = req.headers.authorization
  if (!authorization) {
    c('no authorization header')
    return res.send('rejected')
  }
  token = authorization.split(' ')[1]
  if (!token) {
    c('token is a falsy value')
    return res.send('rejected')
  }
  // const user = await userModel.findOne({ jwt_token: token })
  const user = await utils.findByJwt(token)
  if (!user) {
    c('no user with that token')
    return res.send('rejected')
  }
  req.theUserDoc = user
  try {
    tokenStatus = jwt.verify(token, process.env.JWT_SECRET)
    c('user found, token accepted')
    return next()
  } catch (error) {
    c('user found, token rejected')
    return res.send('rejected')
  }
}

router.get('/verifytoken', verifyToken, async (req, res) => {
  const {
    _id, jwt_token, unhashed_password,
    hashed_password, counter, __v, profileImage,
    ...public
  } = req.theUserDoc
  return res.json({status: 'ok', userinfo: public})
})

router.get('/logout', async (req, res) => {
  console.log('logout running...');
  const token = req.headers.authorization.split(' ')[1]
  // token will return a string of null if no token found...
  if(token !== 'null') {
    // const user = await userModel.findOne({jwt_token: token})
    const result = await utils.findAndRemoveJWT(token)
    if(!result.acknowledged) return res.json({error: 'fail to remove jwt, unkown'})
    if(result.matchedCount < 1) return res.json({error: 'database does not have that token'})
    if(result.modifiedCount < 1) return res.json({error: 'token found but fail to modify'})

    // if(user) {
    //   const tokenIndex = user.jwt_token.indexOf(token)
    //   user.jwt_token.splice(tokenIndex, 1)
    //   const result = await user.save()
    //   c(result)
    // } else {
    //   c('database does not have that token...')
    // }

    res.send('token deleted')
  } else {
    c('token null')
    res.send('token null')
  }
})

router.post('/changeusername', verifyToken, async (req, res) => {
  const newUsername = req.body.newusername
  // const {profileImage, ...tolog} = req.theUserDoc
  // console.log(tolog);
  const result = await utils.changeUsername(newUsername, req.theUserDoc._id)
  if(result.error) return res.json(result)
  return res.json({status: 'ok'})
})

router.get('/testme', (req, res) => {
  res.send('ok faiz')
})

module.exports = {
  verifyToken,
  userRouter: router
}