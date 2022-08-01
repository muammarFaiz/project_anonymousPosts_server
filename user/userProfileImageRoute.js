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

router.get('/userimage', verifyToken, (req, res) => {
  const imageInfo = req.theUserDoc.profileImage
  let buffer1
  try {
    buffer1 = imageInfo.buffer.toString('base64')
  } catch (error) {
    console.log(error);
  }
  
  res.json({mimetype: imageInfo.mimetype, base64: buffer1})
})

module.exports = router