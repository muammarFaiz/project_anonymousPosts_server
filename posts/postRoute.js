const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { paginationModel } = require('../user/userModel')
const { verifyToken } = require('../user/userRoute')
const formPageArr = require('./postUtils')
const { secretModel } = require('./secretModel')

const c = console.log

router.post('/postsecret',
  [
    body('content').isLength({min: 1, max: 400}).withMessage('content length invalid').escape()
  ],
  verifyToken,
  async (req, res) => {
  c(req.body)
  const errors = validationResult(req)
  if(!errors.isEmpty()) {
    return res.status(400).json({errors: errors.array()})
  }
  const newDoc = new secretModel({
    creatorId: req.theUserDoc._id,
    content: req.body.content
  })
  const result = await newDoc.save()
  c(result)
  return res.send('ok')
})
// router deletesecret accepts secret number to delete
router.post('/deletesecret',
  verifyToken,
  async (req, res) => {
    const secretN = req.body.secretNumber
    const numberArr = await paginationModel.findOne({userid: req.theUserDoc._id})
    const secretIndex = numberArr.secret_numbers.indexOf(secretN)
    if(!secretIndex || secretIndex === -1) {
      c(secretIndex)
      return res.send('secret number not found')
    }
    // update the number array doc
    numberArr.secret_numbers.splice(secretIndex, 1)
    const updatedNumberArr = await numberArr.save()
    c(updatedNumberArr)
    const deletedSecretResult = await secretModel.findOneAndDelete({creatorId: req.theUserDoc._id, n: secretN})
    c(deletedSecretResult)
    return res.send('ok')
  })

router.get('/getsecrets', async (req, res) => {
  const idIndex = req.query.idIndex
  const limit = req.query.limit || 10
  let secrets;
  if(!idIndex) {
    secrets = await secretModel.find().sort({_id: -1}).limit(limit)
  } else {
    secrets = await secretModel.find({_id: {$lt: idIndex}}).sort({_id: -1}).limit(limit)
    // even if the doc that have the idindex is already deleted, its id can still be used
  }
  res.json({result: secrets})
})

router.post('/usersecrets', verifyToken, async (req, res) => {
  const paginationMode = req.body.paginationMode
  const ondemandPage = req.body.page || 1
  const idIndex = req.body.idIndex
  const docPerPage = req.body.docPerPage || 10
  const pagePerGroup = req.body.pagePerGroup || 10
  const userid = req.theUserDoc._id
  let secrets
  let arrayOfPagesInThisGroup = []

  if(paginationMode === 'on demand') {
    const paginationDoc = await paginationModel.findOne({userid: userid})
    const secretNumbers = paginationDoc.secret_numbers
    c(secretNumbers)
    // const skips = (ondemandPage - 1) * docPerPage
    const skips = secretNumbers.length - (docPerPage * ondemandPage)
    const nonNegativeSkip = skips < 0 ? 0 : skips
    const sliceCount = skips < 0 ? secretNumbers.length % docPerPage : docPerPage
    c(sliceCount);
    const numbersInOnePage = secretNumbers.slice(nonNegativeSkip, nonNegativeSkip + sliceCount)
    c(numbersInOnePage);
    secrets = await secretModel.find({
      creatorId: userid, n: {$in: numbersInOnePage}
    }).sort({_id: -1})

    const totalPages = Math.ceil(secretNumbers.length / docPerPage)
    if(ondemandPage > totalPages || ondemandPage < 1) {
      return res.json({error: 'demanded page does not exist'})
    }
    arrayOfPagesInThisGroup = formPageArr(totalPages, pagePerGroup, ondemandPage)

  } else {
    if(idIndex) {
      secrets = await secretModel.find({creatorId: userid, _id: {$gt: idIndex}})
      .sort({_id: -1})
      .limit(docPerPage)
    } else {
      secrets = await secretModel.find({creatorId: userid})
      .sort({_id: -1})
      .limit(docPerPage)
    }
  }
  return res.json({
    result: secrets,
    arrayOfPages: arrayOfPagesInThisGroup
  })
})

router.get('/vote', verifyToken, async (req, res) => {
  const status = req.query.status
  const id = req.query.id
  let secret
  try {
    secret = await secretModel.findById(id)
  } catch (error) {
    return res.json({error: error.message})
  }
  if(!secret) {
    return res.send('secret not found')
  }
  if(secret.vote_count === undefined || secret.vote_count === 'init') {
    c('vote_count is undefined')
    secret.vote_count = 0
  }
  if(status === 'up') {
    secret.vote_count++
  } else {
    secret.vote_count = secret.vote_count - 1
  }
  const result = await secret.save()
  c(result)
  return res.send('ok')
})

module.exports = router