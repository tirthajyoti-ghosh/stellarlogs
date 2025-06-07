// Spaceship model and controls

import { canvas, camera, universeWidth, universeHeight } from './canvas.js';
import { updateHUD } from './navigation.js';
import { checkPlanetProximity } from './universe.js';
import { hasVisitedBefore } from './welcome.js';

// Spaceship object - initialize with temporary values
const spaceship = {
    x: 0, // Will be set properly during initialization
    y: 0, // Will be set properly during initialization
    width: 32,
    height: 32,
    velocityX: 0,
    velocityY: 0,
    acceleration: 0.45,
    maxSpeed: 15,
    friction: 0.97,
    rotationAngle: -Math.PI / 2,
    rotationSpeed: 0.1,
    thrusting: false,
    // Boost properties
    boostFactor: 4,
    boostDuration: 1000, // milliseconds
    boostCooldown: 0,
    boostAvailable: true,
    boostActive: false,
    boostStartTime: 0,
    boostCooldownStartTime: 0,
    // Tracking nearest objects
    nearestSystem: null,
    nearestPlanet: null,
};

// Initialize spaceship position
function initSpaceshipPosition() {
    // Center spaceship in the universe
    spaceship.x = hasVisitedBefore() ? canvas.width / 2 : canvas.width / 3;
    
    // Adjust Y position based on device and visit status
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile && !hasVisitedBefore()) {
        // On mobile, position spaceship much lower to make room for welcome message above
        spaceship.y = canvas.height * 0.85; // 85% down the screen - very noticeable
    } else {
        // Default center position for desktop or returning visitors
        spaceship.y = canvas.height / 2;
    }
    
    console.log('Spaceship initialized at:', spaceship.x, spaceship.y);
    console.log('Canvas height:', canvas.height);
    console.log('Is mobile:', isMobile, 'Has visited before:', hasVisitedBefore());
}

// Update spaceship position and rotation based on input
function updateSpaceship() {
    // Apply thrust based on input - now always in the direction the ship is facing
    spaceship.thrusting = false;

    // Check if boost is active and if it should be deactivated
    if (spaceship.boostActive) {
        if (Date.now() - spaceship.boostStartTime > spaceship.boostDuration) {
            spaceship.boostActive = false;
            spaceship.boostAvailable = true; // Immediately available again
        }
    }

    // Check if boost cooldown is complete
    if (!spaceship.boostAvailable && !spaceship.boostActive) {
        if (Date.now() - spaceship.boostCooldownStartTime > spaceship.boostCooldown) {
            spaceship.boostAvailable = true;
        }
    }

    // Activate boost with Shift key
    if (keys["Shift"] && !spaceship.boostActive && spaceship.boostAvailable) {
        spaceship.boostActive = true;
        spaceship.boostStartTime = Date.now();
    }

    // Apply regular thrust or joystick control
    if (window.isTouchDevice && keys._joystickActive) {
        // Touch controls: Move in joystick direction
        const joystickAngle = keys._joystickAngle; // Angle from touch-controls
        spaceship.rotationAngle = joystickAngle + Math.PI / 2; // Point ship in joystick direction

        const currentAcceleration = spaceship.boostActive
            ? spaceship.acceleration * spaceship.boostFactor
            : spaceship.acceleration;

        spaceship.velocityX += Math.cos(joystickAngle) * currentAcceleration;
        spaceship.velocityY += Math.sin(joystickAngle) * currentAcceleration;
        spaceship.thrusting = true;

    } else if (keys["ArrowUp"] || keys["w"]) {
        // Keyboard controls: Thrust forward
        const currentAcceleration = spaceship.boostActive
            ? spaceship.acceleration * spaceship.boostFactor
            : spaceship.acceleration;

        spaceship.velocityX += Math.cos(spaceship.rotationAngle - Math.PI / 2) * currentAcceleration;
        spaceship.velocityY += Math.sin(spaceship.rotationAngle - Math.PI / 2) * currentAcceleration;
        spaceship.thrusting = true;
    }

    // Rotation (only for keyboard)
    if (!window.isTouchDevice || !keys._joystickActive) { // Allow keyboard rotation if joystick not active or not touch device
        if (keys["ArrowLeft"] || keys["a"]) {
            spaceship.rotationAngle -= spaceship.rotationSpeed;
        }
        if (keys["ArrowRight"] || keys["d"]) {
            spaceship.rotationAngle += spaceship.rotationSpeed;
        }
    }

    // Update max speed based on boost
    const currentMaxSpeed = spaceship.boostActive
        ? spaceship.maxSpeed * spaceship.boostFactor
        : spaceship.maxSpeed;

    // Limit maximum speed
    const currentSpeed = Math.sqrt(
        spaceship.velocityX * spaceship.velocityX +
        spaceship.velocityY * spaceship.velocityY
    );
    if (currentSpeed > currentMaxSpeed) {
        const ratio = currentMaxSpeed / currentSpeed;
        spaceship.velocityX *= ratio;
        spaceship.velocityY *= ratio;
    }

    // Apply different friction based on boost status
    // Less friction during boost for more acceleration/deceleration time
    const currentFriction = spaceship.boostActive
        ? 0.99 // Higher value means less friction
        : spaceship.friction;

    spaceship.velocityX *= currentFriction;
    spaceship.velocityY *= currentFriction;

    // Update position
    spaceship.x += spaceship.velocityX;
    spaceship.y += spaceship.velocityY;

    // Wrap around universe edges
    if (spaceship.x > universeWidth) spaceship.x = 0;
    if (spaceship.x < 0) spaceship.x = universeWidth;
    if (spaceship.y > universeHeight) spaceship.y = 0;
    if (spaceship.y < 0) spaceship.y = universeHeight;

    // Update camera to follow spaceship
    camera.x = spaceship.x - canvas.width / 2;
    
    // Check if we should use custom mobile positioning
    const isMobile = window.innerWidth <= 768;
    const welcomePopupVisible = document.getElementById('welcome-popup')?.classList.contains('visible');
    
    if (isMobile && welcomePopupVisible) {
        // Position camera to show spaceship at 70% down the screen while welcome popup is visible
        camera.y = spaceship.y - canvas.height * 0.7;
    } else {
        // Default behavior: center camera on spaceship
        camera.y = spaceship.y - canvas.height / 2;
    }

    // Keep camera within universe bounds
    camera.x = Math.max(0, Math.min(camera.x, universeWidth - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, universeHeight - camera.height));

    // Update dashboard
    updateHUD();

    // Check if near planets
    checkPlanetProximity(spaceship);
}

export {
    spaceship,
    updateSpaceship,
    initSpaceshipPosition,
};