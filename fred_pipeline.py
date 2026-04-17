"""
FRED macro data pipeline.

Fetches FEDFUNDS, CPIAUCSL, UNRATE over 5 years via FRED REST API,
computes 12-month rolling correlations, and exports to data/macro_data.json.
"""

import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import requests

FRED_API_BASE = "https://api.stlouisfed.org/fred/series/observations"
SERIES = {
    "FEDFUNDS": "Federal Funds Effective Rate (%)",
    "CPIAUCSL": "CPI All Urban Consumers (Index 1982-84=100)",
    "UNRATE":   "Unemployment Rate (%)",
}
ROLLING_WINDOW = 12  # months


def fetch_series(series_id: str, api_key: str, start: str, end: str) -> pd.Series:
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "observation_start": start,
        "observation_end": end,
        "frequency": "m",          # monthly
    }
    resp = requests.get(FRED_API_BASE, params=params, timeout=30)
    resp.raise_for_status()
    observations = resp.json().get("observations", [])
    data = {
        obs["date"]: float(obs["value"])
        for obs in observations
        if obs["value"] != "."
    }
    return pd.Series(data, name=series_id, dtype=float)


def rolling_correlations(df: pd.DataFrame, window: int) -> dict:
    pairs = [
        ("FEDFUNDS", "CPIAUCSL"),
        ("FEDFUNDS", "UNRATE"),
        ("CPIAUCSL", "UNRATE"),
    ]
    result = {}
    for a, b in pairs:
        key = f"{a}_vs_{b}"
        roll_corr = df[a].rolling(window).corr(df[b]).replace([float('inf'), float('-inf')], float('nan')).dropna().round(4)
        result[key] = {ts.date().isoformat(): val for ts, val in roll_corr.items()}
    return result


def main() -> None:
    api_key = os.environ.get("FRED_API_KEY")
    if not api_key:
        sys.exit("Error: FRED_API_KEY environment variable is not set.")

    end_date   = date.today()
    start_date = end_date - timedelta(days=5 * 365)
    start_str  = start_date.isoformat()
    end_str    = end_date.isoformat()

    print(f"Fetching data from {start_str} to {end_str} ...")

    series_data: dict[str, pd.Series] = {}
    for sid in SERIES:
        print(f"  {sid} ...", end=" ", flush=True)
        series_data[sid] = fetch_series(sid, api_key, start_str, end_str)
        print(f"{len(series_data[sid])} observations")

    df = pd.DataFrame(series_data)
    df.index = pd.to_datetime(df.index)
    df.sort_index(inplace=True)

    print(f"\nComputing {ROLLING_WINDOW}-month rolling correlations ...")
    corr_dict = rolling_correlations(df, ROLLING_WINDOW)

    output = {
        "metadata": {
            "series": {sid: desc for sid, desc in SERIES.items()},
            "start_date": start_str,
            "end_date": end_str,
            "rolling_window_months": ROLLING_WINDOW,
            "generated_at": date.today().isoformat(),
        },
        "series": {
            sid: {
                (ts.date().isoformat() if hasattr(ts, "date") else str(ts)): val
                for ts, val in s.items()
                if pd.notna(val)
            }
            for sid, s in series_data.items()
        },
        "rolling_correlations": corr_dict,
    }

    out_path = Path("data/macro_data.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nExported to {out_path}  ({out_path.stat().st_size / 1024:.1f} KB)")

    # Quick summary
    print("\n--- Summary ---")
    for sid in SERIES:
        s = series_data[sid]
        print(f"  {sid}: {len(s)} months, latest={s.iloc[-1]:.2f} ({s.index[-1]})")
    print("\n  Rolling correlations (latest available):")
    for pair, values in corr_dict.items():
        if values:
            last_date = max(values)
            print(f"    {pair}: {values[last_date]:+.4f}  (as of {last_date})")


if __name__ == "__main__":
    main()
