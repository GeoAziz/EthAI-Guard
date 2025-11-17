# UX Descriptions — Decision Analysis Preview Screen

## Purpose
Provide a streamlined interface to submit feature inputs, trigger ethical evaluation, and interpret risk + explanation outputs with minimal cognitive load.

## Screen Name
"Decision Analysis Preview"
Route suggestion: `/decision-analysis` (Next.js App Router page)

## Layout Structure
| Region | Component | Purpose |
|--------|-----------|---------|
| Header | Title + brief tagline | Context setting |
| Left Column | Input Form (FeatureInputList) | Data entry |
| Right Column (initially placeholder) | Results Panel | Displays evaluation outcome |
| Footer | Small latency + request id note | Transparency & traceability |

## Interaction Flow
1. User enters features (dynamic list of key/value pairs; arrays allowed via comma separation).
2. Optional: selects sensitive attribute name.
3. Clicks "Evaluate" button.
4. Button transitions to loading state (spinner + "Evaluating...").
5. Result panel fades in (Framer Motion) with risk gauge slide animation.
6. Explanation accordion collapsed by default; user expands to view details.
7. If high risk: panel accent border in red + callout message.

## Components
### FeatureInputList
- Rows: feature name, value input.
- Add Feature button: inserts empty row.
- Remove row icon (trash) each line.
- Value parsing: comma-separated numbers -> array.

### RiskGauge
- Radial or horizontal bar (simpler: horizontal progress with color gradient).
- Colors: green (0–33), amber (34–66), red (67–100).
- Animated from 0 to final score over 600ms.

### ExplanationAccordion
- Summary line always visible.
- Expand to view itemized reasons + recommended action.
- If no reasons: neutral message.

### Metadata Panel
- Shows request_id, model_id, user_id, timestamp.
- Lightweight monospace styling.

## Visual Style
- Neutral dark background (already defined global).
- Accent colors: semantic risk colors.
- Minimal borders; rely on spacing & subtle shadows.

## States
| State | Representation |
|-------|----------------|
| Idle | Empty results panel with placeholder text |
| Loading | Spinner + disabled form inputs |
| Success | Populated risk gauge + explanation |
| Error | Red alert box with error message and retry button |

## Animations
| Element | Animation |
|---------|-----------|
| Results Panel | Initial fade-in + slight upward translate |
| RiskGauge fill | Framer Motion width tween |
| ExplanationAccordion | Height auto expansion |
| Error Alert | Shake subtle (optional) |

## Accessibility
- All form inputs labeled.
- Button has `aria-busy` during evaluation.
- Risk colors accompanied by text labels (Low/Medium/High).
- Accordion uses semantic heading + region.

## Error Handling UX
| Error | Message | Action |
|-------|---------|--------|
| validation_failed | "Validation error — check required fields." | Highlight missing inputs |
| evaluation_failed | "Internal evaluation error — retry later." | Retry button |
| network | "Network issue — check connectivity." | Retry automatically after 5s |

## High Risk Emphasis
- Add banner: "High Risk Decision — Manual Review Recommended"
- Provide CTA: (Future) "Open Review Workflow"

## Performance Feedback
- Show latency (time from click → response) under results panel: "Evaluation completed in 12ms".
- Helps users trust responsiveness.

## Future Enhancements
| Feature | UX Addition |
|---------|------------|
| Comparison mode | Side-by-side risk gauges |
| Bulk upload | Table + batch evaluation results list |
| Historical chart | Sparkline risk trend per model_id |
| Export | Download JSON button |

---
**Status:** Implemented Day 17 (design spec for initial slice)
