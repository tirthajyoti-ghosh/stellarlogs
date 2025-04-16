// Utility functions for calculations and conversions

// Calculate bearing between two points (in degrees)
function calculateBearing(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Calculate angle in radians
    let angle = Math.atan2(dy, dx);

    // Convert to degrees
    let degrees = angle * (180 / Math.PI);

    // Normalize to 0-360 degrees
    if (degrees < 0) {
        degrees += 360;
    }

    return Math.round(degrees);
}

// Convert radians to degrees
function radToDeg(rad) {
    return rad * (180 / Math.PI);
}

// Convert degrees to compass direction
function degToCompass(deg) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[Math.round(deg / 45) % 8];
}

// Calculate distance between two points
function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Linear interpolation
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Generate a random integer between min (inclusive) and max (inclusive)
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random color
function randomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

export {
    calculateBearing,
    radToDeg,
    degToCompass,
    calculateDistance,
    lerp,
    clamp,
    randomInt,
    randomColor
};