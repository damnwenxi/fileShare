const mysql = require('mysql');
const co = require('co-mysql');
const db = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'shareFile',
    timezone: "08:00"
});

module.exports = {
    db: co(db),
    BASE_PATH: '/root/files/server/'  //文件保存地址
}