const fs = require('fs');
const Router = require('koa-router');
const config = require('../config');
const router = new Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');



/**
 * @desc file upload api
 * @port /api/upload/, public
 * @param ...
 */
router.post('/upload', async ctx => {
    try {
        const file = ctx.request.files.file;
        const description = ctx.request.body.description;
        if (file.size > 0 && file.size < 52428800) {
            const item = [file.name, file.size, description];
            // 创建可读流
            const rs = fs.createReadStream(file.path);
            // 重命名(时间戳拼接)
            const date = new Date();
            const newFileName = date.getTime() + '_' + file.name;
            // 创建可写流
            const ws = fs.createWriteStream(config.BASE_PATH + newFileName);
            // 管道链接传输并获取地址
            await rs.pipe(ws).path
            const url = 'http://' + ctx.header.host + '/' + newFileName;
            // console.log(url);
            item.push(url);

            // 存储相关信息到数据库
            const savaFile = await ctx.db.query(
                "insert into file set fileName=?,size=?,description=?,url=?,passtime=date_add(NOW(), interval 30 minute)",
                item
            );

            if (savaFile.affectedRows > 0) {
                ctx.status = 200;
                ctx.body = { msg: '上传文件成功。', savaFile };
            } else {
                ctx.status = 500;
                ctx.body = { msg: '上传文件失败，请稍后再试。' };
            }
        } else {
            ctx.status = 400;
            ctx.body = { msg: '文件大于50M或格式有误。' };
        }
    } catch (e) {
        throw e;
    }
});


/**
 * @desc get filelist api
 * @port /api/filelist/, public
 * @param page
 */
router.get('/filelist', async ctx => {
    try {
        const page = parseInt(ctx.query.page);
        // page合法
        if (page >= 0) {
            const fileList = await ctx.db.query(
                "select * from file where showable=1 order by c_date desc limit ?,10 ",
                page * 10
            );
            const count = await ctx.db.query(
                'select count(*) from file'
            );
            if (fileList.length > 0) {
                ctx.status = 200;
                ctx.body = { msg: 'success', fileList, page, count };
            }
        } else {
            ctx.status = 400;
            ctx.body = { msg: 'params err' };
        }
    } catch (e) {
        ctx.status = 500;
        ctx.body = { msg: 'err' };
    }
})

/**
 * @desc del fileitem api
 * @port /api/del/, private
 * @query id
 */
router.get('/del', async ctx => {
    try {
        const id = ctx.query.id;
        const token = ctx.headers.cookie;
        if (token) {
            await jwt.verify(token, config.SECRET, async (err, decode) => {
                // token验证通过
                if (decode) {
                    const user = await ctx.db.query(
                        'select * from user where email = ?', decode.email
                    );
                    if (user.length > 0) {
                        const delResult = await ctx.db.query(
                            "update file set showable=0 where id = ?",id
                        );
                        if(delResult.affectedRows>0){
                            ctx.status = 200;
                            ctx.body = { msg: '删除成功' };
                        }else{
                            ctx.status = 200;
                            ctx.body = { msg: '删除失败' };
                        }    
                    }
                }else{
                    ctx.status = 400;
                    ctx.body = { msg: '登录信息过期' };
                }
            })
        }else{
            ctx.status = 400;
            ctx.body = { msg: '未登录或没有权限' };
        }
    } catch (e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = { msg: 'err' };
    }
})

/**
 * @desc search file
 * @port /api/find/, public
 * @query keywords
 */
router.get('/find', async ctx => {
    try {
        const keywords = ctx.query.keywords;
        const findResult = await ctx.db.query(
            'select * from file where showable=1 and (fileName like ? or description like ?) order by c_date desc',
            ['%' + keywords + '%', '%' + keywords + '%']
        );
        if (findResult.length > 0) {
            ctx.status = 200;
            ctx.body = { msg: 'success', findResult };
        } else {
            ctx.status = 200;
            ctx.body = { msg: 'can not find.' };
        }
    } catch (e) {
        throw e;
    }
})

/**
 * @desc admin login api
 * @port /api/login/,public
 * @params email,passwd
 */
router.post('/login', async ctx => {
    try {
        const data = ctx.request.body;
        // 数据验证
        // 查找用户
        const findUser = await ctx.db.query(
            'select * from user where email = ?',
            data.email
        );
        if (findUser.length > 0) {
            const user = findUser[0];
            const payLoad = {
                email: user.email,
                name: user.name
            }
            await bcrypt.compare(data.passwd, user.passwd).then(res => {
                if (res) {
                    // 生成token
                    var token = jwt.sign(payLoad, config.SECRET, { expiresIn: 3600 });
                    ctx.status = 200;
                    ctx.body = { msg: '管理员身份登录成功！', user: payLoad, token };
                } else {
                    ctx.status = 400;
                    ctx.body = { msg: '密码错误！' };
                }
            });
        } else {
            ctx.status = 400;
            ctx.body = { msg: '用户不存在！' };
        }
    } catch (e) {
        console.log(e);
        ctx.status = 500;
        ctx.body = { msg: 'err' };
    }
})

/**
 * @desc test api
 */
router.get('/test',async ctx=>{
    console.log(ctx.headers.cookie);
})

module.exports = router.routes();