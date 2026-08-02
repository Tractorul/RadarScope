// Aircraft model and rendering logic

class Aircraft {
    /**
     * @param {Object} data - Aircraft data from OpenSky API
     * @param {string} data.icao24 - ICAO24 address
     * @param {string} data.callsign - Callsign
     * @param {string} data.origin_country - Origin country
     * @param {number} data.latitude - Latitude in degrees
     * @param {number} data.longitude - Longitude in degrees
     * @param {number} [data.baro_altitude] - Barometric altitude in meters
     * @param {number} [data.velocity] - Velocity in m/s
     * @param {number} [data.true_track] - True track in degrees
     * @param {number} [data.vertical_rate] - Vertical rate in m/s
     * @param {boolean} [data.on_ground] - On ground flag
     * @param {number} [data.distance] - Distance from center in nautical miles
     * @param {number} [data.bearing] - Bearing from center in degrees
     * @param {Date} [data.last_update] - Last update timestamp
     */
    constructor(data) {
        this.icao24 = data.icao24;
        this.callsign = data.callsign?.trim() || '';
        this.origin_country = data.origin_country || '';
        this.latitude = data.latitude;
        this.longitude = data.longitude;
        this.baro_altitude = data.baro_altitude;
        this.velocity = data.velocity;
        this.true_track = data.true_track;
        this.vertical_rate = data.vertical_rate;
        this.on_ground = data.on_ground;
        this.distance = data.distance; // nautical miles from center
        this.bearing = data.bearing; // degrees from north
        this.last_update = data.last_update || new Date();

        // For interpolation
        this.lastPosition = null;
        this.targetPosition = null;
        this.interpolationFactor = 0;

        // For fading out when lost
        this.alpha = 1.0; // 1.0 = fully visible, 0.0 = invisible
        this.fadeOutRate = 0.05; // per second

        // DOM elements
        this.element = null;
        this.labelElement = null;
        this.altitudeElement = null;
        this.trailElements = [];
    }

    /**
     * Update aircraft with new data
     * @param {Object} newData - New aircraft data
     */
    update(newData) {
        // Mark as recently updated
        this.alpha = 1.0;
        this.last_update = newData.last_update || new Date();

        // Update data
        this.callsign = newData.callsign?.trim() || this.callsign;
        this.origin_country = newData.origin_country || this.origin_country;
        this.baro_altitude = newData.baro_altitude !== undefined ? newData.baro_altitude : this.baro_altitude;
        this.velocity = newData.velocity !== undefined ? newData.velocity : this.velocity;
        this.true_track = newData.true_track !== undefined ? newData.true_track : this.true_track;
        this.vertical_rate = newData.vertical_rate !== undefined ? newData.vertical_rate : this.vertical_rate;
        this.on_ground = newData.on_ground !== undefined ? newData.on_ground : this.on_ground;
        this.distance = newData.distance !== undefined ? newData.distance : this.distance;
        this.bearing = newData.bearing !== undefined ? newData.bearing : this.bearing;

        // Update position for interpolation
        const oldPos = { latitude: this.latitude, longitude: this.longitude };
        const newPos = { latitude: newData.latitude, longitude: newData.longitude };
        this.lastPosition = oldPos;
        this.targetPosition = newPos;
        this.interpolationFactor = 0; // Start interpolation from oldPos

        // Update current position to new data immediately (will be interpolated by render)
        this.latitude = newData.latitude;
        this.longitude = newData.longitude;
    }

    /**
     * Mark aircraft as lost (for fade out)
     */
    lost() {
        // Start fading out
        // The fade will be handled in the update loop
    }

    /**
     * Update interpolation factor based on time
     * @param {number} deltaTime - Time since last update in seconds
     * @param {number} interpSpeed - Interpolation speed factor (higher = faster)
     */
    updateInterpolation(deltaTime, interpSpeed = 5.0) {
        if (!this.lastPosition || !this.targetPosition) return;
        // Advance interpolation factor
        this.interpolationFactor += deltaTime * interpSpeed;
        if (this.interpolationFactor >= 1.0) {
            this.interpolationFactor = 1.0;
            this.lastPosition = this.targetPosition;
            // Target becomes the new last position for next update
        }
    }

    /**
     * Get interpolated position
     * @returns {{latitude: number, longitude: number}} Interpolated position
     */
    getInterpolatedPosition() {
        if (!this.lastPosition || !this.targetPosition) {
            return { latitude: this.latitude, longitude: this.longitude };
        }
        const lat = this.lastPosition.latitude + (this.targetPosition.latitude - this.lastPosition.latitude) * this.interpolationFactor;
        const lon = this.lastPosition.longitude + (this.targetPosition.longitude - this.lastPosition.longitude) * this.interpolationFactor;
        return { latitude: lat, longitude: lon };
    }

