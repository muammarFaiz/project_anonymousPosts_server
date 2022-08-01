const { default: mongoose } = require("mongoose");
const {userModel, paginationModel} = require("../user/userModel");

const secretSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  content: {
    type: String,
    minlength: 1,
    maxlength: 400
  },
  vote_count: {
    type: mongoose.Schema.Types.Mixed,
    default: 'init'
  },
  date_created: {
    type: String,
    default: () => {
      const d = new Date();
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
    }
  },
  n: {
    type: Number,
    immutable: true
  },
  audio: {
    buffer: Buffer,
    mimetype: String
  }
})

secretSchema.pre('save', async function() {
  if(this.vote_count === 'init') {
    let userDoc = await userModel.findById(this.creatorId)
    if(!userDoc) {
      console.log('user not found, why?');
      return
    }
    userDoc.counter++
    const response = await userDoc.save()
    this.n = userDoc.counter
    console.log('result from saving the updated user counter:');
    console.log(response);
    const numberArr = await paginationModel.findOne({userid: userDoc._id})
    if(!numberArr) {
      console.log('pagination doc is not found, why?');
      return
    }
    numberArr.secret_numbers.push(userDoc.counter)
    const updatedNumberArr = await numberArr.save()
    console.log(updatedNumberArr);
  }
})

// all that for nothing?? well not really but now lets just use skip() and remove the secrets and pagination in db
const secretModel = mongoose.model('secret', secretSchema, 'secrets')
module.exports = {
  secretModel
}