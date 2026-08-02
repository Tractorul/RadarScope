// Animations Module: Handles animation loops and requestAnimationFrame for smooth rendering

class AnimationManager {
    constructor() {
        this.lastTimestamp = 0;
        this.deltaTime = 0;
        this.running = false;
        this.requestId = null;
        this.callbacks = [];
    }

    /**
     * Add a callback to be executed on each animation frame
     * @param {Function} callback - Function to call with timestamp and deltaTime
     */
    addCallback(callback) {
        this.callbacks.push(callback);
    }

    /**
     * Remove a callback
     * @param {Function} callback - Function to remove
     */
    removeCallback(callback) {
        this.callbacks = this.callbacks.filter(cb => cb !== callback);
    }

    /**
     * Start the animation loop
     */
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTimestamp = performance.now();
        this.animate();
    }

    /**
     * Stop the animation loop
     */
    stop() {
        if (!this.running) return;
        this.running = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    /**
     * Main animation loop
     * @param {number} timestamp - Current timestamp from performance.now()
     */
    animate(timestamp) {
        if (!this.running) return;

        // Calculate delta time in seconds
        this.deltaTime = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        // Call all registered callbacks
        this.callbacks.forEach(callback => {
            try {
                callback(timestamp, this.deltaTime);
            } catch (error) {
                console.error('Error in animation callback:', error);
            }
        });

        // Request next frame
        this.requestId = requestAnimationFrame(this.animate.bind(this));
    }
}

// Export for use in other modules
window.AnimationManager = AnimationManager;