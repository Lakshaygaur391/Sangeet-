import { Link, useParams } from "react-router-dom";
import {
  IoArrowBackOutline,
  IoChevronForwardOutline,
  IoDocumentTextOutline,
} from "react-icons/io5";

const DOCS = {
  privacy: {
    title: "Privacy Policy",
    summary:
      "Learn how Sangeet protects your data with 100% security, 256-bit encryption, and privacy-first standards.",
    sections: [
      {
        heading: "Overview",
        content:
          "Sangeet respects your privacy and is committed to handling information responsibly with zero third-party monetization. This Privacy Policy explains what data is collected, how it is secured, and how your privacy rights are safeguarded.",
      },
      {
        heading: "100% Data Security & Encryption",
        content:
          "All data transmitted between your device and Sangeet is protected using industry-standard 256-bit SSL/TLS encryption. User passwords are cryptographically salted and hashed using bcrypt. We implement strict internal access controls and isolated storage to ensure your account credentials, playlist metadata, and listening history remain 100% secure.",
      },
      {
        heading: "Information We Collect",
        content:
          "When you register for a free account, we store basic profile details (name, email) and your listening preferences (liked songs, playlists, and recently played tracks) strictly to synchronize your audio experience across sessions and devices.",
      },
      {
        heading: "Zero Data Selling & Third-Party Sharing",
        content:
          "We do not sell, rent, license, or monetize your personal information, email address, or musical habits to third-party ad networks or data brokers. Your information is used exclusively to operate and personalize Sangeet.",
      },
      {
        heading: "Your Data Rights",
        content:
          "You have full ownership of your data. You may review, modify, or request deletion of your account and associated library data at any time through our Support Center.",
      },
    ],
  },

  terms: {
    title: "Terms of Use",
    summary:
      "The terms and conditions that govern your free access and streaming on Sangeet.",
    sections: [
      {
        heading: "100% Free Platform",
        content:
          "Sangeet is a 100% free music platform. There are no monthly subscription fees, credit card requirements, or paywalled music tiers.",
      },
      {
        heading: "Free Account Requirement for Audio Playback",
        content:
          "Browsing the music catalog, searching artists, and viewing playlists is publicly open without an account. However, to stream audio tracks, create custom playlists, heart songs, and maintain playback queue state across browser reloads, users must register for a free Sangeet account. This ensures bandwidth allocation, low-latency streaming CDN delivery, and protection against automated bot scraping.",
      },
      {
        heading: "Account Responsibility",
        content:
          "You are responsible for keeping your login credentials confidential. You agree to use Sangeet for lawful, personal, and non-commercial entertainment purposes only.",
      },
      {
        heading: "Service Availability & Content",
        content:
          "We strive to maintain uninterrupted, lightning-fast streaming availability. Audio catalog updates, maintenance, or feature improvements may occur periodically to enhance your listening experience.",
      },
    ],
  },

  copyright: {
    title: "Copyright",
    summary:
      "Information about copyrighted content and intellectual property on Sangeet.",
    sections: [
      {
        heading: "Respect for Copyright",
        content:
          "Sangeet respects the intellectual property rights of artists, creators, labels, publishers, and other rights holders.",
      },
      {
        heading: "Third-Party Content",
        content:
          "Music, artwork, metadata, trademarks, and other materials may belong to their respective owners. Sangeet does not claim ownership of third-party copyrighted material unless explicitly stated.",
      },
      {
        heading: "Copyright Concerns",
        content:
          "If you believe that content available through Sangeet infringes your copyright or other intellectual property rights, please provide sufficient information to identify the material and explain the basis of your claim.",
      },
      {
        heading: "Takedown Requests",
        content:
          "Copyright-related requests should include the relevant work, the material being identified, your contact information, and any information necessary to evaluate the request.",
      },
    ],
  },

  cookies: {
    title: "Cookie Policy",
    summary:
      "How Sangeet may use cookies, local storage, and similar browser technologies.",
    sections: [
      {
        heading: "What Are Cookies?",
        content:
          "Cookies are small pieces of information stored by your browser. Similar technologies, including local storage, may also be used to remember settings and improve the functionality of a website.",
      },
      {
        heading: "How Sangeet Uses Storage",
        content:
          "Sangeet may use browser storage to remember preferences, maintain application state, support authentication, and provide features that depend on information being retained between sessions.",
      },
      {
        heading: "Managing Browser Storage",
        content:
          "You can manage or clear cookies and local storage through your browser settings. Removing stored information may cause certain Sangeet features or preferences to reset.",
      },
    ],
  },

  accessibility: {
    title: "Accessibility",
    summary:
      "Our commitment to making Sangeet usable and accessible to as many people as possible.",
    sections: [
      {
        heading: "Our Commitment",
        content:
          "Sangeet aims to provide an accessible and inclusive experience for all users, including people who use assistive technologies or alternative methods of interaction.",
      },
      {
        heading: "Accessible Experience",
        content:
          "We work toward clear navigation, readable content, sufficient interaction states, keyboard accessibility, responsive layouts, and meaningful labels for important interface elements.",
      },
      {
        heading: "Feedback",
        content:
          "If you encounter an accessibility barrier while using Sangeet, please report the issue through the Support section. Helpful details about the page, feature, and problem can make it easier to investigate.",
      },
    ],
  },
};

const Legal = () => {
  const { doc } = useParams();

  const currentDoc = DOCS[doc] ? doc : "privacy";
  const entry = DOCS[currentDoc];

  const documentLinks = Object.entries(DOCS).filter(
    ([key]) => key !== currentDoc
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-0 md:py-8">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-xl shadow-black/20">
        {/* Header */}
        <header className="border-b border-white/[0.08] p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-amber-300">
            <IoDocumentTextOutline
              aria-hidden="true"
              className="text-base"
            />
            <span>Legal</span>
          </div>

          <h1 className="text-h1 mt-2 text-white">
            {entry.title}
          </h1>

          <p className="text-body mt-3 max-w-2xl leading-relaxed text-white/55">
            {entry.summary}
          </p>

          <p className="mt-4 text-xs text-white/30">
            Last updated: August 16, 2026
          </p>
        </header>

        {/* Content */}
        <article className="p-6 md:p-8">
          <div className="space-y-7">
            {entry.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-h2 text-white">
                  {section.heading}
                </h2>

                <p className="text-body mt-2.5 leading-7 text-white/60">
                  {section.content}
                </p>
              </section>
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-10 border-t border-white/[0.08] pt-6">
            <Link
              to="/support"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            >
              <IoArrowBackOutline aria-hidden="true" />
              Support Center
            </Link>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Other legal information
              </p>

              <nav
                aria-label="Legal documents"
                className="mt-3 grid gap-2 sm:grid-cols-2"
              >
                {documentLinks.map(([key, document]) => (
                  <Link
                    key={key}
                    to={`/legal/${key}`}
                    className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition hover:border-white/15 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                  >
                    <span className="text-sm font-medium text-white/70 transition group-hover:text-white">
                      {document.title}
                    </span>

                    <IoChevronForwardOutline
                      aria-hidden="true"
                      className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-amber-300"
                    />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
};

export default Legal;