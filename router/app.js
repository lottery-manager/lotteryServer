const router = require('express').Router();
const P = require('bluebird');
const mongoose = require('mongoose');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});
const util = require('./util');
const App = require('../mongo/app');

const upsertApp = (req,res) => {
    util.jsonResponse(req,res,(tarData)=>{
        return P.resolve().then(() => {
            let id = tarData.id || new mongoose.Types.ObjectId;
            let app = {
                bundleId: tarData.bundleId,
                bundleName: tarData.bundleName || '',
                system: tarData.system || '',
                url: tarData.url || '',
                isStop: tarData.isStop
            };

            return App.findOneAndUpdate({_id: id},app,{upsert:true}).then(()=>{
                return P.resolve({id: id});
            });
        });
    });
};

router.route('/getAppInfo')
    .post(upload.none(),(req,res) =>{
        util.jsonResponse(req,res,(tarData)=>{

            return App.findOne({bundleId: tarData.bundleId,system:tarData.system}).then((res)=>{
                if (!res) {
                    return P.resolve({code:1000,error:`${bundleId} 没有找到相关app信息`});
                }

                if (res.isStop) {
                    return P.resolve({code:1001,error:`${bundleId} 已被停用`});
                }else {
                    return P.resolve({code:0,data:res});
                }
            });
        });
    });

router.route('/')
    .get((req,res) =>{
        util.jsonAggResponse(req,res,(tarData)=>{
            let pl = [
                {
                    $project:{
                        _id:0,
                        id:'$_id',
                        bundleId:1,
                        bundleName:1,
                        system:1,
                        url:1,
                        isStop:{$ifNull:[ '$isStop',false] }
                    }
                }
            ];
            return {
                module:App,
                pipeline:pl,
                push:{
                    id:1,
                    bundleId:1,
                    bundleName:1,
                    system:1,
                    url:1,
                    isStop:1
                }
            }
        })
    })
    .post(upload.none(),upsertApp);

router.route('/:id')
    .get((req,res) =>util.normalGetOne(req,res,App,{}))
    .post(upload.none(),upsertApp)
    .delete((req,res) =>util.normalDelete(req,res,App));

module.exports = router;