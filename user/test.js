const { default: mongoose } = require("mongoose");
const testModel = mongoose.model('testforindex', new mongoose.Schema({ content: String }), 'testforindex')
module.exports = testModel