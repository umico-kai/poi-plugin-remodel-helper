import React, { useEffect, useMemo, useState } from 'react'
import { store } from 'views/create-store'
import { REMODEL_LABEL, REMODEL_COLOR, SHIP_TYPES } from './lib/constants.es'
import { detectRemodel, buildMasterNameMap } from './lib/remodel.es'
import { USEITEM_NAME } from './lib/extraMaterials.es'
import { USEITEM_ICON, RES_ICON } from './lib/icons.es'
import { getConvertGroup } from './lib/convertGroups.es'
import * as st from './lib/styles.es'

// localStorage 持久化：已标记「改造完毕」的舰娘组
const EXCLUDED_KEY = 'poi-plugin-remodel-helper:excluded'
const loadExcluded = () => {
  try {
    return JSON.parse(window.localStorage.getItem(EXCLUDED_KEY) || '{}')
  } catch {
    return {}
  }
}
const saveExcluded = (obj) => {
  try {
    window.localStorage.setItem(EXCLUDED_KEY, JSON.stringify(obj))
  } catch {}
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

// 舰娘行卡片：左头像（remodel 立绘裁剪）+ 名字/Lv/舰种 + 右侧状态与材料
const ShipRow = ({ item, shipImgMod, serverIp, marginMagics, excluded, onToggleExcluded }) => {
  const stypeName = SHIP_TYPES[item.stype] || `舰种${item.stype}`
  const isExcluded = !!excluded[item.groupKey]
  const isConvert = !!item.convertGroup

  // 头像偏移：优先 poi 内置 marginMagics，否则默认值
  const offset = marginMagics?.[item.masterId]?.normal ?? DEFAULT_AVATAR_OFFSET
  const AVATAR_H = 80 // 放大 2 倍（原 40）

  // 额外材料描述
  const extraDesc = []
  if (item.extra) {
    if (item.extra.useitems) {
      for (const [idStr, need] of Object.entries(item.extra.useitems)) {
        const needN = Number(need) || 0
        if (needN <= 0) continue
        extraDesc.push(`${USEITEM_NAME[Number(idStr)] || '道具'}×${needN}`)
      }
    }
    if (item.extra.devmat > 0) extraDesc.push(`开发×${item.extra.devmat}`)
    if (item.extra.flame > 0) extraDesc.push(`喷火×${item.extra.flame}`)
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${st.colors.panelBorder}`,
        borderRadius: 6,
        padding: '12px 14px',
        minWidth: 0,
      }}
    >
      {/* 头像：与「舰娘信息」一致 —— remodel 立绘 + marginMagics 偏移裁剪 */}
      <div
        style={{
          width: 96,
          height: AVATAR_H,
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
          background: 'rgba(0,0,0,0.3)',
          flex: '0 0 auto',
        }}
      >
        {shipImgMod ? (
          <img
            src={shipImgMod.getShipImgPath(item.masterId, 'remodel', false, serverIp || '203.104.209.71')}
            alt=""
            style={{
              height: AVATAR_H,
              position: 'absolute',
              top: 0,
              left: `${-Math.round(offset * AVATAR_H)}px`,
              display: 'block',
              maxWidth: 'none',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ color: st.colors.text, fontSize: st.font.large, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.currentName}
          </span>
          {item.locked ? (
            <span title="已上锁" style={{ color: '#ffd54f', fontSize: st.font.medium, flex: '0 0 auto' }}>🔒</span>
          ) : (
            <span title="未上锁（易被拆解/合成误操作）" style={{ color: st.colors.textFaint, fontSize: st.font.medium, flex: '0 0 auto', opacity: 0.7 }}>🔓</span>
          )}
          <span style={{ color: st.colors.textDim, fontSize: st.font.medium, flex: '0 0 auto' }}>Lv.{item.lv}</span>
          <span style={{ color: st.colors.textFaint, fontSize: st.font.small, flex: '0 0 auto' }}>{stypeName}</span>
          {isConvert && (
            <span
              style={{
                ...st.chip('rgba(171,71,188,0.25)', '#ce93d8'),
                fontSize: st.font.small,
                flex: '0 0 auto',
              }}
            >
              形态转换
            </span>
          )}
        </div>
        <div style={{ fontSize: st.font.small, color: st.colors.textDim }}>
          {item.currentName} → <span style={{ color: st.colors.accent }}>{item.afterName}</span>（改造等级 Lv.{item.afterLv}）
        </div>
        {/* 等级提示 */}
        {!item.levelOk && (
          <div style={{ fontSize: st.font.small, color: '#ef9a9a' }}>
            还差 {item.afterLv - item.lv} 级
          </div>
        )}
        {/* 额外材料 */}
        {extraDesc.length > 0 && (
          <div style={{ display: 'flex', gap: 8, fontSize: st.font.small, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: st.colors.textFaint }}>额外：</span>
            {item.extra.useitems &&
              Object.entries(item.extra.useitems).map(([idStr, need]) => {
                const needN = Number(need) || 0
                if (needN <= 0) return null
                const have = item.missingItems.find((m) => m.kind === 'useitem' && m.id === Number(idStr))?.have ?? null
                const ok = have === null || have >= needN
                const icon = USEITEM_ICON[Number(idStr)]
                return (
                  <span key={idStr} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: ok ? st.colors.textDim : '#ffca28' }}>
                    {icon && (
                      <img src={icon} alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }} />
                    )}
                    {USEITEM_NAME[Number(idStr)] || '道具'} {have !== null ? `${have}/${needN}` : `×${needN}`}
                  </span>
                )
              })}
            {item.extra.devmat > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: (item.missingItems.find((m) => m.kind === 'devmat') ? '#ffca28' : st.colors.textDim) }}>
                {RES_ICON.devmat && (
                  <img src={RES_ICON.devmat} alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }} />
                )}
                开发 {item.extra.devmat}
              </span>
            )}
            {item.extra.flame > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: (item.missingItems.find((m) => m.kind === 'flame') ? '#ffca28' : st.colors.textDim) }}>
                {RES_ICON.flame && (
                  <img src={RES_ICON.flame} alt="" style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }} />
                )}
                喷火 {item.extra.flame}
              </span>
            )}
          </div>
        )}
        {/* 缺少材料提示 */}
        {item.state === 'LACK_MATERIAL' && (
          <div style={{ fontSize: st.font.small, color: '#ffca28' }}>
            缺：
            {item.missingItems.map((m) => {
              if (m.kind === 'useitem') return `${USEITEM_NAME[m.id] || '道具'} ${m.need - m.have}`
              if (m.kind === 'devmat') return `开发 ${m.need - m.have}`
              if (m.kind === 'flame') return `喷火 ${m.need - m.have}`
              return ''
            }).filter(Boolean).join('、')}
          </div>
        )}
      </div>

      {/* 状态徽章 + 手动标记 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: '0 0 auto' }}>
        <span style={{ ...st.badge(REMODEL_COLOR[item.state]), fontSize: st.font.small, padding: '3px 12px' }}>
          {REMODEL_LABEL[item.state]}
        </span>
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
          title={isConvert ? '形态转换舰娘：标记后整组不再提示' : '标记为已改造完毕，从列表移除'}
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
    const nameMap = buildMasterNameMap(snap.masterShips)
    const result = []
    for (const ship of snap.ships) {
      if (!ship || ship.api_ship_id == null) continue
      const master = snap.masterShips[Number(ship.api_ship_id)]
      const det = detectRemodel(ship, master, snap.resources, snap.useitems)
      if (!det) continue // 已完成最终改造或无改造信息，移除
      const m = master || {}
      const stypeNum = Number(m.api_stype)
      const convertGroup = getConvertGroup(det.masterId)
      result.push({
        ...det,
        currentName: m.api_name || `#${ship.api_ship_id}`,
        afterName: nameMap[det.afterId] || `#${det.afterId}`,
        stype: stypeNum,
        convertGroup,
        // 排除以「形态转换组」为单位；非转换舰则用 masterId 自身
        groupKey: convertGroup || `m${det.masterId}`,
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
          if (
            i.currentName.toLowerCase().indexOf(kw) < 0 &&
            i.afterName.toLowerCase().indexOf(kw) < 0
          ) {
            return false
          }
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

  // 已排除的舰娘组（标记为「已改造完毕」）
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

  // 顶部材料缺口汇总：
  // 正确算法 —— 累加「还未改造舰娘」所需的材料总和 needTotal，
  // 再与账号实际持有量 have（只取一次）比对，缺口 = needTotal - have。
  const materialGaps = useMemo(() => {
    const needTotal = {} // { key: { kind, id, need } }
    const addNeed = (kind, id, need) => {
      const key = kind === 'useitem' ? `u${id}` : kind
      if (!needTotal[key]) needTotal[key] = { kind, id, need: 0 }
      needTotal[key].need += need
    }
    for (const i of items) {
      if (!i.locked) continue // 未上锁不计入
      if (excluded[i.groupKey]) continue // 已排除（判定为改造完毕）不计入
      // 还未改造的舰娘：无论等级是否达标，其改造所需材料都计入需求总和
      const ex = i.extra
      if (!ex) continue
      if (ex.useitems) {
        for (const [idStr, need] of Object.entries(ex.useitems)) {
          const needN = Number(need) || 0
          if (needN <= 0) continue
          addNeed('useitem', Number(idStr), needN)
        }
      }
      if (Number(ex.devmat) > 0) addNeed('devmat', null, Number(ex.devmat))
      if (Number(ex.flame) > 0) addNeed('flame', null, Number(ex.flame))
    }
    // 填充账号实际持有量（每种只取一次）
    const gaps = {}
    for (const [key, t] of Object.entries(needTotal)) {
      let have = 0
      if (t.kind === 'useitem') {
        have = Number(snap.useitems?.[t.id]?.api_count) || 0
      } else if (t.kind === 'devmat') {
        have = Number(snap.resources[6]) || 0
      } else if (t.kind === 'flame') {
        have = Number(snap.resources[4]) || 0
      }
      gaps[key] = { kind: t.kind, id: t.id, need: t.need, have }
    }
    return gaps
  }, [items, excluded, snap.useitems, snap.resources])

  // 按用户指定顺序排序的缺口列表（仅显示确实有缺口的）
  const materialGapList = useMemo(() => {
    // 顺序：设计图58、甲板65、炮熕75、详报78、开发devmat、喷火flame、工厂资源104、兵装94、航空77、海外技术100
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
    return order
      .map((o) => {
        const key = o.kind === 'useitem' ? `u${o.id}` : o.kind
        const g = materialGaps[key]
        if (!g) return null
        // 只有需求总和 > 持有量时才算有缺口
        if (g.need <= g.have) return null
        return { ...o, need: g.need, have: g.have }
      })
      .filter(Boolean)
  }, [materialGaps])

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
          { value: 'READY', label: `${REMODEL_LABEL.READY} ${stats.READY}`, color: REMODEL_COLOR.READY },
          { value: 'LACK_MATERIAL', label: `${REMODEL_LABEL.LACK_MATERIAL} ${stats.LACK_MATERIAL}`, color: REMODEL_COLOR.LACK_MATERIAL },
          { value: 'LOW_LEVEL', label: `${REMODEL_LABEL.LOW_LEVEL} ${stats.LOW_LEVEL}`, color: REMODEL_COLOR.LOW_LEVEL },
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

        {/* 材料缺口汇总 */}
        {materialGapList.length > 0 && (
          <div
            style={{
              background: 'rgba(255,202,40,0.08)',
              border: '1px solid rgba(255,202,40,0.3)',
              borderRadius: 8,
              padding: '12px 14px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: st.font.large, color: '#ffca28', fontWeight: 600, flex: '0 0 auto' }}>
              材料缺口：
            </span>
            {materialGapList.map((g) => {
              const icon = g.kind === 'useitem' ? USEITEM_ICON[g.id] : (g.kind === 'devmat' ? RES_ICON.devmat : RES_ICON.flame)
              const name = g.kind === 'useitem'
                ? (USEITEM_NAME[g.id] || '道具')
                : (g.kind === 'devmat' ? '开发' : '喷火')
              return (
                <span key={g.kind === 'useitem' ? `u${g.id}` : g.kind} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: st.font.large, color: '#ffca28' }}>
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
          {visibleItems.map((item) => (
            <ShipRow
              key={item.shipId}
              item={item}
              shipImgMod={shipImgMod}
              serverIp={snap.serverIp}
              marginMagics={snap.marginMagics}
              excluded={excluded}
              onToggleExcluded={toggleExcluded}
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
