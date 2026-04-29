import { useTripStore } from '../store/tripStore'
import { pageIntros } from '../data/pageIntros'
import PageIntro from '../components/PageIntro'

export default function AppSettings() {
  const { settings, patchSettings, spots, pitfalls } = useTripStore()

  const toggles = [
    { key: 'showPitfalls' as const, label: '显示避坑点', desc: '在地图和列表中显示避坑档案' },
    { key: 'useAI' as const, label: '开启AI推荐', desc: '使用DeepSeek提供智能行程推荐' },
    { key: 'useLocation' as const, label: '位置权限', desc: '获取当前位置用于导航' },
  ]

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ spots, pitfalls }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'qinhuangdao-spots.json'
    a.click()
  }

  return (
    <div>
      <PageIntro {...pageIntros.settings} />
      <h2 className="text-2xl font-bold text-ocean-800 mb-6">⚙️ 设置与数据</h2>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* API 状态 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">🔌 服务状态</h3>
            {[
              { name: '腾讯位置服务', icon: '🗺️', status: '已连接' as const },
              { name: 'DeepSeek AI', icon: '🤖', status: '已连接' as const },
            ].map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2 last:mb-0">
                <span className="text-xl">{s.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-700 text-sm">{s.name}</div>
                  <div className="text-xs text-gray-500">API Key 已配置</div>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">● {s.status}</span>
              </div>
            ))}
          </div>

          {/* 功能开关 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">🎛️ 功能开关</h3>
            <div className="space-y-4">
              {toggles.map((t) => (
                <div key={t.key} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-700 text-sm">{t.label}</div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                  </div>
                  <button onClick={() => patchSettings({ [t.key]: !settings[t.key] })}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings[t.key] ? 'bg-ocean-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${settings[t.key] ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* 数据概览 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">📊 数据概览</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">名称</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">分类</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">优先级</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {spots.slice(0, 6).map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700">{s.name}</td>
                      <td className="px-4 py-3"><span className="chip-blue">{s.type}</span></td>
                      <td className="px-4 py-3">
                        <span className={`chip ${s.priority === 'core' ? 'chip-green' : 'chip-yellow'}`}>
                          {s.priority === 'core' ? '必去' : '备用'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-right">共 {spots.length} 个地点 · {pitfalls.length} 个避坑</p>
          </div>

          {/* 导入导出 */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-700 mb-4">📁 数据管理</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleExport}
                className="flex flex-col items-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-ocean-400 hover:bg-ocean-50 transition-all">
                <span className="text-3xl mb-2">📤</span>
                <span className="font-medium text-gray-700">导出JSON</span>
                <span className="text-xs text-gray-500 mt-1">备份地点数据</span>
              </button>
              <div className="flex flex-col items-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl opacity-50 cursor-not-allowed">
                <span className="text-3xl mb-2">☁️</span>
                <span className="font-medium text-gray-700">云端同步</span>
                <span className="text-xs text-gray-500 mt-1">即将上线</span>
              </div>
            </div>
          </div>

          <div className="card p-5 text-center">
            <p className="text-gray-500 text-sm">秦皇岛双站旅行地图 · v0.1.0</p>
            <p className="text-gray-500 text-xs mt-1">设计/制作：小光</p>
          </div>
        </div>
      </div>
    </div>
  )
}
