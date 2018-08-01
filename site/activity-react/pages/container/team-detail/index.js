import * as React from 'react';
import './style.scss'
import api from '../../../utils/api';
var ReactDOM = require('react-dom')
import { sortByCreateTime, formatDate } from '../../../utils/util'
import Task from "../../container/task"
import Page from '../../../components/page'
import Modal from '../../../components/modal'
import MemberChosenList from '../../../components/member-chose-list'
import Editor from '../../../components/editor'
import fileUploader from '../../../utils/file-uploader'
import TopicItem from '../../../components/topic-item'
import {create} from '../../../../../server/components/uuid/uuid'
 
class TeamChoseItem extends React.PureComponent {
    render() {
        return (
            <div className="admin-team-item">
                <div className="team-img"></div>
                <div className="team-name">{this.props.name}</div>
                {this.props.active && <span className="check">√</span>}
            </div>
        )
    }
}


export default class TeamDetail extends React.Component {
    state = {
        showCreateTopic: false,
        isCreator: false,

        topicName: '',
        topicContent: '',
        topicAttachments: [],

        teamInfo: {},
        topicList: [],
        memberList: [],
        attachmentsArg:{},
        ossKeyArg:"",
        fileList: [],
        showCreateFolder: false,
        createFolderName: '新建文件夹',
        
        modal: document.createElement('div'),
        moveItem: '',
        renderTimes: 0,

        renameId: '',
        renameName: '',
    }

    componentDidMount = async () => {
        this.teamId = this.props.params.id
        this.initTeamInfo()
        this.initTeamFile()
    }

    initTeamFile = async () => {
        const result = await api('/api/file/getDirFileList', {
            method: 'POST',
            body: {
                dirInfo: {
                    teamId: this.teamId,
                    dir: '/',
                }
            }
        })
        if (result && result.data && result.data.fileList) {
            this.setState({
                fileList: result.data.fileList
            })
        }
    }


    initTeamInfo = async () => {
        const result = await api('/api/team/info', {
            method: 'POST',
            body: {
                teamId: this.teamId
            }
        })
        if (!result.data) {
            window.toast('团队内容加载出错')
        }
        const teamInfo = {}
        teamInfo._id = result.data._id
        teamInfo.name = result.data.name
        teamInfo.teamImg = result.data.teamImg
        teamInfo.desc = result.data.teamDes


        const memberList = []
        const memberIDList = []

        const curUserId = this.props.personInfo._id

        let isCreator = ''

        result.data.memberList.map((item) => {  // 判断是否是创建者 ？
            if (item.userId == curUserId) {
                isCreator = item.role
            }
            memberIDList.push(item.userId)
        })
        console.log(isCreator)
        const memberResult = await api('/api/userInfoList', {
            method: 'POST',
            body: { userList: memberIDList }
        })
        // console.log('result.data.topicList', result.data.topicList)
        memberResult.data.map((item, idx) => {
            memberList.push({
                ...item,
                ...result.data.memberList[idx],
                chosen: false,
            })
        })
        this.setState({
            isCreator: isCreator,
            teamInfo: teamInfo,
            memberList: memberList,
            topicList: sortByCreateTime(result.data.topicList)
        })
    }

    locationTo = (url) => {
        this.props.router.push(url)
    }

    handleTopicContentChange = (content) => {
        this.setState({
            topicContent: content
        })
    }

