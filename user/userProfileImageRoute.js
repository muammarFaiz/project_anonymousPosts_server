const router = require('express').Router()
const { verifyToken } = require('./userRoute');

router.post('/profileImg', verifyToken, async (req, res) => {
  const b64 = req.body.img.base64.split(',').slice(1).join('')
  const newBuffer = new Buffer.from(b64, 'base64')
  const {base64, ...imgInfo} = req.body.img
  req.theUserDoc.profileImage = {...imgInfo, buffer: newBuffer}
  let result
  try {
    result = await req.theUserDoc.save()
    // console.log(result);
    res.send('ok')
  } catch (error) {
    console.log(error);
    res.send('saving fail')
  }
})

router.get('/userimage', verifyToken, (req, res) => {
  const imageInfo = req.theUserDoc.profileImage
  const buffer1 = imageInfo.buffer.toString('base64')
  
  res.json({mimetype: imageInfo.mimetype, base64: buffer1})
})

module.exports = router