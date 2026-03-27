"use client";

import { useEffect, useMemo, useState } from "react";

const ROTATING_SIGNALS = [
  "Highlights sync to your account automatically.",
  "Session state follows you from phone to desktop.",
  "Bookmarks stay pinned even after refresh.",
  "Notes are stored and searchable in one place.",
];

const LIVE_METRICS = [
  { label: "Books opened today", target: 1824, suffix: "+" },
  { label: "Active reading streaks", target: 612, suffix: "" },
  { label: "Notes captured", target: 9370, suffix: "+" },
] as const;

const METRIC_ANIMATION_MS = 1200;
const SIGNAL_ROTATION_MS = 3600;
const CLOCK_REFRESH_MS = 30000;

export function LandingDynamics() {
  const [activeSignal, setActiveSignal] = useState(0);
  const [clock, setClock] = useState<Date>(() => new Date());
  const [metricValues, setMetricValues] = useState<number[]>(() => LIVE_METRICS.map(() => 0));

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), CLOCK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSignal((current) => (current + 1) % ROTATING_SIGNALS.length);
    }, SIGNAL_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let frame = 0;
    const start = window.performance.now();

    const update = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / METRIC_ANIMATION_MS, 1);

      setMetricValues(LIVE_METRICS.map((metric) => Math.round(metric.target * progress)));

      if (progress < 1) {
        frame = window.requestAnimationFrame(update);
      }
    };

    frame = window.requestAnimationFrame(update);

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const localTimeLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(clock);
  }, [clock]);

  const dayPartLabel = useMemo(() => {
    const hour = clock.getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  }, [clock]);

  const metricFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  return (
    <aside className="landing-livePanel" aria-live="polite">
      <p className="landing-liveEyebrow">Live reading pulse</p>
      <p className="landing-liveTime">
        {dayPartLabel} <span>{localTimeLabel}</span>
      </p>

      <div className="landing-liveMessageWrap">
        <p className="landing-liveMessage">{ROTATING_SIGNALS[activeSignal]}</p>
      </div>

      <div className="landing-liveDots" role="tablist" aria-label="Reading signal slides">
        {ROTATING_SIGNALS.map((signal, index) => (
          <span
            key={signal}
            className={`landing-liveDot ${index === activeSignal ? "is-active" : ""}`}
            role="presentation"
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="landing-metrics" aria-label="Live metrics">
        {LIVE_METRICS.map((metric, index) => (
          <div key={metric.label} className="landing-metricItem">
            <span className="landing-metricValue">
              {metricFormatter.format(metricValues[index])}
              {metric.suffix}
            </span>
            <span className="landing-metricLabel">{metric.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
