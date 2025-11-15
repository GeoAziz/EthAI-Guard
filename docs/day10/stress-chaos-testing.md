# Stress and Chaos Testing Plan (Day 10)

Purpose: Validate failure modes, recovery behavior, and data integrity under adverse conditions.

Stress tests (push until it breaks)
- 1000 /analyze requests in 30 seconds
- Model reload (switch version) during heavy traffic
- MongoDB restart mid-operation
- Network delay injection to ai_core (200–500ms)
- Backend container restart loop (every 1–2 minutes)
- Burst of invalid login attempts (rate limiter validation)

Observations to capture
- Onset of 5xx errors: RPS level and error profiles
- ai_core stability: crash, backoff, or graceful degradation
- Queuing/timeout behavior and user impact
- Refresh token safety: no reuse or corruption during chaos
- Log readability: are JSON logs intact, correlated, and useful?

Chaos experiments (resilience and integrity)
- Kill ai_core mid-analysis
  - Expected: backend returns 5xx/timeout with clear error, no corrupted report in DB
- Kill MongoDB (or drop connections)
  - Expected: backend degrades gracefully (read-only where possible), logs clear errors
- Drop packets between backend ↔ ai_core (tc/netem)
  - Expected: latency increases, alerts trigger, no data corruption
- Random container restarts (every 3 minutes)
  - Expected: service recovers, requests eventually succeed, no cascading failures

Pass/Fail criteria (initial)
- No permanent data corruption (reports/datasets)
- Services return to healthy state without manual intervention
- Error rates drop back to baseline after chaos ends
- Logs/metrics provide clear root-cause visibility

Runbook
1) Announce window and ensure non-prod
2) Enable increased logging retention for test period
3) Run one stress scenario at a time; collect artifacts per scenario
4) Run chaos experiments with 5–10 minute stabilization windows between
5) Produce a short post-mortem per failing scenario with recommended fixes
