// Entry point and game loop

import { canvas, camera } from './canvas.js';
import { spaceship, updateSpaceship } from './spaceship.js';
import { updateStarSystems } from './universe.js';
import { draw } from './rendering.js';
import { initModal } from './modal.js';
import { initCarousels } from './carousel.js';
import { initWelcomePopup, updateWelcomePopupPosition, hasVisitedBefore } from './welcome.js';
import { initTouchControls, updateTouchControls } from './touch-controls.js';

// Create keys object for input handling
const keys = {};
// Also make it available on window for easy access across modules
window.keys = keys;

// Game loop
function gameLoop() {
    // Skip updates if game is paused (modal is open)
    if (!window.isPaused) {
        if (window.isTouchDevice) {
            updateTouchControls();
        }
        updateSpaceship();
        updateStarSystems(); // Update planet orbits
        
        // Update welcome popup position
        updateWelcomePopupPosition();
    }
    
    // Always draw (even when paused)
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
    spaceship.x = hasVisitedBefore() ? canvas.width / 2 : canvas.width / 3;
    spaceship.y = canvas.height / 2;

    // Detect if it's a touch device
    window.isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));

    if (window.isTouchDevice) {
        initTouchControls(spaceship, keys, document.getElementById('interact-button'));
        // Hide desktop nav toggle if touch controls are active, as mobile has its own
        const desktopNavToggle = document.getElementById("nav-panel-toggle");
        if(desktopNavToggle) desktopNavToggle.style.display = 'none';

        const navPanelTitle = document.getElementById("nav-panel-title");
        if(navPanelTitle) navPanelTitle.style.textAlign = 'center'; // Center title if toggle is gone

    }
    
    // Initialize modal system
    initModal();

    initWelcomePopup();
    
    // Add listener for modal open to initialize carousels
    document.addEventListener('modalOpened', function() {
        setTimeout(initCarousels, 100);
    });
    
    // Set initial pause state
    window.isPaused = false;
    window.eKeyPressed = false;
    
    // Start the game loop
    gameLoop();
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', init);

// Export the keys object for modules that need direct access
export { keys };