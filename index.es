import React, { useEffect, useMemo, useState } from 'react'
import { store } from 'views/create-store'
import { REMODEL_LABEL, REMODEL_LABEL_ZH, REMODEL_LABEL_EN, REMODEL_COLOR, SHIP_TYPES, RES_INDEX } from './lib/constants.es'
import { detectRemodel } from './lib/remodel.es'
import { USEITEM_NAME } from './lib/extraMaterials.es'
import { USEITEM_ICON, RES_ICON } from './lib/icons.es'
import { getConvertGroup, CONVERT_GROUPS } from './lib/convertGroups.es'
import * as st from './lib/styles.es'

// 按 poi 界面语言取徽章文案：中文用直白含义，日文保留原梗，其它语言英文
const getRemodelLabel = (state) => {
  const lang = (typeof window !== 'undefined' && window.language) || ''
  if (lang.startsWith('zh')) return REMODEL_LABEL_ZH[state]
  if (lang.startsWith('ja')) return REMODEL_LABEL[state]
  return REMODEL_LABEL_EN[state]
}

// 排除标记：1.1.0 起按「舰娘实例」记录（api_id 账号内唯一，改造/形态转换后不变）
const EXCLUDED_KEY_OLD = 'poi-plugin-remodel-helper:excluded' // 1.0.x：按型号/转换组
const EXCLUDED_KEY = 'poi-plugin-remodel-helper:excluded:v2'

const loadExcluded = () => {
  try {
    const v2 = window.localStorage.getItem(EXCLUDED_KEY)
    if (v2) return JSON.parse(v2)
    return JSON.parse(window.localStorage.getItem(EXCLUDED_KEY_OLD) || '{}')
  } catch {
    return {}
  }
}

const saveExcluded = (obj) => {
  try {
    window.localStorage.setItem(EXCLUDED_KEY, JSON.stringify(obj))
    // 旧格式已迁移完毕，清掉避免下次回读
    window.localStorage.removeItem(EXCLUDED_KEY_OLD)
  } catch {}
}

// 把 1.0.x 的旧标记（m<型号id> / 转换组名）迁移到 s<实例id>，并清理已不存在的舰娘
// 返回 null 表示无需改动
const migrateExcluded = (obj, ships) => {
  const keys = Object.keys(obj)
  if (!keys.length) return null

  const byMaster = {}
  const byShip = {}
  for (const s of ships) {
    const sid = Number(s.api_id)
    byShip[sid] = s
    const mid = Number(s.api_ship_id)
    if (!byMaster[mid]) byMaster[mid] = []
    byMaster[mid].push(s)
  }

  // 同型号有多艘时，旧数据只存了一条，只能还原给等级最高的那艘
  const bestOf = (list) => {
    if (!list || !list.length) return null
    return list
      .slice()
      .sort((a, b) => (Number(b.api_lv) || 0) - (Number(a.api_lv) || 0) || Number(a.api_id) - Number(b.api_id))[0]
  }

  const next = {}
  let changed = false

  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('s')) {
      if (byShip[Number(key.slice(1))]) {
        next[key] = val
      } else {
        changed = true // 船已被拆解/合成，清掉这条孤儿记录
      }
      continue
    }

    let target = null
    if (key.startsWith('m')) {
      target = bestOf(byMaster[Number(key.slice(1))])
    } else if (CONVERT_GROUPS[key]) {
      const list = []
      for (const id of CONVERT_GROUPS[key]) {
        if (byMaster[id]) list.push(...byMaster[id])
      }
      target = bestOf(list)
    }

    if (target) next[`s${Number(target.api_id)}`] = val
    changed = true
  }

  return changed ? next : null
}

// 从 poi store 读取快照
const readSnapshot = () => {
  const state = store.getState()
  const info = state?.info || {}
  const konst = state?.const || {}
  const toArray = (obj) => {
    if (!obj) return []
    if (Array.isArray(obj)) return obj.filter((x) => x)
    return Object.keys(obj)
      .map((k) => obj[k])
      .filter((x) => x)
  }
  return {
    ships: toArray(info.ships),
    resources: info.resources || [],
    useitems: info.useitems || {},
    masterShips: konst.$ships || {},
    serverIp: info.server?.ip || null,
    // 头像裁剪偏移（poi 内置 shipavatar 的 marginMagics）
    marginMagics: state?.fcd?.shipavatar?.marginMagics || null,
  }
}

