require('dotenv').config()
const { MongoClient, ObjectId } = require("mongodb");

const url = process.env.ATLAS_URL;
const client = new MongoClient(url)

async function connect() {
  try {
    await client.connect()
    console.log('connected to mongodb atlas');
    // findme() 
  } catch (error) {
    console.log(error);
  }
}
connect()

// async function findme() {
//   const db = client.db('anonymshare_project2')
//   const coll = db.collection('secrets')
//   // const coll = db.collection('users')
//   // const result = await coll.updateOne({ _id: ObjectId('62c169515dcf3ae01b93010c')}, {$push: {jwt_token: 'test me xxxxxxx'}})
//   // const result = await coll.insertOne({name: 'pussy master', ability: 'deep vibrations'})
//   // const result = await coll.findOne({}, {projection: {email: 1}})
//   // const result = await coll.updateOne({ jwt_token: 'test me xxxxxxx' }, { $pull: { jwt_token: 'test me yyyy'}})
//   // const result = await coll.findOneAndDelete({ "name": "pussy master" })
//   const result = await coll.find({z: 'x'}, {
//     // projection: { username: 1 },
//     sort: { _id: -1 },
//     limit: 10
//   }).toArray()
//   // console.log(result.insertedId.toString());
//   console.log(result);
// }

const db = client.db('anonymshare_project2')

module.exports = db