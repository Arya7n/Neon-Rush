export const THEMES = [
  {
    id: 'neon',
    name: 'Neon',
    primary: '#3df0ff',
    secondary: '#ff2bd6',
    danger: '#ff4d6a',
    fog: '#070814',
    sky: ['#05060e', '#10182e', '#241433', '#070814'],
  },
  {
    id: 'toxic',
    name: 'Toxic',
    primary: '#c6ff4a',
    secondary: '#ffe14a',
    danger: '#ff6a2a',
    fog: '#071208',
    sky: ['#041006', '#123018', '#243810', '#071208'],
  },
  {
    id: 'ember',
    name: 'Ember',
    primary: '#ff8a3d',
    secondary: '#ff315c',
    danger: '#ffe08a',
    fog: '#140805',
    sky: ['#1a0806', '#3a140c', '#5a2212', '#140805'],
  },
  {
    id: 'void',
    name: 'Void',
    primary: '#d2b4ff',
    secondary: '#6f8cff',
    danger: '#ff6ad5',
    fog: '#0c0716',
    sky: ['#070414', '#1a1038', '#2a1458', '#0c0716'],
  },
]

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) || THEMES[0]
}

export function applyTheme(id) {
  const theme = getTheme(id)
  if (typeof document === 'undefined') return theme
  const root = document.documentElement
  root.style.setProperty('--cyan', theme.primary)
  root.style.setProperty('--magenta', theme.secondary)
  root.style.setProperty('--bg', theme.fog)
  document.body.style.background = theme.fog
  return theme
}
