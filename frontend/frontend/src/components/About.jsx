import React from "react";
import { IoArrowBackCircleOutline } from "react-icons/io5";
import { Link } from "react-router-dom";


const About = () => {
 
  return (<>
        <Link to="/"><IoArrowBackCircleOutline className="text-3xl  m-4 text-cyan-200 " /></Link>

    <div className="w-[90%] md:w-[80%] lg:w-[60%]  mx-auto px-4 my-6 bg-[rgb(23,23,24)] p-4 rounded-2xl shadow-lg shadow-amber-600/30">

        
      <h1 className="text-3xl font-bold mb-4 text-amber-500 border-b border-amber-600 pb-2">
        About Sangeet 🎧
      </h1>

      <p className="text-gray-300 text-lg leading-relaxed mb-4">
        <strong>Sangeet</strong> is a modern, React-based music web application built using the
        <strong> Vite</strong> development environment for ultra-fast performance and modular
        architecture. It’s designed to give users a sleek, responsive interface for exploring and
        listening to their favorite music seamlessly.
      </p>

      <p className="text-gray-300 text-lg leading-relaxed mb-4">
        The music data is powered by the <strong>YouTube API</strong>, which allows Sangeet to
        dynamically fetch trending tracks, search for songs, and stream real audio directly from
        YouTube — giving users an up-to-date and diverse library of songs across genres.
      </p>

      <p className="text-gray-300 text-lg leading-relaxed">
        This project is part of a personal learning journey to integrate React front-end
        development with external APIs, focusing on smooth user experience, state management, and
        responsive UI using Tailwind CSS.
      </p>

      <div className="mt-6 text-sm text-gray-400 italic">
        — Developed with ❤️ using React, Vite, and YouTube Data API.
      </div>
    </div>
    </>
  );
};

export default About;
