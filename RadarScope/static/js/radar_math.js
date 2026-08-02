// Radar math utilities for coordinate conversion and bearing/distance calculations.

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}

/**
 * Calculate the great-circle distance between two points on Earth.
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in nautical miles
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Calculate the bearing from point 1 to point 2.
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Bearing in degrees from north (0-360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    const dLon = toRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    let bearing = Math.atan2(y, x);
    bearing = toDegrees(bearing);
    bearing = (bearing + 360) % 360;
    return bearing;
}

/**
 * Convert polar coordinates (distance, bearing) to radar screen coordinates.
 * Assumes radar center is at (0,0) and y-axis points north, x-axis points east.
 * @param {number} distanceNm - Distance in nautical miles from center
 * @param {number} bearingDeg - Bearing in degrees from north (0-360)
 * @param {number} radarRadiusNm - Radar radius in nautical miles (max display range)
 * @param {number} radarRadiusPx - Radar radius in pixels (screen radius)
 * @returns {{x: number, y: number}} Radar coordinates (x, y) in pixels, where (0,0) is center
 */
function radarCoordinates(distanceNm, bearingDeg, radarRadiusNm, radarRadiusPx) {
    // Convert bearing from degrees to radians (0° is north, 90° is east)
    const theta = toRadians(bearingDeg);
    // Convert distance to radar radius ratio (0 to 1)
    let ratio = distanceNm / radarRadiusNm;
    // Clamp ratio to 1.0 (maximum display range)
    if (ratio > 1) ratio = 1;
    // Calculate coordinates (y is north, x is east)
    const x = ratio * Math.sin(theta) * radarRadiusPx; // easting
    const y = ratio * Math.cos(theta) * radarRadiusPx; // northing
    return { x, y };
}

/**
 * Linearly interpolate between two positions.
 * @param {{latitude: number, longitude: number}} oldPos - Old position
 * @param {{latitude: number, longitude: number}} newPos - New position
 * @param {number} factor - Interpolation factor (0.0 = oldPos, 1.0 = newPos)
 * @returns {{latitude: number, longitude: number}} Interpolated position
 */
function interpolatePosition(oldPos, newPos, factor) {
    if (!oldPos) return newPos;
    if (!newPos) return oldPos;
    const lat = oldPos.latitude + (newPos.latitude - oldPos.latitude) * factor;
    const lon = oldPos.longitude + (newPos.longitude - oldPos.longitude) * factor;
    return { latitude: lat, longitude: lon };
}

// Export for use in other modules (if using modules)
// In a browser environment, we'll attach to window
window.radarMath = {
    toRadians,
    toDegrees,
    haversineDistance,
    calculateBearing,
    radarCoordinates,
    interpolatePosition
};