    createTopicHandle = async () => {
        const informList = []
        this.state.memberList.map((item) => {
            if (item.chosen) {
                informList.push(item._id)
            }
        })
        if(this.state.attachmentsArg.name){
            const result1 = await api('/api/file/createFile', {
                method: 'POST',
                body: {
                    fileInfo: {
                        teamId: this.teamId,
                        size: this.state.attachmentsArg.size,
                        dir: '/',
                        fileName: this.state.attachmentsArg.name,
                        ossKey: this.state.ossKeyArg,
                    }
                }
            })
            if (result1.state.code === 0) {
                window.toast("上传文件成功")
            } else {
                window.toast(result1.state.msg)
            }
        }
        
        const result = await api('/api/topic/createTopic', {
            method: 'POST',
            body: {
                teamId: this.teamId,
                name: this.state.topicName,
                content: this.state.topicContent,
                fileList: this.state.topicAttachments,
                informList: informList,
            }
        })

        if (result.state.code == 0) {
            const topicList = this.state.topicList
            const time = new Date().getTime()
            topicList.unshift({
                _id: result.data._id,
                creator: this.props.personInfo,
                title: this.state.topicName,
                content: this.state.topicContent,
                fileList: this.state.topicAttachments,
                time: time,
            })
            this.setState({
                topicList: topicList,
                showCreateTopic: false,
                topicName: '',
                topicContent: '',
                topicAttachments:[],
            })
        } else {
            window.toast(result.state.msg)
        }
        
        this.initTeamFile()
    }


    deleteFile = async (e, index) => {
        let topicAttachments = this.state.topicAttachments
        topicAttachments.splice(index, 1);
        this.setState({
            topicAttachments,
        })
    }

    topicNameInputHandle = (e) => {
        this.setState({
            topicName: e.target.value
        })
    }

    topicContentInputHandle = (e) => {
        this.setState({
            topicContent: e.target.value
        })
    }

    topicFileUploadHandle = async (e) => {
        var fileName= e.target.files[0].name
        var nameParts = e.target.files[0].name.split('.')
        var ossKey = this.teamId + '/' + create() + '.' + nameParts[nameParts.length-1]
        this.setState({
            attachmentsArg:e.target.files[0],
            ossKeyArg:ossKey
        })
        const resp = await fileUploader(e.target.files[0], ossKey)
        let topicAttachments = this.state.topicAttachments
        resp.fileName = fileName
        topicAttachments = [...topicAttachments, resp]
        this.setState({
            topicAttachments,
        })
    }

    memberChoseHandle = (tarId) => {
        const memberList = this.state.memberList
        memberList.map((item) => {
            if (item._id == tarId) {
                item.chosen = !item.chosen
            }
        })
        this.setState({ memberList })
    }

    toAdminHandle = () => {
        location.href = '/team-admin/' + this.teamId
    }

    // todo
    handlecloseEditTodo = () => {
        this.setState({ showCreateTodo: false })
    }

    handleTodoCreate = async (lIndex, id, todoInfo) => {
        if(!todoInfo.name.trim()){
            alert("任务名不能为空")
        }
        else{
            const result = await api('/api/task/create', {
                method: 'POST',
                body: {
                    teamId: this.teamId,
                    listId: id,
                    name: todoInfo.name,
                    ddl: todoInfo.date,
                    assigneeId: todoInfo.assigneeId,
                }
            })
            // 返回用户名的显示依赖assigneeId
            if (result.state.code === 0) {
                let todo = {
                    listId: result.data.listId,
                    id: result.data.id,
                    name: result.data.title,
                    desc: result.data.content,
                    assignee: {
                        id: result.data.header,
                    },
                    ddl: result.data.deadline,
                    checkItemDoneNum: 0,
                    // checkItemNum: 0,
                    hasDone: false,
                }
                const todoListArr = this.state.todoListArr
                const todolist = todoListArr[lIndex]
                if (!todolist.list) {
                    todolist.list = []
                }
                todolist.list = [...todolist.list, todo]
                this.setState({ todoListArr})
            }
            return result
        }
        
    }

