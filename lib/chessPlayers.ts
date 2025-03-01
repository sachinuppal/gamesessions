// List of famous chess players
export const famousChessPlayers = [
  "Magnus Carlsen",
  "Garry Kasparov",
  "Anatoly Karpov",
  "Bobby Fischer",
  "Viswanathan Anand",
  "Vladimir Kramnik",
  "Veselin Topalov",
  "Levon Aronian",
  "Fabiano Caruana",
  "Hikaru Nakamura",
  "Wesley So",
  "Ding Liren",
  "Ian Nepomniachtchi",
  "Maxime Vachier-Lagrave",
  "Anish Giri",
  "Alexander Grischuk",
  "Shakhriyar Mamedyarov",
  "Teimour Radjabov",
  "Boris Gelfand",
  "Peter Svidler",
  "Judit Polgar",
  "Alexandra Kosteniuk",
  "Hou Yifan",
  "Koneru Humpy",
  "Nona Gaprindashvili"
];

// Get a random selection of unique chess player names
export const getRandomChessPlayers = (count: number): string[] => {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...famousChessPlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
};