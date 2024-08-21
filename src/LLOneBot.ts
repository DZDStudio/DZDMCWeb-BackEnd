type Echo = {
    resolve: (data : object) => void,
    reject: (err : string) => void
}

export type Sender = {
    user_id: number,
    nickname: string,
    sex: "male" | "female" | "unknown",
    age: number
}

export type GroupMessage = {
    sub_type: "normal" | "anonymous" | "notice"
    message_id: number,
    group_id: number,
    user_id: number,
    message: Array<{
        "type": "text" | "at" | "image",
        "data": {
            "text": string,
            "qq": number
            "url": string
        }
    }>,
    raw_message: string,
    sender: Sender
}

export type GroupMemberInfo = {
    group_id: number,
    user_id: number,
    nickname: string,
    card: string,
    sex: "male" | "female" | "unknown",
    age: number,
    area: string,
    join_time: number,
    last_sent_time: number,
    level: string,
    role: "owner" | "admin" | "member",
    unfriendly: boolean,
    title: string,
    title_expire_time: number,
    card_changeable: boolean,
    shut_up_timestamp: number
}


import * as uuid from "uuid"
import ws from "ws"

import Logger from "./Logger.js"
import Config from "./Config.js"
import Event from "./Event.js"

const logger = new Logger("LLOneBot")

const conf : Config = new Config("LLOneBot")
const _WS_URL : string = conf.init("WS_URL", "ws://10.0.0.2:3001")

const _echo : Map<string, Echo> = new Map()

let _ws : ws, _ws_open = false

Event.create("LLOneBot.onLink")
Event.create("LLOneBot.onGroupMessage")
function linkWS() {
    logger.info("正在连接至LLOneBot...")
    _ws = new ws(_WS_URL)

    _ws.on("open", () => {
        _ws_open = true
        logger.info(`已连接到LLOneBot。`)
        Event.trigger("LLOneBot.onLink")
    })

    _ws.on("message", (data) => {
        logger.debug(`收到LLOneBot消息：${data.toString()}`)
        const msg = JSON.parse(data.toString())

        // 执行 API 回调
        if (msg["echo"] != undefined) {
            const echo : Echo = _echo.get(msg["echo"])

            if (echo != undefined) {
                if (msg["status"] != "failed") {
                    echo["resolve"](msg["data"])
                } else {
                    echo["reject"](msg["msg"])
                }
                _echo.delete(msg["echo"])
            }
        }

        // 群消息
        if (msg["message_type"] == "group" && msg["post_type"] == "message") {
            Event.trigger("LLOneBot.onGroupMessage", {
                sub_type: msg.sub_type,
                message_id: msg.message_id,
                group_id: msg.group_id,
                user_id: msg.user_id,
                message: msg.message,
                raw_message: msg.raw_message,
                sender: msg.sender
            })
        }
    })

    _ws.on("error", (err) => {
        logger.error(`LLOneBot连接错误：${err}`)
    })

    _ws.on("close", () => {
        _ws_open = false
        logger.error(`LLOneBot连接断开！将于 5 秒后重连...`)
        setTimeout(() => {
            linkWS()
        }, 5000)
    })
}
linkWS()

export class LLOneBot {
    /**
     * 发送群消息
     * @param group_id 群号
     * @param message 消息内容
     * @param auto_escape 是否转义消息内容
     * @returns Promise
     */
    public static async sendGroupMessage(group_id : number, message : string, auto_escape : boolean = false) {
        return new Promise((resolve, reject) => {
            if (!_ws_open) {
                reject("未连接至LLOneBot")
                return
            }

            let echo = uuid.v4()

            const data = {
                action: "send_group_msg",
                params: {
                    group_id: group_id,
                    message: message,
                    auto_escape: auto_escape
                },
                echo: echo
            }
    
            _ws.send(JSON.stringify(data))

            _echo.set(echo, {
                resolve: resolve,
                reject: reject
            })
        })
    }

    /**
     * 获取群成员信息
     */
    public static async getGroupMemberInfo(group_id : number, user_id : number, no_cache : boolean = false) {
        return new Promise((resolve, reject) => {
            if (!_ws_open) {
                reject("未连接至LLOneBot")
                return
            }

            let echo = uuid.v4()

            const data = {
                action: "get_group_member_info",
                params: {
                    group_id: group_id,
                    user_id: user_id,
                    no_cache: no_cache
                },
                echo: echo
            }

            _ws.send(JSON.stringify(data))

            _echo.set(echo, {
                resolve: resolve,
                reject: reject
            })
        })
    }
}