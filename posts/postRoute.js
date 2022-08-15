const router = require('express').Router()
const { body, validationResult } = require('express-validator')
// const { paginationModel } = require('../user/userModel')
const { verifyToken } = require('../user/userRoute')
const formPageArr = require('./postUtils')
// const { secretModel } = require('./secretModel')
const createDOMPurify = require('dompurify')
const {JSDOM} = require('jsdom')
const multer = require('multer')
const utils = require('./secretUtils')()

const c = console.log
const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window)
const upload = multer()

router.post('/postsecret',
  // [
  //   // the isLength is broken, if min = 0 then max will not be accepted, if min > 0 then it will always return
  //   // error
  //   body('content').isLength({min: 1, max: 10}).withMessage('content length invalid')
  // ],
  verifyToken, upload.single('audiobuffer'), async (req, res) => {
    // const errors = validationResult(req)
    // if(!errors.isEmpty()) {
    //   return res.json({errors: errors.array()})
    // }
    if(!req.body.content && !req.file) return res.json({errors: 'nothing to save'})
    if(req.body.content.length > 500) return res.json({errors: 'content too long'})
    const purified = DOMPurify.sanitize(req.body.content)
    let newDoc;
    if(req.file) {
      // newDoc = new secretModel({
      //   creatorId: req.theUserDoc._id,
      //   content: purified,
      //   audio: {
      //     buffer: req.file.buffer,
      //     mimetype: req.file.mimetype
      //   }
      // })
      newDoc = {
        creatorId: req.theUserDoc._id,
        content: purified,
        audio: {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype
        }
      }
    } else {
      // newDoc = new secretModel({
      //   creatorId: req.theUserDoc._id,
      //   content: purified
      // })
      newDoc = {
        creatorId: req.theUserDoc._id,
        content: purified
      }
    }
    // const result = await newDoc.save()
    // c(result)
    const result = await utils.insertOneSecret(newDoc)
    if(result.error) return res.json(result)
    console.log(newDoc);
    return res.send('ok')
  })

// router deletesecret accepts secret number to delete
router.post('/deletesecret',
  verifyToken,
  async (req, res) => {
    const secretN = req.body.secretNumber
    // const numberArr = await paginationModel.findOne({userid: req.theUserDoc._id})
    // const secretIndex = numberArr.secret_numbers.indexOf(secretN)
    // if(!secretIndex || secretIndex === -1) {
    //   c(secretIndex)
    //   return res.send('secret number not found')
    // }
    // // update the number array doc
    // numberArr.secret_numbers.splice(secretIndex, 1)
    // const updatedNumberArr = await numberArr.save()
    // c(updatedNumberArr)
    // const deletedSecretResult = await secretModel.findOneAndDelete({creatorId: req.theUserDoc._id, n: secretN})
    // c(deletedSecretResult)
    const result = await utils.deleteSecret(req.theUserDoc._id, secretN)
    return res.json(result)
  })

router.get('/getsecrets', async (req, res) => {
  const idIndex = req.query.idIndex
  const limit = req.query.limit || 10
  // let secrets;
  // if(!idIndex) {
  //   secrets = await secretModel.find().sort({_id: -1}).limit(limit)
  // } else {
  //   secrets = await secretModel.find({_id: {$lt: idIndex}}).sort({_id: -1}).limit(limit)
  //   // even if the doc that have the idindex is already deleted, its id can still be used
  // }
  const result = await utils.getSecret_forhomepage(idIndex, limit)
  res.json(result)
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
    // const paginationDoc = await paginationModel.findOne({userid: userid})
    const paginationDoc = await utils.getPaginationByID(userid)
    const secretNumbers = paginationDoc.secret_numbers
    c(secretNumbers)
    // const skips = (ondemandPage - 1) * docPerPage
    const skips = secretNumbers.length - (docPerPage * ondemandPage)
    const nonNegativeSkip = skips < 0 ? 0 : skips
    const sliceCount = skips < 0 ? secretNumbers.length % docPerPage : docPerPage
    c(sliceCount);
    const numbersInOnePage = secretNumbers.slice(nonNegativeSkip, nonNegativeSkip + sliceCount)
    c(numbersInOnePage);
    // secrets = await secretModel.find({
    //   creatorId: userid, n: {$in: numbersInOnePage}
    // }).sort({_id: -1})
    secrets = await utils.getusersecret_byN(userid, numbersInOnePage)

    const totalPages = Math.ceil(secretNumbers.length / docPerPage)
    if(ondemandPage > totalPages || ondemandPage < 1) {
      if(totalPages < 1) {
        return res.send('empty')
      }
      return res.json({error: 'demanded page does not exist'})
    }
    arrayOfPagesInThisGroup = formPageArr(totalPages, pagePerGroup, ondemandPage)

  } else {
    if(idIndex) {
      // secrets = await secretModel.find({creatorId: userid, _id: {$gt: idIndex}})
      // .sort({_id: -1})
      // .limit(docPerPage)
      secrets = await utils.getusersecret_byIDIndex(userid, idIndex, docPerPage)
    } else {
      // secrets = await secretModel.find({creatorId: userid})
      // .sort({_id: -1})
      // .limit(docPerPage)
      secrets = await utils.getusersecret_byIDIndex(userid, undefined, docPerPage)
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
    // secret = await secretModel.findById(id)
    secret = await utils.getSecretById_forVote(id)
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
  // const result = await secret.save()
  const result = await utils.updateSecret(id, secret)
  c(result)
  return res.send('ok')
})

router.post('/bookmarksecret', verifyToken, async (req, res) => {
  console.log(req.body)
  console.log(req.theUserDoc._id)
  const result = await utils.bookmarkaSecret(req.body.secretid, req.theUserDoc._id)
  console.log(result);
  if(result.error) return res.json(result)
  return res.send('ok')
})

router.post('/removebookmark', verifyToken, async (req, res) => {
  const result = await utils.removeBookmark(req.body.secretid, req.theUserDoc._id)
  console.log(result)
  if(result.error) return res.json(result)
  return res.send('ok')
})

router.post('/getbookmarks', verifyToken, async (req, res) => {
  const result = await utils.getBookmarked(req.theUserDoc._id, req.body.startfrom, req.body.limit, req.body.back)
  if(result.error) return res.json(result)
  if(result.length < 1) return res.send('empty')
  return res.json({result: result.result, arrayOfPages: 'bookmark', nextbutton: result.nextbutton, backbutton: result.backbutton})
})

router.post('/comment', verifyToken, async (req, res) => {
  const result = await utils.updateComment(req.body.update, req.body.content, req.body.commindex, req.body.secretid, req.theUserDoc._id)
  if(result.error) return res.json(result)
  if(req.body.update === 'get') return res.json(result)
  return res.send('ok')
})

module.exports = router