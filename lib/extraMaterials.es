// 改造额外材料数据表（来源：舰娘百科 exp.kcwiki.moe/wiki/改装设计图 权威数据，2026-01-28 版）
//
// key: 目标形态的 shipId（即 api_aftershipid，改造后形态）
// value: { useitems: { useitemId: 数量 }, devmat: 開発資材数, flame: 高速建造材数 }
//
// useitem id 对照（kancolle-data master/useitems.json）：
//   58  改装設計図
//   78  戦闘詳報
//   94  新型兵装資材
//   65  試製甲板カタパルト
//   75  新型砲熕兵装資材（新型火炮兵装资材）
//   77  新型航空兵装資材
//   100 海外艦最新技術
//   104 工廠資源
//
// 资源：
//   開発資材    = resources[6]
//   高速建造材  = resources[4]
//
// 注意：表中的「改二补/改三」等追加改造，图纸通常在改二阶段已消耗，追加改造不再需要图纸。
// 形态转换（双形态/三形态互转）一般不需图纸（铃谷/熊野 CAV→CVL 转换例外，需图纸×1）。

export const USEITEM_NAME = {
  58: '设计图',
  78: '详报',
  94: '兵装',
  65: '甲板',
  75: '炮熕',
  77: '航空',
  100: '海外技术',
  104: '工厂资源',
}

