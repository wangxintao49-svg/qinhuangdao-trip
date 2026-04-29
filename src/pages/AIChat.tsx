import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatDeepSeek } from '../services/api'
import { useTripStore } from '../store/tripStore'
import type { ChatMessage } from '../types'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'
import { MessageSquare, Lightbulb, Check, Loader, ArrowRight, Brain, RotateCcw } from 'lucide-react'

interface RouteSuggestion {
  order: string[]     // spot IDs in recommended order
  reason: string      // overall reasoning
  highlights: string[] // per-spot reasoning
  totalTime?: string
}

const quickQuestions = [
  '我只有半天时间，怎么安排？',
  '推荐拍照好看的路线',
  '下雨天适合去哪？',
  '我快赶火车了，最后一站去哪？',
  '想吃海鲜，推荐路线',
  '带老人小孩，轻松路线',
]

function parseSuggestions(text: string): RouteSuggestion | null {
  try {
    // Try to extract JSON block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1])
      if (data.order && Array.isArray(data.order)) {
        return { order: data.order, reason: data.reason || '', highlights: data.highlights || [], totalTime: data.totalTime }
      }
    }
    // Try to find inline JSON
    const inlineMatch = text.match(/\{[\s\S]*"order"[\s\S]*\}/)
    if (inlineMatch) {
      const data = JSON.parse(inlineMatch[0])
      if (data.order && Array.isArray(data.order)) {
        return { order: data.order, reason: data.reason || '', highlights: data.highlights || [], totalTime: data.totalTime }
      }
    }
  } catch {}
  return null
}

function buildSystemPrompt(spots: any[]): string {
  return `你是「AI 智行」，秦皇岛旅行规划专家。你的目标是根据用户需求，给出最实用、最贴心、最个性化的旅行方案。

### 你的个性 ###
- 热情、专业、细致，像一个当地朋友在帮忙规划
- 给出建议时说明「为什么」——不只是推荐，还要解释推荐的理由
- 会主动提醒用户可能忽略的细节（交通时间、最佳游玩时段、天气影响等）

### 景点数据 ###
${spots.map((s) => `- ${s.id}: ${s.name}（${s.type}，位于${s.address}，评分${s.rating}／5）${s.intro || ''}`).join('\n')}

### 规划原则 ###
1. **地理相邻优先** — 尽量减少折返跑，按北戴河→海港区→秦皇岛站的方向推进
2. **时间匹配** — 上午适合鸽子窝（日出）、动物园；下午适合西港花园、老虎石；傍晚适合碧螺塔、秦皇小巷
3. **体力管理** — 一天不超过 4-5 个点，预留吃饭和交通时间
4. **交通衔接** — 每段出行考虑路况，段与段之间留足交通时间
5. **常见顾虑** — 用户可能关心：值不值得去？人多不多？要多久？附近能吃什么？下雨怎么办？赶火车来得及吗？

### 回复规则 ###
1. 语言简洁清晰，用中文回复
2. 不要使用 markdown 表格或复杂格式
3. 给出建议时，在回答末尾另起一行，输出 \`\`\`json 代码块包含结构化方案
4. JSON 格式：{ "order": ["id1","id2",...], "reason": "路线说明（一句话概括）", "highlights": ["第1站理由","第2站理由",...], "totalTime": "X小时" }
5. order 数组中的 id 必须来自上面的景点数据，不要编造
6. 考虑地理相邻性和交通便利度
7. 如果用户说赶火车，终点设为 qhd_stn（秦皇岛站）
8. 如果用户没指定天数，默认按一日游精华路线推荐
9. 如果用户说带老人/小孩，少走路、少爬坡、多安排室内和休息点`
}

const iconMap: Record<string, string> = { station: '🚉', play: '🎯', food: '🍽️', rainy: '🏛️' }

