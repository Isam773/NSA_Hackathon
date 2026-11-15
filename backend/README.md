# CALLUNA — Backend Documentation

The CALLUNA backend is a Python application that analyses potential lunar landing sites using terrain elevation data and astronomical calculations.

It combines **LOLA lunar topography**, **NASA JPL Horizons ephemerides**, and mission suitability criteria to estimate sunlight availability, Earth visibility, and terrain-related constraints.

The backend uses FastAPI and also serves the compiled React frontend.

For general installation and usage, see the main repository `README.md`.

---

## 1. Technologies

| Technology | Purpose |
|---|---|
| Python 3 | Scientific calculations and backend logic |
| FastAPI | HTTP API |
| Uvicorn | ASGI server |
| NumPy | Terrain grid and numerical calculations |
| pandas | Astronomical data processing and summaries |
| requests | Communication with NASA JPL Horizons |
| LOLA | Lunar elevation data |
| JPL Horizons | Sun and Earth ephemerides |

---

## 2. Project Structure

```text
backend/
├── api_mission.py
├── requirements.txt
├── venv/
│
└── data/
    ├── __init__.py
    ├── analyse_optimalite.py
    ├── analyse_topographie.py
    ├── extraction_horizons.py
    ├── ldem_16.img
    ├── ldem_16.lbl
    └── logs/
```

### Main files

**`api_mission.py`**

Defines the FastAPI application, the analysis endpoint, JSON response formatting, and static frontend serving.

**`data/analyse_optimalite.py`**

Coordinates the complete analysis pipeline and calculates mission suitability indicators.

**`data/analyse_topographie.py`**

Reads LOLA elevation data and estimates local slope and the surrounding terrain horizon.

**`data/extraction_horizons.py`**

Requests Sun and Earth ephemerides from NASA JPL Horizons and processes the returned data.

**`data/ldem_16.img`**

Binary lunar elevation grid used for terrain calculations.

**`data/ldem_16.lbl`**

Metadata associated with the elevation dataset.

---

## 3. Backend Architecture

The backend processes one landing site and one mission date interval per analysis request.

```text
React Frontend
      |
      | HTTP GET /api/analyser
      v
FastAPI — api_mission.py
      |
      v
analyse_optimalite.py
      |
      +---- analyse_topographie.py
      |       |
      |       +---- LOLA elevation
      |       +---- Local slope
      |       +---- Terrain horizon
      |
      +---- extraction_horizons.py
      |       |
      |       +---- NASA JPL Horizons
      |       +---- Sun positions
      |       +---- Earth positions
      |
      +---- Visibility calculations
      |
      +---- Mission diagnostics
      |
      v
JSON Response
      |
      v
React Frontend
```

The backend separates terrain processing, astronomical data retrieval, and mission evaluation into different modules.

---

## 4. FastAPI Endpoint

### GET `/api/analyser`

The main endpoint accepts lunar coordinates and mission dates.

| Parameter | Type | Description |
|---|---|---|
| `lat` | float | Lunar latitude in degrees |
| `lon` | float | Lunar longitude in degrees |
| `debut` | string | Mission start date, `YYYY-MM-DD` |
| `fin` | string | Mission end date, `YYYY-MM-DD` |

Example:

```text
http://127.0.0.1:8000/api/analyser?lat=0.6741&lon=23.4730&debut=2026-11-14&fin=2026-11-28
```

The backend performs the analysis and returns a JSON response.

### Response structure

```json
{
  "diagnostic": {
    "statut_global": "...",
    "criteres_valides": {},
    "donnees_factuelles": {},
    "seuils_mission": {}
  },
  "horizon_360": {},
  "timeline": []
}
```

The response contains:

**`diagnostic`**

Mission suitability indicators, factual metrics, and thresholds.

**`horizon_360`**

Terrain horizon elevation for azimuths from 0° to 359°.

**`timeline`**

Time samples containing Sun/Earth positions and visibility flags.

### API documentation

FastAPI automatically generates interactive API documentation at:

http://localhost:8000/docs

The OpenAPI schema is available at:

http://localhost:8000/openapi.json

---

## 5. LOLA Terrain Processing

Implemented in:

`data/analyse_topographie.py`

CALLUNA uses the included LOLA elevation grid to estimate the landing site's topographic characteristics.

### Dataset

The current implementation assumes:

| Property | Value |
|---|---|
| Grid dimensions | 5760 × 2880 |
| Resolution | 16 pixels per degree |
| Data type | Little-endian signed 16-bit integers |
| Elevation scaling | 0.5 metres per stored unit |
| Lunar reference radius | 1,737,400 metres |

The grid is accessed using NumPy memory mapping.

This avoids loading the entire elevation dataset into memory for each calculation.

### Local slope

The backend estimates slope from a small neighbourhood around the selected site.

Elevation differences are converted into approximate surface gradients.

The resulting slope is expressed in degrees.

This is a coarse terrain estimate, not a lander-scale hazard assessment.

### Terrain horizon

For each azimuth from 0° to 359°, the backend examines surrounding terrain.

The current configuration samples approximately:

- **50 km** maximum distance
- **500 m** distance intervals
- **1°** azimuth intervals

