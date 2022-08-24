const router = require('express').Router()
const multer = require('multer');
const { verifyToken } = require('./userRoute');
const userUtils = require('./userUtils');

const upload = multer()
const utils = userUtils()

router.post('/profileImg', verifyToken, async (req, res) => {
  const b64 = req.body.img.base64.split(',').slice(1).join('')
  const newBuffer = new Buffer.from(b64, 'base64')
  const {base64, ...imgInfo} = req.body.img
  const imgObj = {...imgInfo, buffer: newBuffer}
  const result = await utils.saveImg(imgObj, req.theUserDoc._id)
  if(result.error) return res.json(result)
  res.send('ok')
})

router.get('/userimage', verifyToken, async (req, res) => {
  const imageInfo = await utils.getImage(req.theUserDoc._id)
  let buffer1
  try {
    buffer1 = imageInfo.buffer.toString('base64')
  } catch (error) {
    console.log(error);
  }
  if(buffer1) {
    res.json({mimetype: imageInfo.mimetype, base64: buffer1})
  } else {
    res.send('none')
  }
})

router.post('/userinfopublic', async (req, res) => {
  console.log(req.body)
  const result = await utils.getUserPublicInfo(req.body.userid)
  res.json(result)
})

router.post('/getimgname', async (req, res) => {
  const result = await utils.getimgandusername(req.body.idarr)
  res.json(result)
})

module.exports = router