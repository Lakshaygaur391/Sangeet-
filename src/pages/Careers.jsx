const Careers = () => {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-0 md:py-8">
      <section
        aria-labelledby="careers-heading"
        className="rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-xl shadow-black/20 md:p-10"
      >
        {/* Header */}
        <div className="text-center">
          <p className="text-meta font-medium uppercase tracking-[0.12em] text-amber-300">
            Careers
          </p>

          <h1
            id="careers-heading"
            className="text-h1 mt-2 text-white"
          >
            Build the future of music with Sangeet
          </h1>

          <p className="text-body mx-auto mt-4 max-w-xl leading-relaxed text-white/55">
            We're building a better way to discover and enjoy music. While
            there are no open positions at the moment, we're always interested
            in connecting with talented people who are passionate about
            technology, music, and great user experiences.
          </p>
        </div>

        {/* Status */}
        <div className="mx-auto mt-8 max-w-xl rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/[0.06]">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-amber-300"
            />
          </div>

          <h2 className="mt-3 text-sm font-semibold text-white">
            No open positions
          </h2>

          <p className="mt-1.5 text-sm leading-relaxed text-white/45">
            There are currently no open roles at Sangeet. New opportunities
            will appear here when positions become available.
          </p>
        </div>

        {/* Future opportunities */}
        <div className="mt-8 border-t border-white/[0.08] pt-7">
          <h2 className="text-h2 text-white">
            What we're looking for
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="text-sm font-semibold text-white">
                Product
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                People who care about simple, intuitive products.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="text-sm font-semibold text-white">
                Engineering
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                Builders who enjoy creating fast and reliable experiences.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h3 className="text-sm font-semibold text-white">
                Design
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                Designers who turn complex ideas into elegant experiences.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-white/[0.08] pt-5 text-center">
          <p className="text-caption text-white/30">
            Keep an eye on this page for future opportunities at Sangeet.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Careers;