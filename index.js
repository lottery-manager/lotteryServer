const mongo = require('./mongo');
const expressServer = require('./expressServer');

Promise.resolve().then(() =>{
    return mongo.init();
}).then(()=>{
    return expressServer.init();
}).catch((e)=>{
    console.error(e);
});