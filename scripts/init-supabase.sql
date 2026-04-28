-- 秦皇岛之旅 · 数据库初始化脚本
-- 在 Supabase 的 SQL Editor 中运行

-- 1. 景点表
CREATE TABLE IF NOT EXISTS spots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('station', 'play', 'food', 'rainy')),
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'backup',
  address TEXT NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  tags TEXT[] DEFAULT '{}',
  best_time TEXT DEFAULT '',
  note TEXT DEFAULT '',
  rating INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 避坑表
CREATE TABLE IF NOT EXISTS pitfalls (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  risks TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT '已删除',
  can_retry BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 行程收藏表（持久化用户收藏）
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  spot_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入景点数据
INSERT INTO spots (id, name, category, type, priority, address, lng, lat, tags, best_time, note, rating) VALUES
('bdh_stn', '北戴河站', 'station', '车站', 'start', '秦皇岛市北戴河区站南大街', 119.46512, 39.82744, ARRAY['车站', '起点'], '到站/出发', '本次旅行起点或中转点。', 4),
('qhd_stn', '秦皇岛站', 'station', '车站', 'end', '秦皇岛市海港区北环路与迎宾路交汇处', 119.58337, 39.93641, ARRAY['车站', '返程'], '返程前', '本次旅行返程车站。', 4),
('geziwo', '鸽子窝公园', 'play', '玩乐', 'core', '北戴河区鸽赤路25号', 119.5329, 39.8394, ARRAY['必去', '看日出', '海边', '观鸟'], '清晨/上午', '核心看海点，适合日出和海边拍照。', 5),
('laohushi', '老虎石海上公园', 'play', '玩乐', 'core', '北戴河区中海滩路', 119.4887, 39.8203, ARRAY['必去', '海边', '礁石', '日落'], '下午/傍晚', '核心海滩点，适合散步、玩沙、看海。', 4),
('biluota', '碧螺塔海上酒吧公园', 'play', '玩乐', 'core', '北戴河区东海滩路中段', 119.5366, 39.8204, ARRAY['必去', '夜景', '演艺', '海边'], '傍晚/夜间', '夜游氛围点，适合拍照、看演出和夜景。', 4),
('xigang', '西港花园', 'play', '玩乐', 'core', '海港区东山街与南山街交叉口西侧', 119.6135, 39.9235, ARRAY['必去', '港口', '工业风', '拍照'], '下午/傍晚', '工业港口风格，适合citywalk和拍照。', 5),
('safari', '秦皇岛野生动物园', 'play', '玩乐', 'core', '北戴河区滨海大道中段62号', 119.5333, 39.8667, ARRAY['亲子', '动物园', '半日'], '上午/下午', '适合亲子和动物园体验，耗时较长。', 4),
('jinmeng', '金梦海湾浴场', 'play', '玩乐', 'backup', '海港区河滨路与山东堡大桥附近', 119.5441, 39.8945, ARRAY['顺路', '海边', '散步', '骑行'], '下午/傍晚', '顺路看海、散步、骑行，不作为必去核心。', 3),
('qianshui', '浅水湾浴场', 'play', '玩乐', 'backup', '北戴河区滨海大道52号附近', 119.5315, 39.8565, ARRAY['顺路', '赶海', '玩沙'], '退潮/白天', '5月更适合赶海和拍照。', 3),
('botanical', '秦皇植物园', 'play', '玩乐', 'backup', '海港区西环北路70号', 119.54, 39.95, ARRAY['顺路', '散步', '植物'], '顺路', '普通城市公园，顺路可去。', 3),
('tanghe', '汤河公园', 'play', '玩乐', 'backup', '海港区港城大街西段', 119.556, 39.949, ARRAY['顺路', '散步', '城市景观'], '顺路', '本地散步型点位，游客主线优先级低。', 2),
('qhd_alley', '秦皇小巷', 'food', '吃喝', 'core', '海港区奥体街66号', 119.5408, 39.9051, ARRAY['主吃喝', '夜市', '小吃', 'City Walk'], '傍晚/夜间', '核心吃喝收尾点，适合晚餐、小吃和拍照。', 4),
('yecunli', '叶存利海鲜饺子（总店）', 'food', '吃喝', 'core', '北戴河区海宁路14号', 119.5046, 39.828, ARRAY['主吃喝', '海鲜饺子', '老字号'], '午餐/晚餐', '北戴河海鲜饺子正餐点。', 4),
('liuzhuang', '刘庄夜市街', 'food', '吃喝', 'backup', '北戴河区红石路刘庄北里', 119.5076, 39.8335, ARRAY['备选', '夜市', '氛围'], '夜间', '只当逛氛围，不当海鲜正餐核心。', 3),
('yanshan', '燕大小吃街', 'food', '吃喝', 'backup', '海港区燕山大学周边', 119.5304, 39.9123, ARRAY['备选', '夜宵', '学生夜市'], '夜间', '住金梦海湾/燕大附近时可顺路。', 3),
('yuanfu', '源福饭店（海鲜本地菜）', 'food', '吃喝', 'backup', '北戴河区刘庄北里4栋1号', 119.5083, 39.8329, ARRAY['备选', '海鲜', '餐厅'], '午餐/晚餐', '出发当天看近30天点评再决定。', 3),
('hongqin_qhx', '脸红秦田田（秦皇小巷店）', 'food', '吃喝', 'backup', '海港区奥体街66号秦皇小巷内', 119.5408, 39.9051, ARRAY['顺路', '饮品', '本地品牌'], '顺路', '只当顺路饮品，不专门跑。', 3),
('hongqin_lhs', '脸红秦田田（老虎石店）', 'food', '吃喝', 'backup', '北戴河区中海滩路老虎石附近', 119.4894, 39.8202, ARRAY['顺路', '饮品'], '顺路', '靠近老虎石，顺路可买。', 3),
('kailuan', '开滦路历史文化街区', 'food', '吃喝', 'backup', '海港区开滦路与海滨路交叉口', 119.6135, 39.9275, ARRAY['顺路', '夜间', '街区'], '夜间顺路', '只建议夜间顺路打卡。', 3),
('qhd_museum', '秦皇岛博物馆', 'rainy', '雨天', 'backup', '海港区河北大街西段521号', 119.5089, 39.8853, ARRAY['雨天', '室内', '博物馆', '预约'], '雨天/下午', '免费但需预约，适合雨天备选。', 4),
('glass_museum', '秦皇岛玻璃博物馆', 'rainy', '雨天', 'backup', '海港区文化路44号', 119.5986, 39.9231, ARRAY['雨天', '室内', '玻璃艺术', '工业遗产'], '雨天/下午', '小众室内点，适合拍照和了解玻璃工业。', 4);

-- 插入避坑数据
INSERT INTO pitfalls (id, name, reason, risks, status, can_retry) VALUES
('lianfeng', '联峰山公园', '5月存在闭园/森林防火风险，三方复核一致不进主线。', ARRAY['闭园风险'], '已删除', false),
('qinyuzhou', '秦宇宙智慧乐园', '闭园改造风险明确，测试期不作为可用点。', ARRAY['闭园风险', '偏离主线'], '已删除', false),
('xianluo', '仙螺岛', '偏离双站主线，索道排队与体验分歧大。', ARRAY['偏离主线', '评价分歧'], '已删除', false),
('qiuxian', '秦皇求仙入海处', '人造景区与性价比争议大。', ARRAY['性价比低', '评价分歧'], '已删除', false),
('guailou', '怪楼奇园', '园区小、内容空、体验价值分歧大。', ARRAY['性价比低', '评价分歧'], '已删除', false),
('xinao', '新澳海底世界', '成人游性价比风险高。', ARRAY['性价比低', '评价分歧'], '已删除', false),
('shitang', '石塘路市场', '海鲜加工费与调包风险分歧大。', ARRAY['评价分歧', '体验风险'], '已删除', false),
('blue_coast', '蔚蓝海岸', '不一定差，但偏离北戴河站-秦皇岛站主线。', ARRAY['偏离主线'], '本次不考虑', true),
('momi_cafe', '猫的天空之城（蔚蓝海岸店）', '与蔚蓝海岸绑定，位置偏远。', ARRAY['偏离主线', '定位重复'], '本次不考虑', true),
('zhaojiaguan', '昌黎赵家馆', '昌黎方向过远，不符合本次范围。', ARRAY['偏离主线'], '本次不考虑', false),
('shanhaiguan_hotpot', '山海关浑锅', '山海关方向过远，不符合本次范围。', ARRAY['偏离主线'], '本次不考虑', false),
('shanhaiguan_baozi', '山海关四条包子', '山海关方向过远，不符合本次范围。', ARRAY['偏离主线'], '本次不考虑', false);
