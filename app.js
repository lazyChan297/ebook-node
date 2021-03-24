const bodyParser = require('body-parser')
const express = require('express')
const router = require('./router')
const cors = require('cors')
const compress = require('compression')
const app = express()
const fs = require('fs')
app.use(compress())
app.use(bodyParser.urlencoded({limit:'2mb', extended: true }))
app.use(bodyParser.json({limit: '2mb'}))
app.use(cors())
// // 中间件,相应结束后不会再调用中间件
// const myLogger = function(res, req, next) {
//     console.log('logger')
//     next()
// }
// //使用中间件
// app.use(myLogger)

// app.get('/', function(req, res) {
//     // res.send('hello node')
//     throw new Error('抛出异常')
// })

// 后置中间件通常用作异常处理
// function errorHandle(err, req, res, next) {
//     res.status(500).json({
//         error: -1,
//         msg: err.toString()
//     })
// }

// app.use(errorHandle)

// 将全部的路由通过router来管理
app.use('/api', router)

const server = app.listen(18082, function() {
    const { address, port } = server.address()
    console.log('服务已启动..')
})

