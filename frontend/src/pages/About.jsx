const About = () => {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-lg shadow-black/20 md:p-8">
      <p className="text-meta text-amber-300">About</p>
      <h1 className="text-h1 mt-1 text-white">About Sangeet</h1>

      <p className="text-body mt-4 leading-relaxed text-white/70">
        <strong className="text-white">Sangeet</strong> is a modern, React-based music web
        application built with <strong className="text-white">Vite</strong> for fast performance
        and a modular architecture — designed to give you a sleek, responsive way to explore and
        listen to music.
      </p>

      <p className="text-body mt-4 leading-relaxed text-white/70">
        Music data is powered by the <strong className="text-white">YouTube API</strong>, letting
        Sangeet dynamically surface trending tracks, search results, and real audio streaming
        across a wide range of genres and languages.
      </p>

      <p className="text-body mt-4 leading-relaxed text-white/70">
        This project is part of an ongoing learning journey combining React front-end development
        with external APIs — with a focus on smooth UX, thoughtful state management, and a
        responsive interface built with Tailwind CSS.
      </p>

      <div className="text-caption mt-6 border-t border-white/10 pt-4 italic">
        — Built with React and the YouTube Data API.
      </div>
    </div>
  );
};

export default About;
