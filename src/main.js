import Phaser from 'phaser'
import BootScene         from './scenes/BootScene.js'
import AuthScene         from './scenes/AuthScene.js'
import MenuScene         from './scenes/MenuScene.js'
import CharSelect        from './scenes/CharSelectScene.js'
import StageSelectScene  from './scenes/StageSelectScene.js'
import FightScene        from './scenes/FightScene.js'
import ResultScene       from './scenes/ResultScene.js'

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#000000',
  dom: { createContainer: true },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1800 },
      debug: false,
    }
  },
  scene: [BootScene, AuthScene, MenuScene, CharSelect, StageSelectScene, FightScene, ResultScene]
}

export default new Phaser.Game(config)
