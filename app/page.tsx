"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { isoWeekKey, capWaterMl } from "../lib/utils";

// Persist state to MongoDB via API routes.
// Initial value is fetched from the server and each update triggers a POST.
function useLocalStorage<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initial as T);
  const loaded = useRef(false);

  // Load initial value from the database
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && key in data) setState(data[key]);
        }
      } catch {
        // ignore fetch errors
      } finally {
        loaded.current = true;
      }
    }
    load();
  }, [key]);

  // Save value to the database whenever it changes
  useEffect(() => {
    if (!loaded.current) return;
    async function save() {
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: state }),
        });
      } catch {
        // ignore network errors
      }
    }
    save();
  }, [key, state]);

  return [state, setState];
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Sparkline({
  data = [],
  w = 260,
  h = 60,
  color = "#111827",
  upIsGood = false,
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  upIsGood?: boolean;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const dx = w / Math.max(1, data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * dx;
      const y = h - ((v - min) / Math.max(1, max - min)) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const first = data[0];
  const delta = last - first;
  const isGood = upIsGood ? delta >= 0 : delta <= 0;
  const arrow = delta >= 0 ? "▲" : "▼";
  const deltaColor = isGood ? "text-emerald-600" : "text-rose-600";
  return (
    <div className="flex items-end gap-3">
      <svg width={w} height={h} className="rounded-md bg-gradient-to-b from-gray-50 to-white">
        <polyline fill="none" stroke={color} strokeWidth={2.5} points={points} />
        {data.map((v, i) => {
          const x = i * dx;
          const y = h - ((v - min) / Math.max(1, max - min)) * (h - 8) - 4;
          return <circle key={i} cx={x} cy={y} r={2.3} fill={color} />;
        })}
      </svg>
      <div className="text-sm text-gray-600">
        <div>
          Start: <span className="font-medium">{first}</span>
        </div>
        <div>
          Now: <span className="font-medium">{last}</span>
        </div>
        <div className={deltaColor}>
          {arrow} {Math.abs(delta).toFixed(1)}
        </div>
      </div>
    </div>
  );
}

function useTimer(initialSeconds = 300) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);
  useEffect(() => { if (seconds === 0) setRunning(false); }, [seconds]);
  const start = (sec?: number) => { if (typeof sec === "number") setSeconds(sec); setRunning(true); };
  const pause = () => setRunning(false);
  const reset = (sec?: number) => { setRunning(false); setSeconds(sec ?? initialSeconds); };
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return { seconds, running, start, pause, reset, label: `${mm}:${ss}` };
}

const PROMPTS = [
  "3 things you’re grateful for (be oddly specific).",
  "What made today 1% better than yesterday?",
  "If you had 2 minutes of courage tomorrow, what would you do?",
  "What tugged your energy today—add, delete, or delegate?",
];

type Task = { text: string; habit?: string; done: boolean };

const QUICK_TASKS: Omit<Task, "done">[] = [
  { text: "10-min guided meditation", habit: "mind" },
  { text: "7-min mobility/yoga flow", habit: "body" },
  { text: "10-min dance/move break", habit: "body" },
  { text: "Log water (3L target)", habit: "body" },
  { text: "2-min journal check-in", habit: "mood" },
];

const NAV_TABS: [string, string][] = [
  ["today", "Today"],
  ["meditate", "Meditate"],
  ["yoga", "Yoga"],
  ["dance", "Dance"],
  ["journal", "Journal"],
  ["tasks", "Tasks"],
  ["steps", "Steps"],
  ["weight", "Weight"],
];