// 默认头像偏移（与 poi ship-info 的默认值一致）
const DEFAULT_AVATAR_OFFSET = 0.555

// 找一组名字的最长公共前缀
const commonPrefix = (names) => {
  if (!names.length) return ''
  let p = names[0]
  for (const n of names) {
    let i = 0
    while (i < p.length && i < n.length && p[i] === n[i]) i++
    p = p.slice(0, i)
    if (!p) break
  }
  return p
}

// 生成「短名」函数：去掉公共前缀（保留到「改」字），让段标签变成「改二 → 改三」而不是全名
// 吹雪改二/吹雪改三 → 公共前缀「吹雪改」→ 短名「改二」「改三」
// 千歳改/千歳甲/千歳航 → 公共前缀「千歳」→ 短名「改」「甲」「航」
const makeShortener = (names) => {
  const cp = commonPrefix(names)
  const idx = cp.lastIndexOf('改')
  const cut = idx >= 0 ? idx : cp.length
  return (name) => {
    const s = cut > 0 ? name.slice(cut) : name
    return s || name
  }
}

// 材料小标签：只显示 ×数量（持有量是账号共用的，逐段显示 have/need 会重复计数误读）
const MatChip = ({ kind, id, need, lack }) => {
  const icon = kind === 'useitem' ? USEITEM_ICON[id] : kind === 'devmat' ? RES_ICON.devmat : RES_ICON.flame
  const name = kind === 'useitem' ? USEITEM_NAME[id] || '道具' : kind === 'devmat' ? '开发' : '喷火'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 7px',
        borderRadius: 4,
        border: `1px solid ${lack ? 'rgba(255,202,40,0.55)' : st.colors.panelBorder}`,
        background: lack ? 'rgba(255,202,40,0.10)' : 'rgba(255,255,255,0.06)',
        color: lack ? '#ffca28' : st.colors.textDim,
        fontSize: st.font.small,
        whiteSpace: 'nowrap',
      }}
      title={lack ? '按顺序改到这里时不够' : ''}
    >
      {icon && <img src={icon} alt="" style={{ width: 18, height: 18, objectFit: 'contain', display: 'block' }} />}
      {name} ×{need}
    </span>
  )
}

