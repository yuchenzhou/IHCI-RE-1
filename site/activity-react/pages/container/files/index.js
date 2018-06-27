import * as React from 'react';
import './style.scss'

import { timeBefore, sortByCreateTime, formatDate } from '../../../utils/util'
import api from '../../../utils/api';
import Page from '../../../components/page'
import fileUploader from '../../../utils/file-uploader';

export default class Files extends React.Component {
    componentDidMount = async () => {
        this.teamId = this.props.params.id
        this.curDir = this.props.location.query.dir || '/'

        this.initDirList()

        this.initTeamInfo()
        this.initTeamFile()
    }
    state = {
        teamInfo : {},
        fileList: [],

        showCreateFolder: false,
        createFolderName: '新建文件夹',

        dirList: [],
    }

    initDirList = () => {
        if(this.curDir == '/') { 
            return
        }
        let splitDir = this.curDir.split('/')
        let totalDirList = []
        splitDir.map((item, idx) => {
            if(idx == 0) {
                totalDirList.push({
                    name: '根目录',
                    dir: ''
                })
            } else {
                totalDirList.push({
                    name: item,
                    dir: totalDirList[idx - 1].dir + '/' + item
                }) 
            }
        })
        totalDirList[0].dir = '/'

        console.log(totalDirList);
        this.setState({
            dirList: totalDirList
        })
    }

    initTeamInfo = async () => {
        const result = await api('/api/team/info', {
            method: 'POST',
            body: {
                teamId: this.teamId
            }
        })
        if(result.data) {
            this.setState({
                teamInfo: result.data
            })
        }
    }

    initTeamFile = async () => {
        const result = await api('/api/file/getDirFileList', {
            method: 'POST',
            body: {
                dirInfo: {
                    teamId: this.teamId,
                    dir: this.curDir,
                }
            }
        })
        if (result && result.data && result.data.fileList && result.data.fileList.length) {
            this.setState({
                fileList: result.data.fileList
            })
        }
    }

    createFolderHandle = async () => {
        this.setState({ showCreateFolder: true })
    }

    createFolderNameInputHandle = (e) => {
        this.setState({
            createFolderName: e.target.value
        })
    }

    createFolderComfirmHandle = async () => {
        const result = await api('/api/file/createFolder', {
            method: 'POST',
            body: {
                folderInfo: {
                    teamId: this.teamId,
                    dir: this.curDir,
                    folderName: this.state.createFolderName
                }
            }
        })

        if (result.state.code === 0) {
            window.toast("Folder created")
            this.setState({ showCreateFolder: false, createFolderName: '新建文件夹' })
        } else {
            window.toast(result.state.msg)
        }
        this.initTeamFile()
    }

    createFolderCancelHandle = () => {
        this.setState({ showCreateFolder: false, createFolderName: '新建文件夹' })
    }

    openFileInput = () => {
        this.fileInput.click()
    }

    uploadFileHandle = async (e) => {

        var file = e.target.files[0];
        this.setState({
            chosenFile: file
        })
        console.log(file)
        const result = await api('/api/file/createFile', {
            method: 'POST',
            body: {
                fileInfo: {
                    teamId: this.teamId,
                    size: file.size,
                    dir: this.curDir,
                    fileName: file.name,
                    ossKey: `${this.teamId}/${file.name}`
                }
            }
        })
        console.log(result);
        if (result.state.code === 0) {
            window.toast("Folder created")
        } else {
            window.toast(result.state.msg)
        }
        fileUploader(this.teamId, '', file)

        this.initTeamFile()
    }

    deleteHandle = async (type, name) => {
        if (type == 'file') {
            const result = await api('/api/file/delFile', {
                method: 'POST',
                body: {
                    fileInfo: {
                        teamId: this.teamId,
                        dir: '/',
                        fileName: name
                    }
                }
            })
        }
        else {
            const result = await api('/api/file/delFolder', {
                method: 'POST',
                body: {
                    folderInfo: {
                        teamId: this.teamId,
                        dir: '/',
                        folderName: name
                    }
                }
            })
        }

        this.initTeamFile()
    }

    downloadHandle = (ossKey) => {
        window.open(window.location.origin + '/static/' + ossKey)
    }

    headDirClickHandle = (dir) => {
        if(dir == '/') {
            window.location.href = '/files/' + this.teamId
        } else {
            window.location.href = '/files/' + this.teamId + '?dir=' + dir
        }
    }

    folderClickHandle = (folderName) => {
        window.location.href = '/files/' + this.teamId + '?dir=' + this.curDir + (this.curDir == '/' ? '' : '/') + folderName
    }

    render() {
        return (
            <Page title="文件" className="file-page">
                <input className='file-input-hidden' type="file" ref={(fileInput) => this.fileInput = fileInput} onChange={this.uploadFileHandle}></input>

                <div className="file-con page-wrap">

                    <div className="head-info">
                        {this.state.teamInfo.name}的文件
                    </div>

                    <div className="file-dir">
                        {
                            this.state.dirList.length ? 
                            <div> 
                                {
                                    this.state.dirList.map((item, idx) => (
                                        <span onClick={() => {this.headDirClickHandle(item.dir)} }>{item.name} {idx == this.state.dirList.length - 1 ? '' : '>'} </span>
                                    ))
                                }
                            </div> 
                            :  ''
                        }
                    </div>

                    <div className="head">
                        <div className="create-btn" onClick={this.openFileInput}>上传文件</div>
                        <div className="create-btn" onClick={this.createFolderHandle}>创建文件夹</div>
                    </div>

                    <div className="file-list">
                        <div className="file-line header">
                            <div className="name">名称</div>
                            <div className="size">大小</div>
                            <div className="last-modify">最后修改时间</div>
                            <div className="tools"></div>
                        </div>

                        {
                            this.state.showCreateFolder ? <div className="file-line files">
                                <div className="name">
                                    <input autoFocus="autofocus" type="text" className="folder-name" onChange={this.createFolderNameInputHandle} value={this.state.createFolderName} />
                                </div>
                                <div className="tools">
                                    <span onClick={this.createFolderComfirmHandle}>创建</span>
                                    <span onClick={this.createFolderCancelHandle}>取消</span>
                                </div>
                            </div> : ''
                        }

                        {
                            this.state.fileList.map((item, idx) => {
                                if (idx > 10) {
                                    return
                                }
                                if (item.fileType == 'folder') {
                                    return (
                                        <div className="file-line files" key={item.fileType + '-' + item._id}>
                                            <div className="name" onClick={() => {this.folderClickHandle(item.name)}}>{'(文件夹)'}{item.name}</div>
                                            <div className="size">-</div>
                                            <div className="last-modify">{formatDate(item.last_modify_time)}</div>
                                            <div className="tools">
                                                <span>移动</span>
                                                <span onClick={() => { this.deleteHandle('folder', item.name) }}>删除</span>
                                            </div>
                                        </div>
                                    )
                                }
                                if (item.fileType == 'file') {
                                    return (
                                        <div className="file-line files" key={item.fileType + '-' + item._id}>
                                            <div className="name">{item.name}</div>
                                            <div className="size">大小</div>
                                            <div className="last-modify">{formatDate(item.last_modify_time)}</div>
                                            <div className="tools">
                                                <span onClick={() => { this.downloadHandle(item.OssKey) }}>下载</span>
                                                <span>移动</span>
                                                <span onClick={() => { this.deleteHandle('file', item.name) }}>删除</span>
                                            </div>
                                        </div>
                                    )
                                }
                            })
                        }

                    </div>
                </div>


            </Page>
        )
    }
}