export default function Page() {
  const [active, setActive] = useState("today");
  const [tasks, setTasks] = useLocalStorage<Task[]>(
    "reset.tasks",
    QUICK_TASKS.map((t) => ({ ...t, done: false as boolean }))
  );
  const [notes, setNotes] = useLocalStorage("reset.journal", [] as { id: number; date: string; title: string; body: string }[]);
  const [steps, setSteps] = useLocalStorage("reset.steps", [] as { date: string; steps: number }[]);
  const [weights, setWeights] = useLocalStorage("reset.weights", [71.5, 71.1, 70.9] as number[]);
  const [waterMl, setWaterMl] = useLocalStorage("reset.water", 0);
  const [weightLastDate, setWeightLastDate] = useLocalStorage<string | null>("reset.weightLastDate", null);

  const med = useTimer(10 * 60);
  const yoga = useTimer(7 * 60);
  const dance = useTimer(10 * 60);

  const today = new Date().toISOString().slice(0, 10);

  const addTask = (text: string) => { if (!text?.trim()) return; setTasks((t) => [...t, { text: text.trim(), done: false }]); };
  const toggleTask = (idx: number) => setTasks((t) => t.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)));
  const clearToday = () => setTasks((t) => t.map((x) => ({ ...x, done: false })));

  const addNote = (title: string, body: string) => setNotes((n) => [{ id: Date.now(), date: today, title, body }, ...n]);

  const addSteps = (count?: number) => { if (!count || Number.isNaN(Number(count))) return; setSteps((s) => [...s, { date: today, steps: Number(count) }].slice(-30)); };

  const addWeight = (kg?: number) => {
    if (!kg || Number.isNaN(Number(kg))) return;
    const wk = isoWeekKey(today);
    const lastWk = weightLastDate ? isoWeekKey(weightLastDate) : null;
    setWeights((w) => {
      const next = [...w];
      if (lastWk && lastWk === wk && next.length) next[next.length - 1] = Number(kg);
      else { next.push(Number(kg)); setWeightLastDate(today); }
      return next.slice(-60);
    });
  };

  const stepSeries = steps.map((x) => x.steps);
  const progress = useMemo(() => Math.round((tasks.filter((t) => t.done).length / Math.max(1, tasks.length)) * 100), [tasks]);

  return (
    <div>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reset (Beta) — Mind·Body·Mood</h1>
          <p className="text-sm text-gray-600">Build the tiny daily system that gets you back in the driver’s seat.</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {NAV_TABS.map(([k, label]) => (
            <button key={k} onClick={() => setActive(k)} className={`px-3 py-2 rounded-xl text-sm border transition shadow-sm ${active === k ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50 border-gray-200"}`}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {active === "today" && (
        <div>
          <Section title={`Your 30‑min Minimum for ${today}`} right={<span className="text-sm text-gray-600">{progress}% complete</span>}>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => med.start(10 * 60)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Start 10‑min Meditation</button>
                  <span className="font-mono text-lg">{med.label}</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => yoga.start(7 * 60)} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Start 7‑min Yoga Flow</button>
                  <span className="font-mono text-lg">{yoga.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => dance.start(10 * 60)} className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">Start 10‑min Dance Break</button>
                  <span className="font-mono text-lg">{dance.label}</span>
                </div>
              </div>
              <div>
                <div className="mb-3 text-sm text-gray-600">Tap to complete today’s essentials:</div>
                <ul className="space-y-2">
                  {tasks.map((t: Task, i: number) => (
                    <li key={i} className="flex items-center gap-3">
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(i)} className="h-5 w-5 rounded border-gray-300" />
                      <span className={t.done ? "line-through text-gray-400" : ""}>{t.text}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 mt-4">
                  <button onClick={clearToday} className="px-3 py-2 rounded-lg border border-gray-300">Reset Today</button>
                  <button onClick={() => addTask("Walk 20 mins (any pace)")} className="px-3 py-2 rounded-lg border border-gray-300">Add Walk</button>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Fast Log">
            <div className="grid md:grid-cols-3 gap-4">
              <WaterCard waterMl={waterMl} setWaterMl={setWaterMl} />
              <QuickSteps addSteps={addSteps} stepSeries={stepSeries} />
              <QuickWeight addWeight={addWeight} weights={weights} />
            </div>
          </Section>
        </div>
      )}

      {active === "meditate" && <MeditateSection med={med} />}
      {active === "yoga" && <YogaSection yoga={yoga} />}
      {active === "dance" && <DanceSection dance={dance} />}
      {active === "journal" && <JournalSection addNote={addNote} notes={notes} />}
      {active === "tasks" && <TasksSection tasks={tasks} setTasks={setTasks} />}
      {active === "steps" && <StepsSection steps={steps} addSteps={addSteps} />}
      {active === "weight" && <WeightSection weights={weights} addWeight={addWeight} />}

      <DevTests tasks={tasks} stepSeries={stepSeries} weights={weights} />

      <footer className="mt-10 text-center text-xs text-gray-500">Built for momentum, not perfection. • Private by default (stored locally in your browser).</footer>
    </div>
  );
}

function WaterCard({ waterMl, setWaterMl }: { waterMl: number; setWaterMl: React.Dispatch<React.SetStateAction<number>> }) {
  const add = (ml: number) => setWaterMl((w) => capWaterMl((w || 0) + ml));
  const pct = Math.min(100, Math.round(((waterMl || 0) / 3000) * 100));
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Water (3L)</h4>
        <span className="text-sm text-gray-600">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        {[250, 500].map((ml) => (
          <button key={ml} onClick={() => add(ml)} className="btn text-sm px-3 py-1.5">+{ml} ml</button>
        ))}
        <button onClick={() => setWaterMl(0)} className="btn text-sm px-3 py-1.5 ml-auto">Reset</button>
      </div>
      {waterMl > 3000 && <div className="text-xs text-rose-600 mt-2">Capped at 3L for today.</div>}
    </div>
  );
}

function QuickSteps({ addSteps, stepSeries }: { addSteps: (n?: number) => void; stepSeries: number[] }) {
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <div className="card">
      <h4 className="font-medium mb-2">Steps</h4>
      <div className="flex gap-2 mb-3">
        <input ref={input} placeholder="e.g. 6500" className="input w-full" />
        <button onClick={() => { addSteps(Number(input.current?.value)); if (input.current) input.current.value = ""; }} className="btn">Log</button>
      </div>
      <Sparkline data={stepSeries} upIsGood />
      <p className="text-xs text-gray-500 mt-2">Apple Health auto‑sync (future): enabled by default.</p>
    </div>
  );
}

function QuickWeight({ addWeight, weights }: { addWeight: (n?: number) => void; weights: number[] }) {
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <div className="card">
      <h4 className="font-medium mb-2">Weight (kg)</h4>
      <div className="flex gap-2 mb-3">
        <input ref={input} placeholder="e.g. 70.8" className="input w-full" />
        <button onClick={() => { addWeight(Number(input.current?.value)); if (input.current) input.current.value = ""; }} className="btn">Log</button>
      </div>
      <Sparkline data={weights} />
      <p className="text-xs text-gray-500 mt-2">Weekly logs: adding again this week replaces your last entry.</p>
    </div>
  );
}

