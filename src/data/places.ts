// 秦皇岛之旅 · 地点数据 v0.1.0
// 范围：北戴河站 → 秦皇岛站
import type { Spot, Pitfall } from '../types'

export const spots: Spot[] = [
  // —— 车站 ——
  { id: 'bdh_stn', name: '北戴河站', category: 'station', type: '车站', priority: 'start', address: '秦皇岛市北戴河区站南大街', lng: 119.46512, lat: 39.82744, tags: ['车站', '起点'], bestTime: '到站/出发', note: '本次旅行起点或中转点。', rating: 4 },
  { id: 'qhd_stn', name: '秦皇岛站', category: 'station', type: '车站', priority: 'end', address: '秦皇岛市海港区北环路与迎宾路交汇处', lng: 119.58337, lat: 39.93641, tags: ['车站', '返程'], bestTime: '返程前', note: '本次旅行返程车站。', rating: 4 },
  // —— 玩乐（核心） ——
  { id: 'geziwo', name: '鸽子窝公园', category: 'play', type: '玩乐', priority: 'core', address: '北戴河区鸽赤路25号', lng: 119.5329, lat: 39.8394, tags: ['必去', '看日出', '海边', '观鸟'], bestTime: '清晨/上午', note: '核心看海点，适合日出和海边拍照。', rating: 5 },
  { id: 'laohushi', name: '老虎石海上公园', category: 'play', type: '玩乐', priority: 'core', address: '北戴河区中海滩路', lng: 119.4887, lat: 39.8203, tags: ['必去', '海边', '礁石', '日落'], bestTime: '下午/傍晚', note: '核心海滩点，适合散步、玩沙、看海。', rating: 4 },
  { id: 'biluota', name: '碧螺塔海上酒吧公园', category: 'play', type: '玩乐', priority: 'core', address: '北戴河区东海滩路中段', lng: 119.5366, lat: 39.8204, tags: ['必去', '夜景', '演艺', '海边'], bestTime: '傍晚/夜间', note: '夜游氛围点，适合拍照、看演出和夜景。', rating: 4 },
  { id: 'xigang', name: '西港花园', category: 'play', type: '玩乐', priority: 'core', address: '海港区东山街与南山街交叉口西侧', lng: 119.6135, lat: 39.9235, tags: ['必去', '港口', '工业风', '拍照'], bestTime: '下午/傍晚', note: '工业港口风格，适合citywalk和拍照。', rating: 5 },
  { id: 'safari', name: '秦皇岛野生动物园', category: 'play', type: '玩乐', priority: 'core', address: '北戴河区滨海大道中段62号', lng: 119.5333, lat: 39.8667, tags: ['亲子', '动物园', '半日'], bestTime: '上午/下午', note: '适合亲子和动物园体验，耗时较长。', rating: 4 },
  // —— 玩乐（备用） ——
  { id: 'jinmeng', name: '金梦海湾浴场', category: 'play', type: '玩乐', priority: 'backup', address: '海港区河滨路与山东堡大桥附近', lng: 119.5441, lat: 39.8945, tags: ['顺路', '海边', '散步', '骑行'], bestTime: '下午/傍晚', note: '顺路看海、散步、骑行，不作为必去核心。', rating: 3 },
  { id: 'qianshui', name: '浅水湾浴场', category: 'play', type: '玩乐', priority: 'backup', address: '北戴河区滨海大道52号附近', lng: 119.5315, lat: 39.8565, tags: ['顺路', '赶海', '玩沙'], bestTime: '退潮/白天', note: '5月更适合赶海和拍照。', rating: 3 },
  { id: 'botanical', name: '秦皇植物园', category: 'play', type: '玩乐', priority: 'backup', address: '海港区西环北路70号', lng: 119.54, lat: 39.95, tags: ['顺路', '散步', '植物'], bestTime: '顺路', note: '普通城市公园，顺路可去。', rating: 3 },
  { id: 'tanghe', name: '汤河公园', category: 'play', type: '玩乐', priority: 'backup', address: '海港区港城大街西段', lng: 119.556, lat: 39.949, tags: ['顺路', '散步', '城市景观'], bestTime: '顺路', note: '本地散步型点位，游客主线优先级低。', rating: 2 },
  // —— 吃喝 ——
  { id: 'qhd_alley', name: '秦皇小巷', category: 'food', type: '吃喝', priority: 'core', address: '海港区奥体街66号', lng: 119.5408, lat: 39.9051, tags: ['主吃喝', '夜市', '小吃', 'City Walk'], bestTime: '傍晚/夜间', note: '核心吃喝收尾点，适合晚餐、小吃和拍照。', rating: 4 },
  { id: 'yecunli', name: '叶存利海鲜饺子（总店）', category: 'food', type: '吃喝', priority: 'core', address: '北戴河区海宁路14号', lng: 119.5046, lat: 39.828, tags: ['主吃喝', '海鲜饺子', '老字号'], bestTime: '午餐/晚餐', note: '北戴河海鲜饺子正餐点。', rating: 4 },
  { id: 'liuzhuang', name: '刘庄夜市街', category: 'food', type: '吃喝', priority: 'backup', address: '北戴河区红石路刘庄北里', lng: 119.5076, lat: 39.8335, tags: ['备选', '夜市', '氛围'], bestTime: '夜间', note: '只当逛氛围，不当海鲜正餐核心。', rating: 3 },
  { id: 'yanshan', name: '燕大小吃街', category: 'food', type: '吃喝', priority: 'backup', address: '海港区燕山大学周边', lng: 119.5304, lat: 39.9123, tags: ['备选', '夜宵', '学生夜市'], bestTime: '夜间', note: '住金梦海湾/燕大附近时可顺路。', rating: 3 },
  { id: 'yuanfu', name: '源福饭店（海鲜本地菜）', category: 'food', type: '吃喝', priority: 'backup', address: '北戴河区刘庄北里4栋1号', lng: 119.5083, lat: 39.8329, tags: ['备选', '海鲜', '餐厅'], bestTime: '午餐/晚餐', note: '出发当天看近30天点评再决定。', rating: 3 },
  { id: 'hongqin_qhx', name: '脸红秦田田（秦皇小巷店）', category: 'food', type: '吃喝', priority: 'backup', address: '海港区奥体街66号秦皇小巷内', lng: 119.5408, lat: 39.9051, tags: ['顺路', '饮品', '本地品牌'], bestTime: '顺路', note: '只当顺路饮品，不专门跑。', rating: 3 },
  { id: 'hongqin_lhs', name: '脸红秦田田（老虎石店）', category: 'food', type: '吃喝', priority: 'backup', address: '北戴河区中海滩路老虎石附近', lng: 119.4894, lat: 39.8202, tags: ['顺路', '饮品'], bestTime: '顺路', note: '靠近老虎石，顺路可买。', rating: 3 },
  { id: 'kailuan', name: '开滦路历史文化街区', category: 'food', type: '吃喝', priority: 'backup', address: '海港区开滦路与海滨路交叉口', lng: 119.6135, lat: 39.9275, tags: ['顺路', '夜间', '街区'], bestTime: '夜间顺路', note: '只建议夜间顺路打卡。', rating: 3 },
  // —— 雨天备选 ——
  { id: 'qhd_museum', name: '秦皇岛博物馆', category: 'rainy', type: '雨天', priority: 'backup', address: '海港区河北大街西段521号', lng: 119.5089, lat: 39.8853, tags: ['雨天', '室内', '博物馆', '预约'], bestTime: '雨天/下午', note: '免费但需预约，适合雨天备选。', rating: 4 },
  { id: 'glass_museum', name: '秦皇岛玻璃博物馆', category: 'rainy', type: '雨天', priority: 'backup', address: '海港区文化路44号', lng: 119.5986, lat: 39.9231, tags: ['雨天', '室内', '玻璃艺术', '工业遗产'], bestTime: '雨天/下午', note: '小众室内点，适合拍照和了解玻璃工业。', rating: 4 },
]

