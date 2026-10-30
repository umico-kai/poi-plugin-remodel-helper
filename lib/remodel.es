// 改造状态检测逻辑
import { REMODEL_STATE, RES_INDEX } from './constants.es'
import { getExtraMaterials } from './extraMaterials.es'
import { getConvertGroup } from './convertGroups.es'

// 链长上限：千歳/千代田系最长 4 段，留余量防止脏数据造成死循环
const MAX_STAGES = 6

// 改造链缓存：master 数据（$ships）几乎不变，但每次资源/舰娘变动都会触发全量重算。
// 这里按「同一份 masterShips 引用」缓存 getRemodelChain 的结果，避免重复走链。
// 用 WeakMap 保证 masterShips 被替换后旧缓存自动释放，不泄漏。
const chainCache = new WeakMap()
const masterChainCache = new WeakMap()

// 沿 api_aftershipid 走出「从当前形态到终态」的改造链
//
// 每段：{ fromId, toId, fromName, toName, afterLv, extra, convert }
//   convert = true 表示这一步是形态转换（同一转换组内互转），不是必经的改造进度
//
// 停止条件：
//   1. 没有下一形态（已到终态）
//   2. 下一形态已经走过（防成环）
//   3. 同组内互转 —— 已经走出过改造段之后，组内互转属于可选分支，不再累加
//   4. 超过链长上限
//
// 特例：当前形态本身就在转换组里（如翔鶴改二 461），第一步就是组内互转。
// 这种情况仍保留这一段（convert=true），否则这类舰娘会从列表里消失。
export const getRemodelChain = (masterShips, masterId) => {
  const stages = []
  const seen = new Set([Number(masterId)])
  let curId = Number(masterId)
  let group = getConvertGroup(curId)

  while (stages.length < MAX_STAGES) {
    const cur = masterShips?.[curId]
    if (!cur) break

    const nextId = Number(cur.api_aftershipid) || 0
    if (nextId <= 0) break
    if (seen.has(nextId)) break

    const next = masterShips?.[nextId]
    if (!next) break

    const nextGroup = getConvertGroup(nextId)
    const sameGroup = !!group && nextGroup === group

    // 已经走过至少一段，之后还在同组里打转 → 这是可达的另一个形态，不是必经之路
    if (sameGroup && stages.length > 0) break

    stages.push({
      fromId: curId,
      toId: nextId,
      fromName: cur.api_name || `#${curId}`,
      toName: next.api_name || `#${nextId}`,
      afterLv: Number(cur.api_afterlv) || 0,
      extra: getExtraMaterials(nextId),
      convert: sameGroup,
    })

    // 当前形态就在组内 → 这一段就是形态互转，到此为止
    if (sameGroup) break

    seen.add(nextId)
    curId = nextId
    group = nextGroup
  }

  return stages
}

// 带缓存的链遍历：以 masterShips 对象引用为维度做整表缓存，
// 一次 subscribe 触发里同一型号舰娘（同名舰）共用同一条链结果。
export const getRemodelChainCached = (masterShips, masterId) => {
  const id = Number(masterId)
  let table = masterChainCache.get(masterShips)
  if (!table) {
    table = new Map()
    masterChainCache.set(masterShips, table)
  }
  if (!table.has(id)) {
    table.set(id, getRemodelChain(masterShips, id))
  }
  return table.get(id)
}

// 把整条链的额外材料累加成一个总数（用于顶部「材料总览」总账）
export const sumExtra = (stages) => {
  const total = { useitems: {}, devmat: 0, flame: 0 }
  for (const seg of stages) {
    const ex = seg.extra
    if (!ex) continue
    if (ex.useitems) {
      for (const [idStr, need] of Object.entries(ex.useitems)) {
        const n = Number(need) || 0
        if (n > 0) total.useitems[idStr] = (total.useitems[idStr] || 0) + n
      }
    }
    if (Number(ex.devmat) > 0) total.devmat += Number(ex.devmat)
    if (Number(ex.flame) > 0) total.flame += Number(ex.flame)
  }
  return total
}

