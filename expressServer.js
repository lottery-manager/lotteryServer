const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const connectMongo = require('connect-mongo');
const http = require('http');
const compress = require('compression');

const mongoose = require('mongoose');
const router = require('./router');

const config = require('./config').webServer;

module.exports.init = function () {
    let sessionStore = connectMongo(session);

    let storeOptions = {
        'secret': config.secret,
        'store': new sessionStore({
            db: mongoose.connection.db
        }),

        resave: false,
        saveUninitialized: false,
        cookie:{maxAge:config.cookieTime}
    };


    let app = express();

    app.use(compress());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json({strict:false}));

    app.use(function(req, res, next) {

        let accessToken = (req.query.accessToken || req.body.accessToken);
        if(accessToken) {
            accessToken = accessToken.replace(/\s/g,'+');
            let cookies = (req.headers && req.headers.cookie) || '' ;
            let cookiesArray = cookies.split(';');
            cookies = 'connect.sid=s:' + accessToken;

            cookiesArray.forEach(function (item) {
                if(!/connect\.sid=s:.*/.test(item)){
                    cookies += ';'+item;
                }
            });
            req.headers.cookie = cookies;
        }

        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "*");
        res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");

        res.header("X-Powered-By",' 3.2.1');

        next();
    });
    app.use(cookieParser(storeOptions.secret));
    app.use(session(storeOptions));
    router.initRouter(app);
    http.createServer(app).listen(config.port,config.listenIp);
    console.log('Server started');
};