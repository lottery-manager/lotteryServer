const router = require('express').Router();
const P = require('bluebird');
const mongoose = require('mongoose');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage: storage});
const util = require('./util');
const Feedback = require('../mongo/feedback');

router.route('/create')
    .post(upload.none(),(req,res) =>{
        util.jsonResponse(req,res,(tarData)=>{
            return P.resolve().then(() => {
                let id = tarData.id || new mongoose.Types.ObjectId;
                let feedback = {
                    creator: tarData.session.telNo,
                    content: tarData.content || '',
                    contact: tarData.contact || ''
                };

                return Feedback.findOneAndUpdate({_id: id},feedback,{upsert:true}).then(()=>{
                    return P.resolve({code:0,data:{id:id}});
                });
            });
        });
    });

const upsertFeedback = (req,res) => {
    util.jsonResponse(req,res,(tarData)=>{
        return P.resolve().then(() => {
            let id = tarData.id || new mongoose.Types.ObjectId;
            let feedback = {
                creator: tarData.session.telNo,
                content: tarData.content || '',
                contact: tarData.contact || ''
            };

            return Feedback.findOneAndUpdate({_id: id},feedback,{upsert:true}).then(()=>{
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
                        creator:1,
                        content:1,
                        contact:1
                    }
                }
            ];
            return {
                module:Feedback,
                pipeline:pl,
                push:{
                    id:1,
                    creator:1,
                    content:1,
                    contact:1
                }
            }
        })
    })
    .post(upload.none(),upsertFeedback);

router.route('/:id')
    .get((req,res) =>util.normalGetOne(req,res,Feedback,{}))
    .post(upload.none(),upsertFeedback)
    .delete((req,res) =>util.normalDelete(req,res,Feedback));

module.exports = router;