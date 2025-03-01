// List of famous board game players and celebrities known to play sequence
export const famousSequencePlayers = [
  "Magnus Carlsen",
  "Garry Kasparov",
  "Hikaru Nakamura",
  "Judit Polgar",
  "Fabiano Caruana",
  "Wesley So",
  "Levon Aronian",
  "Viswanathan Anand",
  "Anatoly Karpov",
  "Bobby Fischer",
  "Ding Liren",
  "Ian Nepomniachtchi",
  "Maxime Vachier-Lagrave",
  "Anish Giri",
  "Alexander Grischuk",
  "Shakhriyar Mamedyarov",
  "Teimour Radjabov",
  "Wang Hao",
  "Richard Garfield",
  "Reiner Knizia",
  "Klaus Teuber",
  "Uwe Rosenberg",
  "Stefan Feld",
  "Martin Wallace",
  "Vlaada Chvátil"
];

// Get a random selection of unique sequence player names
export const getRandomSequencePlayers = (count: number): string[] => {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...famousSequencePlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
};