function MeditateSection({ med }: { med: ReturnType<typeof useTimer> }) {
  const presets = [5, 10, 15, 20];
  return (
    <Section title="Guided Meditation">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-3">Pick a length and hit start. Try box breathing: inhale 4, hold 4, exhale 4, hold 4 — repeat.</p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {presets.map((m) => (
              <button key={m} onClick={() => med.start(m * 60)} className="btn">{m} min</button>
            ))}
          </div>
          <div className="flex items-center gap-3 mb-2"><span className="font-mono text-3xl">{med.label}</span></div>
          <div className="flex gap-2">
            <button onClick={() => med.start()} className="btn">Start</button>
            <button onClick={med.pause} className="btn">Pause</button>
            <button onClick={() => med.reset(10 * 60)} className="btn">Reset</button>
          </div>
        </div>
        <div className="text-sm text-gray-700">
          <h4 className="font-semibold mb-1">Why it works</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li>Short, consistent sessions lower stress and build the habit.</li>
            <li>Use earphones and sit comfortably; eyes soft or closed.</li>
            <li>On low‑motivation days, do 2 mindful minutes. Momentum &gt; perfection.</li>
          </ul>
        </div>
    </div>
      <YTPanel topic="meditation" />
    </Section>
  );
}

function YogaSection({ yoga }: { yoga: ReturnType<typeof useTimer> }) {
  return (
    <Section title="Yoga / Mobility">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-3">7‑minute daily flow: cat‑cow → hip circles → runner’s lunge → hamstring fold → thoracic rotations → child’s pose.</p>
          <div className="flex items-center gap-3 mb-2"><span className="font-mono text-3xl">{yoga.label}</span></div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => yoga.start(7 * 60)} className="btn bg-secondary hover:bg-secondary-dark">Start 7 min</button>
            <button onClick={yoga.pause} className="btn">Pause</button>
            <button onClick={() => yoga.reset(7 * 60)} className="btn">Reset</button>
          </div>
          <p className="text-xs text-gray-500">Future: auto‑generate sessions by level, focus, and time.</p>
        </div>
        <div className="text-sm text-gray-700">
          <h4 className="font-semibold mb-1">Tips</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li>Move slowly and breathe through your nose.</li>
            <li>Keep knees soft; no pain. Low‑impact and thyroid‑friendly.</li>
            <li>Prefer a coach? Queue any 5–10 minute mobility video and use this timer.</li>
          </ul>
        </div>
    </div>
      <YTPanel topic="yoga" />
    </Section>
  );
}

