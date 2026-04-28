// 百度 TTS 语音引擎（音质好，支持多种发音人）
// 如果未配置 KEY，自动降级到浏览器自带语音

const TTS_KEY = import.meta.env.VITE_BAIDU_TTS_KEY
const TTS_SECRET = import.meta.env.VITE_BAIDU_TTS_SECRET

let tokenCache: { value: string; expires: number } | null = null
let currentAudio: HTMLAudioElement | null = null

async function getBaiduToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires) return tokenCache.value
  const res = await fetch(`/baidu-auth/oauth/2.0/token?grant_type=client_credentials&client_id=${TTS_KEY}&client_secret=${TTS_SECRET}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('获取百度 Token 失败')
  tokenCache = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 - 120000 }
  return data.access_token
}

// 浏览器原生语音降级
let bestVoice: SpeechSynthesisVoice | null = null
function findVoice() {
  const all = window.speechSynthesis.getVoices()
  bestVoice = all.find((v) => v.lang.startsWith('zh') &&
    (v.name.includes('Neural') || v.name.includes('Online') || v.name.includes('Yunxi') || v.name.includes('Yunyang'))
  ) || all.find((v) => v.lang.startsWith('zh')) || null
}

// 是否已配置百度 TTS
const hasBaiduTTS = TTS_KEY && TTS_KEY !== '你的百度API_KEY' && TTS_SECRET && TTS_SECRET !== '你的百度SECRET_KEY'

/** 播报文本 */
export async function speak(text: string, onEnd?: () => void) {
  stopSpeak()

  // 百度 TTS（优先）
  if (hasBaiduTTS) {
    try {
      const token = await getBaiduToken()
      const formData = new URLSearchParams()
      formData.append('tex', text)
      formData.append('tok', token)
      formData.append('cuid', 'qhd_trip_web')
      formData.append('ctp', '1')
      formData.append('lan', 'zh')
      formData.append('spd', '5')
      formData.append('pit', '5')
      formData.append('vol', '5')
      formData.append('per', '4134') // 用户指定的发音人
      formData.append('aue', '3') // mp3

      const res = await fetch('/baidu-tts/text2audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      })

      // 百度成功返回音频二进制，失败返回 JSON
      const contentType = res.headers.get('Content-Type') || ''
      if (contentType.includes('json')) {
        const err = await res.json()
        console.warn('百度 TTS 失败，降级浏览器语音:', err)
        return fallbackSpeak(text, onEnd)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      currentAudio = new Audio(url)
      currentAudio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; onEnd?.() }
      currentAudio.play().catch(() => fallbackSpeak(text, onEnd))
      return
    } catch (e) {
      console.warn('百度 TTS 异常，降级浏览器语音:', e)
      return fallbackSpeak(text, onEnd)
    }
  }

  // 未配置百度 TTS → 浏览器原生
  fallbackSpeak(text, onEnd)
}

/** 浏览器原生 TTS 降级 */
function fallbackSpeak(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  if (!bestVoice) { findVoice(); if (!bestVoice && window.speechSynthesis.getVoices().length > 0) findVoice() }
  const u = new SpeechSynthesisUtterance(text)
  if (bestVoice) u.voice = bestVoice
  u.lang = 'zh-CN'
  u.rate = 1.05
  u.onend = () => onEnd?.()
  window.speechSynthesis.speak(u)
}

/** 停止播报 */
export function stopSpeak() {
  window.speechSynthesis?.cancel()
  if (currentAudio) { currentAudio.pause(); currentAudio = null }
}

/** 确保语音引擎就绪（浏览器原生用） */
export async function ensureVoice(): Promise<void> {
  if (window.speechSynthesis.getVoices().length > 0) { findVoice(); return }
  await new Promise<void>((ok) => {
    window.speechSynthesis.onvoiceschanged = () => { findVoice(); ok() }
  })
}
