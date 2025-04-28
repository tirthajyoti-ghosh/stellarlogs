import { spaceship } from './spaceship.js';
import { camera } from './canvas.js';

let isPopupVisible = false;
let dismissedWithEKey = false;

export function initWelcomePopup() {
    const welcomePopup = document.getElementById('welcome-popup');
    
    // Check if this is the first visit
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    
    if (!hasVisited) {        
        isPopupVisible = true;
        welcomePopup.classList.add('visible');
        updatePopupPosition();

        localStorage.setItem('hasVisitedBefore', 'true');
    }
    
    // Handle dismiss with E key
    document.addEventListener('keydown', function(e) {
        if ((e.key === 'e' || e.key === 'E') && isPopupVisible) {
            hideWelcomePopup();
            dismissedWithEKey = true;
        }
    });
}

// Update popup position based on spaceship position
export function updateWelcomePopupPosition() {
    if (!isPopupVisible) return;
    updatePopupPosition();
}

// Position popup above spaceship with improved positioning
function updatePopupPosition() {
    const welcomePopup = document.getElementById('welcome-popup');
    if (!welcomePopup) return;
    
    const screenX = spaceship.x - camera.x;
    const screenY = spaceship.y - camera.y;
    
    // Position popup to the right of the spaceship instead of above
    welcomePopup.style.left = `${screenX + 60}px`;
    welcomePopup.style.top = `${screenY - welcomePopup.offsetHeight / 2}px`;
}

// Hide the welcome popup
function hideWelcomePopup() {
    const welcomePopup = document.getElementById('welcome-popup');
    welcomePopup.classList.remove('visible');
    isPopupVisible = false;
}

// Check if popup has been dismissed with E key
export function hasPopupBeenDismissed() {
    return dismissedWithEKey;
}