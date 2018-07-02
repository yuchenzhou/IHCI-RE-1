var _ = require('underscore'),
    resProcessor = require('../components/res-processor/res-processor'),
    proxy = require('../components/proxy/proxy'),
    conf = require('../conf');

import apiAuth from '../components/auth/api-auth'
var sendMail = require('../components/mail/mail');
var mongoose = require('mongoose')
var UserDB = mongoose.model('user')

const randomChar = function() {
    var x="0123456789qwertyuioplkjhgfdsazxcvbnm";
    var tmp="";
    var timestamp = new Date().getTime();
    for(var  i=0;i<13;i++)  {
       tmp += x.charAt(Math.ceil(Math.random()*100000000)%x.length);
    }
    return timestamp+tmp;
 }

const activation = async (req, res, next) => {
    const userId = req.rSession.userId
    const mailAccount = req.body.mailAccount
    const mailCode = randomChar()
    const result = await UserDB.findByIdAndUpdate({_id: userId}, {mailCode: mailCode, mailLimitTime: Date.now()+10*1000 }, {new: true})
    var mail = {
        // 发件人
        from: 'ICHI <13416363790@163.com>',
        // 主题
        subject: '激活账号',
        // 收件人
        to: mailAccount, //发送给注册时填写的邮箱
        text: '点击激活：<a href="http://localhost:5000/checkCode?userId='+ userId +'&mailCode='+ mailCode + '"></a>'
    };

       const sendFlag = await sendMail(mail)
       console.log("dsfdf:",sendFlag)
       if(sendFlag){
        resProcessor.jsonp(req, res, {
            state: { code: 0, msg:"成功"},
            data: {}
                   });
       }else{
        resProcessor.jsonp(req, res, {
            state: { code: 1, msg:"失败"},
            data: {}
                   });
       }
}

const checkCode = async (req, res, next) => {
    const userId = req.query.userId;
    const mailCode = req.query.mailCode;
    console.log(userId)
    console.log(mailCode)
    const user = await UserDB.findByUserId(userId)
    console.log("woshi用户：", user)
    if (user.mailCode === mailCode && (user.mailLimitTime - Date.now()) > 0){
        console.log("时间戳：",user.mailLimitTime) 
        console.log("时间戳：",user.mailLimitTime+1000*10)
        const result = await UserDB.findByIdAndUpdate({_id: userId}, {isLive: true}, {new: true})
        if(result){
            resProcessor.jsonp(req, res, {
                state: { code: 0, msg:"激活成功"},
                data: {}
                       });         
        }else{
            resProcessor.jsonp(req, res, {
                state: { code: 1, msg:"激活失败"},
                data: {}
                       });
        }
}else{
    resProcessor.jsonp(req, res, {
        state: { code: 1, msg:"激活失败,链接过期"},
        data: {}
               });
}
}

module.exports = [
    ['POST', '/api/activation', apiAuth, activation],
    ['GET', '/checkCode', apiAuth, checkCode],
];