// 舰娘行卡片：头像 + 标题 + 改造链 + 分段材料
const ShipRow = ({ item, shipImgMod, serverIp, marginMagics, excluded, onToggleExcluded, zebra }) => {
  const stypeName = SHIP_TYPES[item.stype] || `舰种${item.stype}`
  const isExcluded = !!excluded[item.groupKey]
  const isConvert = !!item.convertGroup

  // 头像偏移：优先 poi 内置 marginMagics，否则默认值
  const offset = marginMagics?.[item.masterId]?.normal ?? DEFAULT_AVATAR_OFFSET
  // 横向半身头像（复刻 poi 概览 Avatar 组件参数）：
  // 容器宽 = 1.85 × 高，图片高 = 高/176×182，纵向微调 -高/176×3
  const AVATAR_H = 80
  const AVATAR_W = Math.round(1.85 * AVATAR_H)
  const IMG_H = Math.round((AVATAR_H / 176) * 182)
  const IMG_TOP = -Math.round((AVATAR_H / 176) * 3)

  const gapLv = item.finalLv - item.lv
  const withMaterials = item.chain.filter((seg) => seg.materials.length > 0)

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: zebra ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${st.colors.panelBorder}`,
        borderRadius: 6,
        padding: '12px 14px',
        minWidth: 0,
      }}
    >
      {/* 头像：横向半身立绘（复刻 poi 概览）—— remodel 立绘 + marginMagics 偏移裁剪 + 右缘渐隐 */}
      <div
        style={{
          width: AVATAR_W,
          height: AVATAR_H,
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          background: 'rgba(0,0,0,0.3)',
          flex: '0 0 auto',
          alignSelf: 'center',
        }}
      >
        {shipImgMod ? (
          <img
            src={shipImgMod.getShipImgPath(item.masterId, 'remodel', false, serverIp || '203.104.209.71')}
            alt=""
            loading="lazy"
            style={{
              height: IMG_H,
              position: 'absolute',
              top: IMG_TOP,
              left: `${-Math.round(offset * AVATAR_H)}px`,
              display: 'block',
              maxWidth: 'none',
              WebkitMaskImage: 'linear-gradient(to right, #000 65%, transparent 100%)',
              maskImage: 'linear-gradient(to right, #000 65%, transparent 100%)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: st.colors.textFaint,
              fontSize: 18,
            }}
          >
            …
          </div>
        )}
      </div>

      {/* 信息 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ color: st.colors.text, fontSize: st.font.large, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {item.currentName}
          </span>
          <span style={{ color: st.colors.textFaint, fontSize: st.font.tiny }} title="船位编号（同名舰靠它区分）">
            #{item.shipId}
          </span>
          {item.locked ? (
            <span title="已上锁" style={{ color: '#ffd54f', fontSize: st.font.medium, flex: '0 0 auto' }}>🔒</span>
          ) : (
            <span title="未上锁（易被拆解/合成误操作）" style={{ color: st.colors.textFaint, fontSize: st.font.medium, flex: '0 0 auto', opacity: 0.7 }}>🔓</span>
          )}
          <span style={{ color: st.colors.textDim, fontSize: st.font.medium, flex: '0 0 auto' }}>Lv.{item.lv}</span>
          <span style={{ color: st.colors.textFaint, fontSize: st.font.small, flex: '0 0 auto' }}>{stypeName}</span>
          {isConvert && (
            <span style={{ ...st.chip('rgba(171,71,188,0.25)', '#ce93d8'), fontSize: st.font.small, flex: '0 0 auto' }}>
              形态转换
            </span>
          )}
        </div>

        {/* 改造链：中间形态不标等级，等级差统一放在下一行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: st.font.base }}>
          <span style={{ color: st.colors.text, fontWeight: 600 }}>{item.currentName}</span>
          {item.chain.map((seg, idx) => (
            <React.Fragment key={`seg-${seg.toId}-${idx}`}>
              <span style={{ color: '#5f5f63' }}>→</span>
              <span
                style={{
                  color: idx === item.chain.length - 1 ? st.colors.accent : st.colors.textDim,
                  fontWeight: idx === item.chain.length - 1 ? 600 : 400,
                }}
              >
                {seg.toName}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* 等级差：按链上要求最高的那一段算（通常就是最终形态） */}
        {gapLv > 0 && (
          <div style={{ fontSize: st.font.small, color: item.levelOk ? st.colors.textFaint : '#ef9a9a' }}>
            还差 {gapLv} 级（最终 Lv.{item.finalLv}）
          </div>
        )}

        {/* 材料：一段一行 */}
        {withMaterials.map((seg, idx) => (
          <div key={`mat-${seg.toId}-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: st.font.small }}>
            <span
              style={{
                width: 116,
                flex: '0 0 auto',
                color: st.colors.textFaint,
                paddingTop: 3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={seg.label}
            >
              {seg.label}
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {seg.materials.map((m) => (
                <MatChip
                  key={`${m.kind}-${m.id || ''}`}
                  kind={m.kind}
                  id={m.id}
                  need={m.need}
                  lack={seg.lack.some((l) => l.kind === m.kind && l.id === m.id)}
                />
              ))}
              {seg.convert && (
                <span style={{ ...st.chip('rgba(171,71,188,0.25)', '#ce93d8'), fontSize: st.font.tiny }}>形态转换</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 状态徽章 + 手动标记 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: '0 0 auto' }}>
        <span style={{ ...st.badge(REMODEL_COLOR[item.state]), fontSize: st.font.small, padding: '3px 12px' }}>
          {getRemodelLabel(item.state)}
        </span>
        {item.chain.length > 1 && (
          <span style={{ fontSize: st.font.tiny, color: st.colors.textFaint }}>共 {item.chain.length} 段</span>
        )}
        <button
          onClick={() => onToggleExcluded(item.groupKey)}
          style={{
            border: 'none',
            cursor: 'pointer',
            borderRadius: 4,
            fontSize: st.font.small,
            padding: '5px 14px',
            color: isExcluded ? '#1a1a1a' : st.colors.textDim,
            background: isExcluded ? '#81c784' : 'rgba(255,255,255,0.08)',
            whiteSpace: 'nowrap',
          }}
          title={isConvert ? '形态转换舰娘：标记后这艘船不再提示' : '标记为已改造完毕，从列表移除'}
        >
          {isExcluded ? '已排除' : '标记完成'}
        </button>
      </div>
    </div>
  )
}

