// Entry point and game loop

import { canvas, camera } from './canvas.js';
import { spaceship, updateSpaceship } from './spaceship.js';
import { updateStarSystems } from './universe.js';
import { draw } from './rendering.js';

// Create keys object for input handling
const keys = {};
// Also make it available on window for easy access across modules
window.keys = keys;

// Game loop
function gameLoop() {
    updateSpaceship();
    updateStarSystems(); // Update planet orbits
    draw();
    requestAnimationFrame(gameLoop);
}

// Setup input handlers
function setupInputHandlers() {
    // Input handling
    document.addEventListener("keydown", (e) => {
        keys[e.key] = true;
    });

    document.addEventListener("keyup", (e) => {
        keys[e.key] = false;
    });

    // Handle nav panel toggle
    const navPanelToggle = document.getElementById("nav-panel-toggle");
    navPanelToggle.addEventListener("click", () => {
        const planetData = document.getElementById("planet-data");
        if (planetData.style.display === "none") {
            planetData.style.display = "block";
            navPanelToggle.textContent = "-";
        } else {
            planetData.style.display = "none";
            navPanelToggle.textContent = "+";
        }
    });

    // Handle window resizing
    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        camera.width = canvas.width;
        camera.height = canvas.height;
    });
}

// Initialize the game
function init() {
    setupInputHandlers();
    
    // Center spaceship in the universe
    spaceship.x = canvas.width / 2;
    spaceship.y = canvas.height / 2;
    
    // Start the game loop
    gameLoop();
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', init);

// Export the keys object for modules that need direct access
export { keys };