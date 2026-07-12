// AI-Driven Personalization Rule Engine for Aura Health

const CONTENT_LIBRARY = {
  PCOS: {
    diet: [
      { title: "Inositol-Rich Breakfast", rationale: "Helps regulate insulin sensitivity and reduce androgen levels." },
      { title: "Spearmint Tea (2 cups)", rationale: "Has anti-androgenic properties that can help reduce mild hirsutism." }
    ],
    exercise: [
      { title: "Strength Training (25m)", rationale: "Building muscle improves insulin sensitivity and metabolic health." },
      { title: "Low-Intensity Cardio", rationale: "Reduces stress hormones which can trigger PCOS symptoms." }
    ]
  },
  endometriosis: {
    pain: [
      { title: "Warm Compression / Castor Oil Pack", rationale: "Helps increase pelvic blood flow and alleviate muscle cramping." },
      { title: "Magnesium Glycinate Supplement", rationale: "Acts as a natural muscle relaxant to soothe uterine contractions." }
    ],
    exercise: [
      { title: "Gentle Pelvic Stretches", rationale: "Helps release tension in the pelvic floor and reduce deep tissue pain." }
    ]
  },
  pmdd: {
    mood: [
      { title: "Gratitude Journaling", rationale: "Aids in cognitive framing during intense luteal swings." },
      { title: "Saffron extract (30mg)", rationale: "Clinically shown to help reduce emotional symptoms of PMDD/PMS." }
    ],
    sleep: [
      { title: "Wind-down routine (No screens 1hr)", rationale: "Improves melatonin release to mitigate luteal insomnia." }
    ]
  },
  general: {
    menstrual: [
      { title: "Hydration check (3 liters)", category: "diet", rationale: "Crucial to flush bloating and ease pelvic congestion." },
      { title: "Iron-Rich Lunch", category: "diet", rationale: "Replenishes iron stores lost during menstruation (spinach, lentils)." }
    ],
    follicular: [
      { title: "High-Intensity Workout", category: "exercise", rationale: "Estrogen levels are rising, boosting energy, stamina, and recovery capacity." },
      { title: "New Skill / Project Planning", category: "mindset", rationale: "High estrogen and dopamine levels enhance cognitive focus and creativity." }
    ],
    ovulatory: [
      { title: "Social / High-Engagement Meetings", category: "mindset", rationale: "Peak estrogen and testosterone boost communication and confidence." },
      { title: "Core Stability Training", category: "exercise", rationale: "Estrogen spikes can increase joint laxity; focus on control." }
    ],
    luteal: [
      { title: "Gentle Walking / Yoga", category: "exercise", rationale: "Progesterone dominates; choose moderate exercise to support mood." },
      { title: "Complex Carbohydrates Dinner", category: "diet", rationale: "Supports serotonin production to buffer PMS mood swings." }
    ]
  }
};

/**
 * Determine the current cycle phase based on the start date and day count.
 * Typically:
 * Menstrual: Days 1-5
 * Follicular: Days 6-12
 * Ovulatory: Days 13-16
 * Luteal: Days 17-28 (or end of cycle)
 */
export const getCycleDayAndPhase = (startDate, today = new Date()) => {
  if (!startDate) return { day: 1, phase: 'follicular' };
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);
  
  const diffTime = current - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  // Positive modulo so a future-dated start never yields a zero/negative day
  const day = (((diffDays - 1) % 28) + 28) % 28 + 1; // Normalize to 28-day cycle for simulation
  
  let phase = 'follicular';
  if (day <= 5) phase = 'menstrual';
  else if (day <= 12) phase = 'follicular';
  else if (day <= 16) phase = 'ovulatory';
  else phase = 'luteal';
  
  return { day, phase };
};

/**
 * Run rule engine to generate routine items and check for red flags.
 */
