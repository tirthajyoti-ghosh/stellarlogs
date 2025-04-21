// Modal management for detailed information display

// DOM references
let modal = null;
let modalContent = null;
let modalClose = null;
let isModalInitialized = false;

// Initialize modal elements
function initModal() {
    if (isModalInitialized) return;
    
    // Create modal container
    modal = document.createElement('div');
    modal.id = 'info-modal';
    modal.className = 'info-modal';
    modal.style.display = 'none';
    
    // Create modal content
    modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create close button
    modalClose = document.createElement('div');
    modalClose.className = 'modal-close';
    modalClose.innerHTML = '&times;';
    modalClose.onclick = closeModal;
    
    // Create header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    // Create title
    const modalTitle = document.createElement('h2');
    modalTitle.id = 'modal-title';
    modalTitle.className = 'modal-title';
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(modalClose);
    
    // Create body
    const modalBody = document.createElement('div');
    modalBody.id = 'modal-body';
    modalBody.className = 'modal-body';
    
    // Put it all together
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);
    
    // Add to document
    document.body.appendChild(modal);
    
    // Add event listener for Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
            closeModal();
        }
    });
    
    // Add click outside to close
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    isModalInitialized = true;
}

// Open modal with content
function openModal(title, content, objectColor) {
    if (!isModalInitialized) {
        initModal();
    }
    
    // Get references if needed
    if (!modal) modal = document.getElementById('info-modal');
    if (!modalContent) modalContent = modal.querySelector('.modal-content');
    
    // Set content
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    
    // Add color theme based on object
    if (objectColor) {
        const rgbColor = hexToRgb(objectColor);
        modal.style.boxShadow = `0 0 50px rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.3)`;
        modalContent.style.borderColor = objectColor;
    }
    
    // Show modal with animation
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');

        // Dispatch event for carousel initialization
        document.dispatchEvent(new CustomEvent('modalOpened'));
    }, 10);
    
    // Pause game or reduce motion here if needed
    window.isPaused = true;
}

// Close modal
function closeModal() {
    if (!modal) return;
    
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // Wait for animation to finish
    
    // Resume game
    window.isPaused = false;
}

// Helper function to convert hex to rgb
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 255 };
}

// Export functions
export {
    initModal,
    openModal,
    closeModal
};