const App = () => {
  const [snap, setSnap] = useState(readSnapshot)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [shipImgMod, setShipImgMod] = useState(null)
  const [excluded, setExcluded] = useState(loadExcluded)
  const [showExcluded, setShowExcluded] = useState(false)

  useEffect(() => {
    const unsub = store.subscribe(() => setSnap(readSnapshot()))
    return unsub
  }, [])

  useEffect(() => {
    let mounted = true
    import('views/utils/ship-img')
      .then((m) => {
        if (mounted) setShipImgMod(m && (m.getShipImgPath ? m : m.default))
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // 舰娘列表指纹：只有船真的变了（获得/改造/拆解）才做一次标记迁移 + 孤儿清理
  const shipsSig = useMemo(() => snap.ships.map((s) => Number(s.api_id)).join(','), [snap.ships])

  useEffect(() => {
    if (!snap.ships.length) return // 未同步时不动，避免把标记全清掉
    setExcluded((prev) => {
      const next = migrateExcluded(prev, snap.ships)
      if (!next) return prev
      saveExcluded(next)
      return next
    })
  }, [shipsSig])

  const toggleExcluded = (groupKey) => {
    setExcluded((prev) => {
      const next = { ...prev }
      if (next[groupKey]) {
        delete next[groupKey]
      } else {
        next[groupKey] = Date.now()
      }
      saveExcluded(next)
      return next
    })
  }

  // 计算所有舰娘的改造状态
  const items = useMemo(() => {
    const result = []
    for (const ship of snap.ships) {
      if (!ship || ship.api_ship_id == null) continue
      const master = snap.masterShips[Number(ship.api_ship_id)]
      const det = detectRemodel(ship, master, snap.resources, snap.useitems, snap.masterShips)
      if (!det) continue // 已完成最终改造或无改造信息，移除

      const m = master || {}
      const currentName = m.api_name || `#${ship.api_ship_id}`
      const short = makeShortener([currentName, ...det.chain.map((s) => s.toName)])
      const chain = det.chain.map((seg) => ({
        ...seg,
        label: `${short(seg.fromName)} → ${short(seg.toName)}`,
      }))

      result.push({
        ...det,
        chain,
        currentName,
        stype: Number(m.api_stype),
        convertGroup: getConvertGroup(det.masterId),
        // 排除以「这一艘船」为单位：api_id 改造后不变，同名舰互不影响
        groupKey: `s${det.shipId}`,
      })
    }
    return result
  }, [snap.ships, snap.masterShips, snap.resources, snap.useitems])

  const stats = useMemo(() => {
    const s = { READY: 0, LACK_MATERIAL: 0, LOW_LEVEL: 0 }
    items.forEach((i) => {
      s[i.state] = (s[i.state] || 0) + 1
    })
    return s
  }, [items])

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase()
    return items
      .filter((i) => {
        if (filter !== 'all' && i.state !== filter) return false
        if (!i.locked) return false // 未上锁的舰娘一律不显示
        if (kw) {
          const hay = [i.currentName, ...i.chain.map((s) => s.toName)].join(' ').toLowerCase()
          if (hay.indexOf(kw) < 0) return false
        }
        return true
      })
      .sort((a, b) => {
        // 排序：可改造 > 缺材料 > 未达等级；同级按等级降序
        const order = { READY: 0, LACK_MATERIAL: 1, LOW_LEVEL: 2 }
        const da = order[a.state] ?? 9
        const db = order[b.state] ?? 9
        if (da !== db) return da - db
        return b.lv - a.lv
      })
  }, [items, filter, search])

  // 已排除的舰娘（标记为「已改造完毕」）
  const visibleItems = useMemo(() => {
    if (showExcluded) return filtered
    return filtered.filter((i) => !excluded[i.groupKey])
  }, [filtered, excluded, showExcluded])

  const excludedCount = useMemo(() => {
    const keys = new Set()
    filtered.forEach((i) => {
      if (excluded[i.groupKey]) keys.add(i.groupKey)
    })
    return keys.size
  }, [filtered, excluded])

  // 顶部材料总览：累加每艘未改造舰娘「整条改造链」的材料需求总和，
  // 与账号持有量比对。够不够都显示，格式「持有/需求」（如 6/5、3/0）。
  const materialOverview = useMemo(() => {
    const needTotal = {} // { key: need }
    const addNeed = (kind, id, need) => {
      const key = kind === 'useitem' ? `u${id}` : kind
      needTotal[key] = (needTotal[key] || 0) + need
    }

    for (const i of items) {
      if (!i.locked) continue // 未上锁不计入
      if (excluded[i.groupKey]) continue // 已排除（判定为改造完毕）不计入

      const t = i.totalExtra || {}
      for (const [idStr, need] of Object.entries(t.useitems || {})) {
        const n = Number(need) || 0
        if (n > 0) addNeed('useitem', Number(idStr), n)
      }
      if (Number(t.devmat) > 0) addNeed('devmat', null, Number(t.devmat))
      if (Number(t.flame) > 0) addNeed('flame', null, Number(t.flame))
    }

    // 展示顺序：设计图58、甲板65、炮熕75、详报78、开发devmat、喷火flame、工厂资源104、兵装94、航空77、海外技术100
    const order = [
      { kind: 'useitem', id: 58 },
      { kind: 'useitem', id: 65 },
      { kind: 'useitem', id: 75 },
      { kind: 'useitem', id: 78 },
      { kind: 'devmat' },
      { kind: 'flame' },
      { kind: 'useitem', id: 104 },
      { kind: 'useitem', id: 94 },
      { kind: 'useitem', id: 77 },
      { kind: 'useitem', id: 100 },
    ]

    const haveOf = (o) => {
      if (o.kind === 'useitem') return Number(snap.useitems?.[o.id]?.api_count) || 0
      if (o.kind === 'devmat') return Number(snap.resources[RES_INDEX.DEVMAT]) || 0
      return Number(snap.resources[RES_INDEX.FLAME]) || 0
    }

    return order
      .map((o) => {
        const key = o.kind === 'useitem' ? `u${o.id}` : o.kind
        const need = needTotal[key] || 0
        const have = haveOf(o)
        // 需求为 0 且持有为 0 时不显示（避免空栏占位）
        if (need === 0 && have === 0) return null
        return { ...o, need, have, lack: need > have }
      })
      .filter(Boolean)
  }, [items, excluded, snap.useitems, snap.resources])

  const renderFilterChips = (value, setter, options) => (
    <div style={{ ...st.row, flexWrap: 'wrap', gap: 6, alignItems: 'stretch' }}>
      {options.map((opt) => {
        const selected = value === opt.value
        const bg = selected ? opt.color || '#2d6cdf' : 'rgba(255,255,255,0.08)'
        const fg = selected ? '#1a1a1a' : st.colors.textDim
        return (
          <button
            key={opt.value}
            onClick={() => setter(opt.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              padding: '8px 16px',
              fontSize: st.font.small,
              color: fg,
              background: bg,
              whiteSpace: 'nowrap',
              minHeight: 36,
              boxSizing: 'border-box',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <div style={{ ...st.col, height: '100%', minHeight: 0 }}>
      {/* 工具栏 */}
      <div style={{ ...st.col, gap: 6, padding: '4px 2px 8px' }}>
        <div style={{ ...st.row, gap: 6 }}>
          <input
            placeholder="搜索舰娘名称…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${st.colors.panelBorder}`,
              borderRadius: 4,
              padding: '5px 8px',
              color: st.colors.text,
              fontSize: st.font.small,
              outline: 'none',
              flex: 1,
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                ...st.chip('rgba(255,255,255,0.08)', st.colors.textDim),
                border: 'none',
                cursor: 'pointer',
                padding: '4px 10px',
              }}
            >
              清除
            </button>
          )}
        </div>
        {renderFilterChips(filter, setFilter, [
          { value: 'all', label: '全部', color: '#2d6cdf' },
          { value: 'READY', label: `${getRemodelLabel('READY')} ${stats.READY}`, color: REMODEL_COLOR.READY },
          { value: 'LACK_MATERIAL', label: `${getRemodelLabel('LACK_MATERIAL')} ${stats.LACK_MATERIAL}`, color: REMODEL_COLOR.LACK_MATERIAL },
          { value: 'LOW_LEVEL', label: `${getRemodelLabel('LOW_LEVEL')} ${stats.LOW_LEVEL}`, color: REMODEL_COLOR.LOW_LEVEL },
        ])}
        <div style={{ ...st.row, justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: st.font.tiny, color: st.colors.textFaint }}>
            共 {visibleItems.length} 艘可改造舰娘
            {excludedCount > 0 ? `（已排除 ${excludedCount}）` : ''}
            （未上锁舰娘已隐藏）
          </span>
          <div style={{ ...st.row, gap: 6 }}>
            {excludedCount > 0 && (
              <button
                onClick={() => setShowExcluded((v) => !v)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 3,
                  fontSize: st.font.tiny,
                  padding: '2px 8px',
                  color: showExcluded ? '#1a1a1a' : st.colors.textDim,
                  background: showExcluded ? '#81c784' : 'rgba(255,255,255,0.08)',
                }}
              >
                {showExcluded ? '隐藏已排除' : '显示已排除'}
              </button>
            )}
          </div>
        </div>

        {/* 材料总览（整条改造链累加，够不够都显示） */}
        {materialOverview.length > 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: st.font.large, color: st.colors.textDim, fontWeight: 600, flex: '0 0 auto' }}>
              材料总览：
            </span>
            {materialOverview.map((g) => {
              const icon = g.kind === 'useitem' ? USEITEM_ICON[g.id] : (g.kind === 'devmat' ? RES_ICON.devmat : RES_ICON.flame)
              const name = g.kind === 'useitem'
                ? (USEITEM_NAME[g.id] || '道具')
                : (g.kind === 'devmat' ? '开发' : '喷火')
              const color = g.lack ? '#ffca28' : '#81c784'
              return (
                <span
                  key={g.kind === 'useitem' ? `u${g.id}` : g.kind}
                  title={g.lack ? '持有不足' : '持有充足'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: st.font.large, color }}
                >
                  {icon && (
                    <img src={icon} alt="" style={{ width: 26, height: 26, objectFit: 'contain', display: 'block' }} />
                  )}
                  {name} {g.have}/{g.need}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* 列表 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
        {visibleItems.length === 0 && (
          <div style={{ color: st.colors.textFaint, padding: 20, fontSize: st.font.small, textAlign: 'center' }}>
            没有符合条件的舰娘
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleItems.map((item, idx) => (
            <ShipRow
              key={item.shipId}
              item={item}
              shipImgMod={shipImgMod}
              serverIp={snap.serverIp}
              marginMagics={snap.marginMagics}
              excluded={excluded}
              onToggleExcluded={toggleExcluded}
              zebra={idx % 2 === 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export const windowMode = false
export const reactClass = App
export const pluginDidLoad = () => {}
export const pluginWillUnload = () => {}
