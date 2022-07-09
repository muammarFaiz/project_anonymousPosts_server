const mongoose = require('mongoose');

const urlAtlas = process.env.ATLAS_URL;
const local = 'mongodb://localhost:27017/eduwork-1';

mongoose.connect(urlAtlas);

mongoose.connection.on('error', err => console.log(err))
mongoose.connection.once('open', () => console.log('mongoose connection successful'));
