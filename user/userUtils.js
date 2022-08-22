const { ObjectId } = require('mongodb')
const sharp = require('sharp')

const userColl = require('../mongodbnativeconfig').collection('users')
const paginationColl = require('../mongodbnativeconfig').collection('paginations')
const secretColl = require('../mongodbnativeconfig').collection('secrets')

const userUtils = () => {
  /**
   * 
   * @param {string} id the id value
   * @param {string} token the token string
  * @returns return the response from db, something like: {acknowledged: true, modifiedCount: 1,
  upsertedId: null, upsertedCount: 0, matchedCount: 1}
   */
  const addToken = async (id, token) => {
    const res = await userColl.updateOne({_id: ObjectId(id)}, {$push: {jwt_token: token}})
    return res
  }

  /**
   * 
   * @param {string} email the user email
   * @returns null if user not found, return the user doc if found
   */
  const findByEmail = async (email) => {
    const res = await userColl.findOne({email: email}, {projection: {savedsecrets: 0, profileImage: 0}})
    return res
  }

  /**
   * insert a new user only
   * @param {obj} userdoc the object as the user doc
   * @returns if fail throw error or return {error: 'something'}, if succeed return something like this:
  {acknowledged: true, insertedId: new ObjectId("62dfb007a01419c00d2f36b5")}
   */
  const insertNewUser = async (userdoc) => {
    const createDate = () => {
      const d = new Date();
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
    }
    const additionals = {
      created_date: createDate(),
      counter: 0
    }
    const res = await userColl.insertOne({...userdoc, ...additionals})
    const res2 = await paginationColl.insertOne({
      userid: res.insertedId,
      secret_numbers: []
    })
    if(!res.acknowledged || !res.insertedId) return {error: 'fail creating user'}
    if(!res2.acknowledged || !res2.insertedId) return {error: 'fail creating pagination'}
    return res
  }

  /**
   * 
   * @param {string} jwt the token
   * @returns null if there is no user with that jwt token, return the user doc if there is any
   */
  const findByJwt = async (jwt) => {
    const res = await userColl.findOne({jwt_token: jwt}, {projection: {savedsecrets: 0, profileImage: 0}})
    return res
  }

  /**
   * 
   * @param {string} jwt the token to delete
   * @returns assuming there is no error it will return something like this: {
  acknowledged: true, modifiedCount: 1, upsertedId: null, upsertedCount: 0, matchedCount: 1}
   */
  const findAndRemoveJWT = async (jwt) => {
    const res = await userColl.updateOne({jwt_token: jwt}, {$pull: {jwt_token: jwt}})
    return res
  }

  /**
   * 
   * @param {ObjectId} id accepts mongodb objectid or the string version
   * @returns null if found nothing, returns the user doc if found
   */
  const findUserById = async (id) => {
    let idobj = id
    if(typeof(id) === 'string') idobj = ObjectId(id)
    const res = await userColl.findOne({_id: idobj}, {projection: {savedsecrets: 0, profileImage: 0}})
    return res
  }

  const changeUsername = async (newName, userid) => {
    if(typeof(newName) !== 'string') return {error: 'newName is not a string'}
    const idobj = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const res = await userColl.updateOne({_id: idobj}, {$set: {username: newName}})
    return res
  }

  const saveImg = async (imgobj, userid) => {
    const idobj = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const res = await userColl.updateOne({_id: idobj}, {$set: {profileImage: imgobj}})
    if(!res.acknowledged || !res.modifiedCount) return {error: 'saving image to db failed'}
    return res
  }
  
  const updateUserBio = async (newbio, userid) => {
    const idobj = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const res = await userColl.updateOne({_id: idobj}, {$set: {bio: newbio}})
    if(!res.acknowledged || !res.modifiedCount) return {error: 'saving bio to db failed'}
    return res
  }
  
  const getImage = async (userid) => {
    const idobj = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const res = await userColl.findOne({_id: idobj}, {projection: {profileImage: 1}})
    if(!res.profileImage) return {error: 'fail to find the user image'}
    return res.profileImage
  }
  
  const getimgandusername = async (idarr) => {
    let objarr = []
    if(Array.isArray(idarr)) {
      idarr.forEach(idstr => {
        const idobj = typeof(idstr) === 'string' ? ObjectId(idstr) : idstr
        objarr.push(idobj)
      });
    }
    let res
    if(objarr.length > 0) res = await userColl.find({_id: {$in: objarr}}, {projection: {profileImage: 1, username: 1}}).toArray()
    if(!res || !Array.isArray(res)) return {error: 'fail to get images'}
    if(res.length > -1) {
      const imporvedImgArr = res.map(async doc => {
        const buff = doc.profileImage.buffer
        const newimg = await sharp(doc.profileImage.buffer.buffer).resize(50, 50).webp().toBuffer()
        let dic = doc
        dic.profileImage.buffer = newimg.toString('base64')
        return dic
      })
      return Promise.all(imporvedImgArr)
    }
  }

  const getUserPublicInfo = async (userid) => {
    const useridobj = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const result = await userColl.findOne({_id: useridobj}, {projection: {username: 1, profileImage: 1, bio:  1}})
    if(result._id) return result
    return {error: 'fail to get the user info'}
  }

  const countdoc = (collection) => {
    return async (req, res, next) => {
      let result
      if (collection === 'secret') {
        const userid = req.theUserDoc._id
        const useridobj = typeof(userid) === 'string' ? ObjectId(userid) : userid
        result = await secretColl.countDocuments({creatorId: useridobj})
        if(typeof(result) === 'number') {
          result < 50 ? next() : res.json({error: 'max secrets limit has been reached'})
        } else {
          res.json({error: 'server error, counting the docs'})
        }
      } else if (collection === 'user') {
        result = await userColl.countDocuments()
        if(typeof(result) === 'number') {
          result < 40 ? next() : res.json({error: 'max users limit has been reached'})
        } else {
          res.json({error: 'server error, counting the docs'})
        }
      }
      console.log(result)
    }
  }

  return {
    addToken, findByEmail, insertNewUser, findByJwt, findAndRemoveJWT, findUserById, changeUsername, saveImg,
    updateUserBio, getImage, getimgandusername, getUserPublicInfo, countdoc
  }
}

module.exports = userUtils