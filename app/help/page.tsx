"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, LifeBuoy } from "lucide-react";
import { HELP } from "../../lib/helpContent";
import { PageHeader, SearchInput } from "../../components/ui/Common";

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // open the topic from the URL, e.g. /help#invoice
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) {
      setOpen(id);
      setTimeout(() => document.getElementById(`topic-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
    }
  }, []);

  const sections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return HELP;
    return HELP.map(s => ({
      ...s,
      topics: s.topics.filter(t => [t.title, t.summary, ...t.steps, ...(t.tips || [])].join(" ").toLowerCase().includes(q)),
    })).filter(s => s.topics.length);
  }, [search]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Help" subtitle="Step-by-step guides for everyday work" />
      <div className="mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="What do you want to do? e.g. quotation, GST, stock" />
      </div>

      {sections.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-3">
          <LifeBuoy className="mx-auto mb-2" size={28} />
          No guide matches “{search}”. Try a simpler word like “invoice”, “payment” or “stock”.
        </div>
      )}

      <div className="space-y-6">
        {sections.map(section => (
          <section key={section.id}>
            <h2 className="text-sm font-semibold text-ink-3 mb-2 px-1">{section.title}</h2>
            <ul className="card divide-y divide-line">
              {section.topics.map(t => {
                const isOpen = open === t.id || !!search.trim();
                return (
                  <li key={t.id} id={`topic-${t.id}`} className="scroll-mt-4">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface/60"
                      onClick={() => setOpen(isOpen && open === t.id ? null : t.id)}
                      aria-expanded={isOpen}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink">{t.title}</p>
                        <p className="text-[13px] text-ink-3">{t.summary}</p>
                      </div>
                      <ChevronDown size={18} className={`text-ink-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        <ol className="space-y-2">
                          {t.steps.map((s, i) => (
                            <li key={i} className="flex gap-3 text-[15px] text-ink-2">
                              <span className="w-6 h-6 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ol>
                        {t.tips && (
                          <ul className="mt-3 space-y-1.5 bg-surface rounded-lg p-3">
                            {t.tips.map((tip, i) => <li key={i} className="text-sm text-ink-2">💡 {tip}</li>)}
                          </ul>
                        )}
                        {t.action && <Link href={t.action.href} className="btn-primary mt-3">{t.action.label}</Link>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
