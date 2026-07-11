# Timeline Mechanics: How It Works under the Hood

This document outlines the end-to-end logical architecture of the **Interactive Health Timeline** module inside the Aura Health platform.

---

## 1. Session Merging Logic

The timeline aggregates and displays data from two distinct state origins:
1. **Historical Database Log Array**: Telemetry entries stored in the MongoDB `Log` collection for past days.
2. **Today's Active Session States**: Real-time inputs tracked inside the patient's active state variables before they are finalized or batched to the server.

### Implementation Block:
```javascript
const todayLogs = [];
if (dashboardData && dashboardData.logs) {
  const logs = dashboardData.logs;
  if (logs.hydration > 0) {
    todayLogs.push({
      type: 'hydration',
      date: new Date(),
      title: "Today's Hydration (Active Session)",
      desc: `Drank: ${logs.hydration} ml of water logged in your active session.`
    });
  }
  // Similar logic merges logs.exercise and logs.pain...
}
const mergedTimeline = [...todayLogs, ...timelineEvents];
```

---

## 2. Interactive SVG Charts Scaling

To prevent layout shifts and display trends without loading heavy charting libraries, the timeline uses pure SVG coordinate math:

### Mathematical Scaling:
- **Hydration (Water Intake)**: Scaled out of **3,000ml** (max height = `120px` inside a `180px` viewBox).
  $$\text{Height (px)} = \frac{\text{Logged Water (ml)}}{3000} \times 120$$
- **Sleep Duration**: Scaled out of **10 hours**.
  $$\text{Height (px)} = \frac{\text{Hours Slept}}{10} \times 120$$

### SVG Structure:
- Grid lines are drawn using `<line>` tags with `strokeDasharray="3"`.
- Each data point is represented as a `<rect>` bar.
- On mouse enter (`onMouseEnter`), the local hover state is updated to show interactive `<g>` tooltips with precise values.

---

## 3. Cohort-Tailored AI Guidelines

Aura evaluates the user's date of birth and names to classify them into biological cohorts, displaying specific warnings:

| Cohort | Age/Condition Criteria | Target AI Recommendation |
| :--- | :--- | :--- |
| **Teen Profile** | Age < 18 | Advises on estrogen baseline stabilization and iron tracking. |
| **Postpartum Care** | Name contains "Priya" / "Sen" | Suggests sleep fragmentation support and lactation hydration (+400ml). |
| **Working Professional** | Age 18–33 | Targets stress cortisol management and afternoon caffeine windows. |
| **Menopause Transition** | Age > 45 | Focuses on vasomotor hot flashes and DEXA bone density scan prompts. |

---

*Compliant with provisions of India's Digital Personal Data Protection (DPDP) Act.*
