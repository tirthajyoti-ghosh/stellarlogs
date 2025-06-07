import { spaceship } from './spaceship.js';
import { camera } from './canvas.js';

let isPopupVisible = false;
let dismissedWithEKey = false;

export const hasVisitedBefore = () => localStorage.getItem('hasVisitedBefore') === 'true';

export function initWelcomePopup() {
    const welcomePopup = document.getElementById('welcome-popup');
    const closeBtn = document.getElementById('welcome-close-btn');

    if (!welcomePopup) return;
    
    // Show popup only for first-time visitors
    if (!hasVisitedBefore()) {      
        isPopupVisible = true;
        welcomePopup.classList.add('visible');
        updatePopupPosition();

        // Update dismiss hint text based on device type
        const dismissHint = welcomePopup.querySelector('.dismiss-hint');
        if (dismissHint) {
            // Check if it's a touch device directly
            const isTouchDevice = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
            
            if (isTouchDevice) {
                dismissHint.innerHTML = 'Tap the <strong>X</strong> button to begin exploration';
            } else {
                dismissHint.innerHTML = 'Press <span class="key-hint">E</span> to begin exploration';
            }
        }

        // Add E key listener for dismissing popup
        const handleEKeyPress = (e) => {
            if (e.key.toLowerCase() === 'e' && isPopupVisible) {
                dismissedWithEKey = true;
                hideWelcomePopup();
                // Remove the event listener after use
                document.removeEventListener('keydown', handleEKeyPress);
            }
        };
        
        console.log('Adding E key listener for welcome popup');
        document.addEventListener('keydown', handleEKeyPress);

        // localStorage.setItem('hasVisitedBefore', 'true');
    }
    
    // Add click handler for close button
    if (closeBtn) {
        console.log('Adding event listeners to close button');
        closeBtn.addEventListener('click', (e) => {
            console.log('Close button clicked!');
            e.preventDefault();
            e.stopPropagation();
            hideWelcomePopup();
        });
        
        closeBtn.addEventListener('touchend', (e) => {
            console.log('Close button touched!');
            e.preventDefault();
            e.stopPropagation();
            hideWelcomePopup();
        });
    } else {
        console.log('Close button not found!');
    }
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
    
    // Get popup dimensions
    const popupWidth = welcomePopup.offsetWidth;
    const popupHeight = welcomePopup.offsetHeight;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    let leftPos, topPos;
    
    // Check if we're on mobile (you can adjust this breakpoint as needed)
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // On mobile, center the popup horizontally and position it above the spaceship
        leftPos = (screenWidth - popupWidth) / 2;
        
        // Position popup above spaceship with more space
        const spaceAbove = screenY - 40; // 40px buffer above spaceship
        const spaceNeeded = popupHeight + 20; // popup height + 20px padding
        
        if (spaceAbove >= spaceNeeded) {
            // Enough space above, position above spaceship
            topPos = screenY - popupHeight - 40;
        } else {
            // Not enough space above, position in upper portion of screen
            topPos = Math.min(20, Math.max(20, spaceAbove - popupHeight));
        }
        
        // Ensure popup doesn't go off screen
        if (topPos < 20) {
            topPos = 20;
        }
        
        if (topPos + popupHeight > screenHeight - 20) {
            topPos = screenHeight - popupHeight - 20;
        }
    } else {
        // Desktop behavior - position to the right of spaceship
        leftPos = screenX + 60;
        topPos = screenY - popupHeight / 2;
        
        // Ensure popup doesn't go off screen on desktop
        if (leftPos + popupWidth > screenWidth - 20) {
            leftPos = screenX - popupWidth - 60; // Position to the left instead
        }
        
        if (leftPos < 20) {
            leftPos = 20;
        }
        
        if (topPos < 20) {
            topPos = 20;
        }
        
        if (topPos + popupHeight > screenHeight - 20) {
            topPos = screenHeight - popupHeight - 20;
        }
    }
    
    welcomePopup.style.left = `${leftPos}px`;
    welcomePopup.style.top = `${topPos}px`;
}

// Hide the welcome popup
export function hideWelcomePopup() {
    const welcomePopup = document.getElementById('welcome-popup');
    welcomePopup.classList.remove('visible');
    isPopupVisible = false;
}

// Check if popup has been dismissed with E key
export function hasPopupBeenDismissed() {
    return dismissedWithEKey;
}