const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { PRIVATE_KEY } = require('./constant')

// 密码加密
function md5(s) {
    return crypto.createHash('md5').update(String(s)).digest('hex');
}

// 解析jwt
function decoded(req) {
    let token = req.get('Authorization')
    // token存在
    if (token.indexOf('Bearer') === 0) {
        token = token.replace('Bearer ', '')
    }
    return jwt.verify(token, PRIVATE_KEY)
}

// 判断数据模型是否为对象
function isObject(o) {
    return Object.prototype.toString.call(o) === '[object Object]'
}

module.exports = {
    md5,
    decoded,
    isObject
}