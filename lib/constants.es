// 常量定义
export const PACKAGE_NAME = 'poi-plugin-remodel-helper'

// 舰种（api_stype）
export const SHIP_TYPES = {
  1: '海防舰',
  2: '驱逐舰',
  3: '轻巡洋舰',
  4: '重雷装巡洋舰',
  5: '重巡洋舰',
  6: '航空巡洋舰',
  7: '轻空母',
  8: '巡洋战舰',
  9: '战舰',
  10: '航空战舰',
  11: '正规空母',
  12: '超弩级战舰',
  13: '潜水舰',
  14: '潜水空母',
  15: '补给舰',
  16: '水上机母舰',
  17: '登陆舰',
  18: '装甲空母',
  19: '工作舰',
  20: '潜水母舰',
  21: '练习巡洋舰',
  22: '补给舰',
}

// 改造状态分类
export const REMODEL_STATE = {
  READY: 'READY',           // 可改造（等级达标 + 材料齐全）
  LACK_MATERIAL: 'LACK_MATERIAL', // 等级达标但缺材料
  LOW_LEVEL: 'LOW_LEVEL',   // 未达到改造等级
}

export const REMODEL_LABEL = {
  READY: 'いっていいよ',
  LACK_MATERIAL: 'いっていい……ってさ',
  LOW_LEVEL: '待ってろいよ',
}

export const REMODEL_COLOR = {
  READY: '#81c784',      // 绿
  LACK_MATERIAL: '#ffca28', // 黄
  LOW_LEVEL: '#ef5350',  // 红
}
