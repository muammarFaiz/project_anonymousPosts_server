const { ObjectId } = require('mongodb')

const secretColl = require('../mongodbnativeconfig').collection('secrets')
const userColl = require('../mongodbnativeconfig').collection('users')
const paginationColl = require('../mongodbnativeconfig').collection('paginations')

const secretUtils = () => {
  const projectionforsecrets = {'comment.creator': 0, 'comment.content': 0}

  const idfier = (id) => {
    if(typeof(id) === 'string') {
      try {
        return ObjectId(id)
      } catch (e) {
        return {error: 'not an id'}
      }
    }
    return id
  }

  const dateCreator = () => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
  }

  /**
   * insert one secret
   * @param {obj} doc data object for the secret document
   * @returns if fail throw error or {error: 'something'}, else return the result of secretColl.insertOne
   */
  const insertOneSecret = async (doc) => {
    const useridobj = idfier(doc.creatorId)
    if(useridobj.error) return useridobj
    // let useridobj = typeof(doc.creatorId) === 'string' ? ObjectId(doc.creatorId) : doc.creatorId

    // update user secret counter
    const user = await userColl.updateOne({_id: useridobj}, {$inc: {counter: 1}})
    if(!user.acknowledged) return {error: 'unknown fail increment user counter'}
    if(!user.matchedCount) return {error: 'user not found'}
    if(!user.modifiedCount) return {error: 'user found but fail to increment'}

    // update user pagination
    const updatedUser = await userColl.findOne({_id: useridobj}, {projection: {counter: 1}})
    const updatedpagination = await paginationColl.updateOne({userid: useridobj}, {$push: {secret_numbers: updatedUser.counter}})
    if (!updatedpagination.acknowledged) return { error: 'pagination update unknown fail' }
    if (!updatedpagination.matchedCount) return { error: 'no pagination document have that id' }
    if (!updatedpagination.modifiedCount) return { error: 'pagination doc found, update failed' }

    // save the secret
    const res = await secretColl.insertOne({...doc, vote_count: 'init', date_created: dateCreator(), n: updatedUser.counter})
    return res
  }

  /**
   * update the pagination and then delete the secret
   * @param {string} userid accepts string or ObjectId
   * @param {number} secretNumber the number of the secret to delete
   * @returns 'ok' if success, throw Error or {error: 'somehing'} if fail
   */
  const deleteSecret = async (userid, secretNumber) => {
    const user_objectId = idfier(userid)
    if(user_objectId.error) return user_objectId
    // let user_objectId = typeof(userid) === 'string' ? ObjectId(userid) : userid
    // remove one number in pagination
    const response = await paginationColl.updateOne({userid: user_objectId}, {$pull: {secret_numbers: secretNumber}})
    if(!response.acknowledged) return {error: 'unnkown pagination update fail'}
    if(!response.matchedCount) return {error: 'pagination with that id not found'}
    if(!response.modifiedCount) return {error: 'pagination found but update failed'}
    // remove the secret
    const response2 = await secretColl.findOneAndDelete({creatorId: user_objectId, n: secretNumber})
    if(!response2.value) return {error: 'unkown failure deleting the secret'}
    if(!response2.ok) return {error: 'unkown failure deleting the secret'}
    return 'ok'
  }

  /**
   * 
   * @param {*} idIndex 
   * @param {*} limit 
   * @returns 
   */
  const getSecret_forhomepage = async (idIndex, limit) => {
    let secrets
    if (!idIndex) {
      secrets = await secretColl.find({}, {sort: {_id: -1}, limit: limit, projection: projectionforsecrets}).toArray()
    } else {
      const objectid_index = idfier(idIndex)
      if(objectid_index.error) return objectid_index
      // const objectid_index = typeof(idIndex) === 'string' ? ObjectId(idIndex) : idIndex
      // even if the doc that have the idindex is already deleted, its id can still be used (mongodb feature)
      secrets = await secretColl.find({_id: {$lt: objectid_index}}, {sort: {_id: -1}, limit: limit, projection: projectionforsecrets}).toArray()
    }
    return {result: secrets}
  }

  /**
   * 
   * @param {string} userid string or ObjectId
   * @returns result of paginationColl.findOne
   */
  const getPaginationByID = async (userid) => {
    const objectid_user = idfier(userid)
    if(objectid_user.error) return objectid_user
    // objectid_user = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const result = await paginationColl.findOne({userid: objectid_user})
    return result
  }
  
  const getusersecret_byN = async (userid, nArray) => {
  const objectid_user = idfier(userid)
  if(objectid_user.error) return objectid_user
  // const objectid_user = typeof(userid) === 'string' ? ObjectId(userid) : userid
  const result = await secretColl.find({creatorId: objectid_user, n: {$in: nArray}}, {sort: {_id: -1}, projection: projectionforsecrets}).toArray()
  return result
  }
  
  const getusersecret_byIDIndex = async (userid, idIndex, docperpage) => {
    const objectid_user = idfier(userid)
    if(objectid_user.error) return objectid_user
    // const objectid_user = typeof(userid) === 'string' ? ObjectId(userid) : userid
    let result
    if(idIndex) {
      const objectid_index = idfier(idIndex)
      if(objectid_index.error) return objectid_index
      // const objectid_index = typeof(idIndex) === 'string' ? ObjectId(idIndex) : idIndex
      result = await secretColl.find({creatorId: objectid_user, _id: {$lt: objectid_index}}, {sort: {_id: -1}, limit: docperpage, projection: projectionforsecrets}).toArray()
    } else {
      result = await secretColl.find({creatorId: objectid_user}, {sort: {_id: -1}, limit: docperpage, projection: projectionforsecrets}).toArray()
    }
    return result
  }

  const getSecretById_forVote = async (id) => {
    const objectid_secret = idfier(id)
    if(objectid_secret.error) return objectid_secret
    // const objectid_secret = typeof(id) === 'string' ? ObjectId(id) : id
    const result = await secretColl.findOne({_id: objectid_secret}, {projection: projectionforsecrets})
    const {_id, __v, ...toedit} = result
    return toedit
  }
  
  const updateSecret = async (id, newData) => {
    const objectid_secret = idfier(id)
    if(objectid_secret.error) return objectid_secret
    // const objectid_secret = typeof(id) === 'string' ? ObjectId(id) : id
    const result = await secretColl.updateOne({_id: objectid_secret}, {$set: newData})
    if(!result.acknowledged) return {error: 'unkown fail to update secret'}
    if(!result.matchedCount) return {error: 'secret to update not found'}
    if(!result.modifiedCount) return {error: 'secret found, fail to update'}
    return result
  }
  
  const bookmarkaSecret = async (secretId, userid) => {
    const objectid_user = idfier(userid)
    if(objectid_user.error) return objectid_user
    // const objectid_user = typeof (userid) === 'string' ? ObjectId(userid) : userid
    const objectid_secret = idfier(secretId)
    if(objectid_secret.error) return objectid_secret
    // const objectid_secret = typeof (secretId) === 'string' ? ObjectId(secretId) : secretId
    
    // const result = await userColl.updateOne({_id: objectid_user}, {$push: {savedsecrets: objectid_secret}})
    const result = await secretColl.updateOne({_id: objectid_secret}, {$push: {bookmarkedBy: objectid_user}})
    if(!result.acknowledged) return {error: 'unkown fail to bookmark the secret'}
    if(!result.matchedCount) return {error: 'secret id not found'}
    if(!result.modifiedCount) return {error: 'secret found, fail to update'}
    return result
  }
  
  const removeBookmark = async (secretId, userid) => {
    const objectid_user = idfier(userid)
    if(objectid_user.error) return objectid_user
    // const objectid_user = typeof (userid) === 'string' ? ObjectId(userid) : userid
    const objectid_secret = idfier(secretId)
    if(objectid_secret.error) return objectid_secret
    // const objectid_secret = typeof (secretId) === 'string' ? ObjectId(secretId) : secretId
    // const result = await userColl.updateOne({ _id: objectid_user }, { $set: { savedsecrets: objectid_secret } })
    const result = await secretColl.updateOne({_id: objectid_secret}, {$pull: {bookmarkedBy: objectid_user}})
    if (!result.acknowledged) return { error: 'unkown fail to bookmark the secret' }
    if (!result.matchedCount) return { error: 'user id not found' }
    if (!result.modifiedCount) return { error: 'user found, fail to update' }
    return result
  }
  
  const getBookmarked = async (userid, idindex, limit, back) => {
    const objectid_user = idfier(userid)
    if(objectid_user.error) return objectid_user
    // const objectid_user = typeof(userid) === 'string' ? ObjectId(userid) : userid
    let result
    if(idindex) {
      const objectid_index = idfier(idindex)
      if(objectid_index.error) return objectid_index
      // const objectid_index = typeof (idindex) === 'string' ? ObjectId(idindex) : idindex
      if(back) {
        result = await secretColl.find({bookmarkedBy: objectid_user, _id: {$gt: objectid_index}}, {limit: limit, sort: {_id: -1}, projection: projectionforsecrets}).toArray()
      } else {
        result = await secretColl.find({bookmarkedBy: objectid_user, _id: {$lt: objectid_index}}, {limit: limit, sort: {_id: -1}, projection: projectionforsecrets}).toArray()
      }
    } else {
      result = await secretColl.find({bookmarkedBy: objectid_user}, {limit: limit, sort: {_id: -1}, projection: projectionforsecrets}).toArray()
    }
    if(!result) return {error: 'fail to get bookmarked secrets'}

    let nextbutton = false
    if(result.length >= limit) {
      const nextSecret = await secretColl.findOne({bookmarkedBy: objectid_user, _id: {$lt: result[limit - 1]._id}}, {projection: {creatorId: 1}})
      if(nextSecret) nextbutton = true
    }
    let backbutton = false
    if(result.length > 1) {
      const prevSecret = await secretColl.findOne({bookmarkedBy: objectid_user, _id: {$gt: result[0]._id}}, {projection: {creatorId: 1}})
      if(prevSecret) backbutton = true
    }
    return {result: result, nextbutton, backbutton}
  }

  const updateComment = async (update, content, commIndex, secretid, userid) => {
    let result, modifier
    const objsecretid = idfier(secretid)
    if(!objsecretid) return {error: 'secret id is empty'}
    if(objsecretid.error) return objsecretid
    if(update === 'save') {
      const objuserid = idfier(userid)
      if(!objuserid) return {error: 'user id is empty'}
      if(objuserid.error) return objuserid
      modifier = {$push: {comment: {content: content, vote: 0, creator: objuserid}}}
    }
    if(['up', 'down'].includes(update)) modifier = {$inc: {[`comment.${commIndex}.vote`]: update === 'up' ? 1 : -1}}
    if(['save', 'up', 'down'].includes(update)) {
      result = await secretColl.updateOne({_id: objsecretid}, modifier)
      if (!result.acknowledged) return { error: 'unkown fail' }
      if (!result.matchedCount) return { error: 'secret not found' }
      if (!result.modifiedCount) return { error: 'secret found, fail to update' }
    }
    
    if(update === 'get') {
      result = await secretColl.findOne({_id: objsecretid}, {projection: {comment: 1}})
      if(result._id) result = !result.comment ? [] : result.comment
    }
    if(update === 'del') {
      result = await secretColl.updateOne({_id: objsecretid}, {$set: {[`comment.${commIndex}`]: 'x'}})
      if(result.acknowledged && result.matchedCount && result.modifiedCount) {
        result = await secretColl.updateOne({_id: objsecretid}, {$pull: {comment: 'x'}})
        if (!result.acknowledged) return { error: 'unkown fail' }
        if (!result.matchedCount) return { error: 'secret not found' }
        if (!result.modifiedCount) return { error: 'secret found, fail to delete' }
      } else {
        return {error: 'fail to update comment for deletion'}
      }
    }
    return result
  }

  return {
    insertOneSecret, deleteSecret, getSecret_forhomepage, getPaginationByID, getusersecret_byN,
    getusersecret_byIDIndex, getSecretById_forVote, updateSecret, bookmarkaSecret, removeBookmark, getBookmarked,
    updateComment
  }
}
module.exports = secretUtils