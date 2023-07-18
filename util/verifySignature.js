require('dotenv').config()
const sha256 = require('js-sha256');

const verify_signature = (req, token) => {
  const bodyData = JSON.stringify(req.body);
  const signature = sha256.hmac(token, bodyData);
  return `sha256=${signature}` === req.headers['x-hub-signature-256'];
};

const handleSignature = (req, token) => {
    if (!verify_signature(req, token)) {
        return false;
    } else {
        return true;
    }
};

module.exports = {handleSignature}