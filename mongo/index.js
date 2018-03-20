const mongoose = require("mongoose");
const Promise = require("bluebird");
mongoose.Promise = Promise;

const config = require("../config").mongoDB;

const dbString = "mongodb://" + config.dbIp + ":" + config.dbPort + "/" + config.dbName;

let options = {
    'user': config.user,
    'pass': config.pass,
    autoReconnect:true,
    promiseLibrary: Promise
};

function init() {
    mongoose.connection.on('open',function() {
        console.log("数据库连接成功:" + config.dbIp + ",端口:" + config.dbPort + ' 数据库：' + config.dbName);
    });

    mongoose.connection.on('error',function(error) {
        console.log('数据库连接断开，原因为：',error);
    });

    return mongoose.connect(dbString, options);
}

module.exports.dbString = dbString;
module.exports.init = init;