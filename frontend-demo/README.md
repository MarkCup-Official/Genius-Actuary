# Frontend Demo

这是一个最小联调页面，用来验证：

- 浏览器首次访问时是否正确拿到匿名 `cookie`
- `POST /api/sessions` 是否能创建绑定到当前 cookie 的会话
- 追问答案是否能继续推进主循环
- 报告预览、证据和结论是否能被前端消费

## 目录

- `index.html`: 单页演示入口
- `app.js`: 直接调用后端 API
- `styles.css`: 最小演示样式

## 启动方式

最省事的方式是直接在仓库根目录运行：

```bash
powershell -ExecutionPolicy Bypass -File .\run-demo.ps1
```

停止：

```bash
powershell -ExecutionPolicy Bypass -File .\stop-demo.ps1
```

如果你想手动启动，再按下面方式：

先启动后端：

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

再启动一个本地静态服务器，建议使用 `8080`：

```bash
cd frontend-demo
python -m http.server 8080
```

然后访问：

- [http://127.0.0.1:8080](http://127.0.0.1:8080)

## 联调步骤

1. 打开页面后先点“初始化 Cookie”
2. 输入问题并创建会话
3. 按页面渲染的追问填写答案
4. 提交答案，页面会继续推进 MCP 占位执行和报告预览

## 注意

- 请求使用 `credentials: "include"`，用于发送后端设置的 cookie。
- 当前后端 CORS 白名单已放通 `localhost/127.0.0.1` 的常见本地端口，适合这个 demo。
- 当前 demo 是纯静态页面，目的是快速验证后端主循环，不代表最终前端架构。
