import { useState, useRef, useCallback, useEffect } from 'react'
import { ensureVoice, speak, stopSpeak } from '../utils/speak'
import type { PageIntroConfig } from '../data/pageIntros'

export default function PageIntro(props: PageIntroConfig) {
  // sessionStorage 缓存，关标签页后重新显示
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(props.storageKey) === '1')
  const [voiceState, setVoiceState] = useState<'idle' | 'playing' | 'done'>('idle')
  const playedRef = useRef(false)

  const playVoice = useCallback(async () => {
    if (playedRef.current) return
    playedRef.current = true
    setVoiceState('playing')
    await ensureVoice()
    speak(props.text, () => setVoiceState('done'))
  }, [props.text])

  // 弹窗后自动播放语音（若被拦截，用户可手动播放）
  useEffect(() => {
    if (!dismissed && (voiceState as string) === 'idle') {
      const timer = setTimeout(() => playVoice().catch(() => {
        if (voiceState === 'playing') setVoiceState('idle')
      }), 600)
      return () => clearTimeout(timer)
    }
  }, [dismissed, voiceState, playVoice])

  const dismiss = () => {
    stopSpeak()
    sessionStorage.setItem(props.storageKey, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) { if (voiceState === 'idle') playVoice() } }}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
          {props.icon}
        </div>
        <h3 className="text-lg font-bold text-gray-800 text-center mb-3">{props.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6 text-center">{props.text}</p>
        <div className="flex flex-col gap-2">
          {voiceState === 'idle' && (
            <button onClick={(e) => { e.stopPropagation(); playVoice() } }
              className="w-full py-3 rounded-xl bg-ocean-50 text-ocean-700 font-medium hover:bg-ocean-100 transition-colors">
              🔊 点击播放语音介绍
            </button>
          )}
          {voiceState === 'playing' && (
            <button onClick={(e) => { e.stopPropagation(); stopSpeak(); setVoiceState('done') } }
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-medium">
              ⏹ 停止播放
            </button>
          )}
          {voiceState !== 'idle' && (
            <button onClick={dismiss}
              className="w-full py-3 rounded-xl bg-ocean-500 text-white font-medium hover:bg-ocean-600 transition-colors shadow-lg shadow-ocean-200">
              {voiceState === 'done' ? '我知道了 🚀' : '跳过 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
