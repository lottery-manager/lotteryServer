/**
 * Created by fx on 17-5-11.
 */
const P = require('bluebird');
const router = require('express').Router();
const mongoose = require('mongoose');
const signature = require('cookie-signature');
const crypto = require('crypto');
const util = require('./util');
const _ = require('lodash');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});
const smsProvider = require('yunpian-sms-client').v2;
const provider = smsProvider.initWithKey('3fe8aa1c8e1201382b288b17a31af1ca');

const config = require('../config').webServer;

const User = require('../mongo/user');

const getRole = (telNo) => {
    if(telNo == '15851939699') {
        return 'admin';
    }
    return 'user';
};

router.route('/getCode')
    .post(upload.none(),(req,res) =>{
        util.jsonResponse(req,res,()=>{
            let telNo = req.body.telNo;
            if (!/(13[0-9]|15[0-9]|17[0-9]|18[0-9]|14[0-9])[0-9]{8}$/.test(telNo)){
                return P.resolve({code:2001,error:'手机号码无效'});
            }

            return User.findOne({telNo:telNo}).then((result)=>{
                let code = Math.random().toString(10).substr(2, 6);

                let text = "【极客Super】您的验证码是"+code+"。如非本人操作，请忽略本短信";

                req.session.telNo = telNo;
                req.session.code = code;
                req.session.save();
                return P.resolve({code:0,data:{code:code}});

                // return provider.sendSingleSms({
                //     mobile: telNo,
                //     text: text,
                //     uid: '234'//可选，请参见官方文档说明
                // }).then(() => {
                //     req.session.telNo = telNo;
                //     req.session.code = code;
                //     req.session.save();
                //     let at = signature.sign(req.session.id,config.secret);
                //     return P.resolve({code:0,data:{accessToken:at}});
                // });
            });
        },util.noAuth)
    });

router.route('/checkCode')
    .post(upload.none(),(req,res) =>{
        util.jsonResponse(req,res,()=>{
            let code = req.body.code;
            let telNo = req.body.telNo;
            if(!code ||!telNo|| !req.session.code ||!req.session.telNo){
                return P.reject('无效参数');
            }

            if(req.session && req.session.code == code && req.session.telNo == telNo){
                return P.resolve({code:0});
            }
            else {
                return P.resolve({code:2000,error:'验证码不正确'});
            }
        },util.noAuth)
    });

//验证访问令牌
router.route('/bindAccessToken')
    .post((req, res) => {
        util.jsonResponse(req,res,(tarData) => {
            return User.findOne({telNo: tarData.session.telNo}).then((result)=>{
                if(result) {
                    let accessToken = (req.query.accessToken || req.body.accessToken);
                    return P.resolve({
                        code: 0,
                        data: {
                            accessToken: accessToken,
                            user: {
                                name: result.name || '',
                                identity: result.identity || '',
                                avatar: result.avatar || '',
                                telNo: result.telNo,
                                nickname: result.nickname || '',
                                sex: result.sex || '',
                                sign: result.sign || '',
                                role: getRole(tarData.session.telNo)
                            }
                        }
                    });
                } else {
                    return P.resolve({code: 2001,error:'令牌已过期'});
                }
            })
        },util.noAuth);
    });

//登录
router.route('/login')
    .post(upload.none(),(req,res) => {
        util.jsonResponse(req,res,(tarData)=>{
            let telNo = req.body.telNo;
            let password = req.body.password;

            console.log(`手机号：${telNo},时间：${new Date()}`);

            if(!telNo || !password){
                return P.resolve({code: 1, error: "无效参数"});
            }

            return User.findOne({telNo:telNo}).then((result)=>{
                if(result && result.password == crypto.createHash('md5').update(password).digest('hex')) { //验证密码是否正确
                    req.session.telNo = telNo;
                    delete req.session.code;
                    req.session.save();

                    let at = signature.sign(req.session.id,config.secret);
                    return P.resolve({
                        code: 0,
                        data: {
                            accessToken:at,
                            user: {
                                name: result.name || '',
                                identity: result.identity || '',
                                avatar: result.avatar || '',
                                telNo: result.telNo,
                                nickname: result.nickname || '',
                                sex: result.sex || '',
                                sign: result.sign || '',
                                role: getRole(telNo)
                            }
                        }
                    });
                } else {
                    return P.resolve({code: 1, error: "手机号或密码不正确"});
                }
            })

        },util.noAuth)
    });

