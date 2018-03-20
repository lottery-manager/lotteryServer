/**
 * Created by fx on 17-5-11.
 */
const vm = require('vm');
const _ = require('lodash');
const P = require('bluebird');

const needAuth = (req) => {
    return (req.session && req.session.telNo && !req.session.code)
};

const procReq = (req,handle,getAuth) => {
    if(!getAuth(req)){
        return P.reject("no auth")
    }
    return handle(procReqData(req));
};

const normalResponse = (req, res,handle,getAuth = needAuth) => {
    P.resolve().then(()=>{
        return procReq(req,handle,getAuth);
    }).then((result)=>{
        if(result.type){
            res.setHeader("Content-Type", result.type);
        }
        if(result.disposition){
            res.setHeader("Content-Disposition", result.disposition);
        }
        res.end(result.data);
    }).catch((e)=>{
        res.status(500).end(e && e.toString());
    })
};

const jsonResponse = (req, res, handle, getAuth = needAuth) => {
    P.resolve().then(()=>{
        return procReq(req,handle,getAuth);
    }).then((result)=>{
        res.json({data:result || {}});
    }).catch((e)=>{
        let err = e || {};
        res.status(err.status||500).json(e);
    })
};

const normalGetOne = (req, res,Module,project,id,getAuth = needAuth) => {
    jsonResponse(req,res,(tarData)=>{
        let query = {};
        query[(id || '_id')] = tarData.id;
        return Module.findOne(query,project);
    },getAuth)
};

const normalDelete = (req, res,Module,id,getAuth = needAuth) => {
    jsonResponse(req, res,(tarData)=>{
        let query = {};
        query[(id || '_id')] = tarData.id;
        return Module.remove(query).then(()=>{
            return P.resolve({id:tarData.id});
        })
    },getAuth)
};

const procReqData =  (req) => {
    let tarData = {
        session:req.session,
        qurey:req.query,
        params:req.params,
        body:req.body
    };
    if(req.file){
        tarData.file = req.file;
    }
    if(req.files){
        tarData.files = req.files;
    }
    return _.extend(tarData,req.body,req.query,req.params);
};

const procPipeline = (aggDef,req) => {

    let queryString = "";
    let getQuery = {};

    if(req.query.sort){
        queryString += " sort = "+req.query.sort + ";"
    }
    if(req.query.range){
        queryString += " range = "+req.query.range + ";"
    }
    if(req.query.filter){
        if(_.isString(req.query.filter)){
            queryString += " filter = "+req.query.filter + ";"
        }
        if(_.isObject(req.query.filter)){
            getQuery.filter = req.query.filter;
        }
    }



    let script = new vm.Script(queryString);
    script.runInNewContext(getQuery);

    if(!_.isEmpty(getQuery.filter)){

        let filter = _.mapValues(getQuery.filter,(item,key)=>{

            let filterOper = aggDef.filterOper || {};

            switch (filterOper[key]) {
                case 'ne':
                    return {$ne:item};
                    break;
                case 'eq':
                    return item;
                    break;
                case 'cn':
                    return new RegExp(item);
                    break;
                case 'bw':
                    return new RegExp('^' + item);
                    break;
                case 'ew':
                    return new RegExp(item + '$');
                    break;
                case 'lt':
                    return {$lt:item};
                    break;
                case 'lte':
                    return {$lte:item};
                    break;
                case 'gt':
                    return {$gt:item};
                    break;
                case 'gte':
                    return {$gte:item};
                    break;
                default :
                    return _.isArray(item)?{$in:item}:item;
                    break;
            }


        });
        aggDef.pipeline.push({
            $match: filter
        });
    }


    if (getQuery.sort && getQuery.sort[0]) {
        let sort = {};
        sort[getQuery.sort[0]] = (getQuery.sort[1] == 'ASC') ? 1 : -1;
        aggDef.pipeline.push({
            $sort: sort
        });
    }


    let newPush = _.mapValues(aggDef.push,(item,key)=>{
        return (item == 1) ? "$"+key : item;
    });

    aggDef.pipeline.push({
        $group: {
            _id: null,
            data: {$push:newPush},
            total: {$sum: 1},
            // total:1
        }

    });

    if(getQuery.range){

        aggDef.pipeline.push({
            $project: {
                _id: 0,
                data: { $slice: [ '$data', getQuery.range[0] , (getQuery.range[1]-getQuery.range[0]+1) ] },
                total: 1
            }

        });
    }

    return aggDef.pipeline;
};

const jsonAggResponse = (req, res, createAgg,procResult,isAuth = needAuth) => {
    P.resolve().then(()=>{
        if(!isAuth(req)){
            return P.reject({});
        }
        return P.resolve(createAgg(procReqData(req))).then((aggDef)=>{
            if(aggDef && aggDef.pipeline){
                return aggDef.module.aggregate(procPipeline(aggDef,req)).exec()
            }
            else {
                return P.reject({})
            }
        }).then((result) =>{
            let retObj = (result && result[0]) || {data:[],total:0};
            if(procResult){
                return procResult(retObj);
            }
            return P.resolve(retObj);
        })

    }).then((result) => {
        res.json(result);
    }).catch((e)=>{
        res.status(500).json(e);
    })
};

module.exports = {
    noAuth:() => true,
    needAuth:needAuth,
    jsonResponse:jsonResponse,
    jsonAggResponse:jsonAggResponse,
    normalResponse:normalResponse,
    normalGetOne:normalGetOne,
    normalDelete:normalDelete
};