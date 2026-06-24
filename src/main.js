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

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
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

export default new Phaser.Game(config)
