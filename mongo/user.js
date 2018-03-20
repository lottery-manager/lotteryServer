const mongoose = require('mongoose');

const user = new mongoose.Schema(
    {
        telNo: {type: String, unique: true}, //用户手机号
        password: {type: String}, //密码
        nickname: {type: String}, //昵称
        name: {type: String}, //姓名
        sex: {type: Number}, //性别(0:男,1:女)
        avatar: {type: String}, //头像
        registerTime: {type: String}, //注册时间
        isStop: {type: Boolean}, //是否停用
        src: {bundleId: {type: String}, bundleName: {type: String}, system: {type: String}}//用户注册来源
    }
);

module.exports = mongoose.model('user', user);