"""
Radar math utilities for coordinate conversion and bearing/distance calculations.
"""

import math

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points on Earth.
    Returns distance in nautical miles.
    """
    R = 3440.065  # Earth radius in nautical miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_bearing(lat1, lon1, lat2, lon2):
    """
    Calculate the bearing from point 1 to point 2.
    Returns bearing in degrees from north (0-360).
    """
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    bearing = math.atan2(y, x)
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360
    return bearing

def radar_coordinates(distance_nm, bearing_deg, radar_radius_nm):
    """
    Convert polar coordinates (distance, bearing) to radar screen coordinates.
    Assumes radar center is at (0,0) and y-axis points north, x-axis points east.
    Returns (x, y) in pixels, assuming radar_radius_nm maps to radar_radius_pixels.
    """
    # Convert bearing from degrees to radians (0° is north, 90° is east)
    theta = math.radians(bearing_deg)
    # Convert distance to radar radius ratio (0 to 1)
    ratio = distance_nm / radar_radius_nm if radar_radius_nm > 0 else 0
    # Clamp ratio to 1.0 (maximum display range)
    ratio = min(ratio, 1.0)
    # Calculate coordinates (y is north, x is east)
    x = ratio * math.sin(theta)  # easting
    y = ratio * math.cos(theta)  # northing
    return x, y

def interpolate_position(old_pos, new_pos, factor):
    """
    Linearly interpolate between two positions.
    factor: 0.0 (old_pos) to 1.0 (new_pos)
    """
    if old_pos is None:
        return new_pos
    if new_pos is None:
        return old_pos
    lat = old_pos[0] + (new_pos[0] - old_pos[0]) * factor
    lon = old_pos[1] + (new_pos[1] - old_pos[1]) * factor
    return (lat, lon)