    handleTodoModify = async (lIndex, lId, id, todoInfo) => {
        let editTask = {}
        if(!todoInfo.name.trim()){
            alert("任务名不能为空")
        }
        else{
            editTask.name = todoInfo.name
            editTask.ddl = todoInfo.date
            editTask.assigneeId = todoInfo.assigneeId
            const resp = await api('/api/task/edit', {
                method: 'POST',
                body: {
                    listId: lId,
                    taskId: todoInfo.id,
                    teamId: this.teamId,
                    editTask: editTask,
                }
            })
            if (resp.state.code === 0) {
                const todoListArr = this.state.todoListArr
                const todolist = todoListArr[lIndex]
                const [todoItem, itemIndex] = getUpdateItem(todolist.list, id)
                todoItem.name = resp.data.title
                todoItem.ddl = resp.data.deadline
                todoItem.assignee.id = resp.data.header
                todolist.list[itemIndex] = todoItem
                todolist.list = todolist.list.slice()
                this.setState({ todoListArr })
            }
            return resp
        }
    }

    handleTodoCheck = async (lIndex, lId, id, hasDone) => {
        let editTask = {}
        editTask.hasDone = !hasDone
        const resp = await api('/api/task/edit', {
            method: 'POST',
            body: {
                listId: lId,
                taskId: id,
                teamId: this.teamId,
                editTask: editTask,
            }
        })
        console.log(resp)
        if (resp.state.code === 0) {
            // 更新 todolist
            const todoListArr = this.state.todoListArr
            const todolist = todoListArr[lIndex]
            const [todoItem, itemIndex] = getUpdateItem(todolist.list, id)
            todoItem.hasDone = resp.data.state
            todoItem.completeTime = resp.data.completed_time
            // ...更新完成时间赋值
            todolist.list[itemIndex] = todoItem
            todolist.list = todolist.list.slice()
            this.setState({ todoListArr })
        }
    }

    handleAssigneeChange = async (lIndex, lId, id, e) => {
        let editTask = {}
        editTask.assigneeId = e.target.value
        const resp = await api('/api/task/edit', {
            method: 'POST',
            body: {
                listId: lId,
                taskId: id,
                teamId: this.teamId,
                editTask: editTask,
            }
        })
        console.log(resp)
        if (resp.state.code === 0) {
            let todoListArr = this.state.todoListArr
            const todolist = todoListArr[lIndex]
            const [todoItem, itemIndex] = getUpdateItem(todolist.list, id)
            // fix bug: 这里进行过短路优化
            todoItem.assignee = {}
            todoItem.assignee.id = resp.data.header
            todolist.list[itemIndex] = todoItem
            todolist.list = todolist.list.slice()
            this.setState({ todoListArr })
            return resp
        }
    }

    handleDateChange = async (lIndex, lId, id, e) => {
        let editTask = {}
        editTask.ddl = e.target.value
        const resp = await api('/api/task/edit', {
            method: 'POST',
            body: {
                listId: lId,
                taskId: id,
                teamId: this.teamId,
                editTask: editTask,
            }
        })
        if (resp.state.code === 0) {
            const todoListArr = this.state.todoListArr
            const todolist = todoListArr[lIndex]
            const [todoItem, itemIndex] = getUpdateItem(todolist.list, id)
            todoItem.ddl = resp.data.deadline
            todolist.list = todolist.list.slice()
            this.setState({ todoListArr })
            return resp
        }
    }

    handleTodoDelete = async (lIndex, lId, id) => {
        const resp = await api('/api/task/delTask', {
            method: "POST",
            body: {
                taskId: id,
                teamId: this.teamId,
                listId: lId,
            }
        })
        if (resp.state.code === 0) {
            const todoListArr = this.state.todoListArr
            const todolist = todoListArr[lIndex]
            const [todoItem, itemIndex] = getUpdateItem(todolist.list, id)
            todolist.list.splice(itemIndex, 1)
            todolist.list = todolist.list.slice()
            this.setState({ todoListArr })
            return resp
        }
    }

