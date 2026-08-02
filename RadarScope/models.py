"""
Data models for the application.
"""

from pydantic import BaseModel
from typing import Optional

class Aircraft(BaseModel):
    icao24: str
    callsign: Optional[str] = None
    origin_country: Optional[str] = None
    longitude: float
    latitude: float
    baro_altitude: Optional[float] = None
    velocity: Optional[float] = None
    true_track: Optional[float] = None
    vertical_rate: Optional[float] = None
    on_ground: Optional[bool] = None
    distance: Optional[float] = None  # in nautical miles from center
    bearing: Optional[float] = None   # in degrees from north

class AircraftUpdate(BaseModel):
    type: str = "aircraft_update"
    data: List[Aircraft]