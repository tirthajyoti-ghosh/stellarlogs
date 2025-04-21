import { travelImages } from './content.js';

// Generate HTML for a carousel based on location
function generateCarouselHTML(location) {
    // Get images for this location
    const images = travelImages[location];
    
    // If no images, return empty string
    if (!images || !images.length) {
        console.warn(`No images found for location: ${location}`);
        return '';
    }
    
    // Generate slides
    let slidesHTML = '';
    let dotsHTML = '';
    
    images.forEach((image, index) => {
        const isActive = index === 0 ? 'active' : '';
        
        slidesHTML += `
            <div class="carousel-slide ${isActive}">
                <div class="image-container">
                    <img src="${image.url}" alt="${image.caption || ''}" />
                </div>
                <p class="carousel-caption">${image.caption || ''}</p>
            </div>
        `;
        
        dotsHTML += `
            <span class="dot ${isActive}" data-index="${index}"></span>
        `;
    });
    
    // Return complete carousel HTML
    return `
        <div class="image-carousel">
            <div class="carousel-container">
                ${slidesHTML}
                <button class="carousel-btn prev-btn">&lt;</button>
                <button class="carousel-btn next-btn">&gt;</button>
                <div class="carousel-dots">
                    ${dotsHTML}
                </div>
            </div>
        </div>
    `;
}

// Initialize all carousels in the document
export function initCarousels() {
    // Replace placeholders with generated carousels
    document.querySelectorAll('#travel-carousel').forEach(placeholder => {
        const location = placeholder.getAttribute('data-location');
        if (location) {
            const carouselHTML = generateCarouselHTML(location);
            placeholder.outerHTML = carouselHTML;
        }
    });
    
    // Set up event handlers for all carousels
    document.querySelectorAll('.image-carousel').forEach(carousel => {
        const slides = carousel.querySelectorAll('.carousel-slide');
        const prevBtn = carousel.querySelector('.prev-btn');
        const nextBtn = carousel.querySelector('.next-btn');
        const dots = carousel.querySelectorAll('.dot');
        
        // Skip if this carousel has no slides or controls
        if (!slides.length || !prevBtn || !nextBtn) return;
        
        let currentIndex = 0;
        
        // Function to show slide at index
        function showSlide(index) {
            // Handle index boundaries
            if (index < 0) index = slides.length - 1;
            if (index >= slides.length) index = 0;
            
            // Update current index
            currentIndex = index;
            
            // Hide all slides
            slides.forEach(slide => {
                slide.classList.remove('active');
            });
            
            // Show current slide
            slides[currentIndex].classList.add('active');
            
            // Update dots
            dots.forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentIndex);
            });
        }
        
        // Set up event listeners
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSlide(currentIndex - 1);
        });
        
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showSlide(currentIndex + 1);
        });
        
        // Set up dot navigation
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(dot.getAttribute('data-index'));
                showSlide(index);
            });
        });
        
        // Touch swipe support
        let touchStartX = 0;
        let touchEndX = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);
        
        function handleSwipe() {
            if (touchEndX < touchStartX) {
                showSlide(currentIndex + 1);
            } 
            else if (touchEndX > touchStartX) {
                showSlide(currentIndex - 1);
            }
        }
    });
}