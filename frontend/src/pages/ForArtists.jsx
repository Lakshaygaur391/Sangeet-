const ForArtists = () => {
  const features = [
    {
      title: "Artist Profiles",
      description:
        "Create a dedicated profile where listeners can discover your music and learn more about your work.",
    },
    {
      title: "Music Management",
      description:
        "Manage your releases, track information, artwork, and other artist details from one place.",
    },
    {
      title: "Performance Insights",
      description:
        "Understand how your music is being discovered and identify trends as artist analytics become available.",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-0 md:py-8">
      <section
        aria-labelledby="artists-heading"
        className="rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-xl shadow-black/20 md:p-10"
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-meta font-medium uppercase tracking-[0.12em] text-amber-300">
            For Artists
          </p>

          <h1
            id="artists-heading"
            className="text-h1 mt-2 text-white"
          >
            Your music deserves to be heard
          </h1>

          <p className="text-body mx-auto mt-4 max-w-xl leading-relaxed text-white/55">
            Sangeet is building tools to help artists manage their presence,
            showcase their music, and connect with listeners. Artist features
            are currently in development.
          </p>
        </div>

        {/* Status */}
        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/[0.06]">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-amber-300"
            />
          </div>

          <h2 className="mt-3 text-sm font-semibold text-white">
            Artist tools are in development
          </h2>

          <p className="mt-1.5 text-sm leading-relaxed text-white/45">
            Artist profile management, music submission, and creator tools
            aren't available yet. This page will be updated as new features
            are introduced.
          </p>
        </div>

        {/* Upcoming features */}
        <div className="mt-9 border-t border-white/[0.08] pt-7">
          <h2 className="text-h2 text-white">
            What's coming
          </h2>

          <p className="text-body mt-2 text-white/45">
            We're working toward a dedicated experience for artists and
            creators.
          </p>

          <div className="mt-5 grid gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-white/15 hover:bg-white/[0.035]"
              >
                <h3 className="text-sm font-semibold text-white">
                  {feature.title}
                </h3>

                <p className="mt-1.5 text-sm leading-relaxed text-white/40">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Current catalog information */}
        <div className="mt-8 border-t border-white/[0.08] pt-6">
          <h2 className="text-h2 text-white">
            Currently
          </h2>

          <p className="text-body mt-2 leading-relaxed text-white/50">
            Artist pages and music information available on Sangeet are
            currently generated from the platform's music catalog. Dedicated
            artist claiming and submission tools will be introduced in a
            future release.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-white/[0.08] pt-5 text-center">
          <p className="text-caption text-white/30">
            Artist tools are coming to Sangeet.
          </p>
        </div>
      </section>
    </main>
  );
};

export default ForArtists;