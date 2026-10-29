// 形态转换分组表（来源：舰娘百科「改造」页 + 萌娘百科交叉核对）
//
// 形态转换舰娘在两个（或三个）形态之间成环，api_aftershipid 会指回同组另一形态，
// 导致永远有「下一形态」，永远显示「可改造」。因此把它们归为「转换组」，
// 提供「手动标记完成 / 已改造完毕」能力，标记一次即整组从改造列表移除。
//
// 结构：key = 组名（舰娘本体名），value = 该舰所有形态的 master shipId 数组。

export const CONVERT_GROUPS = {
  翔鶴: [461, 466], // 改二 ⇔ 改二甲
  瑞鶴: [462, 467],
  霞: [464, 470],
  朝潮: [463, 468],
  最上: [501, 506],
  三隈: [502, 507],
  鈴谷: [503, 508],
  熊野: [504, 509],
  Saratoga: [545, 550],
  瑞鳳: [555, 560],
  山風: [588, 667],
  榛名: [593, 954],
  赤城: [594, 599],
  加賀: [698, 610, 646], // 改二 → 改二戊 → 改二護（三态链）
  夕張: [622, 623, 624], // 改二 → 改二特 → 改二丁（三态链）
  Fletcher: [628, 629],
  球磨: [652, 657],
  矢矧: [663, 668],
  鳳翔: [894, 899],
  天霧: [903, 908],
  大和: [911, 916],
  清霜: [955, 960],
}

// masterId -> 组名（构建一次的反查表）
const masterToGroup = {}
for (const [group, ids] of Object.entries(CONVERT_GROUPS)) {
  for (const id of ids) {
    masterToGroup[Number(id)] = group
  }
}

// 判断某个 master shipId 是否属于形态转换组，返回组名（不属于则返回 null）
export const getConvertGroup = (masterId) => masterToGroup[Number(masterId)] || null
