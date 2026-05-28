/**
 * WebSocket Load Test
 *
 * 使用 k6 进行 WebSocket 连接压力测试
 * 目标：验证 Backend 能否支持 10,000 并发连接
 */

import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'

// 自定义指标
const connectionTime = new Trend('connection_time')
const messagesSent = new Counter('messages_sent')
const messagesReceived = new Counter('messages_received')
const errors = new Counter('errors')

// 测试配置
export const options = {
  // 场景 1：连接压力测试（10,000 连接）
  scenarios: {
    connection_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1000 },   // 2 分钟内增加到 1000 连接
        { duration: '3m', target: 5000 },   // 3 分钟内增加到 5000 连接
        { duration: '5m', target: 10000 },  // 5 分钟内增加到 10,000 连接
        { duration: '10m', target: 10000 }, // 保持 10,000 连接 10 分钟
        { duration: '2m', target: 0 },      // 2 分钟内降到 0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // 性能目标
    connection_time: ['p(95)<500'],        // 95% 连接建立时间 < 500ms
    ws_connecting: ['p(95)<500'],          // 95% WebSocket 连接时间 < 500ms
    ws_session_duration: ['p(95)>600000'], // 95% 会话持续时间 > 10 分钟
    errors: ['count<100'],                 // 错误数 < 100
  },
}

// WebSocket URL（从环境变量获取）
const WS_URL = __ENV.WS_URL || 'ws://localhost:3002/ws'

export default function () {
  const startTime = Date.now()

  // 建立 WebSocket 连接
  const res = ws.connect(WS_URL, {}, function (socket) {
    // 连接成功
    connectionTime.add(Date.now() - startTime)

    // 监听消息
    socket.on('open', () => {
      console.log('WebSocket connected')

      // 发送认证消息
      const authMessage = JSON.stringify({
        type: 'auth',
        realmId: `realm-${__VU}`,
        token: 'test-token',
      })
      socket.send(authMessage)
      messagesSent.add(1)
    })

    socket.on('message', (data) => {
      messagesReceived.add(1)
      console.log(`Received: ${data}`)
    })

    socket.on('error', (e) => {
      errors.add(1)
      console.error(`WebSocket error: ${e}`)
    })

    socket.on('close', () => {
      console.log('WebSocket closed')
    })

    // 定期发送心跳
    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === ws.OPEN) {
        const heartbeat = JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
        })
        socket.send(heartbeat)
        messagesSent.add(1)
      }
    }, 30000) // 每 30 秒发送一次心跳

    // 保持连接 10 分钟
    sleep(600)

    // 清理
    clearInterval(heartbeatInterval)
    socket.close()
  })

  // 检查连接结果
  check(res, {
    'status is 101': (r) => r && r.status === 101,
  })
}