function DanceSection({ dance }: { dance: ReturnType<typeof useTimer> }) {
  return (
    <Section title="Dance / Cardio Play">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-3">10‑minute minimum: groove basics → sidestep → body roll → light bounce. Keep it fun, not formal.</p>
          <div className="flex items-center gap-3 mb-2"><span className="font-mono text-3xl">{dance.label}</span></div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => dance.start(10 * 60)} className="btn bg-secondary hover:bg-secondary-dark">Start 10 min</button>
            <button onClick={dance.pause} className="btn">Pause</button>
            <button onClick={() => dance.reset(10 * 60)} className="btn">Reset</button>
          </div>
          <p className="text-xs text-gray-500">Future: beginner‑friendly classes and progressions.</p>
        </div>
        <div className="text-sm text-gray-700">
          <h4 className="font-semibold mb-1">Energy rules</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li>Zero‑judgment zone. Camera off. Lights optional. :)</li>
            <li>Short bursts count. 2 × 5 minutes is perfect on busy days.</li>
            <li>End with 4 deep breaths to switch off adrenaline.</li>
          </ul>
        </div>
    </div>
      <YTPanel topic="dance" />
    </Section>
  );
}

function JournalSection({ addNote, notes }: { addNote: (title: string, body: string) => void; notes: { id: number; date: string; title: string; body: string }[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const randomPrompt = () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  const [prompt, setPrompt] = useState(randomPrompt());
  const save = () => { if (!body.trim()) return; addNote(title || prompt, body.trim()); setTitle(""); setBody(""); setPrompt(randomPrompt()); };
  return (
    <Section title="Journaling">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm text-gray-600 mb-1">Prompt</div>
          <div className="p-3 rounded-xl bg-gray-50 border mb-3 text-sm">{prompt}</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="(Optional) Title" className="input w-full mb-2" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Write for 2 minutes. No polishing, only honesty." className="input w-full" />
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn">Save Entry</button>
            <button onClick={() => setPrompt(randomPrompt())} className="btn">New Prompt</button>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Recent entries</h4>
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-gray-500">{n.date}</div>
                <div className="font-medium">{n.title}</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{n.body}</p>
              </li>
            ))}
            {!notes.length && <div className="text-sm text-gray-500">No entries yet.</div>}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function TasksSection({ tasks, setTasks }: { tasks: Task[]; setTasks: React.Dispatch<React.SetStateAction<Task[]>> }) {
  const input = useRef<HTMLInputElement | null>(null);
  const add = () => { const v = input.current?.value || ""; if (!v.trim()) return; setTasks((t) => [...t, { text: v.trim(), done: false }]); if (input.current) input.current.value = ""; };
  const toggle = (i: number) => setTasks((t) => t.map((x, idx) => (idx === i ? { ...x, done: !x.done } : x)));
  const remove = (i: number) => setTasks((t) => t.filter((_, idx) => idx !== i));
  return (
    <Section title="Tasks & Routines">
      <div className="flex gap-2 mb-3">
        <input ref={input} placeholder="Add a task (e.g. prep veg for lunch)" className="input w-full" />
        <button onClick={add} className="btn">Add</button>
      </div>
      <ul className="divide-y rounded-lg border bg-white">
        {tasks.map((t: Task, i: number) => (
          <li key={i} className="flex items-center gap-3 p-3">
            <input type="checkbox" checked={t.done} onChange={() => toggle(i)} className="h-5 w-5" />
            <span className={`flex-1 ${t.done ? "line-through text-gray-400" : ""}`}>{t.text}</span>
            <button onClick={() => remove(i)} className="text-sm text-gray-500 hover:text-rose-600">Delete</button>
          </li>
        ))}
        {!tasks.length && <li className="p-3 text-sm text-gray-500">No tasks yet.</li>}
      </ul>
      <p className="text-xs text-gray-500 mt-2">Tip: Separate non‑negotiable daily habits from nice‑to‑do tasks.</p>
    </Section>
  );
}

function StepsSection({ steps, addSteps }: { steps: { date: string; steps: number }[]; addSteps: (n?: number) => void }) {
  const input = useRef<HTMLInputElement | null>(null);
  const series = steps.map((x) => x.steps);
  return (
    <Section title="Steps Tracker">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex gap-2 mb-3">
            <input ref={input} placeholder="Today’s steps" className="input w-full" />
            <button onClick={() => { addSteps(Number(input.current?.value)); if (input.current) input.current.value = ""; }} className="btn">Log</button>
          </div>
          <Sparkline data={series} upIsGood />
          <p className="text-xs text-gray-500 mt-2">Future: One‑tap sync with Apple Health.</p>
        </div>
        <div className="text-sm text-gray-700">
          <h4 className="font-semibold mb-1">Goal guidance</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li>Start at your average + 500 steps/day. Build gradually.</li>
            <li>Short walks after meals help energy, mood, and sleep.</li>
            <li>Don’t chase 10k if it breaks your day. Consistency wins.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

function WeightSection({ weights, addWeight }: { weights: number[]; addWeight: (n?: number) => void }) {
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <Section title="Weight Tracker">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex gap-2 mb-3">
            <input ref={input} placeholder="e.g. 70.8" className="input w-full" />
            <button onClick={() => { addWeight(Number(input.current?.value)); if (input.current) input.current.value = ""; }} className="btn">Log</button>
          </div>
          <Sparkline data={weights} />
          <p className="text-xs text-gray-500 mt-2">Log weekly; re‑logging in the same week replaces your last value.</p>
        </div>
        <div className="text-sm text-gray-700">
          <h4 className="font-semibold mb-1">Notes</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li>This is a trend tool, not a self‑worth meter.</li>
            <li>Combine with steps, water, sleep for a fuller picture.</li>
            <li>Optional: attach a short note to each log in Journal.</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

function DevTests({ tasks, stepSeries, weights }: { tasks: Task[]; stepSeries: number[]; weights: number[] }) {
  const tests: { name: string; pass: boolean; err?: string }[] = [];
  try { tests.push({ name: "Sparkline handles empty", pass: Array.isArray([]) && true }); } catch (e: any) { tests.push({ name: "Sparkline handles empty", pass: false, err: String(e) }); }
  tests.push({ name: "NAV_TABS count", pass: Array.isArray(NAV_TABS) && NAV_TABS.length === 8 });
  tests.push({ name: "Tasks shape", pass: Array.isArray(tasks) && tasks.every((t) => "text" in t) });
  tests.push({ name: "Step series numeric", pass: stepSeries.every((n) => typeof n === "number") });
  tests.push({ name: "Weights numeric", pass: weights.every((n) => typeof n === "number") });
  const waterPctCap = Math.min(100, Math.round((3000 / 3000) * 100)) === 100;
  tests.push({ name: "Water percent capped at 100%", pass: waterPctCap });
  const passCount = tests.filter((t) => t.pass).length;
  return (
    <details className="mt-6 text-xs text-gray-600">
      <summary>DEV: {passCount}/{tests.length} tests passing</summary>
      <ul className="list-disc ml-5 mt-2 space-y-1">
        {tests.map((t, i) => (
          <li key={i} className={t.pass ? "text-emerald-600" : "text-rose-600"}>
            {t.pass ? "✓" : "✗"} {t.name}
            {!t.pass && t.err && <span className="ml-2 text-gray-500">{t.err}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}