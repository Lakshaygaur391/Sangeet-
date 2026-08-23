import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  IoChevronDown, IoLogoInstagram, IoLogoYoutube, IoLogoTwitter, IoLogoFacebook,
} from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

const SOCIALS = [
  { label: "Instagram", Icon: IoLogoInstagram },
  { label: "YouTube", Icon: IoLogoYoutube },
  { label: "X", Icon: IoLogoTwitter },
  { label: "Facebook", Icon: IoLogoFacebook },
];

const Footer = () => {
  const { isAuthenticated } = useAuth();
  const { openAuthPrompt, toast } = useUI();
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState(null);

  // A handful of footer links point at protected routes; route to the same
  // sign-up prompt used everywhere else instead of a dead redirect.
  const goProtected = (path) => (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openAuthPrompt("library");
    } else {
      navigate(path);
    }
  };

  const handleDownload = () => toast("The Sangeet app isn't available yet — coming soon.", "info");

  const columns = [
    {
      title: "Product",
      key: "product",
      links: [
        { label: "Home", to: "/" },
        { label: "Discover", to: "/discover" },
        { label: "Search", to: "/search" },
        { label: "Library", to: "/library", protected: true },
        { label: "Playlists", to: "/library", protected: true },
      ],
    },
    {
      title: "Explore",
      key: "explore",
      links: [
        { label: "Trending", to: "/#trending" },
        { label: "New on Sangeet", to: "/#fresh" },
        { label: "Regional Spotlight", to: "/#regional" },
        { label: "Artists to Explore", to: "/#artists" },
        { label: "Editorial Picks", to: "/discover" },
      ],
    },
    {
      title: "Support",
      key: "support",
      links: [
        { label: "Help Center", to: "/support" },
        { label: "FAQ", to: "/support" },
        { label: "Contact", to: "/support" },
        { label: "Report a Problem", to: "/support" },
      ],
    },
    {
      title: "Company",
      key: "company",
      links: [
        { label: "About Sangeet", to: "/about" },
        { label: "Careers", to: "/careers" },
        { label: "Contact", to: "/support" },
        { label: "For Artists", to: "/for-artists" },
      ],
    },
    {
      title: "Legal",
      key: "legal",
      links: [
        { label: "Privacy Policy", to: "/legal/privacy" },
        { label: "Terms of Use", to: "/legal/terms" },
        { label: "Copyright", to: "/legal/copyright" },
        { label: "Cookie Policy", to: "/legal/cookies" },
        { label: "Accessibility", to: "/legal/accessibility" },
      ],
    },
  ];

  const renderLink = (link) =>
    link.protected ? (
      <button
        type="button"
        onClick={goProtected(link.to)}
        className="text-left text-sm text-white/50 transition hover:text-amber-300"
      >
        {link.label}
      </button>
    ) : (
      <Link to={link.to} className="text-sm text-white/50 transition hover:text-amber-300">
        {link.label}
      </Link>
    );

  return (
    <footer className="mt-8 rounded-2xl border border-white/10 bg-[#0d0d0e] px-5 py-8 md:px-8 md:py-10">
      {/* Brand + Get Sangeet */}
      <div className="flex flex-col justify-between gap-6 border-b border-white/8 pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="text-lg font-black tracking-[0.18em] text-white/95">SANGEET</p>
          <p className="text-body mt-1.5 text-white/45">Discover music. Find your sound.</p>
        </div>

        <div className="sm:text-right">
          <p className="text-meta">Get Sangeet</p>
          <p className="text-body mt-1 text-white/45">Take your music with you.</p>
          <button
            type="button"
            onClick={handleDownload}
            className="mt-2 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/5"
          >
            Download App — Coming soon
          </button>
        </div>
      </div>

      {/* Desktop grid */}
      <nav aria-label="Footer" className="hidden grid-cols-5 gap-6 py-8 md:grid">
        {columns.map((col) => (
          <div key={col.key}>
            <h3 className="text-meta mb-3 text-white/70">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label + link.to}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Mobile accordion */}
      <nav aria-label="Footer" className="divide-y divide-white/8 py-2 md:hidden">
        {columns.map((col) => (
          <div key={col.key}>
            <button
              type="button"
              onClick={() => setOpenSection(openSection === col.key ? null : col.key)}
              aria-expanded={openSection === col.key}
              className="flex w-full items-center justify-between py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-white/85">{col.title}</span>
              <IoChevronDown className={`text-white/40 transition ${openSection === col.key ? "rotate-180" : ""}`} />
            </button>
            {openSection === col.key && (
              <ul className="space-y-2.5 pb-4">
                {col.links.map((link) => (
                  <li key={link.label + link.to}>{renderLink(link)}</li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <div className="py-4">
          <p className="text-meta mb-2.5 text-white/70">Follow Sangeet</p>
          <div className="flex gap-3">
            {/* eslint-disable-next-line no-unused-vars -- Icon is used as a JSX tag name below */}
            {SOCIALS.map(({ label, Icon }) => (
              <span
                key={label}
                aria-label={`${label} — coming soon`}
                title={`${label} — coming soon`}
                className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-white/10 text-white/25"
              >
                <Icon />
              </span>
            ))}
          </div>
        </div>
      </nav>

      {/* Divider + bottom row */}
      <div className="mt-2 border-t border-white/8 pt-5 md:mt-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-caption order-2 sm:order-1">© 2026 Sangeet. All rights reserved.</p>

          <div className="order-1 hidden items-center gap-2 sm:order-2 md:flex">
            {/* eslint-disable-next-line no-unused-vars -- Icon is used as a JSX tag name below */}
            {SOCIALS.map(({ label, Icon }) => (
              <button
                key={label}
                type="button"
                aria-label={`${label} — coming soon`}
                title={`${label} — coming soon`}
                onClick={() => toast(`${label} isn't live yet — coming soon.`, "info")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/45 transition hover:border-amber-400/30 hover:text-amber-300 focus-visible:text-amber-300"
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
