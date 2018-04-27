var _ = require('underscore'),
    resProcessor = require('../components/res-processor/res-processor'),
    proxy = require('../components/proxy/proxy'),
    conf = require('../conf');

    
import fetch from 'isomorphic-fetch';
import lo from 'lodash';
import apiAuth from '../middleware/auth/api-auth'

import { 
    web_codeToAccessToken, 
    web_accessTokenToUserInfo,
    web_codeToUserInfo,
} from '../components/wx-utils/wx-utils'

var mongoose = require('mongoose')
var UserDB = mongoose.model('user')

var sysTime = function(req, res, next) {
    resProcessor.jsonp(req, res, {
        state: { code: 0 },
        data: {
            sysTime: new Date().getTime()
        }
    });
};

const signUp = async (req, res, next) => {

    const userInfo = req.body.userInfo

    if(!userInfo.username || !userInfo.password) {
        resProcessor.jsonp(req, res, {
            state: { code: 1, msg: "参数不全"},
            data: {}
        });
        return
    }

    const result = await UserDB.createUser(
        userInfo.username,
        userInfo.password,
    )

    if(!result) {
        resProcessor.jsonp(req, res, {
            state: { code: 1, msg: "用户名已经存在"},
            data: {}
        });
        return
    }

    req.rSession.userId = result._id

    resProcessor.jsonp(req, res, {
        state: { code: 0, msg: "操作成功" },
        data: {
            userPo: result
        }
    });
}

const login = async (req, res, next) => {
    const username = lo.get(req, 'body.username')
    const password = lo.get(req, 'body.password')

    if(!username || !password) {
        resProcessor.jsonp(req, res, {
            state: { code: 1 , msg: '参数不全'},
            data: {}
        });
        return
    }
    const result = await UserDB.authJudge(username, password)
    if(result) {
        req.rSession.userId = result._id
        resProcessor.jsonp(req, res, {
            state: { code: 0 },
            data: {
                sysTime: new Date().getTime(),
                userPo: result
            }
        });
    } else {
        resProcessor.jsonp(req, res, {
            state: { code: 1 , msg: '账号或密码错误'},
            data: {}
        });
    }
}

const logout = async (req, res, next) => {
    req.rSession.userId = null

    resProcessor.jsonp(req, res, {
        state: { code: 0, msg: "登出成功" },
        data: {}
    });
}

const setUserInfo = async (req, res, next) => {
    const userId = req.rSession.userId
    const personInfoObj = {}
    if(req.body.headImg) {
        personInfoObj.headImg = req.body.headImg
    }
    if(req.body.name) {
        personInfoObj.name = req.body.name
    }
    if(req.body.phone) {
        personInfoObj.phone = req.body.phone
    }
    if(req.body.mail) {
        personInfoObj.mail = req.body.mail
    }
    const result = await UserDB.updateUser(userId, {
        personInfo: personInfoObj
    })
    if(result) {
        resProcessor.jsonp(req, res, {
            state: { code: 0, msg: '设置成功' },
            data: {
                result: result,
            }
        });
    } else {
        resProcessor.jsonp(req, res, {
            state: { code: 1, msg: '设置失败' },
            data: {}
        });
    }
}

const wxLogin = async (req, res, next) => {
    const code = lo.get(req, 'query.code')
    const state = lo.get(req, 'query.state')
    const userId = lo.get(req, 'rSession.userId')

    try {
        const result = await web_codeToAccessToken(code)

        if (state == 'bind') {
            if(result.access_token && result.openid) {
                const userInfo = await web_accessTokenToUserInfo(result.access_token, result.openid)
                await UserDB.updateUser(userId, { 
                    unionid: result.result,
                    wxUserInfo: userInfo
                })
                res.redirect('/person/1');
            } else {
                // 由于某些原因绑定失败
                res.redirect('/person/1?fail=true');
            }
        }

        if(state == 'auth') {
            if(result.unionid) {
                const userObj = await UserDB.findByUnionId(result.unionid)
                if(userObj) {
                    req.rSession.userId = result._id
                    res.redirect('/team');
                } else {
                    res.redirect('/sign-up');
                }
            } else {
                // 由于某些原因授权失败
                res.redirect('/?fail=true');
            }
        }

    } catch (error) {
        console.error(error);
    }
}

const unbindWechat = async (req, res, next) => {
    const userId = req.rSession.userId
    try {
        const result = await UserDB.updateUser(userId, {
            unionid: ''
        })
        resProcessor.jsonp(req, res, {
            state: { code: 0, msg: '设置成功' },
            data: {
                result: result,
            }
        });
    } catch (error) {
        resProcessor.jsonp(req, res, {
            state: { code: 1, msg: '解绑失败' },
            data: {}
        });
        console.error(error)
    }
}

const test = async (req, res, next) => {

    // const reust =  redisPromiseGet()
    const result1 = await redisPromiseSet('key-adawda', 'value:' + Math.random(), 1000)
    const result2 = await redisPromiseGet('key-adawdass')


    resProcessor.jsonp(req, res, {
        state: { code: 0 },
        data: {
            sysTime: new Date().getTime(),
            result1: result1,
            result2: result2
        }
    });

}


module.exports = [
    ['GET', '/api/base/sys-time', sysTime],
    ['GET', '/api/test', test],

    ['POST', '/api/login', login],
    ['GET', '/wxLogin', wxLogin],

    ['POST', '/api/logout', apiAuth, logout],

    ['POST', '/api/unbindWechat', apiAuth, unbindWechat],

    ['POST', '/api/signUp', signUp],
    ['POST', '/api/setUserInfo', apiAuth, setUserInfo]

];