    /**
     * Create DOM elements for this aircraft
     * @param {HTMLElement} container - Container element to append to
     */
    createElements(container) {
        // Aircraft symbol
        this.element = document.createElement('div');
        this.element.className = 'aircraft';
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'none';
        container.appendChild(this.element);

        // Label
        this.labelElement = document.createElement('div');
        this.labelElement.className = 'aircraft-label';
        this.labelElement.style.position = 'absolute';
        this.labelElement.style.pointerEvents = 'none';
        container.appendChild(this.labelElement);

        // Altitude
        this.altitudeElement = document.createElement('div');
        this.altitudeElement.className = 'aircraft-altitude';
        this.altitudeElement.style.position = 'absolute';
        this.altitudeElement.style.pointerEvents = 'none';
        container.appendChild(this.altitudeElement);
    }

    /**
     * Update DOM elements based on current state and radar settings
     * @param {{centerX: number, centerY: number, radarRadiusPx: number, radarRadiusNm: number, showLabels: boolean}} radarParams
     */
    updateDisplay(radarParams) {
        if (!this.element) return;

        // Apply fade out
        this.alpha = Math.max(0, this.alpha - this.fadeOutRate * (1/60)); // Assume 60 FPS
        if (this.alpha <= 0) {
            // Remove elements if fully faded
            this.remove();
            return;
        }

        // Get interpolated position
        const pos = this.getInterpolatedPosition();

        // Calculate radar coordinates
        const coords = radarMath.radarCoordinates(
            this.distance,
            this.bearing,
            radarParams.radarRadiusNm,
            radarParams.radarRadiusPx
        );

        // Position element
        const left = radarParams.centerX + coords.x - (this.element.offsetWidth / 2);
        const top = radarParams.centerY - coords.y - (this.element.offsetHeight / 2); // Note: negative because screen y increases downward

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
        this.element.style.opacity = this.alpha;

        // Rotate according to heading (if available)
        if (this.true_track !== null) {
            this.element.style.transform = `translate(-50%, -50%) rotate(${this.true_track}deg)`;
        } else {
            this.element.style.transform = 'translate(-50%, -50%)';
        }

        // Update label if shown
        if (this.labelElement && radarParams.showLabels) {
            this.labelElement.textContent = this.callsign || this.icao24.substring(0, 6);
            this.labelElement.style.left = `${left}px`;
            this.labelElement.style.top = `${top + 18}px`;
            this.labelElement.style.opacity = this.alpha;
        } else if (this.labelElement) {
            this.labelElement.style.opacity = '0';
        }

        // Update altitude
        if (this.altitudeElement && this.baro_altitude !== null) {
            const altitudeFeet = Math.round(this.baro_altitude * 3.28084); // meters to feet
            this.altitudeElement.textContent = `${altitudeFeet}'`;
            this.altitudeElement.style.left = `${left}px`;
            this.altitudeElement.style.top = `${top + 28}px`;
            this.altitudeElement.style.opacity = this.alpha;
        } else if (this.altitudeElement) {
            this.altitudeElement.style.opacity = '0';
        }

        // Update trail (optional: we could add a trail effect)
        // For simplicity, we'll skip trail in this version
    }

    /**
     * Remove DOM elements
     */
    remove() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        if (this.labelElement) {
            this.labelElement.remove();
            this.labelElement = null;
        }
        if (this.altitudeElement) {
            this.altitudeElement.remove();
            this.altitudeElement = null;
        }
        // Remove trail elements
        this.trailElements.forEach(el => el.remove());
        this.trailElements = [];
    }

    /**
     * Get aircraft info for display in info panel
     * @returns {Object} Aircraft information
     */
    getInfo() {
        return {
            icao24: this.icao24,
            callsign: this.callsign || '-',
            origin_country: this.origin_country || '-',
            latitude: this.latitude?.toFixed(4) || '-',
            longitude: this.longitude?.toFixed(4) || '-',
            altitude: this.baro_altitude !== null ? `${Math.round(this.baro_altitude * 3.28084)} ft` : '-',
            velocity: this.velocity !== null ? `${Math.round(this.velocity * 1.94384)} kt` : '-',
            heading: this.true_track !== null ? `${Math.round(this.true_track)}°` : '-',
            vertical_rate: this.vertical_rate !== null ? `${this.vertical_rate > 0 ? '+' : ''}${this.vertical_rate} m/s` : '-',
            on_ground: this.on_ground ? 'Yes' : 'No',
            last_update: this.last_update ? this.last_update.toLocaleTimeString() : '-'
        };
    }
}

// Export for use in other modules
window.Aircraft = Aircraft;