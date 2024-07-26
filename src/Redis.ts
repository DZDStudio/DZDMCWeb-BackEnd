import * as redis from 'redis'

import fs from "fs"

import Logger from "./Logger.js"
import Config from "./Config.js"

const logger = new Logger("Redis")

const conf : Config = new Config("Redis")
const _host : string = conf.init("host", "10.0.0.5", () => logger.warn("初始化 host 配置：10.0.0.5"))
const _port : number = conf.init("port", 6379, () => logger.warn("初始化 port 配置：6379"))
const _pwd : string = conf.init("pass", "***", () => logger.warn("初始化 pwd 配置：***"))

export default class Redis {
    protected _client : redis.RedisClientType

    /**
     * 创建邮件发送器
     */
    public constructor () {
        // 创建 Redis 客户端
        this._client = redis.createClient({
            url: `redis://${_host}:${_port}`,
            password: _pwd,
            socket: {
                reconnectStrategy: (retries) => {
                    logger.error(`Redis 重连失败，重试次数：${retries}`)
                    return Math.min(retries * 100, 10000)
                }
            }
        })

        // 连接 Redis
        this._client.connect().catch(err => {
            logger.fatal(`连接 Redis 时出现错误:${err}`)
        })
    }

    /**
     * 设置数据
     * @param key 键
     * @param value 值
     * @param time 剩余时间(秒)
     * @returns Promise<void>
     */
    public async set (key : string, value : any, time : number) : Promise<void> {
        return new Promise((resolve, reject) => {
            this._client.set(key, value, {
                EX: time
            }).then(() => {
                resolve()
            }).catch(err => {
                logger.error(`更新 Redis 数据时出现错误:${err}`)
                reject(err)
            })
        })
    }

    /**
     * 获取数据
     * @param key 键
     * @returns Promise<string>
     */
    public async get (key : string) : Promise<string> {
        return new Promise((resolve, reject) => {
            this._client.get(key).then(value => {
                resolve(value)
            }).catch(err => {
                logger.error(`获取 Redis 数据时出现错误:${err}`)
                reject(err)
            })
        })
    }

    /**
     * 删除数据
     * @param key 键
     * @returns Promise<void>
     */
    public async del (key : string) : Promise<void> {
        return new Promise((resolve, reject) => {
            this._client.del(key).then(() => {
                resolve()
            }).catch(err => {
                logger.error(`删除 Redis 数据时出现错误:${err}`)
                reject(err)
            })
        })
    }
}