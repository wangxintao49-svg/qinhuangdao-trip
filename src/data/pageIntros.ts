// 各页面引导语音介绍配置

export interface PageIntroConfig {
  storageKey: string
  icon: string
  title: string
  text: string
}

export const pageIntros: Record<string, PageIntroConfig> = {
  map: {
    storageKey: 'intro_map',
    icon: '🗺️',
    title: '总览地图',
    text: '这里是秦皇岛旅游总览地图。所有景点按类别用不同颜色标注，点击标记可查看详情和周边探索。右上角可以按类别筛选，搜索框支持自动补全。右下角的定位按钮可以快速回到你的当前位置。',
  },
  route: {
    storageKey: 'intro_route',
    icon: '🛣️',
    title: '路线规划',
    text: '在路线规划中，选择起点和终点，支持驾车、骑行、公交、步行四种方式。地图上会显示真实的导航轨迹线，右侧展示距离、耗时和费用。公交模式还会显示详细的乘车方案。',
  },
  trip: {
    storageKey: 'intro_trip',
    icon: '📋',
    title: '我的行程',
    text: '行程页管理你收藏的所有地点。可以拖拽调整顺序、智能优化路线，切换不同交通方式查看每段路的真实距离和耗时。打开路线图可以看到所有点的连线轨迹。',
  },
  gallery: {
    storageKey: 'intro_gallery',
    icon: '📍',
    title: '地点库',
    text: '地点库收录了秦皇岛所有推荐景点和美食。按玩乐、吃喝、雨天等类别筛选，也可以搜索关键词。点击收藏按钮加入行程，或者直接在地图里查看位置。',
  },
  chat: {
    storageKey: 'intro_chat',
    icon: '🤖',
    title: 'AI 助手',
    text: 'AI 助手由 DeepSeek 驱动，可以回答你关于秦皇岛旅游的任何问题。比如推荐一日游路线、问景点开放时间、或者根据天气推荐去处。',
  },
  home: {
    storageKey: 'intro_home',
    icon: '🏠',
    title: '秦皇岛之旅',
    text: '欢迎！这个应用帮你规划秦皇岛旅游。包含总览地图、路线规划、地点库、行程管理和 AI 助手。从导航栏可以随时切换到各个功能页面。',
  },
  archive: {
    storageKey: 'intro_archive',
    icon: '⚠️',
    title: '避坑指南',
    text: '这里收集了秦皇岛旅游的避坑经验，包括景点注意事项、交通提醒、购票建议等。去一个新地方之前先看看，避免踩坑。',
  },
  settings: {
    storageKey: 'intro_settings',
    icon: '⚙️',
    title: '应用设置',
    text: '在设置页面可以管理你的收藏、查看版本信息，以及配置 API Key 等高级选项。',
  },
}
