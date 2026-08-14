import { useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import { useUI } from "../context/UIContext";

const FAQS = [
  {
    q: "Why can't I find a song?",
    a: "Sangeet's catalog is powered by YouTube, so availability depends on what's published there. Try searching by artist name or a different spelling.",
  },
  {
    q: "Do I need an account to listen?",
    a: "No — you can browse and play music without signing in. An account is only needed to like songs, build playlists, and see your history.",
  },
  {
    q: "Is Sangeet free?",
    a: "Yes, Sangeet is free to use.",
  },
  {
    q: "A song stopped playing or won't load — what do I do?",
    a: "Try refreshing the page. If it keeps happening, use Report a Problem below and mention the song and artist.",
  },
];

const Support = () => {
  const { toast } = useUI();
  const [openIndex, setOpenIndex] = useState(null);
  const [reportText, setReportText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleReport = (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    // No backend endpoint exists yet for support tickets — this is an honest
    // local acknowledgement rather than a fake "message sent" claim to a
    // real inbox that doesn't exist.
    setSubmitted(true);
    setReportText("");
    toast("Thanks — noted locally. Live ticket submission isn't connected yet.", "info");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 md:p-8">
        <p className="text-meta text-amber-300">Support</p>
        <h1 className="text-h1 mt-1 text-white">Help Center</h1>
        <p className="text-body mt-2 text-white/50">
          Answers to common questions. For anything else, use Report a Problem below.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 md:p-8">
        <h2 className="text-h2 mb-3 text-white">FAQ</h2>
        <div className="divide-y divide-white/8">
          {FAQS.map((item, i) => (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
              >
                <span className="text-sm font-semibold text-white/90">{item.q}</span>
                <IoChevronDown className={`shrink-0 text-white/40 transition ${openIndex === i ? "rotate-180" : ""}`} />
              </button>
              {openIndex === i && <p className="text-body pb-3.5 text-white/50">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#141414] p-6 md:p-8">
        <h2 className="text-h2 mb-1 text-white">Contact &amp; Report a Problem</h2>
        <p className="text-body mb-4 text-white/50">
          Live support isn't connected yet — describe the issue below and it'll be visible to you
          in this browser for now.
        </p>
        {submitted ? (
          <p className="text-body rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-emerald-200">
            Got it — thanks for the report.
          </p>
        ) : (
          <form onSubmit={handleReport} className="space-y-3">
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={4}
              placeholder="What happened?"
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0e0e0e] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-amber-400/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!reportText.trim()}
              className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Support;
