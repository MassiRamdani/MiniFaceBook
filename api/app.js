const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const helmet = require('helmet');
const webpush = require('web-push');

// DEVELOPEMENT : Pour le log !
const Cookies = require('cookies');
const cryptojs = require('crypto-js');

const userRoutes = require('./routes/user');
const postRoutes = require('./routes/post');
const commentRoutes = require('./routes/comment');
const likeRoutes = require('./routes/like');
const notifRoutes = require('./routes/notif');

// Lancement de Express
const app = express();

/**
 * MIDDLEWARES
 */
// Configuration cors
app.use((req, res, next) => {
  //res.setHeader('Access-Control-Allow-Origin', 'https://paolibook.herokuapp.com');
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:4200');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

/*app.use(function (req, res, next) {
  //Enabling CORS
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type,Accept, x-client-key, x-client-token, x-client-secret, Authorization");
  next();
});*/

//app.use(cors());

// Parse le body des requetes en json
app.use(bodyParser.json());
// Sécurisation des headers
app.use(helmet());
// Log toutes les requêtes passées au serveur
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
// // DEVELOPEMENT : log de la requete en console
// app.use((req, res, next) => {
//   const cryptedCookie = new Cookies(req, res).get('snToken');
//   const cookie = cryptedCookie ? JSON.parse(cryptojs.AES.decrypt(cryptedCookie, process.env.COOKIE_KEY).toString(cryptojs.enc.Utf8)) : undefined;
//   const toBeDisplayed = {
//     date: new Date().toString(),
//     method: req.method,
//     url: req.url,
//     body: req.body,
//     cookie: cookie
//   }
//   console.log(toBeDisplayed);
//   next();
// })


/**
 * ROUTES
 */
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/api/user', userRoutes);
app.use('/api/post', postRoutes);
app.use('/api/comment', commentRoutes);
app.use('/api/like', likeRoutes);
app.use('/api/notif', notifRoutes);

/**
 * WEB PUSH
 */
console.log(webpush.generateVAPIDKeys());

const publicKey = 'BLBuFp4WTSzS9NDmgRoex_7GAwAI6_DdjNOcD8-0IG74iDIQk7wQvIZmqWE5t8W0PK29KdjB9lxOS9jDfLlqjAA';
const privateKey = '_IQOuVkjwpzmJQPDf5YWbBx9-cH7zPtRzxacxvwi5Hg';

const sub = {
  "endpoint":"https://wns2-par02p.notify.windows.com/w/?token=BQYAAABwwPCCCqL7AZ9UdvhxKAESCJa1Fb5kIj0QZIiFuacn5MK9RKCd6JR8yTANQZ1YVpzveInSDRQEmhJP%2faboLVWrYDJoNFQqd33cwVQksTHQS2EmPyvJiNT8ac26AhE8KITGDCmDfHapacgIybJJR%2ffetfQsw8pFZHtpVQGNvBJu07PgcgXgHNmAgB9aFj7s%2b7mEFbPeTR5stDmxhEKqrCuvCNn9l7xqTQemJatHghxG%2brMzt9hFXjjpO57DeQ5OH6Hjp%2fusT7dTJQa9%2fls%2fa7Wio9I4r9NJS8FcCqgAYq0dm5%2fBMz0mDOws%2feqWI8ToH50%3d",
  "expirationTime":null,
  "keys":{
    "p256dh":"BFDzeWBTaol4Vm-UvHlFo-sF4JLXU-1jwUv43bkfgHL9ivUb3rHa_dvZVqZgOK4yiGTGoDBVpBZ18Oo2ZtN3RBs",
    "auth":"Rg7xuHpbs_LgVNKDLnWt9A"}
    };

webpush.setVapidDetails('mailto:example@yourdomain.org', publicKey, privateKey);

const payLoad = {
  notification: {
    data: {  },
    title: 'Welcome to PaoliBook',
    vibrate: [100, 50, 100],
  },
};


//webpush.sendNotification(sub, JSON.stringify(payLoad));

module.exports = app;
