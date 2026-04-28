import { useState, useRef, useEffect } from 'react'
import { chatDeepSeek } from '../services/api'
import type { ChatMessage } from '../types'

export default function AIBot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<ChatMessage[]>([{ role: 'ai', text: '你好！我是你的秦皇岛旅行助手 🏖️\n\n我可以帮你推荐景点、规划路线、避坑答疑，随便问！' }])
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView() }, [msgs])

  const send = async (text = val) => {
    if (!text.trim() || busy) return
    setMsgs((p) => [...p, { role: 'user', text }])
    setVal('')
    setBusy(true)
    const reply = await chatDeepSeek([{ role: 'system', content: '你是秦皇岛旅行规划助手。回答简洁有用，推荐景点时给出理由。' }, ...msgs.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }))])
    setMsgs((p) => [...p, { role: 'ai', text: reply }])
    setBusy(false)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open && (
        <button onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 text-white text-2xl shadow-2xl hover:scale-110 transition-transform">
          🤖
        </button>
      )}
      {open && (
        <div className="w-80 h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-ocean-100">
          <div className="bg-gradient-to-r from-ocean-500 to-ocean-700 p-4 flex items-center justify-between">
            <span className="text-white font-bold">🤖 旅行助手</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-ocean-500 text-white rounded-br-sm' : 'bg-white text-gray-800 border rounded-bl-sm'}`}>{m.text}</div>
              </div>
            ))}
            {busy && <div className="text-sm text-gray-500 italic">AI 正在思考...</div>}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="问点什么..." disabled={busy}
              className="flex-1 px-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400" />
            <button onClick={() => send()} disabled={!val.trim() || busy}
              className="px-4 py-2 rounded-xl bg-ocean-500 text-white text-sm font-medium hover:bg-ocean-600 disabled:opacity-50">发送</button>
          </div>
        </div>
      )}
    </div>
  )
}
