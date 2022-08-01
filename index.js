require('dotenv').config()
const express = require('express');
const session = require('express-session');
const cors = require('cors');
// require('./mongooseConfig')
require('./mongodbnativeconfig')
// now the mongodb native driver is configured, now replace the requests on all routes
require('./user/passportLocalStrategy')
const routes = require('./routes')

const app = express();
const c = console.log;

app.use(cors());
app.use(express.urlencoded({limit: '50mb', extended: true }));
app.use(express.json({limit: '50mb'}));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

app.use(routes);

app.listen(process.env.PORT || 3001, () => console.log('server running 3001'));