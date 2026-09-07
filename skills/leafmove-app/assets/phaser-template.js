/* ===== Phaser 3 模板（L4+ 2D 游戏） ===== */
/* CDN 引入（放在 <script> 标签中，Phaser 之后）：
   <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
   BoxApp 子应用：API 使用相对路径，API_BASE 为空字符串（同源）
   适用场景：2D 小游戏、交互式教学、答题闯关、可视化游戏化 */

// ===== 主题色（Phaser 游戏背景用） =====
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        bg: s.getPropertyValue('--bg-card').trim() || '#0e1f18',
        primary: s.getPropertyValue('--primary').trim() || '#34d399',
        up: s.getPropertyValue('--color-up').trim() || '#ef4444',
        down: s.getPropertyValue('--color-down').trim() || '#10b981',
        text: s.getPropertyValue('--text-primary').trim() || '#f1f5f9',
    };
}

// ===== 创建游戏（统一入口） =====
// containerId: 容器 div 的 id；scenes: 场景类数组；返回 Phaser.Game
let activePhaserGame = null;

function createPhaserGame(containerId, scenes, opts) {
    opts = opts || {};
    const tc = getThemeColors();
    const container = document.getElementById(containerId);
    if (!container || typeof Phaser === 'undefined') return null;

    const config = {
        type: Phaser.AUTO,               // WebGL 优先，自动降级 Canvas
        parent: containerId,
        width: opts.width || 800,
        height: opts.height || 600,
        backgroundColor: opts.backgroundColor || tc.bg.replace('#', ''),
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: opts.gravity || 0 }, debug: false },
        },
        scene: scenes,
        scale: {
            mode: Phaser.Scale.FIT,      // 自动缩放适配容器
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
    };
    const game = new Phaser.Game(config);
    activePhaserGame = game;
    return game;
}

// ===== 游戏场景基类：玩家移动 + 收集物碰撞 =====
// 继承 Phaser.Scene；子类可覆写 create/update
class BaseGameScene extends Phaser.Scene {
    constructor(key) {
        super(key);
    }

    create() {
        const tc = getThemeColors();

        // 玩家（用 Graphics 画一个圆，无需外部图片资源 —— 零素材）
        const player = this.add.circle(400, 300, 15, parseInt(tc.primary.replace('#', ''), 16));
        this.physics.add.existing(player);
        player.body.setCollideWorldBounds(true);
        this.player = player;

        // 键盘方向控制
        this.cursors = this.input.keyboard.createCursorKeys();

        // 收集物（金币/目标，随机散布）
        this.coins = this.physics.add.group();
        for (let i = 0; i < (this.coinCount || 10); i++) {
            const coin = this.add.circle(
                Phaser.Math.Between(50, 750),
                Phaser.Math.Between(50, 550),
                8,
                parseInt(tc.up.replace('#', ''), 16)
            );
            this.coins.add(coin);
        }

        // 分数文本
        this.score = 0;
        this.scoreText = this.add.text(16, 16, '分数: 0', {
            fontSize: '20px',
            fill: '#' + tc.text.replace('#', ''),
            fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        }).setScrollFactor(0);

        // 玩家与收集物碰撞
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        this.onCollect = null;  // 子类/外部回调：this.onCollect = (score) => {...}
    }

    update() {
        const speed = this.playerSpeed || 200;
        const body = this.player.body;
        body.setVelocity(0, 0);
        if (this.cursors.left.isDown) body.setVelocityX(-speed);
        if (this.cursors.right.isDown) body.setVelocityX(speed);
        if (this.cursors.up.isDown) body.setVelocityY(-speed);
        if (this.cursors.down.isDown) body.setVelocityY(speed);
    }

    collectCoin(player, coin) {
        coin.destroy();
        this.score += 10;
        this.scoreText.setText('分数: ' + this.score);
        if (this.onCollect) this.onCollect(this.score);
        // 全部收集完 → 胜利
        if (this.coins.countActive(true) === 0 && this.onWin) this.onWin();
    }
}

// ===== 销毁游戏（切换视图/卸载时调用，释放 WebGL） =====
function destroyPhaser() {
    if (activePhaserGame) {
        activePhaserGame.destroy(true);
        activePhaserGame = null;
    }
}

// ===== 使用示例 =====
/*
// HTML：<div id="gameBox" style="width:100%;height:600px;"></div>
// 1. 定义场景（可扩展）
class MyGame extends BaseGameScene {
    constructor() { super('mygame'); }
    create() {
        super.create();
        this.coinCount = 15;
        this.playerSpeed = 250;
        this.onCollect = function (score) {
            // 可回调到外部：如把分数 POST 到后端
            // api('/api/score', { method: 'POST', body: JSON.stringify({ score: score }) });
        };
        this.onWin = function () {
            showToast('🎉 全部收集完成！', 'success');
        };
    }
}
// 2. 启动游戏
const game = createPhaserGame('gameBox', [MyGame], { width: 800, height: 600 });
// 3. 卸载时：
//    destroyPhaser();
*/
