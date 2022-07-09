const mongoose = require('mongoose');

const createDate = () => {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  unhashed_password: {
    type: String
  },
  hashed_password: {
    type: String,
    required: true
  },
  googleId: {
    type: String
  },
  jwt_token: {
    type: [String]
  },
  created_date: {
    type: String,
    default: createDate
  },
  counter: {
    type: Number,
    default: 0
    // is default run everytime a user is modified or not???
  }
})

const paginationModel = mongoose.model('pagination', new mongoose.Schema({
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  secret_numbers: [Number]
}))

userSchema.pre('save', async function() {
  const pagination = await paginationModel.findOne({userid: this._id})
  if(!pagination) {
    const newPagination = new paginationModel({userid: this._id})
    const saved = await newPagination.save()
    console.log(saved);
  }
})

const userModel = mongoose.model('user', userSchema)


module.exports = {
  userModel,
  paginationModel
};