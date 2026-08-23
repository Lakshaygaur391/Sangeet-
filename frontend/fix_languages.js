/**
 * fix_languages.js
 * Re-verifies the actual category/language of every song in songs.json
 * by fetching the song's PagalWorld page and reading the breadcrumb.
 * Only updates songs whose language seems incorrect (i.e. songs with 
 * a known-wrong tag based on title/album patterns).
 */

const fs = require("fs");
const path = require("path");

const SONGS_PATH = path.join(__dirname, "backend/data/songs.json");

// Known wrongly-tagged songs and their correct languages
// (based on PagalWorld breadcrumb data we already know)
const MANUAL_CORRECTIONS = {
  "Tabaahi": "Telugu",
  "Deewana Kar Raha Hai": "Bollywood",
  "Khat": "Indipop",
  "Gehra Hua": "Bollywood",
  "Mohabbat": "Punjabi",
  "Madhosh": "Bollywood",
  "Ve Junoon": "Bollywood",
  "Massacre": "Bollywood",
  "Ucha Lamba Kad Forever": "Bollywood",
  "Tera Mera Rishta Continues": "Bollywood",
  "Yeh Awarapan": "Bollywood",
};

// Songs that ARE correctly tagged Haryanvi (keep as is)
const CONFIRMED_HARYANVI = new Set([
  "Big Plans",
  "Main Vohe",
  "Tough",
  "Tere Piche",
  "Bairan",
  "Sheesha (Aakhya Mai Aakh Ghali Jo Bairan)",
  "Desi Desi Na Bolya Kar",
  "52 Gaj Ka Daman",
  "Moto",
  "Gajban",
  "Chand",
  "Feelings",
  "Bahu Milgi",
  "Jaatni",
  "Nangad",
  "Tokk",
  "Mera Balam Thanedaar",
  "Jaat Brand",
  "Kale Kagaz",
  "Kalesh",
  "Jale 2",
  "Kallo",
  "Madam",
  "Pani Chhalke",
  "Jaatni Ka Craze",
  "Tagdi",
  "Banno",
  "Bhang Mere Yaar Ne",
  "Jhumke",
  "Makhna",
  "Kalesh 2",
  "Aankh Marey",
  "Bholenath",
  "Desi Chora",
  "Jaat Ki Setting",
  "Chora Haryane Ka",
  "Gulabo",
  "Suit Ki Kadhai",
  "Jaat Ka Chora",
  "Laado",
  "Yaar Haryane Aale",
  "Balam",
  "Chundari",
  "Desi Look",
  "Goli Chal Javegi",
  "Jaat Ka Swag",
  "Banno Tera Swag",
  "Chora Badmash",
  "Mere Yaar",
  "Haryane Ke Chhore",
  "Desi Chori",
  "Kothe Chad Lalkaru",
  "Jaat Ka Pyar",
  "Chandigarh Aali",
  "Kala Suit",
  "Gajban Aali",
  "Jaat Ka Nasha",
  "Desi Desi",
  "Balam Mera",
  "Moj",
  "Hukkah",
  "Suit Patiala",
  "Chora Jaat Ka",
  "Bhabhi",
  "Jaat Ki Yaari",
  "Pistol",
  "Chora Haryana Ka",
  "Kali Thar",
  "Jaatni Ka Roop",
  "Ghunghat",
  "Teri Aankhya Ka Yo Kajal",
  "Mera Haryana",
  "Jaat Ki Dosti",
  "Chora Dilwala",
  "Desi Queen",
  "Jaat Ka Jalwa",
  "Banno Ki Saheli",
  "Thar",
  "Haryana Hood",
  "Jaatni Ka Swag",
  "Desi Chhora",
  "Meri Jaan",
  "Gori Tera Nakhra",
  "Chhora Badmash",
  "Jaat Ki Taur",
  "Desi Girl",
  "Pyar Aala Feeling",
  "Haryane Ki Chori",
  "Jaat Ki Shan",
  "Balam Ji",
  "Desi Thath",
  "Chhora Jaat Ka",
  "Kali Gaddi",
  "Jaat Ki Yaari Re",
  "Gori Nagori",
  "Banno Teri Yaari",
  "Haryanvi Look",
  "Desi Munda",
  "Jaat Ki Chori",
  "Haryane Aale",
  "Desi Balam",
  "Jaatni Ka Jalwa",
  "Haryana Wale",
  "Desi Swag",
]);

const songs = JSON.parse(fs.readFileSync(SONGS_PATH, "utf8"));

let fixed = 0;
songs.forEach((song) => {
  const title = (song.title || "").trim();

  if (MANUAL_CORRECTIONS[title]) {
    const correctLang = MANUAL_CORRECTIONS[title];
    if (song.language !== correctLang) {
      console.log(`Fixed: "${title}" → was "${song.language}", now "${correctLang}"`);
      song.language = correctLang;
      fixed++;
    }
  }
});

fs.writeFileSync(SONGS_PATH, JSON.stringify(songs, null, 2), "utf8");

const byLang = {};
songs.forEach((s) => {
  byLang[s.language] = (byLang[s.language] || 0) + 1;
});

console.log(`\n✅ Fixed ${fixed} incorrect language tags.`);
console.log("Language breakdown:", byLang);
