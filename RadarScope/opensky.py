"""
OpenSky Network API client using requests directly.
Supports anonymous and authenticated access, with timeout and retry logic.
"""

import requests
import time
from typing import Optional, Tuple, List, Dict, Any


class OpenSkyClient:
    def __init__(
        self,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout: int = 10,
        max_retries: int = 3,
        backoff_factor: float = 1.0,
    ):
        """
        Initialize the OpenSky client.

        :param username: Optional username for authenticated access.
        :param password: Optional password for authenticated access.
        :param timeout: Request timeout in seconds.
        :param max_retries: Maximum number of retry attempts.
        :param backoff_factor: Backoff factor for retries (e.g., 1, 2, 4, 8 seconds).
        """
        self.username = username
        self.password = password
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.auth = (username, password) if username and password else None

    def _request(self, url: str, params: Optional[Dict] = None) -> Any:
        """
        Make a GET request to the OpenSky API with retry logic.

        :param url: The API endpoint URL.
        :param params: Query parameters.
        :return: JSON response from the API.
        :raises Exception: If the request fails after all retries.
        """
        for attempt in range(self.max_retries + 1):
            try:
                response = requests.get(
                    url,
                    auth=self.auth,
                    timeout=self.timeout,
                    params=params,
                )
                response.raise_for_status()  # Raises an HTTPError for bad responses
                return response.json()
            except requests.exceptions.RequestException as e:
                if attempt < self.max_retries:
                    # Exponential backoff
                    time.sleep(self.backoff_factor * (2 ** attempt))
                else:
                    raise Exception(
                        f"Request failed after {self.max_retries} attempts: {e}"
                    )

    def _get_states(
        self, bbox: Optional[Tuple[float, float, float, float]] = None
    ) -> List[Dict]:
        """
        Get aircraft states from the OpenSky API.

        :param bbox: Optional tuple (min_lat, min_lon, max_lat, max_lon) in decimal degrees.
        :return: List of aircraft state dictionaries.
        """
        url = "https://opensky-network.org/api/states/all"
        params = {}
        if bbox:
            # The OpenSky API expects bbox as "min_lon,min_lat,max_lon,max_lat"
            min_lat, min_lon, max_lat, max_lon = bbox
            params["bbox"] = f"{min_lon},{min_lat},{max_lon},{max_lat}"

        data = self._request(url, params=params)
        if not data or "states" not in data:
            return []

        states = data["states"]
        # Map each state vector to a dictionary
        state_dicts = []
        for state in states:
            if state is None:
                continue
            # Ensure the state has at least 17 elements (fill with None if shorter)
            while len(state) < 17:
                state.append(None)
            state_dict = {
                "icao24": state[0],
                "callsign": state[1].strip() if state[1] else None,
                "origin_country": state[2],
                "time_position": state[3],
                "last_contact": state[4],
                "longitude": state[5],
                "latitude": state[6],
                "baro_altitude": state[7],
                "on_ground": state[8],
                "velocity": state[9],
                "true_track": state[10],
                "vertical_rate": state[11],
                "sensors": state[12],
                "geo_altitude": state[13],
                "squawk": state[14],
                "spi": state[15],
                "position_source": state[16],
            }
            state_dicts.append(state_dict)
        return state_dicts

    def get_states_in_bbox(
        self, bbox: Tuple[float, float, float, float]
    ) -> List[Dict]:
        """
        Get aircraft states within a bounding box.

        :param bbox: A tuple (min_lat, min_lon, max_lat, max_lon).
        :return: List of aircraft state dictionaries.
        """
        return self._get_states(bbox=bbox)

    def get_all_states(self) -> List[Dict]:
        """
        Get all aircraft states (no bounding box filter).

        :return: List of aircraft state dictionaries.
        """
        return self._get_states()