// 目标形态 shipId -> 额外材料消耗
export const EXTRA_MATERIALS = {
  // === 战舰（BB / FBB）===
  541: { useitems: { 58: 1 } }, // 長門改二
  573: { useitems: { 58: 1 } }, // 陸奥改二
  911: { useitems: { 58: 3, 75: 3, 78: 1 } }, // 大和改二（高温高压缶属装备不计）
  916: {}, // 大和改二重（形态切换，仅弹/钢/高速/开发，无额外道具）
  546: { useitems: { 58: 3, 75: 3, 78: 1 } }, // 武蔵改二
  173: { useitems: { 58: 1 } }, // Bismarck zwei
  178: { useitems: { 58: 1 } }, // Bismarck drei
  969: { useitems: { 58: 1, 100: 2 }, devmat: 30, flame: 120 }, // Richelieu Deux
  446: { useitems: { 58: 1 } }, // Italia
  447: { useitems: { 58: 1 } }, // Roma改
  591: { useitems: { 58: 2, 75: 2, 78: 1 }, devmat: 300 }, // 金剛改二丙
  592: { useitems: { 58: 2, 75: 2, 78: 1 }, devmat: 330 }, // 比叡改二丙
  593: { useitems: { 58: 2, 94: 2, 78: 1 }, devmat: 390 }, // 榛名改二乙
  954: { useitems: { 58: 2, 94: 2, 78: 1 }, devmat: 55, flame: 35 }, // 榛名改二丙（从乙切换来的追加，含切换耗材）
  694: { useitems: { 58: 2, 75: 2, 78: 1 }, devmat: 400 }, // 霧島改二丙

  // === 航空战舰（BBV）===
  411: { useitems: { 58: 1 } }, // 扶桑改二
  748: { useitems: { 77: 3, 104: 3 }, devmat: 48, flame: 188 }, // 扶桑改二補（追加改造，无图纸）
  412: { useitems: { 58: 1 } }, // 山城改二
  749: { useitems: { 77: 3, 104: 3 }, devmat: 48, flame: 188 }, // 山城改二補（追加改造，无图纸）
  553: { useitems: { 58: 2, 78: 1, 65: 1 }, devmat: 80 }, // 伊勢改二
  554: { useitems: { 58: 2, 78: 1, 77: 1, 65: 1 }, devmat: 181 }, // 日向改二

  // === 正规空母（CV / CVB）===
  594: { useitems: { 58: 2, 78: 1, 77: 2, 65: 1 }, devmat: 100 }, // 赤城改二
  599: { devmat: 80, flame: 30 }, // 赤城改二戊（形态切换）
  698: { useitems: { 58: 2, 78: 1, 77: 2, 65: 1 }, devmat: 120 }, // 加賀改二
  610: { devmat: 88, flame: 30 }, // 加賀改二戊（形态切换）
  646: { devmat: 84, flame: 84 }, // 加賀改二護（形态切换）
  1031: { useitems: { 58: 1, 78: 1, 94: 6 }, devmat: 220 }, // 飛龍改三
  461: { useitems: { 58: 1, 65: 1 } }, // 翔鶴改二
  466: { devmat: 15 }, // 翔鶴改二甲（形态切换）
  462: { useitems: { 58: 1, 65: 1 } }, // 瑞鶴改二
  467: { devmat: 15 }, // 瑞鶴改二甲（形态切换）
  406: { useitems: { 58: 1 } }, // 雲龍改
  429: { useitems: { 58: 1 } }, // 天城改
  430: { useitems: { 58: 1 } }, // 葛城改
  545: { useitems: { 58: 1, 65: 1 } }, // Saratoga Mk.II
  550: { devmat: 20, flame: 30 }, // Saratoga Mk.II Mod.2（形态切换）
  1061: { useitems: { 58: 1, 100: 1, 104: 1 }, devmat: 60, flame: 40 }, // Béarn amélioration

  // === 轻空母（CVL / CVE）===
  707: { useitems: { 58: 1, 65: 1 }, devmat: 60, flame: 73 }, // Gambier Bay Mk.II
  1036: { useitems: { 58: 1, 100: 2, 104: 2 }, devmat: 85, flame: 50 }, // Independence Flight II
  185: { useitems: { 58: 1 } }, // 龍鳳（由大鯨改造）
  888: { devmat: 0, flame: 20 }, // 龍鳳改二（形态切换，无图纸）
  883: { useitems: { 58: 1, 65: 1 }, devmat: 20 }, // 龍鳳改二戊
  529: { useitems: { 58: 1, 65: 1 } }, // 大鷹改二
  536: { useitems: { 58: 1, 65: 1 }, devmat: 40 }, // 神鷹改二
  889: { useitems: { 58: 1, 65: 1 }, devmat: 64 }, // 雲鷹改二
  894: { useitems: { 58: 1, 65: 1 }, flame: 20 }, // 鳳翔改二
  899: { devmat: 20, flame: 20 }, // 鳳翔改二戦（形态切换）
  508: { useitems: { 58: 1 }, devmat: 10, flame: 20 }, // 鈴谷航改二（CAV改二→航改二，图纸×1）
  509: { useitems: { 58: 1 }, devmat: 10, flame: 20 }, // 熊野航改二（CAV改二→航改二，图纸×1）

  // === 航空巡洋舰（CAV）===
  501: { useitems: { 58: 1, 78: 1, 77: 2 }, devmat: 60 }, // 最上改二
  506: { devmat: 45, flame: 40 }, // 最上改二特（形态切换，切换耗材另计）
  502: { useitems: { 58: 1, 78: 1, 77: 2 }, devmat: 60 }, // 三隈改二
  507: { useitems: { 94: 1 }, devmat: 35, flame: 40 }, // 三隈改二特（AV水母形态）
  503: { useitems: { 58: 1 } }, // 鈴谷改二
  504: { useitems: { 58: 1 } }, // 熊野改二
  188: { useitems: { 58: 1 } }, // 利根改二
  189: { useitems: { 58: 1 } }, // 筑摩改二

  // === 重巡（CA）===
  427: { useitems: { 58: 1 } }, // 鳥海改二
  496: { useitems: { 58: 1 } }, // Zara due

  // === 轻巡（CL）===
  663: { useitems: { 58: 1, 78: 1 }, devmat: 88, flame: 88 }, // 矢矧改二
  668: { devmat: 45, flame: 30 }, // 矢矧改二乙（形态切换）
  662: { useitems: { 58: 1, 78: 1 }, devmat: 80, flame: 77 }, // 能代改二
  652: { useitems: { 58: 1 }, devmat: 55, flame: 55 }, // 球磨改二
  657: { devmat: 30, flame: 15 }, // 球磨改二丁（形态切换）
  547: { useitems: { 58: 1 } }, // 多摩改二
  200: { useitems: { 58: 1 } }, // 阿武隈改二
  487: { useitems: { 58: 1 } }, // 鬼怒改二
  488: { useitems: { 58: 1 } }, // 由良改二
  622: { useitems: { 58: 1, 78: 1 }, devmat: 30, flame: 30 }, // 夕張改二
  623: { devmat: 30, flame: 30 }, // 夕張改二特（形态切换）
  624: { devmat: 30, flame: 30 }, // 夕張改二丁（形态切换）
  630: { useitems: { 58: 1, 65: 1 }, devmat: 55, flame: 35 }, // Gotland andra

  // === 雷巡（CLT）===
  1071: { useitems: { 58: 2, 94: 3, 104: 5 }, devmat: 55, flame: 550 }, // 北上改三

  // === 驱逐（DD）===
  1035: { useitems: { 58: 1, 78: 1, 94: 5 }, devmat: 280, flame: 800 }, // 吹雪改三
  1040: { useitems: { 58: 1, 100: 5, 104: 5 }, devmat: 320, flame: 1946 }, // 吹雪改三護(六式)
  666: { useitems: { 58: 1, 75: 1 }, devmat: 28 }, // 磯波改二
  647: { useitems: { 58: 1 }, devmat: 20 }, // 浦波改二
  959: { useitems: { 58: 1 }, devmat: 10 }, // 深雪改二
  903: { useitems: { 58: 1 }, devmat: 20, flame: 10 }, // 天霧改二
  908: { devmat: 20, flame: 10 }, // 天霧改二丁（形态切换）
  961: { useitems: { 58: 2, 78: 2, 94: 3 }, devmat: 77 }, // 時雨改三
  588: { useitems: { 58: 1, 78: 1 } }, // 山風改二
  667: { devmat: 10, flame: 10 }, // 山風改二丁（形态切换）
  199: { useitems: { 58: 1 } }, // 大潮改二
  490: { useitems: { 58: 1 } }, // 荒潮改二
  198: { useitems: { 58: 1 } }, // 霰改二
  566: { useitems: { 58: 1 }, devmat: 20 }, // 陽炎改二
  567: { useitems: { 58: 1 }, devmat: 20 }, // 不知火改二
  568: { useitems: { 58: 1 }, devmat: 20 }, // 黒潮改二
  648: { useitems: { 58: 1, 78: 1 }, devmat: 20 }, // 秋雲改二
  670: { useitems: { 58: 1 }, devmat: 20 }, // 親潮改二
  915: { useitems: { 58: 1 }, devmat: 20 }, // 早潮改二
  951: { useitems: { 58: 1, 78: 1 }, devmat: 65, flame: 30 }, // 天津風改二
  651: { useitems: { 58: 1, 94: 2 }, devmat: 50 }, // 丹陽（由雪風改造）
  656: { useitems: { 58: 2, 78: 1 }, devmat: 60, flame: 30 }, // 雪風改二（由丹陽改造）
  542: { useitems: { 58: 1, 78: 1 } }, // 夕雲改二
  563: { useitems: { 58: 1, 78: 1 } }, // 巻雲改二
  564: { useitems: { 58: 1, 78: 1 } }, // 風雲改二
  543: { useitems: { 58: 1, 78: 1 } }, // 長波改二
  743: { useitems: { 104: 3 }, devmat: 48, flame: 60 }, // 長波改二補（追加改造，无图纸）
  578: { useitems: { 58: 1, 78: 1 } }, // 朝霜改二
  744: { useitems: { 104: 2 }, devmat: 36, flame: 48 }, // 朝霜改二補（追加改造，无图纸）
  569: { useitems: { 58: 1, 78: 1 }, devmat: 80 }, // 沖波改二
  649: { useitems: { 58: 1, 78: 1 }, devmat: 20 }, // 高波改二
  1034: { useitems: { 58: 1, 94: 2 }, devmat: 82 }, // 涼波改二
  745: { useitems: { 104: 2 }, devmat: 36, flame: 48 }, // 涼波改二補（追加改造，无图纸）
  955: { useitems: { 58: 1, 78: 1 }, devmat: 30 }, // 清霜改二
  960: { devmat: 10, flame: 10 }, // 清霜改二丁（形态切换）
  956: { useitems: { 58: 1, 78: 1 }, devmat: 30 }, // 早霜改二
  983: { useitems: { 58: 1, 94: 2 }, devmat: 60 }, // 浜波改二
  981: { useitems: { 58: 1, 94: 2 }, devmat: 65 }, // 藤波改二
  1033: { useitems: { 58: 1, 94: 2 }, devmat: 81 }, // 玉波改二
  982: { useitems: { 58: 1, 94: 2 }, devmat: 78 }, // 早波改二
  968: { useitems: { 58: 1, 78: 1, 94: 2 }, devmat: 30 }, // 初月改二
  963: { useitems: { 58: 1, 78: 1, 94: 2 }, devmat: 30 }, // 秋月改二
  628: { useitems: { 58: 1 }, devmat: 120, flame: 30 }, // Fletcher改 Mod.2
  629: { devmat: 180, flame: 30 }, // Fletcher Mk.II（形态切换）
  920: { useitems: { 58: 1 }, devmat: 60, flame: 20 }, // Samuel B.Roberts Mk.II

  // === 海防舰（DE）===
  979: { useitems: { 58: 1, 94: 1 }, devmat: 13 }, // 稲木改二
}

// 获取某目标形态的额外材料（无则返回 null）
export const getExtraMaterials = (afterId) => EXTRA_MATERIALS[Number(afterId)] || null
