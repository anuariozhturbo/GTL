const STAGES = [
  { key: 'neonvoid',     name: 'NEON VOID',      sub: 'CYBER ARENA', color: 0x9b59b6, hex: '#9b59b6', desc: 'Floating neon platforms. No hazards.' },
  { key: 'volcano',      name: 'VOLCANO TEMPLE', sub: 'ANCIENT FIRE', color: 0xff4400, hex: '#ff4400', desc: 'Lava geysers erupt every 7s.' },
  { key: 'cybercity',    name: 'CYBER CITY',     sub: 'NEON RAIN',    color: 0x00ffcc, hex: '#00ffcc', desc: 'Moving platform. Electrical hazards.' },
  { key: 'spacestation', name: 'SPACE STATION',  sub: 'ORBIT ZERO',   color: 0x4488ff, hex: '#4488ff', desc: 'Laser sweeps every 8s.' },
];

export default class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelectScene');
  }

  init(data) {
    this.mode = data.mode;
    this.p1 = data.p1;
    this.p2 = data.p2;
    this.difficulty = data.difficulty || 'medium';
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this._drawBackground(W, H);
    this._drawTitle(W);
    this._createCards(W, H);
    this._createBackButton(W, H);
    this._createRandomButton(W, H);
    this._setupKeyboard();
  }

  _drawBackground(W, H) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x01000a, 0x01000a, 0x09001f, 0x09001f, 1);
    bg.fillRect(0, 0, W, H);

    // Nebula blobs
    bg.fillStyle(0x4a1080, 0.09); bg.fillCircle(W / 2, H / 2, 380);
    bg.fillStyle(0x6b21a8, 0.05); bg.fillCircle(W * 0.15, H * 0.2, 180);
    bg.fillStyle(0x3b0f6e, 0.07); bg.fillCircle(W * 0.85, H * 0.8, 190);

    // Sparse stars
    for (let i = 0; i < 70; i++) {
      bg.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.12, 0.6));
      bg.fillRect(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 1, 1);
    }
  }

  _drawTitle(W) {
    const title = this.add.text(W / 2, 36, 'SELECT STAGE', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#9b59b6',
      strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 0, color: '#cc88ff', blur: 16, fill: true },
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: title,
      alpha: { from: 0.7, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  _createCards(W, H) {
    const CARD_W = 210;
    const CARD_H = 280;
    const GAP = 40;
    const total = STAGES.length * CARD_W + (STAGES.length - 1) * GAP;
    const startX = (W - total) / 2;
    const cardY = H / 2 - 20;

    this.cardObjects = [];

    STAGES.forEach((stage, i) => {
      const cx = startX + i * (CARD_W + GAP) + CARD_W / 2;
      const container = this.add.container(cx, cardY);
      container.setSize(CARD_W, CARD_H);
      container.setScale(0.1);
      container.setAlpha(0);

      // Card background
      const bg = this.add.graphics();
      bg.fillStyle(0x0d0020, 0.92);
      bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);

      // Border (normal)
      const border = this.add.graphics();
      border.lineStyle(2, stage.color, 0.6);
      border.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);

      // Preview area gradient fill
      const preview = this.add.graphics();
      preview.fillStyle(stage.color, 0.15);
      preview.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 150, { tl: 12, tr: 12, bl: 0, br: 0 });

      // Preview area border bottom line
      const previewLine = this.add.graphics();
      previewLine.lineStyle(1, stage.color, 0.4);
      previewLine.lineBetween(-CARD_W / 2, -CARD_H / 2 + 150, CARD_W / 2, -CARD_H / 2 + 150);

      // Stage name in preview area
      const previewName = this.add.text(0, -CARD_H / 2 + 75, stage.name, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '16px',
        color: stage.hex,
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
        wordWrap: { width: CARD_W - 16 },
      }).setOrigin(0.5, 0.5);

      // Stage name label below preview
      const nameText = this.add.text(0, -CARD_H / 2 + 165, stage.name, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: CARD_W - 16 },
      }).setOrigin(0.5, 0.5);

      // Sub-label
      const subText = this.add.text(0, -CARD_H / 2 + 188, stage.sub, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: stage.hex,
        align: 'center',
      }).setOrigin(0.5, 0.5);

      // Desc text
      const descText = this.add.text(0, -CARD_H / 2 + 230, stage.desc, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#aaaaaa',
        align: 'center',
        wordWrap: { width: CARD_W - 24 },
      }).setOrigin(0.5, 0.5);

      container.add([bg, preview, previewLine, border, previewName, nameText, subText, descText]);

      // Interactivity
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120, ease: 'Quad.easeOut' });
        border.clear();
        border.lineStyle(3, 0x9b59b6, 1);
        border.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
        border.lineStyle(8, 0x9b59b6, 0.2);
        border.strokeRoundedRect(-CARD_W / 2 - 4, -CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 14);
        this.input.setDefaultCursor('pointer');
      });

      container.on('pointerout', () => {
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeOut' });
        border.clear();
        border.lineStyle(2, stage.color, 0.6);
        border.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12);
        this.input.setDefaultCursor('default');
      });

      container.on('pointerdown', (ptr) => {
        if (ptr.leftButtonDown()) this._selectStage(stage.key);
      });

      this.cardObjects.push(container);

      // Staggered entrance tween
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 320,
        ease: 'Back.easeOut',
        delay: i * 80,
      });
    });
  }

  _selectStage(stageKey) {
    this.input.setDefaultCursor('default');
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('FightScene', {
        mode: this.mode,
        p1: this.p1,
        p2: this.p2,
        stage: stageKey,
        difficulty: this.difficulty,
      });
    });
  }

  _createBackButton(W, H) {
    const isTouch = this.sys.game.device.input.touch || navigator.maxTouchPoints > 0;
    const btnText = this.add.text(24, H - 36, '< BACK', {
      fontFamily: 'Arial Black, Arial',
      fontSize: isTouch ? '22px' : '14px',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 3,
      padding: isTouch ? { x: 16, y: 12 } : undefined,
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btnText.on('pointerover', () => btnText.setColor('#cc88ff'));
    btnText.on('pointerout', () => btnText.setColor('#aaaaaa'));
    btnText.on('pointerdown', () => {
      this.input.setDefaultCursor('default');
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CharSelectScene', {
          mode: this.mode,
          p1: this.p1,
          p2: this.p2,
          difficulty: this.difficulty,
        });
      });
    });
  }

  _createRandomButton(W, H) {
    const btn = this.add.text(W - 24, H - 36, 'RANDOM [R]', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '14px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#cc88ff'));
    btn.on('pointerout', () => btn.setColor('#ffcc00'));
    btn.on('pointerdown', () => this._pickRandom());
  }

  _pickRandom() {
    const stage = Phaser.Utils.Array.GetRandom(STAGES);
    this._selectStage(stage.key);
  }

  _setupKeyboard() {
    this.input.keyboard.on('keydown-R', () => this._pickRandom());
    this.input.keyboard.on('keydown-ESC', () => {
      this.input.setDefaultCursor('default');
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CharSelectScene', {
          mode: this.mode,
          p1: this.p1,
          p2: this.p2,
          difficulty: this.difficulty,
        });
      });
    });
  }
}
