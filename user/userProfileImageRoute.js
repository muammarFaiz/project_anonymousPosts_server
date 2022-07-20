const router = require('express').Router()
const multer = require('multer');
const { verifyToken } = require('./userRoute');

const upload = multer()

router.post('/profileImg', verifyToken, upload.single('img'), async (req, res) => {
  console.log(req.file);
  console.log(req.file.buffer);
  req.theUserDoc.profileImage = req.file
  req.theUserDoc.testBuffer = req.file.buffer
  let result
  try {
    result = await req.theUserDoc.save()
    // console.log(result);
  } catch (error) {
    console.log(error);
  }
  const {buffer, ...imageInfo} = req.file
  res.json({
    ...imageInfo,
    base64: buffer.toString('base64')
  })
})

router.get('/userimage', verifyToken, (req, res) => {
  const imageInfo = req.theUserDoc.profileImage
  const buffer1 = imageInfo.buffer.toString('base64')
  
  res.json({mime: imageInfo.mimetype, base64: buffer1})
})

module.exports = router