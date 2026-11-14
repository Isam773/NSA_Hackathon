import numpy as np

RAYON_LUNE_M = 1737400.0
METRES_PAR_DEGRE_LAT = (2 * np.pi * RAYON_LUNE_M) / 360.0


def calculer_masque_horizon_lola(
    chemin_img, lat, lon, pixels_par_degre=16, rayon_km=50, pas_distance_m=500
):
  """Lit directement la grille binaire LOLA (.img) en int16 :

  - Lignes : +90° (Nord, ligne 0) à -90° (Sud, dernière ligne)
  - Colonnes : 0° à 360° Est
  - Valeur : altitude en demi-mètres (x 0.5)
  """
  n_lignes = 180 * pixels_par_degre  # 2880 pour ldem_16
  n_cols = 360 * pixels_par_degre  # 5760 pour ldem_16

  # Lecture rapide via memmap (ne charge pas tout le fichier en RAM)
  grille_brut = np.memmap(
      chemin_img, dtype="<i2", mode="r", shape=(n_lignes, n_cols)
  )

  # Conversion (lat, lon) -> indices (row, col)
  lon_360 = lon % 360.0
  row_site = int(round((90.0 - lat) * pixels_par_degre))
  col_site = int(round(lon_360 * pixels_par_degre)) % n_cols

  row_site = np.clip(row_site, 0, n_lignes - 1)

  # Altitude exacte en mètres (échelle 0.5 m)
  z_site = float(grille_brut[row_site, col_site]) * 0.5

  # 1. Pente locale (3x3 autour du point)
  cos_lat = max(np.cos(np.radians(lat)), 0.01)
  dy_m = METRES_PAR_DEGRE_LAT / pixels_par_degre
  dx_m = dy_m * cos_lat

  r_min, r_max = max(0, row_site - 1), min(n_lignes, row_site + 2)
  cols_fenetre = [(col_site - 1) % n_cols, col_site, (col_site + 1) % n_cols]
  fenetre_pente = grille_brut[r_min:r_max, :][:, cols_fenetre].astype(float) * 0.5

  if fenetre_pente.shape[0] >= 2:
    dz_dy, dz_dx = np.gradient(fenetre_pente, dy_m, dx_m)
    pente_deg = round(
        float(np.degrees(np.arctan(np.hypot(dz_dx, dz_dy).max()))), 1
    )
  else:
    pente_deg = 0.0

  # 2. Raycasting à 360° autour du site
  distances = np.arange(pas_distance_m, rayon_km * 1000.0, pas_distance_m)
  courbure = (distances**2) / (2 * RAYON_LUNE_M)
  horizon_360 = {}

  for azimut_deg in range(360):
    az_rad = np.radians(azimut_deg)
    dy_rayon = distances * np.cos(az_rad)
    dx_rayon = distances * np.sin(az_rad)

    lats_rayon = lat + (dy_rayon / METRES_PAR_DEGRE_LAT)
    lons_rayon = (lon_360 + (dx_rayon / (METRES_PAR_DEGRE_LAT * cos_lat))) % 360.0

    rows = np.round((90.0 - lats_rayon) * pixels_par_degre).astype(int)
    cols = np.round(lons_rayon * pixels_par_degre).astype(int) % n_cols

    valides = (rows >= 0) & (rows < n_lignes)
    if not np.any(valides):
      horizon_360[azimut_deg] = 0.0
      continue

    z_obstacles = grille_brut[rows[valides], cols[valides]].astype(float) * 0.5
    angles = np.degrees(
        np.arctan2(
            z_obstacles - z_site - courbure[valides], distances[valides]
        )
    )
    horizon_360[azimut_deg] = round(float(np.max(angles)), 2)

  return {
      "altitude_site_m": round(z_site, 1),
      "altitude_site_km": round(z_site / 1000.0, 3),
      "pente_locale_deg": pente_deg,
      "horizon_360": horizon_360,
  }

def filtrer_visibilite_avec_relief(df_brut, horizon_360):
  """Compare l'élévation du Soleil et de la Terre à la hauteur réelle des montagnes

  dans l'azimut exact où ils se trouvent à chaque instant.
  """
  df_brut["Relief_Soleil_deg"] = [
      horizon_360[int(round(az)) % 360] for az in df_brut["Soleil_Azimut_deg"]
  ]
  df_brut["Relief_Terre_deg"] = [
      horizon_360[int(round(az)) % 360] for az in df_brut["Terre_Azimut_deg"]
  ]

  df_brut["Soleil_OK"] = (
      df_brut["Soleil_Elevation_deg"] > df_brut["Relief_Soleil_deg"]
  )
  df_brut["Terre_OK"] = (
      df_brut["Terre_Elevation_deg"] > df_brut["Relief_Terre_deg"]
  )
  df_brut["Les_Deux_OK"] = df_brut["Soleil_OK"] & df_brut["Terre_OK"]

  return df_brut

if __name__ == "__main__":
  # Test sur Apollo 11 (Mer de la Tranquillité)
  res = calculer_masque_horizon_lola(
      "data/ldem_16.img", lat=-43.600, lon=-11.360, pixels_par_degre=16
  )
  print(res["altitude_site_m"], "m | Pente :", res["pente_locale_deg"], "° | Horizon max :", max(res["horizon_360"].values()), "°")