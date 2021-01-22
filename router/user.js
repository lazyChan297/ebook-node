const express = require('express')
const Result = require('../modules/Result')
const router = express.Router()
const { login, findUser } = require('../services/user')
const { md5, decoded } = require('../utils/index')
const { PWD_SALT, PRIVATE_KEY, JWT_EXPIRED } = require('../utils/constant')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const boom = require('boom')

router.post('/login', [
  body('username').isString().withMessage('username类型不正确'),
  body('password').isString().withMessage('password类型不正确')
],function(req, res, next) {
  const err = validationResult(req)
  if (!err.isEmpty()) {
    const [{msg}] = err.errors
    next(boom.badRequest(msg))
  } else {
    let { username, password } = req.body
    password = md5(`${password}${PWD_SALT}`) // 对密码进行加密
    login(username, password).then( user => {
      if ( !user || user.length === 0 ) {
        new Result('登录失败').fail(res)
      } else {
        // 生成token
        const token = jwt.sign(
          { username },
          PRIVATE_KEY,
          { expiresIn: JWT_EXPIRED }
        )
        new Result({ token }, '登录成功').success(res)
      }
    })
  }
})

router.get('/info', function(req, res, next) {
  const decode = decoded(req)
  // 从数据库中查询到该用户
  if (decode && decode.username) {
    findUser(decode.username).then((user) => {
      if (user) {
        user.roles = [user.role]
        new Result(user, '用户信息查询成功').success(res)
      } else {
        new Result('用户信息查询失败').fail(res)
      }
    })
  }
  
})

module.exports = router