const router = require('express').Router();
const P = require('bluebird');
const mongoose = require('mongoose');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});
const util = require('./util');
const Platform = require('../mongo/platform');

const upsertPlatform = (req,res) => {
    util.jsonResponse(req,res,(tarData)=>{
        return P.resolve().then(()=>{
            let id = tarData.id || new mongoose.Types.ObjectId;
            let platform = {
                appId: tarData.appId,
                appSecret: tarData.appSecret,
                appName: tarData.appName || '',
                appSystem: tarData.appSystem || '',
                bundleId: tarData.bundleId || '',
                form: tarData.form || '',
                isStop: tarData.isStop
            };

            return Platform.findOneAndUpdate({_id: id},platform,{upsert:true}).then(()=>{
                return P.resolve({id: id});
            });
        });
    });
};

router.route('/')
    .get((req,res) =>{
        util.jsonAggResponse(req,res,(tarData)=>{
            let pl = [
                {
                    $project:{
                        _id:0,
                        id:'$_id',
                        appId:1,
                        appSecret:1,
                        appName:1,
                        appSystem:1,
                        bundleId:1,
                        form:1,
                        isStop:{$ifNull:[ '$isStop',false] }
                    }
                }
            ];
            return {
                module:Platform,
                pipeline:pl,
                push:{
                    id:1,
                    appId:1,
                    appSecret:1,
                    appName:1,
                    appSystem:1,
                    bundleId:1,
                    form:1,
                    isStop:1
                }
            }
        })

    })
    .post(upload.none(),upsertPlatform);

router.route('/:id')
    .get((req,res) =>util.normalGetOne(req,res,Platform,{}))
    .post(upload.none(),upsertPlatform)
    .delete((req,res) =>util.normalDelete(req,res,Platform));

module.exports = router;