const { env } = require('./env')
// 指定文件上传路径
const UPLOAD_PATH = env === 'dev' ? '/Users/chenyingqi/upload/admin-upload-ebook' : '/root/upload/admin-upload/ebook'

const UPLOAD_URL = env === 'dev' ? 'http://book.72lsy.vip:8089/admin-upload-ebook' : 'http://book.72lsy.vip:8089/ebook'

const OLD_UPLOAD_URL = env === 'dev' ? 'http://book.72lsy.vip:8089/book/res/img' : 'http://book.72lsy.vip:8089/book/res/img'


module.exports = {
    CODE_ERROR: -1,
    CODE_SUCCESS: 0,
    CODE_TOKEN_EXPIRED: -2, // token过期
    debug: true, // 默认打开调试模式
    PWD_SALT: 'admin_imooc_node',
    PRIVATE_KEY: 'admin_imooc_node_test_youbaobao_xyz',
    JWT_EXPIRED: 60 * 60, // token失效时间
    UPLOAD_PATH,
    MINE_TYPE_EPUB: 'application/epub+zip',
    UPLOAD_URL,
    OLD_UPLOAD_URL,
    dbHost: env === 'dev' ? 'localhost' : '139.186.82.39',
    dbUser: env === 'dev' ? 'root' : 'root',
    dbPwd: env === 'dev' ? '12345678' : '72Lsy1314.'
}