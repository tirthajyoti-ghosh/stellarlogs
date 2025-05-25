export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        this.scoreText = null;
        this.healthText = null;
    }

    create() {
        // Score Display
        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '16px', fill: '#fff' });

        // Health Display
        this.healthText = this.add.text(10, 30, 'Health: 3', { fontSize: '16px', fill: '#fff' });

        // Listen for events from the GameScene
        const gameScene = this.scene.get('GameScene');

        gameScene.events.on('updateHealth', (health) => {
            this.healthText.setText('Health: ' + health);
        }, this);

        gameScene.events.on('addScore', (scoreToAdd) => {
            // Assuming you want to update a running score total
            // You might need to manage the score variable within UIScene or GameScene
            // For now, let's just display the points added, or you can accumulate it.
            const currentScore = parseInt(this.scoreText.text.split(': ')[1] || '0');
            this.scoreText.setText('Score: ' + (currentScore + scoreToAdd));
        }, this);
    }
}
