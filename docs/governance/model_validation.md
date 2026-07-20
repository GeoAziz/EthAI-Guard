# Model validation and tests

Overview
The `ai_core` service includes lightweight model validation and safety checks to ensure analyses are reproducible and fail gracefully on malformed input.

What we did
- Input validation: `ai_core` validates the incoming dataset mapping shape and enforces equal column lengths and a MAX_ROWS safety cap (default 100000).
- Unit tests: added pytest tests covering malformed payloads, mismatched column lengths, zero-variance features, and dataset size limits.
- Plotting fallback: when SHAP visual assets cannot be produced, ai_core falls back to producing a base64 PNG plot so the frontend can still display helpful visuals.

Recommended expansions
- Add reproducibility tests that train the same model multiple times and assert stable summary statistics (within tolerances).
- Add mixed-type coercion tests (e.g., string categorical columns that should be encoded) and missing-value handling tests.
- Add synthetic fuzz tests for malformed JSON shapes to ensure stable error codes.