export const generateDailyRoutine = (user, cycle, recentLogs = []) => {
  const items = [];
  let redFlagAlert = false;
  let redFlagMessage = '';

  // 1. Red Flag Detection
  // Criteria: Pain >= 8 for 3+ consecutive calendar days, or reported fainting/heavy bleeding
  const painLogsByDate = {};
  recentLogs.forEach(log => {
    if (log.type === 'symptom' && log.value?.symptom === 'pain') {
      const dateStr = new Date(log.date).toISOString().split('T')[0];
      const intensity = Number(log.value?.intensity) || 0;
      if (!painLogsByDate[dateStr] || intensity > painLogsByDate[dateStr]) {
        painLogsByDate[dateStr] = intensity;
      }
    }
  });

  const sortedDates = Object.keys(painLogsByDate).sort((a, b) => new Date(b) - new Date(a));
  let consecutiveHighPain = false;
  for (let i = 0; i <= sortedDates.length - 3; i++) {
    const d1 = new Date(sortedDates[i]);
    const d2 = new Date(sortedDates[i+1]);
    const d3 = new Date(sortedDates[i+2]);
    
    const diff1 = (d1 - d2) / (1000 * 60 * 60 * 24);
    const diff2 = (d2 - d3) / (1000 * 60 * 60 * 24);
    
    if (diff1 === 1 && diff2 === 1 && painLogsByDate[sortedDates[i]] >= 8 && painLogsByDate[sortedDates[i+1]] >= 8 && painLogsByDate[sortedDates[i+2]] >= 8) {
      consecutiveHighPain = true;
      break;
    }
  }

  const hasCriticalSymptoms = recentLogs.some(log => 
    log.type === 'symptom' && 
    (log.value?.symptom === 'fainting' || log.value?.symptom === 'excessive_bleeding')
  );

  if (consecutiveHighPain || hasCriticalSymptoms) {
    redFlagAlert = true;
    redFlagMessage = consecutiveHighPain 
      ? "You have reported severe pain (8+/10) for 3 consecutive days. Please consider contacting your doctor." 
      : "You logged critical symptoms (fainting/excessive bleeding). We highly recommend consulting a healthcare provider immediately.";
  }

  // 2. Determine cycle phase
  const { day, phase } = getCycleDayAndPhase(cycle?.startDate);

  // 2.5 Wearable Telemetry Adaptations
  const latestTelemetry = user.telemetryLogs && user.telemetryLogs.length > 0
    ? user.telemetryLogs[user.telemetryLogs.length - 1]
    : null;

  if (latestTelemetry) {
    if (latestTelemetry.sleepHours && latestTelemetry.sleepHours < 6.5) {
      items.push({
        id: 'telemetry-restorative-sleep',
        title: `Restorative Rest Session (Low Sleep: ${latestTelemetry.sleepHours}h)`,
        category: 'exercise',
        completed: false,
        rationale: `Wearable synced sleep is under 6.5 hours. Prioritize a 20-minute restorative yoga or power nap instead of intense cardio.`
      });
    }
    if (latestTelemetry.hrv && latestTelemetry.hrv < 45) {
      items.push({
        id: 'telemetry-stress-relief',
        title: `CalmPulse Vagal Breathing (Low HRV: ${latestTelemetry.hrv}ms)`,
        category: 'mindset',
        completed: false,
        rationale: `Synced Heart Rate Variability is low, indicating sympathetic dominance. Perform 5 minutes of guided 4-4-4-4 breathing.`
      });
    }
  }

  // 3. Add General Cycle Phase Routine Items
  const phaseContent = CONTENT_LIBRARY.general[phase] || [];
  phaseContent.forEach((item, index) => {
    items.push({
      id: `gen-${phase}-${index}`,
      title: item.title,
      category: item.category || 'diet',
      completed: false,
      rationale: item.rationale
    });
  });

  // 4. Add Condition-Tailored Routine Items
  if (user.conditionTags && user.conditionTags.length > 0) {
    user.conditionTags.forEach(tag => {
      const conditionContent = CONTENT_LIBRARY[tag];
      if (conditionContent) {
        // Sample one item from each category of the condition
        Object.keys(conditionContent).forEach((cat, index) => {
          const list = conditionContent[cat];
          const selected = list[Math.floor(Math.random() * list.length)];
          if (selected) {
            items.push({
              id: `cond-${tag}-${cat}-${index}`,
              title: selected.title,
              category: cat,
              completed: false,
              rationale: selected.rationale
            });
          }
        });
      }
    });
  }

  // 5. Add default hydration / basic routines
  items.push({
    id: 'def-water',
    title: 'Track daily water intake',
    category: 'diet',
    completed: false,
    rationale: 'Adequate hydration stabilizes hormones and relieves digestion issues.'
  });

  // Generate recommendations
  const recommendations = [];
  if (redFlagAlert) {
    recommendations.push({
      title: "Escalate to Clinician",
      description: redFlagMessage,
      actionable: true,
      type: "warning"
    });
  } else {
    // Standard recommendations
    if (user.conditionTags && user.conditionTags.includes('pcos')) {
      recommendations.push({
        title: "Focus on Complex Carbohydrates",
        description: "Choose brown rice, oats, and quinoa. They keep blood sugar levels stable, reducing PCOS cravings and androgen spikes.",
        type: "info"
      });
    }
    if (phase === 'luteal') {
      recommendations.push({
        title: "Reduce Sodium & Caffeine",
        description: "Cutting down on salt and coffee during the luteal phase helps decrease water retention, breast tenderness, and anxiety.",
        type: "info"
      });
    } else if (phase === 'menstrual') {
      recommendations.push({
        title: "Prioritize Deep Sleep & Rest",
        description: "Your estrogen is low, which might cause fatigue. Aim for 8 hours of sleep and use warm compresses for pelvic comfort.",
        type: "info"
      });
    } else {
      recommendations.push({
        title: "Optimal Energy Window",
        description: "Estrogen is elevated! This is a great time to tackle complex tasks and schedule intense cardiorespiratory training.",
        type: "info"
      });
    }
  }

  return {
    items,
    recommendations,
    redFlagAlert,
    redFlagMessage,
    phase,
    cycleDay: day
  };
};
