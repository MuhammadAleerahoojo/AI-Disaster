"""
Generates clearly-labeled SYNTHETIC training datasets for the flood and fire
risk models.

IMPORTANT / HONESTY NOTE:
This project does not ship with a real, historical, ground-truth disaster
dataset (those are not freely redistributable / available offline in this
environment). To keep the ML pipeline fully runnable end-to-end, we generate
a synthetic dataset using domain-informed heuristics (e.g. higher rainfall +
poor drainage + high soil saturation => higher flood risk; higher temperature
+ low humidity + high wind + low rainfall => higher fire risk), plus random
noise. This is NOT real-world historical data and must never be presented as
such. Swap this script's output for a real dataset (e.g. a Kaggle flood/fire
dataset) when one becomes available -- the training pipeline in
ml/training/train_models.py does not care where the CSV came from as long as
the column names match.
"""
import numpy as np
import pandas as pd
import os

RNG = np.random.default_rng(42)
N = 20000

OUT_DIR = os.path.join(os.path.dirname(__file__))


def generate_flood_dataset(n=N) -> pd.DataFrame:
    rainfall_mm = RNG.gamma(shape=2.0, scale=25, size=n)  # 0 - ~250mm
    temperature_c = RNG.normal(28, 6, n).clip(-5, 48)
    humidity_pct = RNG.normal(65, 15, n).clip(10, 100)
    wind_speed_kmh = RNG.gamma(2.0, 6, n).clip(0, 90)
    pressure_hpa = RNG.normal(1008, 8, n).clip(970, 1030)
    elevation_m = RNG.gamma(2.0, 60, n).clip(0, 2500)
    soil_saturation_pct = RNG.normal(55, 20, n).clip(0, 100)

    # Domain-informed synthetic risk score (0-1)
    score = (
        0.42 * (rainfall_mm / 250)
        + 0.20 * (soil_saturation_pct / 100)
        + 0.12 * (humidity_pct / 100)
        + 0.10 * (1 - np.clip(elevation_m, 0, 500) / 500)
        + 0.08 * (1013 - pressure_hpa).clip(0, None) / 40
        + 0.08 * (wind_speed_kmh / 90)
    )
    noise = RNG.normal(0, 0.025, n)
    score = np.clip(score + noise, 0, 1)
    flood_occurred = (score > 0.55).astype(int)

    df = pd.DataFrame({
        "rainfall_mm": rainfall_mm,
        "temperature_c": temperature_c,
        "humidity_pct": humidity_pct,
        "wind_speed_kmh": wind_speed_kmh,
        "pressure_hpa": pressure_hpa,
        "elevation_m": elevation_m,
        "soil_saturation_pct": soil_saturation_pct,
        "flood_risk_score": score,
        "flood_occurred": flood_occurred,
    })
    return df


def generate_fire_dataset(n=N) -> pd.DataFrame:
    temperature_c = RNG.normal(30, 7, n).clip(-5, 50)
    humidity_pct = RNG.normal(45, 20, n).clip(5, 100)
    wind_speed_kmh = RNG.gamma(2.0, 8, n).clip(0, 100)
    rainfall_mm = RNG.exponential(8, n).clip(0, 200)
    vegetation_index = RNG.normal(0.5, 0.2, n).clip(0, 1)  # NDVI-like, higher = more dry fuel available

    score = (
        0.28 * (temperature_c / 50)
        + 0.24 * (1 - humidity_pct / 100)
        + 0.20 * (wind_speed_kmh / 100)
        + 0.18 * (1 - np.clip(rainfall_mm, 0, 60) / 60)
        + 0.10 * vegetation_index
    )
    noise = RNG.normal(0, 0.025, n)
    score = np.clip(score + noise, 0, 1)
    fire_occurred = (score > 0.55).astype(int)

    df = pd.DataFrame({
        "temperature_c": temperature_c,
        "humidity_pct": humidity_pct,
        "wind_speed_kmh": wind_speed_kmh,
        "rainfall_mm": rainfall_mm,
        "vegetation_index": vegetation_index,
        "fire_risk_score": score,
        "fire_occurred": fire_occurred,
    })
    return df


if __name__ == "__main__":
    flood_df = generate_flood_dataset()
    fire_df = generate_fire_dataset()
    flood_df.to_csv(os.path.join(OUT_DIR, "flood_dataset.csv"), index=False)
    fire_df.to_csv(os.path.join(OUT_DIR, "fire_dataset.csv"), index=False)
    print(f"Wrote flood_dataset.csv ({len(flood_df)} rows) and fire_dataset.csv ({len(fire_df)} rows)")
