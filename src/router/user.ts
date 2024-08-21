import MongoDB from "../MongoDB.js"
import Logger from "../Logger.js"
import Utils from "../Utils.js"
import { LLOneBot } from "../LLOneBot.js"
import { User , userData , Session } from "../User.js"

const logger : Logger = new Logger("User")

export default async (router : any) => {
    // 获取用户信息
    router.post("/user/info", async (ctx : any) => {
        let token : string = ctx.request.body.token
        if (!token) {
            ctx.body = {
                code: 400,
                msg: "缺少参数。"
            }
            return
        }

        // 验证 token
        let user : userData = await User.verifyToken(token)
        if (user == null) {
            ctx.body = {
                code: 401,
                msg: "身份验证失败。"
            }
            return
        }

        ctx.body = {
            code: 200,
            msg: "成功。",
            data: user
        }
        return
    })

    // 下线设备
    router.post("/user/offline", async (ctx : any) => {
        let token : string = ctx.request.body.token
        let sessionId : string = ctx.request.body.sessionId
        if (!token || !sessionId) {
            ctx.body = {
                code: 400,
                msg: "缺少参数。"
            }
            return
        }

        // 验证 token
        let user : userData = await User.verifyToken(token)
        if (user == null) {
            ctx.body = {
                code: 401,
                msg: "身份验证失败。"
            }
            return
        }

        // 为当前设备
        let isCurrentDevice = sessionId == user.currentSession

        await User.offline(user.uuid, sessionId).then(() => {
            ctx.body = {
                code: 200,
                msg: "成功。",
                data: {
                    isCurrentDevice
                }
            }
        }).catch((err) => {
            ctx.body = {
                code: 500,
                msg: err
            }
        })
    })

    // 设置用户名
    router.post("/user/name", async (ctx : any) => {
        let name : string = ctx.request.body.name
        let token : string = ctx.request.body.token
        if (!name || !token) {
            ctx.body = {
                code: 400,
                msg: "缺少参数。"
            }
            return
        }

        // 验证 token
        let user : userData = await User.verifyToken(token)
        if (user == null) {
            ctx.body = {
                code: 401,
                msg: "身份验证失败。"
            }
            return
        }

        // 是否重名
        if (await MongoDB.get("users", {
            "name": name
        }).then(data => {
            return data.length > 0
        })) {
            ctx.body = {
                code: 400,
                msg: "用户名已存在。"
            }
            return
        }

        // 更新
        await MongoDB.upData("users", {
            "uuid": user.uuid
        }, {
            $set:{
                "name": name
            }
        }).then(async () => {
            ctx.body = {
                code: 200,
                msg: "修改成功。"
            }
        }).catch(() => {
            ctx.body = {
                code: 500,
                msg: "修改失败！"
            }
        })
    })

    // 更新 JavaID
    router.post("/user/javaid", async (ctx : any) => {
        let javaid : string = ctx.request.body.javaid
        let token : string = ctx.request.body.token
        if (!javaid || !token) {
            ctx.body = {
                code: 400,
                msg: "缺少参数。"
            }
            return
        }

        // 验证 token
        let user : userData = await User.verifyToken(token)
        if (user == null) {
            ctx.body = {
                code: 401,
                msg: "身份验证失败。"
            }
            return
        }

        // 是否重名
        if (await MongoDB.get("users", {
            $or: [
                { "javaid": javaid },
                { "xboxid": javaid }
            ]
        }).then(data => {
            return data.length > 0
        })) {
            ctx.body = {
                code: 400,
                msg: "JavaID 或 XboxID 已存在。"
            }
            return
        }

        // 更新
        await MongoDB.upData("users", {
            "uuid": user.uuid
        }, {
            $set:{
                "javaid": javaid
            }
        }).then(async () => {
            ctx.body = {
                code: 200,
                msg: "修改成功。"
            }
        }).catch(() => {
            ctx.body = {
                code: 500,
                msg: "修改失败！"
            }
        })
    })

    // 更新 XboxID
    router.post("/user/xboxid", async (ctx : any) => {
        let xboxid : string = ctx.request.body.xboxid
        let token : string = ctx.request.body.token
        if (!xboxid || !token) {
            ctx.body = {
                code: 400,
                msg: "缺少参数。"
            }
            return
        }

        // 验证 token
        let user : userData = await User.verifyToken(token)
        if (user == null) {
            ctx.body = {
                code: 401,
                msg: "身份验证失败。"
            }
            return
        }

        // 是否重名
        if (await MongoDB.get("users", {
            $or: [
                { "javaid": xboxid },
                { "xboxid": xboxid }
            ]
        }).then(data => {
            return data.length > 0
        })) {
            ctx.body = {
                code: 400,
                msg: "XboxID 或 JavaID 已存在。"
            }
            return
        }

        // 更新
        await MongoDB.upData("users", {
            "uuid": user.uuid
        }, {
            $set:{
                "xboxid": xboxid
            }
        }).then(async () => {
            ctx.body = {
                code: 200,
                msg: "修改成功。"
            }
        }).catch(() => {
            ctx.body = {
                code: 500,
                msg: "数据库错误。"
            }
        })
    })

    // 更新 QQ 号
    router.post("/user/qq", async (ctx : any) => {
        let qq : number = Number(ctx.request.body.qq)
        let token : string = ctx.request.body.token
        if (!qq || !token) {
            ctx.body = {
                code: 400,
                msg: "缺少参数。"
            }
            return
        }

        // 验证 token
        let user : userData = await User.verifyToken(token)
        if (user == null) {
            ctx.body = {
                code: 401,
                msg: "身份验证失败。"
            }
            return
        }

        // 验证真实性
        let isQQ : boolean = await LLOneBot.getGroupMemberInfo(747121127, qq).then(() => {return true}).catch((err) => {return false})

        if (!isQQ) {
            ctx.body = {
                code: 400,
                msg: "该QQ号不存在。"
            }
            return
        }

        // 是否重名
        if (await MongoDB.get("users", {
            "qq": qq
        }).then(data => {
            return data.length > 0
        })) {
            ctx.body = {
                code: 400,
                msg: "QQ 已被绑定。"
            }
            return
        }

        // 更新
        await MongoDB.upData("users", {
            "uuid": user.uuid
        }, {
            $set:{
                "qq": qq
            }
        }).then(async () => {
            ctx.body = {
                code: 200,
                msg: "修改成功。"
            }
        }).catch(() => {
            ctx.body = {
                code: 500,
                msg: "数据库错误。"
            }
        })
    })
}