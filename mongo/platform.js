const mongoose = require('mongoose');

const platform = new mongoose.Schema(
    {
        appId: {type: String},
        appSecret: {type: String},
        appName: {type: String}, //应用名称
        appSystem: {type: String}, //应用的操作系统
        bundleId: {type: String}, //包名
        from: {type: String}, //来自哪个平台
        isStop: {type: Boolean}
    }
);

module.exports = mongoose.model('platform', platform);