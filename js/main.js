// Entry point and game loop

import { canvas, camera } from './canvas.js';
import { spaceship, updateSpaceship } from './spaceship.js';
import { updateStarSystems } from './universe.js';
import { draw } from './rendering.js';
import { initModal } from './modal.js';
import { initCarousels } from './carousel.js';
import { initWelcomePopup, updateWelcomePopupPosition, hasVisitedBefore } from './welcome.js';
import { initTouchControls, updateTouchControls } from './touch-controls.js';
import spriteManager from './sprite-manager.js';

// Create keys object for input handling
const keys = {};
// Also make it available on window for easy access across modules
window.keys = keys;

let gameInitialized = false;

// Game loop
function gameLoop() {
    // Only run game loop if sprites are loaded
    if (!gameInitialized || !spriteManager.isLoaded()) {
        requestAnimationFrame(gameLoop);
        return;
    }

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

// Sprite loading and initialization
async function initGame() {
    try {
        // Show loading screen
        showLoadingScreen();
        
        // Load all sprites
        await spriteManager.loadAllSprites();
        
        // Hide loading screen
        hideLoadingScreen();
        
        // Mark game as initialized
        gameInitialized = true;
        
        console.log('All sprites loaded successfully!');
        
    } catch (error) {
        console.error('Failed to load sprites:', error);
        showErrorScreen(error);
    }
}

function showLoadingScreen() {
    // Create loading overlay
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-screen';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: #00ffff;
        font-family: 'Courier New', monospace;
    `;
    
    loadingDiv.innerHTML = `
        <div style="text-align: center;">
            <h2 style="margin-bottom: 20px;">INITIALIZING...</h2>
            <div style="width: 300px; height: 20px; border: 2px solid #00ffff; background: transparent;">
                <div id="loading-bar" style="height: 100%; background: #00ffff; width: 0%; transition: width 0.3s;"></div>
            </div>
            <p style="margin-top: 15px;">Loading universe assets...</p>
        </div>
    `;
    
    document.body.appendChild(loadingDiv);
    
    // Update loading bar periodically
    const updateLoadingBar = () => {
        const progress = spriteManager.getLoadProgress();
        const loadingBar = document.getElementById('loading-bar');
        if (loadingBar) {
            loadingBar.style.width = (progress * 100) + '%';
        }
        
        if (!spriteManager.isLoaded()) {
            requestAnimationFrame(updateLoadingBar);
        }
    };
    updateLoadingBar();
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.remove();
    }
}

function showErrorScreen(error) {
    hideLoadingScreen();
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.1);
        border: 2px solid #ff0000;
        color: #ff0000;
        padding: 20px;
        font-family: 'Courier New', monospace;
        text-align: center;
        z-index: 10001;
    `;
    errorDiv.innerHTML = `
        <h3>SYSTEM ERROR</h3>
        <p>Failed to initialize stellar navigation system</p>
        <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
        <button onclick="location.reload()" style="margin-top: 15px; background: transparent; border: 1px solid #ff0000; color: #ff0000; padding: 5px 15px; cursor: pointer;">RETRY</button>
    `;
    document.body.appendChild(errorDiv);
}

// Initialize the game
async function init() {
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
    
    // Initialize sprite loading and start game
    await initGame();
    
    // Start the game loop
    gameLoop();
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', init);

// Export the keys object for modules that need direct access
export { keys };