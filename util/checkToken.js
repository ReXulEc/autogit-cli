const crypto = require('crypto');

const checkToken = (json) => {
    let temp = json
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