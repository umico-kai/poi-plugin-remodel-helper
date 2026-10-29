// 共享样式（适配 poi 深色主题）
export const colors = {
  bg: 'transparent',
  panel: 'rgba(255,255,255,0.05)',
  panelBorder: 'rgba(255,255,255,0.10)',
  text: '#e6e6e6',
  textDim: '#9e9e9e',
  textFaint: '#757575',
  accent: '#4fc3f7',
}

export const font = {
  base: '13px',
  large: '16px',
  medium: '14px',
  small: '12px',
  tiny: '11px',
}

export const card = {
  background: colors.panel,
  border: `1px solid ${colors.panelBorder}`,
  borderRadius: 6,
  padding: 10,
  color: colors.text,
}

export const badge = (bg) => ({
  display: 'inline-block',
  padding: '1px 7px',
  borderRadius: 10,
  fontSize: font.tiny,
  color: '#1a1a1a',
  background: bg,
  fontWeight: 600,
  whiteSpace: 'nowrap',
})

export const chip = (bg, color) => ({
  display: 'inline-block',
  padding: '1px 7px',
  borderRadius: 3,
  fontSize: font.tiny,
  color: color || '#fff',
  background: bg,
  whiteSpace: 'nowrap',
})

export const row = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
}

export const col = {
  display: 'flex',
  flexDirection: 'column',
}
