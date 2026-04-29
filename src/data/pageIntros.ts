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
    text: '这里是秦皇岛旅游总览地图。所有景点用彩色标记在地图上显示，标记上带有景点照片。左侧列表可按类别筛选和搜索，点击地点地图会跳转并显示详情。右面板展示地点介绍、标签、周边探索和收藏按钮。支持实时定位、路况图层和交通方式规划。',
  },
  route: {
    storageKey: 'intro_route',
    icon: '🛣️',
    title: '路线规划',
    text: '在路线规划中，选择起点和终点，支持驾车、骑行、公交、步行四种方式。地图上会显示真实的导航轨迹线，右侧展示距离、耗时和费用。公交模式还会显示详细的乘车方案、途经站点列表。',
  },
  trip: {
    storageKey: 'intro_trip',
    icon: '📋',
    title: '我的行程',
    text: '行程页管理你的多日行程。支持多天分组管理，从收藏夹添加地点。每张地点卡片显示图片、介绍、地址和标签，卡片间显示交通方式和耗时。支持拖拽排序、跨天移动、智能优化路线。可推算各段到达时间，打开路线图查看轨迹，或一键导出行程图片。',
  },
  gallery: {
    storageKey: 'intro_gallery',
    icon: '📍',
    title: '地点库',
    text: '地点库收录了秦皇岛所有推荐景点和美食。按玩乐、吃喝、雨天等类别筛选，也可以搜索关键词。点击收藏按钮加入愿望清单，然后在行程页组织路线。每个地点有详细介绍、推荐理由和注意事项。',
  },
  chat: {
    storageKey: 'intro_chat',
    icon: '🤖',
    title: 'AI 智行',
    text: 'AI 智行由 DeepSeek 驱动，是你的秦皇岛专属旅行规划师。我可以根据你的需求定制路线——告诉我你玩几天、喜欢什么风格、有什么顾虑。右侧面板会实时展示推荐的路线方案，确认后可一键应用到行程。',
  },
  home: {
    storageKey: 'intro_home',
    icon: '🏠',
    title: '秦皇岛之旅',
    text: '欢迎使用秦皇岛双站旅行地图！从北戴河站到秦皇岛站，应用帮你规划全程。包含总览地图、路线规划、地点库、AI 智行规划、多日行程管理和避坑指南。从导航栏随时切换功能页面。',
  },
  archive: {
    storageKey: 'intro_archive',
    icon: '⚠️',
    title: '避坑指南',
    text: '这里收集了本次行程中被剔除的地点及其原因。按闭园风险、评价分歧、偏离主线等标签筛选。每个记录标注了删除状态和风险类型，标注"未来可考虑"的地点以后可以重新评估。',
  },
  settings: {
    storageKey: 'intro_settings',
    icon: '⚙️',
    title: '应用设置',
    text: '在设置页面可以管理你的收藏、查看版本信息，以及配置腾讯地图和 DeepSeek 的 API Key。',
  },
}
