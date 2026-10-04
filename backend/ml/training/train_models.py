"""
Trains the flood-risk and fire-risk regression models and saves them with
joblib so the FastAPI prediction endpoints can load them at runtime.

Run:
    python ml/training/train_models.py
"""
import os
import sys
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

DATASET_DIR = os.path.join(BASE_DIR, "ml", "datasets")
MODEL_DIR = os.path.join(BASE_DIR, "ml", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

FLOOD_FEATURES = [
    "rainfall_mm", "temperature_c", "humidity_pct", "wind_speed_kmh",
    "pressure_hpa", "elevation_m", "soil_saturation_pct",
]
FIRE_FEATURES = [
    "temperature_c", "humidity_pct", "wind_speed_kmh", "rainfall_mm", "vegetation_index",
]


def ensure_datasets():
    flood_path = os.path.join(DATASET_DIR, "flood_dataset.csv")
    fire_path = os.path.join(DATASET_DIR, "fire_dataset.csv")
    if not (os.path.exists(flood_path) and os.path.exists(fire_path)):
        from ml.datasets.generate_datasets import generate_flood_dataset, generate_fire_dataset
        generate_flood_dataset().to_csv(flood_path, index=False)
        generate_fire_dataset().to_csv(fire_path, index=False)
    return flood_path, fire_path


def train_flood_model(csv_path):
    df = pd.read_csv(csv_path)
    X = df[FLOOD_FEATURES]
    y = df["flood_risk_score"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=500, max_depth=16, min_samples_leaf=3, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"[flood] MAE={mae:.4f}  R2={r2:.4f}")

    joblib.dump({"model": model, "features": FLOOD_FEATURES}, os.path.join(MODEL_DIR, "flood_model.joblib"))
    return mae, r2


def train_fire_model(csv_path):
    df = pd.read_csv(csv_path)
    X = df[FIRE_FEATURES]
    y = df["fire_risk_score"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=500, max_depth=16, min_samples_leaf=3, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"[fire] MAE={mae:.4f}  R2={r2:.4f}")

    joblib.dump({"model": model, "features": FIRE_FEATURES}, os.path.join(MODEL_DIR, "fire_model.joblib"))
    return mae, r2


if __name__ == "__main__":
    flood_csv, fire_csv = ensure_datasets()
    train_flood_model(flood_csv)
    train_fire_model(fire_csv)
    print("Models saved to", MODEL_DIR)
