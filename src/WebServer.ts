import Koa from "koa"
import cors from "@koa/cors"
import Router from "koa-router"
import bodyParser from "koa-bodyparser"

import Event from "./Event.js"
import Logger from "./Logger.js"
import Config from "./Config.js"

const en : Event = new Event()

const logger = new Logger("WebServer")

const _conf : Config = new Config("WebServer")
const _port : number = _conf.init("port", 1823, () => logger.warn("初始化 port 配置：1823"))
const _host : string = _conf.init("host", "0.0.0.0", () => logger.warn("初始化 host 配置：0.0.0.0"))
const _useProxy : boolean = _conf.init("useProxy", false, () => logger.warn("初始化 useProxy 配置：false"))
const _cors : cors.Options = _conf.init("cors", {
    origin: '*', // 允许所有域名跨域访问
    allowMethods: "*", // 允许的 HTTP 请求方法
    allowHeaders: "*" // 允许的请求头
}, () => logger.warn("初始化 cors 配置：{origin: '*', allowMethods: '*', allowHeaders: '*'}"))

/**
 * Web服务器
 */
export default class WebServer {
    protected _app : Koa;
    protected _router : Router;

    /**
     * 创建Web服务器
     */
    public constructor () {
        this._app = new Koa()
        this._router = new Router()

        // 代理/CDN
        this._app.proxy = _useProxy

        // 跨域
        this._app.use(cors(_cors))

        // Post参数获取
        this._app.use(bodyParser())

        // 路由
        this._app.use(this._router.routes())

        // 监听所有请求
        this._app.use(async (ctx : any, next : Function) => {
            ctx.set("Content-Type", "application/json")

            logger.info(`${ctx.ip} ${ctx.method} ${ctx.url}`)

            await next()
        })

        // 404
        this._app.use(async (ctx : any, next : Function) => {
            ctx.status = 404
            ctx.body = {
                code: 404,
                msg: "接口不存在！"
            }
            await next()
        })

        en.listen("system.start", () => {
            // 启动
            this._app.listen(_port, _host)
            logger.info(`Web服务器已绑定端口：${_port}`)
        })
    }

    /**
     * 获取路由
     * @returns 路由
     */
    public getRouter () : any {
        return this._router
    }

    /**
     * 绑定中间件
     * @param middleware 中间件
     */
    public use (middleware : Koa.Middleware<Koa.DefaultState, Koa.DefaultContext, any>) : void {
        this._app.use(middleware)
    }
}