//注册
router.route('/register')
    .post(upload.none(),(req,res) => {
        util.jsonResponse(req, res,()=> {
            let telNo = req.body.telNo;
            let password = req.body.password;
            let code = req.body.code;
            let bundleId = req.body.bundleId;
            let bundleName = req.body.bundleName;
            let system = req.body.system;

            if(!telNo || !password){
                return P.resolve({code: 1000, error: "无效参数"});
            }

            if(req.session.telNo != telNo || req.session.code != code){
                return P.resolve({code: 2002, error: "短信验证码错误"});
            }

            return User.findOne({telNo: telNo}).then((res) => {
                if (res) {
                    return User.findOneAndUpdate({telNo: telNo},{password: crypto.createHash('md5').update(password).digest('hex')},{new:true});
                }
                else {
                    let user = {
                        identity: Math.random().toString(10).substr(2, 6),
                        password: crypto.createHash('md5').update(password).digest('hex'),
                        registerTime: new Date(),
                        src:{bundleId:bundleId,bundleName:bundleName,system:system}
                    };

                    return User.findOneAndUpdate({telNo: telNo},user,{upsert:true,new:true});
                }
            }).then((result) => {
                delete req.session.code;
                let at = signature.sign(req.session.id,config.secret);
                return P.resolve({
                    code: 0,
                    data: {
                        accessToken:at,
                        user: {
                            name: result.name || '',
                            identity: result.identity || '',
                            avatar: result.avatar || '',
                            telNo: result.telNo,
                            nickname: result.nickname || '',
                            sex: result.sex || '',
                            sign: result.sign || '',
                            role: getRole(telNo)
                        }
                    }
                });
            });
        },util.noAuth);
    });

//修改用户信息
router.route('/modifyUser')
    .post(upload.none(),(req,res) => {
        util.jsonResponse(req,res,(tarData)=>{
            let telNo = tarData.session.telNo;
            let user = {
                sign: tarData.sign || '',
                nickname: tarData.nickname || ''
            };

            return User.findOneAndUpdate({telNo: telNo},user,{new:true}).then((result) => {
                return P.resolve({
                    code: 0,
                    data: {
                        name: result.name || '',
                        identity: result.identity || '',
                        avatar: result.avatar || '',
                        telNo: result.telNo,
                        nickname: result.nickname || '',
                        sex: result.sex || '',
                        sign: result.sign || '',
                        role: getRole(telNo)
                    }
                });
            });
        })
    });

//注销
router.route('/logout')
    .post((req,res) => {
        util.jsonResponse(req,res,()=>{
            delete req.session.telNo;
            return P.resolve({code:0,data:{}});
        },util.noAuth)
    });

const upsertUser = (req,res) =>{
    util.jsonResponse(req,res,(tarData)=>{
        return P.resolve().then(() => {
            let userId = tarData.body.id || new mongoose.Types.ObjectId;
            let user = {
                nickname:tarData.nickname || '',
                name:tarData.name || '',
                sex:tarData.sex || '',
                isStop:tarData.isStop
            };

            return User.findOneAndUpdate({_id: userId},user,{upsert:true}).then(()=>{
                return P.resolve({id: userId})
            })
        });
    });
};

router.route('/')
    .get((req,res) =>{
        util.jsonAggResponse(req,res,()=>{

            let pl = [
                {
                    $project:{
                        _id:0,
                        id:'$_id',
                        telNo: 1, //用户手机号
                        nickname: 1, //昵称
                        name: 1, //姓名
                        sex: 1, //性别(0:男,1:女)
                        src: 1,//用户注册来源
                        isStop:{$ifNull:[ '$isStop',false] }
                    }
                }
            ];
            return {
                module:User,
                pipeline:pl,
                push:{
                    id:1,
                    telNo: 1,
                    nickname: 1,
                    name: 1,
                    sex: 1,
                    src: 1,
                    isStop: 1
                }
            }
        })

    })
    .post(upload.none(),upsertUser);

router.route('/:id')
    .get((req,res) =>util.normalGetOne(req,res,User,{
        password:0,
        avatar:0,
        registerTime:0
    }))
    .post(upload.none(),upsertUser)
    .delete((req,res) => util.normalDelete(req,res,User));

module.exports = router;