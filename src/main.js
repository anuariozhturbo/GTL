import Phaser from 'phaser'
import BootScene         from './scenes/BootScene.js'
import AuthScene         from './scenes/AuthScene.js'
import MenuScene         from './scenes/MenuScene.js'
import CharSelect        from './scenes/CharSelectScene.js'
import StageSelectScene  from './scenes/StageSelectScene.js'
import OnlineLobbyScene  from './scenes/OnlineLobbyScene.js'
import FightScene        from './scenes/FightScene.js'
import ResultScene       from './scenes/ResultScene.js'
import ProfileScene      from './scenes/ProfileScene.js'

const syncViewportSize = () => {
  const vv = window.visualViewport
  const width = Math.round(Math.max(
    vv?.width || 0,
    window.innerWidth || 0,
    document.documentElement.clientWidth || 0
  ))
  const height = Math.round(Math.max(
    vv?.height || 0,
    window.innerHeight || 0,
    document.documentElement.clientHeight || 0
  ))
  document.documentElement.style.setProperty('--app-width', `${width}px`)
  document.documentElement.style.setProperty('--app-height', `${height}px`)
  const gameEl = document.getElementById('game')
  if (gameEl) {
    gameEl.style.width = `${width}px`
    gameEl.style.height = `${height}px`
  }
}

syncViewportSize()

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  dom: { createContainer: true },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1800 },
      debug: false,
    }
  },
  scene: [BootScene, AuthScene, MenuScene, CharSelect, StageSelectScene, OnlineLobbyScene, FightScene, ResultScene, ProfileScene]
}

const game = new Phaser.Game(config)

const refreshScale = () => {
  const refresh = () => {
    syncViewportSize()
    game.scale.refresh()
  }
  window.setTimeout(refresh, 60)
  window.setTimeout(refresh, 250)
  window.setTimeout(refresh, 650)
}

window.addEventListener('orientationchange', refreshScale)
window.visualViewport?.addEventListener('resize', refreshScale)
window.addEventListener('resize', refreshScale)

export default game
