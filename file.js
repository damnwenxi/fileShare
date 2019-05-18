const Koa = require('koa');
const Router = require('koa-router');
const static = require('koa-static');
const KoaBody = require('koa-body');
const config = require('./config');
const app = new Koa();

app.context.db = config.db;
app.use(async (ctx,next)=>{
    ctx.set('Access-Control-Allow-Origin','null');
    ctx.set('Access-Control-Allow-Headers','*');
    ctx.set('Access-Control-Allow-Credentials',true);
    await next();
});

// 静态资源访问地址
app.use(static(config.BASE_PATH));
app.use(KoaBody({
    multipart:true,
    formidable:{
        maxFieldsSize:50*1024*1024  //50M
    }
}));

const router = new Router();
app.use(router.routes()).use(router.allowedMethods());

router.get('/',async ctx=>{
    const findTest = await ctx.db.query(
        "select * from file"
    );
    console.log(findTest);
    ctx.body = {msg:"success"};
})
router.use('/api',require('./api/all'));


const port = process.env.PORT || 8888;
app.listen(port,()=>{
    console.log(`app is running at port ${port}`);
    // console.log(__dirname);
})
