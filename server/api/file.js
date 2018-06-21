var _ = require('underscore'),
    resProcessor = require('../components/res-processor/res-processor'),
    proxy = require('../components/proxy/proxy'),
    conf = require('../conf');

    
import fetch from 'isomorphic-fetch';
import lo from 'lodash';
import apiAuth from '../components/auth/api-auth'

var OSSW = require('ali-oss').Wrapper;
var mongoose = require('mongoose')

var file = require('../models/file');

import { getTempSTS } from '../components/oss-utils/oss-utils'
import { mongo } from 'mongoose';
import { resolve } from 'url';

const getOssStsToken = async (req, res, next) => {
    try {
        const token = await getTempSTS('session')
        resProcessor.jsonp(req, res, {
            state: { code: 0, msg: '操作成功' },
            data: token
        });
    } catch (error) {
        console.log(error);
        resProcessor.jsonp(req, res, {
            state: { code: 1, msg: '操作失败' },
            data: ''
        });
    }
}

const uploadFile = async (req, res, next) => {

    const fileInfo = req.body.fileInfo || {} 
    const userId = req.rSession.userId

    try {
        let fileObj = await file.createFile(fileInfo.teamId,fileInfo.dir,fileInfo.fileName,fileInfo.ossKey)

        resProcessor.jsonp(req, res, {
            state: {code: 0,msg: "Successfully appended file"},
            data: {
                fileObj: fileObj
            }
        });
    } catch (error) {
        console.log(error)
        resProcessor.jsonp(req, res, {
            state: {code: 1,msg: "File append failed"},
            data: {},
            info: fileInfo,
        });
    }
}

const getDirFileList = async (req, res, next) => {
    const dirInfo = req.body.dirInfo || {} 
    const userId = req.rSession.userId

    try {

        let fileList = await file.getDirFileList(dirInfo.teamId,dirInfo.dir)

        resProcessor.jsonp(req, res, {
            state: {code: 0,msg: "Successfully got list of files"},
            data: {
                fileList: fileList
            }
        });
    } catch (error) {
        console.log(error)
        resProcessor.jsonp(req, res, {
            state: {code: 1,msg: "Can't get files"},
            data: {},
            info: dirInfo,
        });
    }
}

module.exports = [
    ['GET', '/api/getOssStsToken', apiAuth, getOssStsToken],
    ['POST','/api/file/uploadFile',apiAuth, uploadFile],
    ['POST','/api/file/getDirFileList',apiAuth, getDirFileList]
];
