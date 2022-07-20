const router = require('express').Router()
const {userRouter} = require('./user/userRoute')
const postRoute = require('./posts/postRoute')
const userImgRouter = require('./user/userProfileImageRoute')

router.use((req, res, next) => {
  console.log('express running******************************');
  console.log(req.path);
  next()
})
router.use(userRouter)
router.use(postRoute)
router.use(userImgRouter)

module.exports = router;
