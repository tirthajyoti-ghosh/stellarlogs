// js/touchcontrols.js

let joystickArea, joystickHandle;
let boostButton, interactButton;
let touchState = {
    joystickActive: false,
    joystickStartX: 0,
    joystickStartY: 0,
    joystickCurrentX: 0,
    joystickCurrentY: 0,
    boostActive: false,
    interactPressed: false // For a single tap
};

let gameKeysRef; // Reference to the main keys object
let interactButtonRef; // Reference to the interact button DOM element

const JOYSTICK_MAX_RADIUS = 40; // Max distance handle can move from center

export function initTouchControls(spaceship, keys, interactBtnElement) {
    joystickArea = document.getElementById('joystick-area');
    joystickHandle = document.getElementById('joystick-handle');
    boostButton = document.getElementById('boost-button');
    interactButton = document.getElementById('interact-button');
    
    gameKeysRef = keys;
    interactButtonRef = interactBtnElement;

    if (!joystickArea || !joystickHandle || !boostButton || !interactButton) {
        console.error("Touch control elements not found!");
        return;
    }

    // Joystick listeners
    joystickArea.addEventListener('touchstart', handleJoystickStart, { passive: false });
    joystickArea.addEventListener('touchmove', handleJoystickMove, { passive: false });
    joystickArea.addEventListener('touchend', handleJoystickEnd, { passive: false });
    joystickArea.addEventListener('touchcancel', handleJoystickEnd, { passive: false });

    // Button listeners
    boostButton.addEventListener('touchstart', () => { touchState.boostActive = true; }, { passive: false });
    boostButton.addEventListener('touchend', () => { touchState.boostActive = false; }, { passive: false });

    interactButton.addEventListener('touchstart', (event) => { // Added event parameter
        event.preventDefault(); // Prevent subsequent click event
        
        // Simulate a quick press for 'E'
        // Not setting gameKeysRef['E'] here to keep touch and keyboard states more separate.
        // window.eKeyPressed will be the primary flag for touch interaction.
        window.eKeyPressed = true; // For systems that check this flag
        
        // Reset after a short delay. This acts as a safety if universe.js doesn't reset it,
        // or if no modal opens. universe.js also resets this flag once an action is taken.
        setTimeout(() => {
            window.eKeyPressed = false;
        }, 100);
    }, { passive: false });
}

function handleJoystickStart(event) {
    event.preventDefault();
    touchState.joystickActive = true;
    const touch = event.touches[0];
    const rect = joystickArea.getBoundingClientRect();
    touchState.joystickStartX = rect.left + rect.width / 2;
    touchState.joystickStartY = rect.top + rect.height / 2;
    updateJoystickPosition(touch.clientX, touch.clientY);
}

function handleJoystickMove(event) {
    event.preventDefault();
    if (!touchState.joystickActive) return;
    const touch = event.touches[0];
    updateJoystickPosition(touch.clientX, touch.clientY);
}

function handleJoystickEnd(event) {
    event.preventDefault();
    touchState.joystickActive = false;
    joystickHandle.style.transform = 'translate(0px, 0px)';
    // Reset joystick control flags
    if (gameKeysRef) { // Ensure gameKeysRef is available
        gameKeysRef._joystickActive = false;
    }
    // Removed w,a,s,d key resets as they are no longer set by joystick directly
}

function updateJoystickPosition(clientX, clientY) {
    let deltaX = clientX - touchState.joystickStartX;
    let deltaY = clientY - touchState.joystickStartY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX); // Raw joystick angle in radians

    let handleX, handleY;

    if (distance > JOYSTICK_MAX_RADIUS) {
        handleX = Math.cos(angle) * JOYSTICK_MAX_RADIUS;
        handleY = Math.sin(angle) * JOYSTICK_MAX_RADIUS;
    } else {
        handleX = deltaX;
        handleY = deltaY;
    }
    joystickHandle.style.transform = `translate(${handleX}px, ${handleY}px)`;

    // Convert joystick position to game actions
    const threshold = JOYSTICK_MAX_RADIUS / 3;

    if (gameKeysRef) { // Ensure gameKeysRef is available
        if (distance > threshold) {
            gameKeysRef._joystickActive = true;
            gameKeysRef._joystickAngle = angle;
        } else {
            gameKeysRef._joystickActive = false;
        }
    }
    // Removed direct setting of w,a,d keys
}

export function updateTouchControls() {
    if (touchState.boostActive) {
        gameKeysRef['Shift'] = true;
    } else {
        gameKeysRef['Shift'] = false;
    }
    // Interact button visibility is handled externally based on game state
}

// Function to be called from elsewhere (e.g., rendering.js or spaceship.js)
// to show/hide the interact button based on proximity to interactable objects.
export function setInteractButtonVisibility(visible) {
    if (interactButtonRef) {
        interactButtonRef.style.display = visible ? 'block' : 'none';
    }
}
