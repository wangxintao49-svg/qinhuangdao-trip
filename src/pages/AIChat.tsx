import { useState } from 'react'
import { chatDeepSeek } from '../services/api'
import { useTripStore } from '../store/tripStore'
import type { ChatMessage } from '../types'

const quick = ['推荐半日路线', '拍好看的照片去哪', '下雨怎么办', '我赶火车了']

export default function AIChat() {
  const spots = useTripStore((s) => s.spots)
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { role: 'ai', text: '👋 你好！我是你的专属秦皇岛旅行规划师。\n\n告诉我你的需求——\n- "帮我规划半天路线"\n- "推荐吃饭的地方"\n- "下雨天能去哪"\n- 或者直接问我任何问题！' },
  ])
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async (text = val) => {
    if (!text.trim() || busy) return
    setMsgs((p) => [...p, { role: 'user', text }])
    setVal('')
    setBusy(true)
    const system = `你是秦皇岛旅行规划助手。以下是景点数据：${spots.map((s) => `${s.name}（${s.type}，${s.note}）`).join('；')}。路线建议从北戴河站到秦皇岛站。回答要简洁实用。`
    const reply = await chatDeepSeek([
      { role: 'system', content: system },
      ...msgs.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: text },
    ])
    setMsgs((p) => [...p, { role: 'ai', text: reply }])
    setBusy(false)
  }

  return (
    <div>
      <PageIntro {...pageIntros.chat} />
      <h2 className="text-2xl font-bold text-ocean-800 mb-4">🤖 AI 智能规划</h2>
      <div className="grid lg:grid-cols-5 gap-6" style={{ height: 'calc(100vh - 200px)' }}>
        {/* 对话区 */}
        <div className="lg:col-span-3 card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-ocean-100 font-semibold text-gray-700">💬 对话</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user' ? 'bg-ocean-500 text-white' : 'bg-white border border-ocean-100 text-gray-800'
                }`}>{m.text}</div>
              </div>
            ))}
            {busy && <div className="text-sm text-gray-500 italic animate-pulse">AI 正在思考...</div>}
          </div>
          <div className="p-4 border-t border-ocean-100">
            <p className="text-xs text-gray-500 mb-3">⚡ 快捷问题</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {quick.map((q) => (
                <button key={q} onClick={() => send(q)} disabled={busy}
                  className="px-3 py-1.5 bg-white border border-ocean-200 rounded-xl text-xs text-gray-700 hover:border-ocean-400 disabled:opacity-50">{q}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="输入你的旅行需求..." disabled={busy}
                className="flex-1 px-4 py-3 rounded-xl border border-ocean-200 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
              <button onClick={() => send()} disabled={!val.trim() || busy}
                className="px-6 py-3 rounded-xl bg-ocean-500 text-white font-medium hover:bg-ocean-600 disabled:opacity-50">发送</button>
            </div>
          </div>
        </div>

        {/* 右侧推荐 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 h-[45%] flex flex-col items-center justify-center bg-gradient-to-br from-ocean-100 to-ocean-200">
            <div className="text-5xl mb-3">🗺️</div>
            <p className="text-ocean-800 font-medium">路线预览</p>
            <p className="text-ocean-600 text-sm">生成路线后将显示在地图上</p>
          </div>
          <div className="card p-4 flex-1 overflow-auto">
            <h3 className="font-semibold text-gray-700 mb-3">✨ 核心出行清单</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex gap-2"><span className="text-ocean-500">1.</span> 下载「秦皇岛公交」App 查实时公交</p>
              <p className="flex gap-2"><span className="text-ocean-500">2.</span> 打车用滴滴/高德，北戴河区内一般 ¥10-20</p>
              <p className="flex gap-2"><span className="text-ocean-500">3.</span> 鸽子窝日出需 05:00 前到，注意打车</p>
              <p className="flex gap-2"><span className="text-ocean-500">4.</span> 秦皇小巷晚上更热闹，建议 18:00 后到</p>
              <p className="flex gap-2"><span className="text-ocean-500">5.</span> 北戴河站→秦皇岛站 高铁约 12 分钟</p>
              <p className="flex gap-2"><span className="text-ocean-500">6.</span> 野生动物园全程 2-3 小时，预留时间</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
