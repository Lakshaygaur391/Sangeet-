import { useParams, Link } from "react-router-dom";
import { IoAlertCircleOutline } from "react-icons/io5";

const DOCS = {
  privacy: {
    title: "Privacy Policy",
    summary: "How Sangeet collects, uses, and protects your information.",
  },
  terms: {
    title: "Terms of Use",
    summary: "The terms that govern your use of Sangeet.",
  },
  copyright: {
    title: "Copyright",
    summary: "How Sangeet handles copyrighted music and takedown requests.",
  },
  cookies: {
    title: "Cookie Policy",
    summary: "How Sangeet uses cookies and local storage.",
  },
  accessibility: {
    title: "Accessibility",
    summary: "Sangeet's commitment to an accessible listening experience.",
  },
};

const Legal = () => {
  const { doc } = useParams();
  const entry = DOCS[doc] || DOCS.privacy;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-lg shadow-black/20 md:p-8">
      <p className="text-meta text-amber-300">Legal</p>
      <h1 className="text-h1 mt-1 text-white">{entry.title}</h1>
      <p className="text-body mt-2 text-white/60">{entry.summary}</p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3.5 text-sm text-amber-100">
        <IoAlertCircleOutline className="mt-0.5 shrink-0 text-lg" />
        <p>
          This page is a placeholder. It doesn't contain real legal terms yet — Sangeet's
          business owner needs to supply the actual {entry.title.toLowerCase()} text (including
          any required company/legal-entity details) before this page reflects real policy.
        </p>
      </div>

      <p className="text-body mt-6 text-white/40">
        Looking for something else?{" "}
        {Object.keys(DOCS)
          .filter((key) => key !== doc)
          .map((key, i, arr) => (
            <span key={key}>
              <Link to={`/legal/${key}`} className="text-amber-300 hover:text-amber-200">
                {DOCS[key].title}
              </Link>
              {i < arr.length - 1 ? " · " : ""}
            </span>
          ))}
      </p>
    </div>
  );
};

export default Legal;
