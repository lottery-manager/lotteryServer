const mongoose = require('mongoose');

const feedback = new mongoose.Schema(
    {
        creator: {type: String}, //创建者
        content: {type: String}, //意见内容
        contact: {type: String} //联系方式
    }
);

module.exports = mongoose.model('feedback', feedback);