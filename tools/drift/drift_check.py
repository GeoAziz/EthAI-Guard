#!/usr/bin/env python3
import argparse
import json
import pandas as pd
from psi import compute_psi, compute_kl


def main():
    ap = argparse.ArgumentParser(description="Compute drift metrics (PSI/KL) between baseline and current CSVs.")
    ap.add_argument("--baseline", required=True, help="Path to baseline CSV")
    ap.add_argument("--current", required=True, help="Path to current CSV")
    ap.add_argument("--columns", required=True, help="Comma-separated list of numeric columns to compare")
    ap.add_argument("--output", default="-", help="Output path for JSON results (default stdout)")
    args = ap.parse_args()

    df_b = pd.read_csv(args.baseline)
    df_c = pd.read_csv(args.current)
    cols = [c.strip() for c in args.columns.split(",") if c.strip()]

    results = {}
    for col in cols:
        if col not in df_b.columns or col not in df_c.columns:
            results[col] = {"error": "missing column"}
            continue
        b = df_b[col].dropna().values
        c = df_c[col].dropna().values
        if b.size == 0 or c.size == 0:
            results[col] = {"error": "empty data"}
            continue
        psi = compute_psi(b, c, bins=10)
        kl = compute_kl(b, c, bins=20)
        severity = "none"
        if psi >= 0.25:
            severity = "high"
        elif psi >= 0.1:
            severity = "moderate"
        results[col] = {"psi": psi, "kl": kl, "severity": severity}

    out = json.dumps({"results": results}, indent=2)
    if args.output == "-":
        print(out)
    else:
        with open(args.output, "w") as f:
            f.write(out)


if __name__ == "__main__":
    main()
