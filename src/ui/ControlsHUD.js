export default class ControlsHUD {
  constructor(scene) {
    const W = scene.scale.width
    const panelW = 310, panelH = 148
    const px = W - panelW - 10, py = 10

    const bg = scene.add.graphics().setDepth(20).setScrollFactor(0)
    bg.fillStyle(0x000000, 0.75)
    bg.fillRoundedRect(px, py, panelW, panelH, 8)
    bg.lineStyle(1, 0x7c3aed, 0.65)
    bg.strokeRoundedRect(px, py, panelW, panelH, 8)

    const sf = (obj) => obj.setScrollFactor(0)
    const style = { fontSize: '11px', fontFamily: 'monospace', color: '#cccccc' }
    const bold  = { fontSize: '11px', fontFamily: 'monospace', color: '#9b59b6', fontStyle: 'bold' }
    const bold2 = { fontSize: '11px', fontFamily: 'monospace', color: '#e74c3c', fontStyle: 'bold' }

    const tx = px + 10, ty = py + 10
    const col2 = px + 162

    sf(scene.add.text(tx, ty,      'PLAYER 1',            bold).setDepth(21))
    sf(scene.add.text(tx, ty + 18, '[WASD]  Move / Jump', style).setDepth(21))
    sf(scene.add.text(tx, ty + 32, '[Z]     Attack',      style).setDepth(21))
    sf(scene.add.text(tx, ty + 46, '[X]     Block',       style).setDepth(21))
    sf(scene.add.text(tx, ty + 60, '[C]     Special',     style).setDepth(21))
    sf(scene.add.text(tx, ty + 74, '[V]     Action*',     style).setDepth(21))

    bg.lineStyle(1, 0x444444, 0.8)
    bg.lineBetween(col2 - 8, py + 8, col2 - 8, py + panelH - 8)

    sf(scene.add.text(col2, ty,      'PLAYER 2',             bold2).setDepth(21))
    sf(scene.add.text(col2, ty + 18, '[←→↑]  Move / Jump',  style).setDepth(21))
    sf(scene.add.text(col2, ty + 32, '[K]     Attack',       style).setDepth(21))
    sf(scene.add.text(col2, ty + 46, '[L]     Block',        style).setDepth(21))
    sf(scene.add.text(col2, ty + 60, '[I]     Special',      style).setDepth(21))
    sf(scene.add.text(col2, ty + 74, '[O]     Action*',      style).setDepth(21))

    sf(scene.add.text(px + panelW / 2, py + panelH - 14,
      '* Action = Bow / Crossbow / TNT / Dash',
      { fontSize: '10px', fontFamily: 'monospace', color: '#888888' }
    ).setOrigin(0.5).setDepth(21))

    scene.input.keyboard.on('keydown-TAB', () => bg.setVisible(!bg.visible))
  }
}