export default function AIChat() {
  const navigate = useNavigate()
  const { spots } = useTripStore()

  const welcomeMsg = { role: 'ai' as const, text: '👋 你好！我是 **AI 智行**——你的秦皇岛专属旅行规划师。\n\n我可以帮你：\n• **量身定制路线** — 告诉我你几天、什么风格、从哪里出发，我帮你排出行程\n• **解答所有疑问** — 景点值不值得去？怎么去最方便？附近还有什么好玩的？\n• **实时调整方案** — 天气变了、时间不够、突然想吃海鲜——告诉我，我马上重新规划\n\n直接说出你的需求，比如「帮我安排一天的精华路线」「我中午到北戴河站，打算玩到傍晚」「带老人小孩，轻松一点」「想吃海鲜，推荐个路线」…… 任何问题都可以！' }

  const CHAT_KEY = 'qhd_ai_chat_msgs'
  const SUGG_KEY = 'qhd_ai_suggestion'

  const [msgs, setMsgs] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return [welcomeMsg]
  })
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestion, setSuggestion] = useState<RouteSuggestion | null>(() => {
    try {
      const saved = localStorage.getItem(SUGG_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  })
  const [showConfirm, setShowConfirm] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 持久化聊天记录和路线推荐
  useEffect(() => { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs)) }, [msgs])
  useEffect(() => { if (suggestion) localStorage.setItem(SUGG_KEY, JSON.stringify(suggestion)) }, [suggestion])

  const send = async (text = val) => {
    if (!text.trim() || busy) return
    const userMsg = text
    setMsgs((p) => [...p, { role: 'user', text: userMsg }])
    setVal('')
    setBusy(true)
    setSuggestion(null)

    const sysPrompt = buildSystemPrompt(spots)
    const reply = await chatDeepSeek([
      { role: 'system', content: sysPrompt },
      ...msgs.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: userMsg },
    ])

    setMsgs((p) => [...p, { role: 'ai', text: reply }])
    setBusy(false)

    // Try to parse structured suggestion
    const parsed = parseSuggestions(reply)
    if (parsed && parsed.order.length >= 2) {
      // Validate spot IDs
      const validIds = parsed.order.filter((id) => spots.some((s) => s.id === id))
      if (validIds.length >= 2) {
        parsed.order = validIds
        setSuggestion(parsed)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const applyToTrip = () => {
    if (!suggestion) return
    // Save to localStorage for TripPlan to pick up
    try {
      const existing = localStorage.getItem('qhd_trip_days')
      let days = existing ? JSON.parse(existing) : []
      if (days.length === 0) {
        days = [{ id: 'day_0', label: '第1天', items: [] }]
      }
      days[0].items = suggestion.order.map((id) => ({ spotId: id, arrivalTime: '' }))
      localStorage.setItem('qhd_trip_days', JSON.stringify(days))
    } catch {}
    setShowConfirm(false)
    navigate('/plan')
  }

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div>
      <PageIntro {...pageIntros.chat} />
      <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--qhd-navy)' }}>
        <Brain size="24" className="inline mr-2" />AI 智行
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--qhd-muted)' }}>智能出行规划，和 AI 聊你的需求</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5 lg:h-[calc(100vh-220px)] min-h-[calc(100vh-300px)]">
        {/* Left: Chat */}
        <div className="flex flex-col rounded-[24px] overflow-hidden max-h-[60vh] lg:max-h-none" style={{ background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(18px)', boxShadow: 'var(--qhd-shadow-card)' }}>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'text-white'
                    : 'border'
                }`} style={
                  m.role === 'user'
                    ? { background: 'linear-gradient(135deg, #0B5CAD, #10B8C9)' }
                    : { background: 'rgba(255,255,255,.9)', borderColor: 'rgba(11,92,173,.1)', color: 'var(--qhd-text)' }
                }>
                  {m.text.split('\n').map((line, j) => (
                    <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--qhd-muted)' }}>
                <Loader size="14" className="animate-spin" />
                AI 正在思考...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t" style={{ borderColor: 'rgba(11,92,173,.08)' }}>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {quickQuestions.map((q) => (
                <button key={q} onClick={() => { send(q); scrollToBottom() }} disabled={busy}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(11,92,173,.06)', color: 'var(--qhd-blue)', border: '1px solid rgba(11,92,173,.1)' }}>
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="输入你的旅行需求..." disabled={busy}
                className="flex-1 px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: 'rgba(11,92,173,.15)', background: 'rgba(255,255,255,.8)' }} />
              <button onClick={() => { send(); scrollToBottom() }} disabled={!val.trim() || busy}
                className="px-5 py-3 rounded-xl text-white font-medium disabled:opacity-50 transition-all hover:translate-y-[-1px]"
                style={{ background: 'linear-gradient(135deg, #062B55, #0B5CAD)' }}>
                <ArrowRight size="18" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Suggestion panel */}
        <div className="flex flex-col rounded-[24px] overflow-hidden" style={{ background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(18px)', boxShadow: 'var(--qhd-shadow-card)' }}>
          <div className="p-4 border-b font-semibold text-sm flex items-center gap-2" style={{ borderColor: 'rgba(11,92,173,.08)', color: 'var(--qhd-navy)' }}>
            <Lightbulb size="16" />
            路线预览
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {suggestion ? (
              <div className="space-y-4">
                {/* Total time */}
                {suggestion.totalTime && (
                  <div className="p-3 rounded-xl text-sm font-medium flex items-center gap-2"
                    style={{ background: 'rgba(11,92,173,.06)', color: 'var(--qhd-blue)' }}>
                    ⏱ 预计 {suggestion.totalTime}
                  </div>
                )}

                {/* Overall reason */}
                {suggestion.reason && (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--qhd-text)' }}>{suggestion.reason}</p>
                )}

                {/* Route timeline */}
                <div className="relative">
                  <div className="absolute left-[15px] top-3 bottom-3 w-0.5" style={{ background: 'linear-gradient(#0B5CAD, #10B8C9)' }} />
                  <div className="space-y-3">
                    {suggestion.order.map((id, idx) => {
                      const spot = spots.find((s) => s.id === id)
                      if (!spot) return null
                      return (
                        <div key={id} className="flex gap-3 pl-8 relative">
                          <div className="absolute left-[8px] top-[6px] w-[16px] h-[16px] rounded-full border-4 border-white shadow-sm flex items-center justify-center"
                            style={{ background: 'var(--qhd-navy)' }}>
                            <span className="text-[8px] text-white font-bold">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0 p-3 rounded-xl" style={{ background: 'rgba(11,92,173,.04)' }}>
                            <div className="flex items-center gap-2">
                              <span>{iconMap[spot.category] || '📍'}</span>
                              <span className="font-semibold text-sm" style={{ color: 'var(--qhd-navy)' }}>{spot.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(11,92,173,.08)', color: 'var(--qhd-blue)' }}>{spot.type}</span>
                            </div>
                            {suggestion.highlights[idx] && (
                              <p className="text-xs mt-1" style={{ color: 'var(--qhd-muted)' }}>{suggestion.highlights[idx]}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Apply button */}
                <button onClick={() => setShowConfirm(true)}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:translate-y-[-1px]"
                  style={{ background: 'linear-gradient(135deg, #062B55, #0B5CAD)', boxShadow: '0 4px 14px rgba(11,92,173,.22)' }}>
                  <Check size="16" className="inline mr-1.5" />应用到我的行程
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare size="48" className="mb-4" style={{ color: 'var(--qhd-muted)' }} />
                <p className="font-medium mb-1" style={{ color: 'var(--qhd-text)' }}>和 AI 对话</p>
                <p className="text-xs" style={{ color: 'var(--qhd-muted)' }}>告诉 AI 你的需求，路线预览会出现在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && suggestion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Check size="20" className="text-emerald-500" />
              <h3 className="font-bold text-lg" style={{ color: 'var(--qhd-navy)' }}>确认路线方案</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--qhd-muted)' }}>AI 为你规划的路线将应用到行程页，是否确认？</p>

            <ol className="space-y-2 mb-4">
              {suggestion.order.map((id, i) => {
                const spot = spots.find((s) => s.id === id)
                return spot ? (
                  <li key={id} className="flex items-center gap-2 text-sm p-2 rounded-lg" style={{ background: 'rgba(11,92,173,.04)' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: 'var(--qhd-navy)' }}>{i + 1}</span>
                    <span>{iconMap[spot.category] || '📍'}</span>
                    <span className="font-medium" style={{ color: 'var(--qhd-text)' }}>{spot.name}</span>
                    <span className="text-xs" style={{ color: 'var(--qhd-muted)' }}>{spot.type}</span>
                  </li>
                ) : null
              })}
            </ol>

            <div className="flex gap-3">
              <button onClick={applyToTrip}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:translate-y-[-1px]"
                style={{ background: 'linear-gradient(135deg, #062B55, #0B5CAD)' }}>
                <Check size="16" className="inline mr-1" />确认应用
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(0,0,0,.04)', color: 'var(--qhd-muted)' }}>
                <RotateCcw size="16" className="inline mr-1" />再想想
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
