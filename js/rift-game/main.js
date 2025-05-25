import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth, // Use window innerWidth for full width
    height: window.innerHeight, // Use window innerHeight for full height
    parent: 'phaser-game', // ID of the div to contain the game
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Set to true for debugging collision boxes
        }
    },
    scene: [BootScene, PreloadScene, GameScene, UIScene, GameOverScene]
};

const game = new Phaser.Game(config);

export default game;
