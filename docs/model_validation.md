# Model validation and tests

This document will capture the model validation strategy used in ai_core including unit tests for:
- missing target/malformed payloads
- mixed-type columns and coercion rules
- SHAP stability checks (repeatability)
- limits for dataset sizes and graceful failure modes
