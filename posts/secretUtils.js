const { ObjectId } = require('mongodb')

const secretColl = require('../mongodbnativeconfig').collection('secrets')
const userColl = require('../mongodbnativeconfig').collection('users')
const paginationColl = require('../mongodbnativeconfig').collection('paginations')

const secretUtils = () => {

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
    let useridobj = typeof(doc.creatorId) === 'string' ? ObjectId(doc.creatorId) : doc.creatorId

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
    let user_objectId = typeof(userid) === 'string' ? ObjectId(userid) : userid
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
    const objectid_index = typeof(idIndex) === 'string' ? ObjectId(idIndex) : idIndex
    if (!idIndex) {
      secrets = await secretColl.find({}, {sort: {_id: -1}, limit: limit}).toArray()
    } else {
      // even if the doc that have the idindex is already deleted, its id can still be used (mongodb feature)
      secrets = await secretColl.find({_id: {$lt: objectid_index}}, {sort: {_id: -1}, limit: limit}).toArray()
    }
    return {result: secrets}
  }

  /**
   * 
   * @param {string} userid string or ObjectId
   * @returns result of paginationColl.findOne
   */
  const getPaginationByID = async (userid) => {
    objectid_user = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const result = await paginationColl.findOne({userid: objectid_user})
    return result
  }

  const getusersecret_byN = async (userid, nArray) => {
    const objectid_user = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const result = await secretColl.find({creatorId: objectid_user, n: {$in: nArray}}, {sort: {_id: -1}}).toArray()
    return result
  }

  const getusersecret_byIDIndex = async (userid, idIndex, docperpage) => {
    const objectid_user = typeof(userid) === 'string' ? ObjectId(userid) : userid
    const objectid_index = typeof(idIndex) === 'string' ? ObjectId(idIndex) : idIndex
    let result
    if(idIndex) {
      result = await secretColl.find({creatorId: objectid_user, _id: {$lt: objectid_index}}, {sort: {_id: -1}, limit: docperpage}).toArray()
    } else {
      result = await secretColl.find({creatorId: objectid_user}, {sort: {_id: -1}, limit: docperpage}).toArray()
    }
    return result
  }

  const getSecretById_forVote = async (id) => {
    const objectid_secret = typeof(id) === 'string' ? ObjectId(id) : id
    const result = await secretColl.findOne({_id: objectid_secret})
    const {_id, __v, ...toedit} = result
    return toedit
  }
  
  const updateSecret = async (id, newData) => {
    const objectid_secret = typeof(id) === 'string' ? ObjectId(id) : id
    const result = await secretColl.updateOne({_id: objectid_secret}, {$set: newData})
    if(!result.acknowledged) return {error: 'unkown fail to update secret'}
    if(!result.matchedCount) return {error: 'secret to update not found'}
    if(!result.modifiedCount) return {error: 'secret found, fail to update'}
    return result
  }

  return {
    insertOneSecret, deleteSecret, getSecret_forhomepage, getPaginationByID, getusersecret_byN,
    getusersecret_byIDIndex, getSecretById_forVote, updateSecret
  }
}
module.exports = secretUtils