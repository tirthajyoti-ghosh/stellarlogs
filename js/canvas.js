// Canvas setup and management

// Get canvas elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const radarCanvas = document.getElementById("radar-sweep");
const radarCtx = radarCanvas.getContext("2d");

// Set initial canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Camera for viewport
const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
};

// Universe size (much larger than viewport)
const universeWidth = 30000;
const universeHeight = 30000;

// Export objects and functions
export {
    canvas,
    ctx,
    radarCanvas,
    radarCtx,
    camera,
    universeWidth,
    universeHeight
};