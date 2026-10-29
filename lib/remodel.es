// 改造状态检测逻辑
import { REMODEL_STATE } from './constants.es'
import { getExtraMaterials } from './extraMaterials.es'

// 资源数组下标：poi 的 state.info.resources 顺序
// [油, 弹, 钢, 铝, 喷火, 桶, 开发, 螺丝]
const IDX_FLAME = 4 // 高速建造材
const IDX_DEVMAT = 6 // 開発資材

// 计算单艘舰娘的改造状态（只考虑等级 + 额外材料，不含油弹钢铝）
// ship: 玩家舰娘实例 (info.ships 里的对象)
// masterShip: 对应 master 数据 ($ships[ship.api_ship_id])
// resources: 资源数组 (info.resources)
// useitems: 道具对象 { useitemId: { api_count } }（info.useitems）
export const detectRemodel = (ship, masterShip, resources, useitems) => {
  if (!ship || !masterShip) return null
  const afterId = Number(masterShip.api_aftershipid) || 0
  // 没有下一形态 → 已完成最终改造，跳过（返回 null 由调用方过滤）
  if (afterId <= 0) return null

  const afterLv = Number(masterShip.api_afterlv) || 0
  const lv = Number(ship.api_lv) || 0

  // 额外材料（设计图/详报/兵装/甲板 等 useitem + 开发/高速建造材）
  const extra = getExtraMaterials(afterId)
  let extraOk = true
  const missingItems = [] // 缺少的额外材料明细 [{ kind, id, need, have }]
  if (extra) {
    if (extra.useitems) {
      for (const [idStr, need] of Object.entries(extra.useitems)) {
        const id = Number(idStr)
        const needN = Number(need) || 0
        if (needN <= 0) continue
        const have = Number(useitems?.[id]?.api_count) || 0
        if (have < needN) {
          extraOk = false
          missingItems.push({ kind: 'useitem', id, need: needN, have })
        }
      }
    }
    if (extra.devmat > 0) {
      const have = Number(resources[IDX_DEVMAT]) || 0
      if (have < extra.devmat) {
        extraOk = false
        missingItems.push({ kind: 'devmat', need: extra.devmat, have })
      }
    }
    if (extra.flame > 0) {
      const have = Number(resources[IDX_FLAME]) || 0
      if (have < extra.flame) {
        extraOk = false
        missingItems.push({ kind: 'flame', need: extra.flame, have })
      }
    }
  }

  const levelOk = lv >= afterLv
  const materialOk = extraOk

  let state
  if (levelOk && materialOk) {
    state = REMODEL_STATE.READY
  } else if (levelOk && !materialOk) {
    state = REMODEL_STATE.LACK_MATERIAL
  } else {
    state = REMODEL_STATE.LOW_LEVEL
  }

  return {
    shipId: Number(ship.api_id),
    masterId: Number(ship.api_ship_id),
    afterId,
    afterLv,
    lv,
    levelOk,
    materialOk,
    extraOk,
    state,
    extra,
    missingItems,
    locked: Number(ship.api_locked) === 1, // 是否上锁（1=上锁，0=未上锁）
  }
}

// 从 master 数据构建名字查找（供展示下一形态名称）
export const buildMasterNameMap = (masterShips) => {
  const map = {}
  for (const [id, s] of Object.entries(masterShips || {})) {
    if (s && s.api_name) map[Number(id)] = s.api_name
  }
  return map
}
