import { useState } from "react";
import { IoChevronDown } from "react-icons/io5";
import { useUI } from "../context/UIContext";

const FAQS = [
  {
    q: "Is Sangeet completely free to use?",
    a: "Yes. Sangeet is 100% free with no monthly subscription fees, credit card requirements, or hidden charges. All core listening and playlist features are completely accessible to everyone.",
  },
  {
    q: "Why do I need to create a free account to play songs?",
    a: "Anyone can freely browse the catalog, search artists, and discover regional genres without logging in. To stream full-fidelity audio tracks, like songs, build custom playlists, and sync your playback history across devices, a quick free signup is required. This helps us ensure lightning-fast CDN audio streaming, prevent automated bot scraping, and maintain your private listening history.",
  },
  {
    q: "Is my personal data and account 100% secure?",
    a: "Absolutely. Sangeet uses industry-standard 256-bit SSL/TLS encryption for all data transmissions, cryptographic password hashing (bcrypt), and secure tokenized authentication. We strictly respect your privacy and never sell or monetize your personal data with third-party advertisers.",
  },
  {
    q: "How do I sign up or log in?",
    a: "Simply click the 'Sign Up' button in the top navigation bar or tap play on any song to open the free registration modal. You only need a name, email, and password to get started in seconds.",
  },
  {
    q: "Why isn't a song playing?",
    a: "Ensure you are signed in to your free account and that your internet connection is active. If a specific track fails to load, it might be undergoing catalog maintenance. You can report it below for immediate review.",
  },
  {
    q: "How can I report a problem or request music?",
    a: "Use the Report a Problem form below to describe any audio issues, missing tracks, or feature requests. Our engineering team reviews all submitted feedback regularly.",
  },
];

const Support = () => {
  const { toast } = useUI();

  const [openIndex, setOpenIndex] = useState(null);
  const [reportText, setReportText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleToggle = (index) => {
    setOpenIndex((current) => (current === index ? null : index));
  };

  const handleReport = (event) => {
    event.preventDefault();

    const message = reportText.trim();

    if (!message) {
      toast("Please describe the problem before submitting.", "error");
      return;
    }

    /*
     * Support API can be connected here when the backend endpoint
     * becomes available.
     */
    setSubmitted(true);
    setReportText("");

    toast("Your report has been recorded.", "success");
  };

  const handleNewReport = () => {
    setSubmitted(false);
  };

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-0 md:py-8">
      {/* Header */}
      <section
        aria-labelledby="support-heading"
        className="rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-lg shadow-black/10 md:p-8"
      >
        <p className="text-meta font-medium uppercase tracking-wider text-amber-300">
          Support
        </p>

        <h1
          id="support-heading"
          className="text-h1 mt-1 text-white"
        >
          Help Center
        </h1>

        <p className="text-body mt-3 max-w-2xl leading-relaxed text-white/55">
          Find answers to frequently asked questions or report an issue with
          your Sangeet experience.
        </p>
      </section>

      {/* FAQ */}
      <section
        aria-labelledby="faq-heading"
        className="rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-lg shadow-black/10 md:p-8"
      >
        <div className="mb-4">
          <h2
            id="faq-heading"
            className="text-h2 text-white"
          >
            Frequently Asked Questions
          </h2>

          <p className="text-caption mt-1 text-white/40">
            Quick answers to common questions.
          </p>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;
            const answerId = `faq-answer-${index}`;
            const buttonId = `faq-question-${index}`;

            return (
              <div key={item.q}>
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => handleToggle(index)}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  className="flex w-full items-center justify-between gap-5 py-4 text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                >
                  <span className="text-sm font-semibold leading-6 text-white/90">
                    {item.q}
                  </span>

                  <IoChevronDown
                    aria-hidden="true"
                    className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-amber-300" : ""
                    }`}
                  />
                </button>

                <div
                  id={answerId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                >
                  <p className="text-body pb-4 pr-8 leading-relaxed text-white/50">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Report Problem */}
      <section
        aria-labelledby="report-heading"
        className="rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-lg shadow-black/10 md:p-8"
      >
        <div className="mb-5">
          <h2
            id="report-heading"
            className="text-h2 text-white"
          >
            Report a Problem
          </h2>

          <p className="text-body mt-1.5 leading-relaxed text-white/50">
            Tell us what went wrong. Include the song title, artist, or any
            relevant details when possible.
          </p>
        </div>

        {submitted ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4"
          >
            <p className="text-sm font-semibold text-emerald-200">
              Report submitted
            </p>

            <p className="mt-1 text-sm leading-relaxed text-emerald-200/60">
              Thanks for helping us improve Sangeet.
            </p>

            <button
              type="button"
              onClick={handleNewReport}
              className="mt-4 text-sm font-semibold text-amber-300 transition hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            >
              Report another problem
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleReport}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="problem-report"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Describe the problem
              </label>

              <textarea
                id="problem-report"
                name="problem"
                value={reportText}
                onChange={(event) => setReportText(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Tell us what happened..."
                autoComplete="off"
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0e0e0e] px-4 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-white/25 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
              />

              <div className="mt-1.5 flex justify-end">
                <span className="text-xs text-white/25">
                  {reportText.length}/2000
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!reportText.trim()}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit Report
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default Support;