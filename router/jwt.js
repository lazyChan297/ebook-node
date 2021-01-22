const expressJwt = require('express-jwt')
const { PRIVATE_KEY } = require('../utils/constant')

const jwtAuth = expressJwt({
    secret: PRIVATE_KEY,
    algorithms: ['HS256'],
    credentialsRequired: true // 设置为false，不验证token
}).unless({
    path: [
        '/',
        '/user/login'
    ] // 设置jwt白名单
})
module.exports = jwtAuth;