    // todoList
    handleTodoListCreate = async (info) => {
        if(!info.name.trim()){
            alert("清单名不能为空")
        }
        else{
            var listExist = false
            this.state.todoListArr.map((item) => {
                if (item.name === info.name) {
                    alert("清单已存在")
                    listExist = true
                }
            })
            if (!listExist) {
                const result = await api('/api/task/createTaskList', {
                    method: 'POST',
                    body: {
                        teamId: this.teamId,
                        name: info.name,
                    }
                })
                if (result.state.code === 0) {
                    let createTodo = {
                        id: result.data.id,
                        name: result.data.name,
                        list: [],
                    }
                    let todoListArr = this.state.todoListArr
                    todoListArr = [...todoListArr, createTodo]
                    this.setState({
                        showCreateTodoList: false,
                        todoListArr
                    })
                }
            }
        }
    }

    changeTodoIndex = async (index,todoId) => {
        const resp = await api('/api/task/changeIndex', {
            method: "POST",
            body: {
                taskId: todoId,
                index:index,
                teamId: this.teamId,
            }
        })
        console.log(resp)
        this.initTodoListArr()
    }

    handleTodoListModify = async (index, id, info) => {
        if(!info.name.trim()){
            alert("清单名不能为空")
        }
        else{
            const todoListArr = this.state.todoListArr
            const resp = await api('/api/task/updateTasklist', {
                method: "POST",
                body: {
                    listId: id,
                    name: info.name,
                    teamId: this.teamId,
                }
            })
            if (resp.state.code === 0) {
                todoListArr[index].name = resp.data.name
                this.setState({ todoListArr: todoListArr.slice() })
            }
            return resp
        }
    }

