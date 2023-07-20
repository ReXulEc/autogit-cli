const crypto = require('crypto');

const checkToken = (json, strict, log) => {
    let temp = json

    if (strict) {
        return new Promise((resolve, reject) => {
            temp.token = crypto.randomBytes(64).toString('hex');
            resolve(true, temp);
        });
    }
    if(json.token?.length === 128 && json.token){
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    } else {
        return new Promise((resolve, reject) => {
            temp.token = crypto.randomBytes(64).toString('hex');
            resolve(false, temp);
        });

    } 
};

module.exports = {checkToken};