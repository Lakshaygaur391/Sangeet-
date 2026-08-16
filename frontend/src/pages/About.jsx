const About = () => {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-lg shadow-black/20 md:p-8">
      <p className="text-meta text-amber-300">About</p>

      <h1 className="text-h1 mt-1 text-white">
        About Sangeet
      </h1>

      <p className="text-body mt-4 leading-relaxed text-white/70">
        <strong className="text-white">Sangeet</strong> is a modern music
        streaming and discovery platform designed to make listening to music
        simple, fast, and enjoyable. Built with a focus on performance,
        accessibility, and a seamless user experience, Sangeet brings your
        music experience together in one clean and intuitive interface.
      </p>

      <p className="text-body mt-4 leading-relaxed text-white/70">
        Discover music across different genres and languages, search for your
        favorite tracks, explore new releases, and enjoy a smooth listening
        experience across devices. Sangeet is designed with a responsive
        architecture that keeps the experience consistent on desktop, tablet,
        and mobile screens.
      </p>

      <p className="text-body mt-4 leading-relaxed text-white/70">
        The platform is built using modern web technologies including{" "}
        <strong className="text-white">React</strong>,{" "}
        <strong className="text-white">Vite</strong>, and{" "}
        <strong className="text-white">Tailwind CSS</strong>, with a strong
        emphasis on scalable architecture, responsive design, optimized
        performance, and maintainable code.
      </p>

      <p className="text-body mt-4 leading-relaxed text-white/70">
        Our goal with <strong className="text-white">Sangeet</strong> is to
        create a reliable and enjoyable music platform that puts discovery,
        simplicity, and the listening experience first.
      </p>

      <div className="text-caption mt-6 border-t border-white/10 pt-4 italic text-white/50">
        — Sangeet · Music, simplified.
      </div>
    </div>
  );
};

export default About;