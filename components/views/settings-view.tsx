'use client';

import { BellRing, Check, Clock3, Database, Moon, ShieldCheck } from 'lucide-react';

import { interestOptions } from '@/lib/demo-data';
import type { UserSettings } from '@/lib/product-types';

type SettingsViewProps = {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
};

type ToggleRowProps = {
  label: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
};

function ToggleRow({ label, detail, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center gap-4 border-b border-white/8 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          checked ? 'bg-primary' : 'bg-white/12'
        }`}
      >
        <span
          className={`absolute top-1 grid size-5 place-items-center rounded-full bg-[#102018] text-[#102018] shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1 bg-[#9ba9a1]'
          }`}
        >
          {checked ? <Check className="size-3" aria-hidden="true" /> : null}
        </span>
      </button>
    </div>
  );
}

export function SettingsView({ settings, onChange }: SettingsViewProps) {
  const toggle = (key: keyof Omit<UserSettings, 'interests'>) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  const toggleInterest = (interest: string) => {
    onChange({
      ...settings,
      interests: settings.interests.includes(interest)
        ? settings.interests.filter((item) => item !== interest)
        : [...settings.interests, interest],
    });
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[820px] px-4 pb-32 pt-5 sm:px-7 sm:pt-8 lg:px-10 lg:pb-16">
      <header>
        <p className="eyebrow text-primary/75">Control the signal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f6f5eb] sm:text-5xl">
          Your briefing settings
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Choose what deserves attention and when it should reach you. These choices
          are saved on this device for the MVP.
        </p>
      </header>

      <section className="mt-8 rounded-[1.35rem] border border-white/8 bg-white/[0.025] px-4 sm:px-5" aria-labelledby="cadence-heading">
        <div className="flex items-center gap-3 border-b border-white/8 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Cadence</p>
            <h2 id="cadence-heading" className="text-sm font-semibold text-white">
              When updates arrive
            </h2>
          </div>
        </div>
        <ToggleRow
          label="Morning briefing"
          detail="One compact briefing around 7:30 ET using the latest completed data pulls."
          checked={settings.morningBrief}
          onChange={() => toggle('morningBrief')}
        />
        <ToggleRow
          label="Event-driven research alerts"
          detail="Notify only when a tracked event crosses the evidence and relevance threshold."
          checked={settings.eventAlerts}
          onChange={() => toggle('eventAlerts')}
        />
        <ToggleRow
          label="Periodic watchlist update"
          detail="A calm digest when the watchlist has meaningful changes; silence when it does not."
          checked={settings.watchlistDigest}
          onChange={() => toggle('watchlistDigest')}
        />
        <ToggleRow
          label="End-of-day supplement"
          detail="An optional recap. This stays secondary to the morning and event-driven cycles."
          checked={settings.endOfDay}
          onChange={() => toggle('endOfDay')}
        />
      </section>

      <section className="mt-5 rounded-[1.35rem] border border-white/8 bg-white/[0.025] p-4 sm:p-5" aria-labelledby="interests-heading">
        <p className="eyebrow">Interests</p>
        <h2 id="interests-heading" className="mt-1 text-sm font-semibold text-white">
          Topics used to rank relevance
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {interestOptions.map((interest) => {
            const active = settings.interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                aria-pressed={active}
                onClick={() => toggleInterest(interest)}
                className={`min-h-10 rounded-xl border px-3.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring ${
                  active
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-white/8 text-muted-foreground hover:bg-white/5 hover:text-white'
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-[1.35rem] border border-white/8 bg-white/[0.025] px-4 sm:px-5" aria-labelledby="experience-heading">
        <div className="flex items-center gap-3 border-b border-white/8 py-4">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Moon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Experience</p>
            <h2 id="experience-heading" className="text-sm font-semibold text-white">
              Accessibility
            </h2>
          </div>
        </div>
        <ToggleRow
          label="Reduce interface motion"
          detail="Avoid smooth scrolling and non-essential transitions on this device."
          checked={settings.reducedMotion}
          onChange={() => toggle('reducedMotion')}
        />
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-[1.25rem] border border-white/8 bg-white/[0.025] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-white">
            <Database className="size-4 text-primary" aria-hidden="true" />
            Data policy
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Free official sources first. Every claim carries source, timestamp, and
            freshness; delayed data is labeled.
          </p>
        </article>
        <article className="rounded-[1.25rem] border border-white/8 bg-white/[0.025] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-white">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            Analysis policy
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Evidence, scenarios, risks, and confidence only — no direct buy or sell
            instructions.
          </p>
        </article>
      </section>

      <aside className="mt-5 flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-4 text-xs leading-5 text-muted-foreground">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        The zero-cost MVP accepts source delays. Freshness is part of confidence, so
        older data lowers the weight of a claim instead of being disguised as live.
      </aside>
    </main>
  );
}