    handleTodoListDelete = async (index, id) => {
        const todoListArr = this.state.todoListArr
        const resp = await api('/api/task/delTasklist', {
            method: "POST",
            body: {
                listId: id
            }
        })
        const [todolist, todolistIndex] = getUpdateItem(todoListArr, id)
        todoListArr.splice(todolistIndex, 1)
        if (resp.state.code === 0) {
            this.setState({ todoListArr: todoListArr.slice() })
        }
        return resp
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
                    dir: '/',
                    folderName: this.state.createFolderName
                }
            }
        })

        if (result.state.code === 0) {
            window.toast("创建文件夹成功")
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
        var nameParts = e.target.files[0].name.split('.')
        var ossKey = this.teamId + '/' + create() + '.' + nameParts[nameParts.length-1]
        var succeeded;
        const uploadResult = fileUploader(file, ossKey)
        await uploadResult.then(function (val) {
            succeeded = 1
        }).catch(function (reason) {
            succeeded = 0
        })

        if (succeeded === 0) {
            window.toast("上传文件失败")
            return
        }

        const result = await api('/api/file/createFile', {
            method: 'POST',
            body: {
                fileInfo: {
                    teamId: this.teamId,
                    size: file.size,
                    dir: '/',
                    fileName: file.name,
                    ossKey: ossKey,
                }
            }
        })
        if (result.state.code === 0) {
            window.toast("上传文件成功")
        } else {
            window.toast(result.state.msg)
        }

        this.initTeamFile()
    }

    viewHandle = async (file) => {
        if (file.fileType == 'folder') {
            var path;
            if (this.state.dir == '/') path = this.state.dir + file.name;
            else path = this.state.dir + '/' + file.name;
            this.state.dir = path;
        }
        this.getDirFileListHandle()
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

    folderClickHandle = (dir) => {
        location.href = '/files/' + this.teamId + '?dir=/' + dir
    }
    
    moveHandle = async (item, tarDir) => {
        if (item.fileType == 'file') {
            const result = await api('/api/file/moveFile', {
                method: 'POST',
                body: {
                    fileInfo: {
                        teamId: this.teamId,
                        dir: '/',
                        fileName: this.state.moveItem.name,
                        tarDir: tarDir,
                    }
                }
            })

            if (result.state.code == 0) {
                window.toast("移动文件成功")
            } else {
                window.toast(result.state.msg)
            }
        }
        else {
            const result = await api('/api/file/moveFolder', {
                method: 'POST',
                body: {
                    folderInfo: {
                        teamId: this.teamId,
                        dir: '/',
                        folderName: this.state.moveItem.name,
                        tarDir: tarDir,
                    }
                }
            })

            if (result.state.code == 0) {
                window.toast("移动文件夹成功")
            } else {
                window.toast(result.state.msg)
            }
        }
        this.initTeamFile()
    }

    onChildChanged = (moveTarDir) => {
        if (moveTarDir != '') {
            this.moveHandle(this.state.moveItem, moveTarDir)
        }
        document.getElementById('app').removeChild(this.state.modal)
        this.state.moveItem = ''
        this.setState({
            renderTimes: this.state.renderTimes+1
        })
    }

    openMoveModalHandle = (item) => {
        this.state.moveItem = item
        ReactDOM.render(<Modal key={"item"+this.state.renderTimes} teamId={this.teamId} folderId={item._id} callbackParent={this.onChildChanged}/>, this.state.modal)
        document.getElementById('app').appendChild(this.state.modal)
    }

    renameHandle = (item) => {
        // this.setState({
        //     renameId: item._id,
        //     renameName:item.name
        // })
        this.state.renameId = item._id
        this.state.renameName = item.name
        // this.state.renameId = item._id
        // this.state.renameName = item.name
        this.initTeamFile()
    }

    renameNameInputHandle = (e) => {
        this.setState({
            renameName: e.target.value
        })
    }

    renameCancelHandle = () => {
        this.state.renameId = ''
        this.state.renameName = ''
        this.initTeamFile()
    }

    renameComfirmHandle = async (item) => {
        if (item.fileType == 'file') {
            const result = await api('/api/file/updateFileName', {
                method: 'POST',
                body: {
                    fileInfo: {
                        teamId: this.teamId,
                        dir: '/',
                        fileName: item.name,
                    },
                    tarName: this.state.renameName,
                }
            })
            if (result.state.code == 0) {
                window.toast("修改文件名称成功")
                this.setState({
                    renameName: '',
                    renameId: '',
                })
                this.initTeamFile()
            } else {
                window.toast(result.state.msg)
            }
        } else {
            const result = await api('/api/file/updateFolderName', {
                method: 'POST',
                body: {
                    folderInfo: {
                        teamId: this.teamId,
                        dir: '/',
                        folderName: item.name,
                    },
                    tarName: this.state.renameName,
                }
            })

            if (result.state.code == 0) {
                window.toast("修改文件夹名称成功")
                this.setState({
                    renameName: '',
                    renameId: '',
                })
                this.initTeamFile()
            } else {
                window.toast(result.state.msg)
            }
        }
    }

    toMemberHandle = () =>{
        const location = {pathname:'/member', state:{teamId:this.state.teamInfo._id}}
        this.props.router.push(location)
    }


    render() {
        let teamInfo = this.state.teamInfo
        return (
            <Page title={teamInfo.name + " - IHCI"}
                className="project-page">
                <div className="discuss-con page-wrap">
                    <div className="team-info">
                        <div className="left">
                            <div className="head">{teamInfo.name}</div>
                            <pre><div className="team-des">{teamInfo.desc}</div>  </pre>
                        </div>
                        <div className="right">
                            <div className="admin" onClick={this.toMemberHandle}>
                                <div className="admin-con member-num">{this.state.memberList.length}</div>
                                <span>成员</span>
                            </div>
                            {
                                this.state.isCreator == 'creator' && <div className="admin">
                                    <div className="admin-con iconfont icon-setup_fill" onClick={this.toAdminHandle}></div>
                                    <span>设置</span>
                                </div>
                            }

                        </div>
                    </div>


                    <div className="div-line"></div>

                    <div className="head">
                        <span className='head-title'>讨论</span>
                        <div className="create-btn" onClick={() => { this.setState({ showCreateTopic: true }) }}>发起讨论</div>
                    </div>

                    {
                        this.state.showCreateTopic && <div className="create-area">
                            <input type="text"
                                className="topic-name"
                                onChange={this.topicNameInputHandle}
                                value={this.state.topicName} placeholder="话题" />
                            <Editor handleContentChange={this.handleTopicContentChange.bind(this)}
                                handleFileUpload={this.topicFileUploadHandle.bind(this)}
                                deleteFile={this.deleteFile.bind(this)}
                                attachments={this.state.topicAttachments}></Editor>

                            <div className="infrom">请选择要通知的人：</div>
                            <MemberChosenList choseHandle={this.memberChoseHandle}
                                memberList={this.state.memberList} />

                            <div className="btn-con">
                                <div className="create-btn"
                                    onClick={this.createTopicHandle}>发起讨论</div>
                                <div className="cancle"
                                    onClick={() => { this.setState({ showCreateTopic: false }) }}>取消</div>
                            </div>
                        </div>
                    }
                    <div className="topic-list">
                        {
                            this.state.topicList.map((item) => {
                                return (
                                    <TopicItem locationTo={this.locationTo}
                                        key={item._id}
                                        {...item} />
                                )
                            })
                        }
                    </div>

                        <Task
                        teamId={this.props.params.id}
                        curUserId={this.props.personInfo._id}
                        ></Task>
                    
                            
                        <input className='file-input-hidden' type="file" ref={(fileInput) => this.fileInput = fileInput} onChange={this.uploadFileHandle}></input>
                        <div className="head">
                            <span className='head-title'>文件</span>
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
                                        <input autoFocus="autofocus" type="text" className="folder-name" 
                                        onKeyDown={(event)=>{if(event.keyCode== "13"){this.createFolderComfirmHandle()}}} onChange={this.createFolderNameInputHandle} value={this.state.createFolderName} />
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
                                    if (item._id == this.state.renameId) {
                                        return (
                                            <div className="file-line files" key={item.fileType + '-' + item._id}>
                                                <div className="name">
                                                    <input  autoFocus="autofocus" type="text" className="folder-name" 
                                                    onKeyDown={(event)=>{if(event.keyCode== "13"){this.renameComfirmHandle(item)}}} onChange={this.renameNameInputHandle} value={this.state.renameName} />
                                                </div>
                                                <div className="tools">
                                                    <span onClick={() => { this.renameComfirmHandle(item) }}>确定</span>
                                                    <span onClick={this.renameCancelHandle}>取消</span>
                                                </div>
                                            </div>
                                        )

                                    } else {
                                        if (item.fileType == 'folder') {
                                            return (
                                                <div className="file-line files" key={item.fileType + '-' + item._id}>
                                                    <div className="name" onClick={() => { this.folderClickHandle(item.name) }}><i className="icon iconfont icon-iconset0196"></i>{item.name}</div>
                                                    <div className="size">-</div>
                                                    <div className="last-modify">{formatDate(item.last_modify_time)}</div>
                                                    <div className="tools">
                                                        <span onClick={() => { this.openMoveModalHandle(item) }}>移动</span>
                                                        <span onClick={() => { this.renameHandle(item) }}> 重命名 </span>
                                                        <span onClick={() => { this.deleteHandle('folder', item.name) }}>删除</span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        if (item.fileType == 'file') {
                                            return (
                                                <div className="file-line files" key={item.fileType + '-' + item._id}>
                                                    <div className="name">{item.name}</div>
                                                    <div className="size">{item.size}</div>
                                                    <div className="last-modify">{formatDate(item.last_modify_time)}</div>
                                                    <div className="tools">
                                                        <span onClick={() => { this.downloadHandle(item.ossKey) }}>下载</span>
                                                        <span onClick={() => { this.openMoveModalHandle(item) }}>移动</span>
                                                        <span onClick={() => { this.renameHandle(item) }}> 重命名 </span>
                                                        <span onClick={() => { this.deleteHandle('file', item.name) }}>删除</span>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    }
                                })

                            }
                            <div className='show-all-file' onClick={() => { location.href = '/files/' + this.teamId }}> 查看全部文件 </div>

                    </div>

                </div>
            </Page>
        )
    }
}


