const { MINE_TYPE_EPUB, UPLOAD_URL, UPLOAD_PATH, OLD_UPLOAD_URL } = require('../utils/constant')
const fs = require('fs')
const Epub = require('../utils/epub')
const path = require('path')
// const book = require('../services/book')
const xml2js = require('xml2js').parseString

class Book {
    constructor(file, data) {
        // 传入file,表示上传电子书， 传入data，表示编辑电子书
        if (file) {
            this.createBookFromFile(file)
        } else {
            this.createBookFromData(data)
        }
    }
    createBookFromFile(file) {
        const {
            destination,
            filename,
            mimetype = MINE_TYPE_EPUB,
            path,
            originalname
        } = file
        const suffix = mimetype === MINE_TYPE_EPUB ? '.epub' : ''
        const oldBookPath = path // 原来的文件路径
        const bookPath = `${destination}/${filename}${suffix}` // 加了后缀名的文件路径
        const url = `${UPLOAD_URL}/book/${filename}${suffix}`
        const unzipPath = `${UPLOAD_PATH}/unzip/${filename}`
        const unzipUrl = `${UPLOAD_URL}/unzip/${filename}`
        if (!fs.existsSync(unzipPath)) {
            fs.mkdirSync(unzipPath, {recursive: true})
        }
        // 对文件进行重命名
        if (fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)) {
            fs.renameSync(oldBookPath, bookPath)
        }
        // 不含后缀的文件名 作为sql主键
        this.fileName = filename
        // 文件相对路径
        this.path = `/book/${filename}${suffix}`
        this.unzipPath = `/unzip/${filename}`
        this.filePath = this.path
        this.url = url // epub文件下载链接
        this.title = ''
        this.author = ''
        this.publisher = ''
        this.contents = [] // 目录结构
        this.contentsTree = [] // 树状目录结构
        this.cover = ''
        this.coverPath = ''
        this.category = -1 // 分类ID默认为-1
        this.categoryText = '' // 分类名称
        this.language = ''
        this.unzipUrl = unzipUrl
        this.originalName = originalname
    }
    createBookFromData(data) {
        this.fileName = data.fileName
        this.cover = data.cover
        this.title = data.title
        this.author = data.author
        this.publisher = data.publisher
        this.bookId = data.fileName
        this.language = data.language
        this.rootFile = data.rootFile
        this.originalName = data.originalName
        this.path = data.path || data.filePath
        this.filePath = data.path || data.filePath
        this.unzipPath = data.unzipPath
        this.coverPath = data.coverPath
        this.createUser = data.username
        this.createDt = new Date().getTime()
        this.updateDt = new Date().getTime()
        this.updateType = data.updateType === 0 ? data.updateType : 1
        this.category = data.category || 99
        this.categoryText = data.categoryText || '自定义'
        this.contents = data.contents || []
    }
    // 解析
    parse() {
        return new Promise((resolve, reject) => {
            const bookPath = `${UPLOAD_PATH}${this.path}`
            if (!fs.existsSync(bookPath)) {
                reject(new Error('电子书不存在'))
            }
            const epub = new Epub(bookPath)
            epub.on('error', err => {
                reject(err)
            })
            epub.on('end', err => {
                if (err) {
                    reject(err)
                } else {
                    const {
                        language,
                        creator,
                        creatorFileAs,
                        title,
                        cover,
                        publisher
                    } = epub.metadata
                    if (!title) {
                        reject(new Error('图书标题为空'))
                    } else {
                        this.title = title
                        this.language = language || 'en'
                        this.author = creator || creatorFileAs || 'unknown'
                        this.publisher = publisher || 'unknown'
                        this.rootFile = epub.rootFile
                        try {
                            // 将资源文件解压
                            this.unzip()
                            // 解析后的目录
                            this.parseContents(epub).then(({chapters, chaptersTree}) => {
                                this.contents = chapters
                                this.contentsTree = chaptersTree
                                epub.getImage(cover, handleGetImage)
                            })
                            const handleGetImage = (err, file, mimetype) => {
                                if (err) {
                                    // 读取封面图片失败
                                    reject(err)
                                } else {
                                    // 读取封面图片后缀名
                                    const suffix = mimetype.split('/')[1]
                                    // 封面图片路径
                                    const coverPath = `${UPLOAD_PATH}/img/${this.fileName}.${suffix}`
                                    // 生成封面图片URL
                                    const coverUrl = `${UPLOAD_URL}/img/${this.fileName}.${suffix}`
                                    // 将图片写入本地磁盘 /Users/chenyingqi/upload/admin-upload-ebook/img/文件名.后缀
                                    fs.writeFileSync(coverPath, file, 'binary')
                                    this.coverPath = `/img/${this.fileName}.${suffix}`
                                    this.cover = coverUrl
                                    resolve(this)
                                }
                            }
                        } catch(e) {
                            reject(e)
                        }
                        
                    }
                }
            })
            epub.parse()
        })
    }
    // 解压
    unzip() {
        const AmdZip = require('adm-zip')
        const zip = new AmdZip(Book.getPath(this.path))
        // 将路径下的文件进行解压,true表示文件存在时进行覆盖
        zip.extractAllTo(Book.getPath(this.unzipPath), true)

    }
    // 获取电子书目录
    parseContents(epub) {
        // 获取目录文件路径 一般以toc.ncf命名
        function getNcxFilePath() {
            const spine = epub && epub.spine
            const manifest = epub && epub.manifest
            const ncf = spine.toc && spine.toc.href
            const id = spine.toc && spine.toc.id
            if (ncf) {
                return ncf
            } else {
                return manifest[id].href
            }
        }
        // level级别，pid上一级目录ID
        function findParent(array, level = 0, pid = '') {
            return array.map(item => {
                item.level = level
                item.pid = pid
                // 存在子目录且子目录为数组
                if (item.navPoint && item.navPoint.length > 0) {
                    // 递归
                    item.navPoint = findParent(item.navPoint, level + 1, item['$'].id)
                    //子目录为对象的情况
                } else if (item.navPoint){
                    item.navPoint.level = level + 1
                    item.navPoint.pid = item['$'].id
                }
                return item
            })
        }
        // 将可能存在嵌套的数组返回扁平化数组
        function flatten(array) {
            return [].concat(...array.map(item => {
                // 存在嵌套数组
                if (item.navPoint && item.navPoint.length > 0) {
                    // 返回item和扁平后item的子数组拼接的数组
                    return [].concat(item, ...flatten(item.navPoint))
                } else if (item.navPoint) {
                    // 返回item和item.navPoint对象的数组
                    return [].concat(item, item.navPoint)
                }
                return item
            }))
        }

        // 生成完整的解压后目录路径
        const ncfFilePath = Book.getPath(`${this.unzipPath}/${getNcxFilePath()}`)
        if (fs.existsSync(ncfFilePath)) {
            return new Promise((resolve, reject) => {
                // 读取目录文件
                const xml = fs.readFileSync(ncfFilePath, 'utf-8')
                const dir = path.dirname(ncfFilePath).replace(UPLOAD_PATH, '')
                const fileName = this.fileName
                const unzipPath = this.unzipPath
                // xml2js解析xml文件api
                /**
                 * 源文件
                 * { 解析配置项 }
                 * 解析回调 (err, json)
                 */
                xml2js(xml, {
                    explicitArray: false,
                    ignoreAttrs: false
                }, (err, json) => {
                    if (err) {
                        reject(err)
                    } else {
                        const navMap = json.ncx.navMap

                        if (navMap.navPoint && navMap.navPoint.length > 0) {
                            navMap.navPoint = findParent(navMap.navPoint)
                            // flatten复制一个新的navPoint,不会对原有的影响
                            const newNavMap = flatten(navMap.navPoint)
                            const chapters = []
                            // epub.flow 电子书展示顺序
                            newNavMap.forEach((chapter, index) => {
                                // 相对路径
                                const src = chapter.content['$'].src
                                chapter.id = `${src}`
                                chapter.href = `${dir}/${src}`.replace(unzipPath, '')
                                chapter.text = `${UPLOAD_URL}${dir}/${src}`
                                chapter.label = chapter.navLabel.text || ''
                                // 目录ID
                                chapter.navId = chapter['$'].id
                                chapter.fileName = fileName
                                chapter.order = index + 1
                                chapters.push(chapter)
                            })
                            const chaptersTree = Book.getContentsTree(chapters)
                            // chapters.forEach(c => {
                            //     c.children = []
                            //     if (c.pid === '') {
                            //         // 一级目录
                            //         chaptersTree.push(c)
                            //     } else {
                            //         // 找到二级目录的上级目录
                            //         const parent = chapters.find(_ => _.navId === c.pid)
                            //         parent.children.push(c)
                            //     }
                            // })
                            resolve({chapters, chaptersTree})
                        } else {
                            reject(new Error('目录解析失败，目录数为0'))
                        }
                    }
                })
            })
        } else {
            throw new Error('目录资源文件不存在')
        }
    }

    // 将model转换成数据库需要的key值
    toDb() {
        return {
            fileName: this.fileName,
            cover: this.cover,
            title: this.title,
            author: this.author,
            publisher: this.publisher,
            bookId: this.fileName,
            language: this.language,
            rootFile: this.rootFile,
            originalName: this.originalName,
            filePath: this.path,
            unzipPath: this.unzipPath,
            coverPath: this.coverPath,
            createUser: this.username,
            createDt: this.createDt,
            updateDt: this.updateDt,
            updateType: this.updateType,
            category : this.category,
            categoryText : this.categoryText
        }
    }

    getContents() {
        return this.contents
    }

    reset() {
        if (Book.pathExists(this.filePath)) {
            fs.unlinkSync(Book.getPath(this.filePath))
        }
       
        if (Book.pathExists(this.coverPath)) {
            fs.unlinkSync(Book.getPath(this.coverPath))
        }
        
        if (Book.pathExists(this.unzipPath)) {
            fs.rmdirSync(Book.getPath(this.unzipPath), {
                recursive: true
            })
        }
    }

    // 生成绝对路径
    static getPath(path) {
        if (!path.startsWith('/')) {
            path = `/${path}`
        }
        return `${UPLOAD_PATH}${path}`
    }

    // 路径是否存在
    static pathExists(path) {
        if (path.startsWith(UPLOAD_PATH)) {
            return fs.existsSync(path)
        } else {
            return fs.existsSync(Book.getPath(path))
        }
    }

    static getCoverUrl(book) {
        const { cover } = book
        if (+book.updateType === 0) {
            if (cover) {
                if (cover.startsWith('/')) {
                    return `${OLD_UPLOAD_URL}${cover}`
                } else {
                    return `${OLD_UPLOAD_URL}/${cover}`
                }
            } else {
                return null
            }
        } else {
            if (cover) {
                if (cover.startsWith('/')) {
                    return `${UPLOAD_URL}${cover}`
                } else {
                    return `${cover}`
                }
            } else {
                return null
            }
        }
    }

    static getContentsTree(contents) {
        if (contents) {
            const contentsTree = []
            contents.forEach(c => {
                c.children = []
                if (c.pid === '') {
                    // 一级目录
                    contentsTree.push(c)
                } else {
                    // 找到二级目录的上级目录
                    const parent = contents.find(_ => _.navId === c.pid)
                    parent.children.push(c)
                }
            })
            return contentsTree
        }
        
    }

}

module.exports = Book