export const pitfalls: Pitfall[] = [
  { id: 'lianfeng', name: '联峰山公园', reason: '5月存在闭园/森林防火风险，三方复核一致不进主线。', risks: ['闭园风险'], status: '已删除', canRetry: false },
  { id: 'qinyuzhou', name: '秦宇宙智慧乐园', reason: '闭园改造风险明确，测试期不作为可用点。', risks: ['闭园风险', '偏离主线'], status: '已删除', canRetry: false },
  { id: 'xianluo', name: '仙螺岛', reason: '偏离双站主线，索道排队与体验分歧大。', risks: ['偏离主线', '评价分歧'], status: '已删除', canRetry: false },
  { id: 'qiuxian', name: '秦皇求仙入海处', reason: '人造景区与性价比争议大。', risks: ['性价比低', '评价分歧'], status: '已删除', canRetry: false },
  { id: 'guailou', name: '怪楼奇园', reason: '园区小、内容空、体验价值分歧大。', risks: ['性价比低', '评价分歧'], status: '已删除', canRetry: false },
  { id: 'xinao', name: '新澳海底世界', reason: '成人游性价比风险高。', risks: ['性价比低', '评价分歧'], status: '已删除', canRetry: false },
  { id: 'shitang', name: '石塘路市场', reason: '海鲜加工费与调包风险分歧大。', risks: ['评价分歧', '体验风险'], status: '已删除', canRetry: false },
  { id: 'blue_coast', name: '蔚蓝海岸', reason: '不一定差，但偏离北戴河站-秦皇岛站主线。', risks: ['偏离主线'], status: '本次不考虑', canRetry: true },
  { id: 'momi_cafe', name: '猫的天空之城（蔚蓝海岸店）', reason: '与蔚蓝海岸绑定，位置偏远。', risks: ['偏离主线', '定位重复'], status: '本次不考虑', canRetry: true },
  { id: 'zhaojiaguan', name: '昌黎赵家馆', reason: '昌黎方向过远，不符合本次范围。', risks: ['偏离主线'], status: '本次不考虑', canRetry: false },
  { id: 'shanhaiguan_hotpot', name: '山海关浑锅', reason: '山海关方向过远，不符合本次范围。', risks: ['偏离主线'], status: '本次不考虑', canRetry: false },
  { id: 'shanhaiguan_baozi', name: '山海关四条包子', reason: '山海关方向过远，不符合本次范围。', risks: ['偏离主线'], status: '本次不考虑', canRetry: false },
]

export const sampleRoute = [
  { time: '09:30', action: '抵达北戴河站', icon: '🚉' },
  { time: '10:00', action: '鸽子窝公园看海', icon: '🎯' },
  { time: '12:30', action: '叶存利海鲜饺子', icon: '🍽️' },
  { time: '14:00', action: '老虎石海边散步', icon: '🎯' },
  { time: '16:30', action: '碧螺塔等夜景', icon: '🎯' },
  { time: '19:00', action: '秦皇小巷逛吃', icon: '🍽️' },
  { time: '20:20', action: '秦皇岛站返程', icon: '🚉' },
]
