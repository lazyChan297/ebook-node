const express = require('express')
const boom = require('boom')
const userRouter = require('./user')
const bookRouter = require('./book')
const {
    CODE_ERROR
} = require('../utils/constant')
const jwtAuth = require('./jwt')
const Result = require('../modules/Result')
// 注册路由
const router = express.Router()


router.get('/', function(req, res) {
    res.send('welcome')
})

router.use('/user', userRouter)

router.use('/book', bookRouter)

/**
 * 集中处理404路由，该处理必须放在正常请求流程后，否则将被拦截
 */
router.use((req, res, next) => {
    next(boom.notFound('接口不存在'))
})

/**
 * 自定义路由异常处理中间件
 */
router.use(jwtAuth)
router.use((err, req, res, next) => {
    // token失效的错误
    if (err.name && err.name === 'UnauthorizedError') {
        const { status = 401, message } = err
        new Result(null, 'token验证失败', {
            error: status,
            errMsg: message
        }).expired(res.status(status))
    } else {
        // 常规接口错误
        const msg = (err && err.message) || '系统错误'
        const statusCode = (err && err.output && err.output.statusCode) || 500
        const errorMsg = (err.output && err.output.payload && err.output.payload.error) || err.message
        new Result(null, msg, {
            error: statusCode,
            errorMsg,
        }).fail(res.status(statusCode))
    }
})



module.exports = router