// 计算单艘舰娘的改造状态
// 状态只看「下一段」：现在能不能点下去改造。后续段的材料只进总账，不参与状态判定。
//
// ship: 玩家舰娘实例 (info.ships 里的对象)
// masterShip: 对应 master 数据 ($ships[ship.api_ship_id])
// resources: 资源数组 (info.resources)
// useitems: 道具对象 { useitemId: { api_count } } (info.useitems)
// masterShips: 全部 master 数据 (const.$ships)，用于走链
export const detectRemodel = (ship, masterShip, resources, useitems, masterShips) => {
  if (!ship || !masterShip) return null

  const masterId = Number(ship.api_ship_id)
  const chain = getRemodelChainCached(masterShips || {}, masterId)
  if (!chain.length) return null

  const lv = Number(ship.api_lv) || 0
  const first = chain[0]

  const haveOf = (kind, id) => {
    if (kind === 'useitem') return Number(useitems?.[id]?.api_count) || 0
    if (kind === 'devmat') return Number(resources?.[RES_INDEX.DEVMAT]) || 0
    return Number(resources?.[RES_INDEX.FLAME]) || 0
  }

  // 按改造顺序模拟消耗：前面段先花，前面的花光了，后面的段就判缺。
  // 否则「只有 1 张图纸、两段各要 1 张」会被误判成两段都够。
  const remain = {}
  const take = (kind, id, need) => {
    const key = kind === 'useitem' ? `u${id}` : kind
    if (remain[key] === undefined) remain[key] = haveOf(kind, id)
    const before = remain[key]
    remain[key] = before - need
    return before
  }

  const stageList = chain.map((seg) => {
    const materials = []
    const ex = seg.extra
    if (ex) {
      if (ex.useitems) {
        for (const [idStr, need] of Object.entries(ex.useitems)) {
          const n = Number(need) || 0
          if (n > 0) materials.push({ kind: 'useitem', id: Number(idStr), need: n })
        }
      }
      if (Number(ex.devmat) > 0) materials.push({ kind: 'devmat', id: null, need: Number(ex.devmat) })
      if (Number(ex.flame) > 0) materials.push({ kind: 'flame', id: null, need: Number(ex.flame) })
    }

    const lack = []
    for (const m of materials) {
      const before = take(m.kind, m.id, m.need)
      if (before < m.need) lack.push({ ...m, have: Math.max(0, before) })
    }

    return { ...seg, materials, lack, ok: lack.length === 0 }
  })

  const levelOk = lv >= first.afterLv
  const materialOk = stageList[0].ok

  let state
  if (levelOk && materialOk) {
    state = REMODEL_STATE.READY
  } else if (levelOk && !materialOk) {
    state = REMODEL_STATE.LACK_MATERIAL
  } else {
    state = REMODEL_STATE.LOW_LEVEL
  }

  const last = stageList[stageList.length - 1]

  return {
    // 舰娘实例 id（账号内唯一，改造/形态转换后不变）—— 排除标记与列表 key 都用它
    shipId: Number(ship.api_id),
    masterId,
    // 下一段（状态判定用）
    afterId: first.toId,
    afterLv: first.afterLv,
    lv,
    levelOk,
    materialOk,
    extraOk: materialOk,
    state,
    extra: first.extra,
    missingItems: stageList[0].lack,
    // 整条链
    chain: stageList,
    totalExtra: sumExtra(chain),
    finalId: last.toId,
    finalName: last.toName,
    finalLv: Math.max(...stageList.map((s) => s.afterLv)),
    locked: Number(ship.api_locked) === 1, // 是否上锁（1=上锁，0=未上锁）
  }
}

// 从 master 数据构建名字查找（备用）
export const buildMasterNameMap = (masterShips) => {
  const map = {}
  for (const [id, s] of Object.entries(masterShips || {})) {
    if (s && s.api_name) map[Number(id)] = s.api_name
  }
  return map
}
