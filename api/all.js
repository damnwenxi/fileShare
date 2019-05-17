const fs = require('fs');
const Router = require('koa-router');
const config = require('../config');
const router = new Router();


/**
 * @desc file upload api
 * @port /api/upload/, public
 * @param ...
 */
router.post('/upload', async ctx => {
    try {
        const file = ctx.request.files.file;
        const description = ctx.request.body.description;
        if (file.size > 0&&file.size<52428800) {
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
            const url = 'http://' +ctx.header.host+'/'+newFileName;
            // console.log(url);
            item.push(url);

            // 存储相关信息到数据库
            const savaFile = await ctx.db.query(
                "insert into file set fileName=?,size=?,description=?,url=?,passtime=date_add(NOW(), interval 30 minute)",
                item
            );

            if(savaFile.affectedRows>0){
                ctx.status = 200;
                ctx.body = {msg:'上传文件成功。',savaFile};
            }else{
                ctx.status = 500;
                ctx.body = {msg:'上传文件失败，请稍后再试。'};
            }
        }else{
            ctx.status = 400;
            ctx.body = {msg:'文件大于50M或格式有误。'};
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
router.get('/filelist',async ctx=>{
    try{
        const page = parseInt(ctx.query.page);
        // page合法
        if(page>=0){
            const fileList = await ctx.db.query(
                "select * from file order by c_date desc limit ?,10 ",
                page*10
            );
            const count = await ctx.db.query(
                'select count(*) from file'
            );
            if(fileList.length>0){
                ctx.status = 200;
                ctx.body = {msg:'success',fileList,page,count};
            }
        }else{
            ctx.status = 400;
            ctx.body = {msg:'params err'};
        }
    }catch(e){
        throw e;
    }
})

/**
 * @desc del fileitem api
 * @port /api/del/, private
 * @query id
 */
router.get('/del',async ctx=>{

})

/**
 * @desc search file
 * @port /api/find/, public
 * @query keywords
 */
router.get('/find',async ctx=>{
    try{
        const keywords = ctx.query.keywords;
        const findResult = await ctx.db.query(
            'select * from file where fileName like ? or description like ? order by c_date desc',
            ['%'+keywords+'%','%'+keywords+'%']
        );
        if(findResult.length>0){
            ctx.status = 200;
            ctx.body = {msg:'success',findResult};
        }else{
            ctx.status = 200;
            ctx.body = {msg:'can not find.'};
        }
    }catch(e){
        throw e;
    }
})

module.exports = router.routes();