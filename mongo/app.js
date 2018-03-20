const mongoose = require('mongoose');

const app = new mongoose.Schema(
    {
        bundleId: {type: String}, //包名
        bundleName: {type: String}, //应用名称
        system: {type: String}, //操作系统
        url: {type: String}, //马甲包url
        isStop: {type: Boolean} //是否停用
    }
);

module.exports = mongoose.model('app', app);