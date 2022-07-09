const router = require('express').Router()
const {userRouter} = require('./user/userRoute')
const postRoute = require('./posts/postRoute')

router.use((req, res, next) => {
  console.log('express running******************************');
  console.log(req.path);
  next()
})
router.use(userRouter)
router.use(postRoute)

module.exports = router;