For each direction, the algorithm estimates the elevation angle of surrounding terrain relative to the selected location.

The highest sampled obstruction determines the local horizon angle.

The calculation includes an approximate correction for lunar curvature.

The resulting 360° horizon is used to determine whether the Sun or Earth is blocked by terrain.

---

## 6. NASA JPL Horizons Integration

Implemented in:

`data/extraction_horizons.py`

The backend requests astronomical data from:

https://ssd.jpl.nasa.gov/api/horizons.api

### Objects analysed

| Object | Horizons identifier |
|---|---|
| Sun | `10` |
| Earth | `399` |
| Moon | `301` |

The observation site is defined using lunar latitude, longitude, and altitude.

### Time sampling

The current implementation requests Sun and Earth positions at **six-hour intervals**.

For each sample, the backend obtains information such as:

- Timestamp
- Azimuth
- Elevation
- Earth distance
- Radio light-time

The returned data is parsed and combined into a pandas DataFrame.

**Limitation:** Events shorter than the sampling interval may not be captured accurately.

Horizons queries require an internet connection.

---

## 7. Terrain-Adjusted Visibility

The backend combines astronomical positions with the terrain horizon.

For each time sample:

1. Determine the Sun's azimuth and elevation.
2. Determine the terrain horizon in that direction.
3. Compare the Sun's elevation with the terrain horizon.
4. Repeat for Earth.
5. Record whether both are visible simultaneously.

Conceptually:

```python
sun_visible = sun_elevation > terrain_horizon_sun
earth_visible = earth_elevation > terrain_horizon_earth

both_visible = sun_visible and earth_visible
```

The calculated visibility flags are used throughout the mission analysis.

### Interpretation

**Sun visibility** represents direct line-of-sight illumination above the sampled terrain horizon.

**Earth visibility** represents geometric direct line-of-sight visibility.

It is not a complete communications link-budget calculation.

---

## 8. Mission Analysis and Diagnostics

Implemented in:

`data/analyse_optimalite.py`

The backend processes the visibility time series to calculate mission indicators.

These include:

- Site altitude
- Local terrain slope
- Maximum terrain horizon
- Sunlight availability
- Earth visibility
- Simultaneous Sun/Earth visibility
- Longest continuous period without sunlight
- Mission duration

### Mission summaries

The analysis includes summaries grouped into approximately **15-day periods**.

Visibility fractions are calculated from the sampled time series.

The longest continuous night is estimated by counting consecutive samples without visible sunlight.

With six-hour sampling, each consecutive sample represents approximately 0.25 days.

### Default mission thresholds

The backend currently uses the following default criteria:

| Criterion | Default |
|---|---|
| Maximum local slope | 15° |
| Minimum sunlight availability | 65% |
| Minimum Earth visibility | 25% |
| Minimum simultaneous visibility | 15% |
| Maximum continuous darkness | 4 days |

These thresholds are illustrative mission-planning criteria, not official NASA landing requirements.

### Mission verdict

The backend evaluates whether each criterion is satisfied.

The results are returned in:

`diagnostic.criteres_valides`

The overall assessment is returned in:

`diagnostic.statut_global`

The frontend also offers adjustable thresholds, which are evaluated locally without changing the backend's default criteria.

---

## 9. Running the Backend

### Automatic launch

For ordinary users, the recommended method is to run:

`Lancer_Calluna.bat`

from the main project directory.

The launcher:

1. Creates a local Python virtual environment if necessary.
2. Installs dependencies from `requirements.txt`.
3. Starts Uvicorn on port 8000.
4. Opens CALLUNA in a browser.

The compiled frontend is already included in `calluna/dist`.

### Manual development launch

From the `backend` directory:

```powershell
python -m venv venv
```

Install dependencies:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Start the development server:

```powershell
.\venv\Scripts\python.exe -m uvicorn api_mission:app --host 127.0.0.1 --port 8000 --reload
```

Open:

http://localhost:8000

**Important:** Run the server from the `backend` directory because the current code uses relative paths for the elevation dataset.

---

## 10. Serving the React Frontend

The FastAPI application also serves the compiled frontend.

The build is located at:

`calluna/dist/`

When this folder exists, `api_mission.py` mounts it as static content.

This allows both the user interface and backend to run through:

`http://localhost:8000`

The development frontend can also run separately through Vite, typically on port 5173.

The current frontend API configuration uses:

`http://127.0.0.1:8000`

---

## 11. AI Usage Disclosure

**The CALLUNA backend was developed with generative AI assistance, including ChatGPT.**

AI tools assisted with Python code generation, FastAPI integration, terrain calculations, astronomical data processing, debugging, and documentation.

All backend source files should be considered AI-assisted.

The CALLUNA team directed development, integrated the modules, tested the application, and refined its functionality.
---

## 12. References

- [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)
- [Horizons API](https://ssd.jpl.nasa.gov/doc/horizons.html)
- [NASA Lunar Reconnaissance Orbiter](https://science.nasa.gov/mission/lro/)
- [LOLA](https://lola.gsfc.nasa.gov/)
- [NASA Moon Trek](https://trek.nasa.gov/moon/)

CALLUNA is an independent educational and preliminary lunar mission-planning application developed for the **NASA Space Apps Challenge 2026**.