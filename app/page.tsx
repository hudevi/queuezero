"use client";
import { useState, useEffect } from "react";

// Helper to get current timestamp (milliseconds since epoch)
function now() {
  return Date.now();
}

// Helper: determines the color class for average wait time
function getWaitColor(wait: number) {
  if (wait < 10) return "text-green-600";
  if (wait <= 19) return "text-yellow-500";
  return "text-red-600";
}

// Helper: compute rounded average wait from array of waits
function getAverage(waits: number[]) {
  if (waits.length === 0) return 0;
  return Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
}

// Helper: determines confidence label and color based on number of submissions
function getConfidence(waits: number[]) {
  // - Low: 1 submission
  // - Medium: 2-3 submissions
  // - High: 4+ submissions
  if (waits.length === 1) return { label: "Low confidence", color: "text-slate-400" };
  if (waits.length <= 3) return { label: "Medium confidence", color: "text-yellow-500" };
  return { label: "High confidence", color: "text-green-500" };
}

// Helper: human-friendly last updated time text
function getLastUpdatedText(lastUpdated: number) {
  const mins = Math.floor((now() - lastUpdated) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins === 1) return "Updated 1 minute ago";
  return `Updated ${mins} minutes ago`;
}

// Helper: busy level logic (Quiet, Moderate, Busy) based on average wait
function getBusyLevel(avgWait: number) {
  if (avgWait < 10) return { label: "Quiet", color: "text-green-600" };
  if (avgWait <= 19) return { label: "Moderate", color: "text-yellow-500" };
  return { label: "Busy", color: "text-red-600" };
}

// The localStorage key for this app's location data
const STORAGE_KEY = "queuezero_locations";

// Initial hardcoded data for locations
const starter = now();
const initialLocations = [
  {
    name: "Coffee Shop",
    waits: [5],
    lastUpdated: starter, // Initialized to now
  },
  {
    name: "Campus Office",
    waits: [18],
    lastUpdated: starter,
  },
  {
    name: "Gym",
    waits: [25],
    lastUpdated: starter,
  },
];

export default function Home() {
  // State: locations (arrays of waits + last updated timestamp)
  const [locations, setLocations] = useState(initialLocations);

  // Form state: selected location index and wait value
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [waitValue, setWaitValue] = useState(getAverage(initialLocations[0].waits));

  // Load location data from localStorage (if present) on first render
  useEffect(() => {
    // Try to load from localStorage
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        const data = JSON.parse(raw);
        // Only accept correct data shape (simple sanity check)
        if (
          Array.isArray(data) &&
          data.every(
            loc =>
              typeof loc.name === "string" &&
              Array.isArray(loc.waits) &&
              typeof loc.lastUpdated === "number"
          )
        ) {
          setLocations(data);
          setSelectedIdx(0);
          setWaitValue(getAverage(data[0].waits));
        }
      } catch (err) {
        // If parse error, just use default
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to localStorage whenever locations state changes
  useEffect(() => {
    // Simple guard for SSR
    if (typeof window !== "undefined" && locations && locations.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    }
  }, [locations]);

  // On dropdown change: update selected location and current input value
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setSelectedIdx(idx);
    setWaitValue(getAverage(locations[idx].waits));
  };

  // Handle wait time input changes
  const handleWaitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWaitValue(Number(e.target.value));
  };

  // On form submit, push new wait time into array and update lastUpdated
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocations(prev =>
      prev.map((loc, idx) =>
        idx === selectedIdx
          ? {
              ...loc,
              waits: [...loc.waits, Number(waitValue)],
              lastUpdated: now(), // Update timestamp to now
            }
          : loc
      )
    );
    // Optionally, update input value to the average again for feedback:
    // setWaitValue(getAverage([...locations[selectedIdx].waits, Number(waitValue)]));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-zinc-800 dark:via-black dark:to-zinc-900 flex flex-col items-center justify-start font-sans">
      {/* App Header */}
      <header className="w-full max-w-2xl mx-auto pt-16 pb-6 px-6 flex flex-col items-center text-center space-y-3">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight drop-shadow-sm">
          QueueZero
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 font-medium">
          See how long the wait is before you go
        </p>
      </header>

      {/* Location Cards */}
      <section className="w-full max-w-2xl mx-auto px-6 flex flex-col gap-6 mb-12">
        {locations.map((loc, idx) => {
          const avgWait = getAverage(loc.waits);
          const { label: confLabel, color: confColor } = getConfidence(loc.waits);
          const lastUpdatedStr = getLastUpdatedText(loc.lastUpdated);
          const { label: busyLabel, color: busyColor } = getBusyLevel(avgWait); // Busy level logic

          return (
            <div
              key={loc.name}
              className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow transition-shadow hover:shadow-lg hover:-translate-y-[2px] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between group"
            >
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                  {loc.name}
                </span>
              </div>
              <div className="flex flex-col items-end mt-3 sm:mt-0">
                {/* Average wait time & busy level */}
                <span className={`text-base font-bold flex items-center gap-2 ${getWaitColor(avgWait)}`}>
                  {avgWait} min avg wait
                  {/* Busy level with subtle color & style */}
                  <span className={`rounded-full bg-opacity-10 px-2 py-[2px] text-xs font-semibold ${busyColor} bg-current/10`}>
                    {busyLabel}
                  </span>
                </span>
                {/* Confidence label */}
                <span className={`text-xs mt-1 ${confColor}`}>
                  {confLabel} ({loc.waits.length} {loc.waits.length === 1 ? "submission" : "submissions"})
                </span>
                {/* Last updated label */}
                <span className="text-xs text-zinc-400 mt-1">{lastUpdatedStr}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Submission Form */}
      <section className="w-full max-w-2xl mx-auto px-6 mb-20">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4 bg-white/90 dark:bg-zinc-900/80 shadow border border-zinc-100 dark:border-zinc-800 rounded-xl px-6 py-5 items-stretch sm:items-end"
        >
          {/* Dropdown for selecting location */}
          <div className="flex flex-col w-full sm:w-1/3">
            <label htmlFor="location-select" className="font-medium text-sm mb-1 text-zinc-700 dark:text-zinc-200">
              Select Location
            </label>
            <select
              id="location-select"
              value={selectedIdx}
              onChange={handleSelectChange}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 transition"
            >
              {locations.map((loc, idx) => (
                <option key={loc.name} value={idx}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          {/* Number input for wait time */}
          <div className="flex flex-col w-full sm:w-1/3">
            <label htmlFor="wait-input" className="font-medium text-sm mb-1 text-zinc-700 dark:text-zinc-200">
              Wait Time (minutes)
            </label>
            <input
              id="wait-input"
              type="number"
              min={0}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 transition"
              value={waitValue}
              onChange={handleWaitChange}
              required
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
          {/* Submit button */}
          <div className="sm:w-1/4 flex flex-col">
            <label className="invisible sm:visible sm:h-5 mb-1" aria-hidden>
              Submit
            </label>
            <button
              type="submit"
              className="h-11 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold shadow hover:shadow-lg transition-colors px-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Update Wait
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
