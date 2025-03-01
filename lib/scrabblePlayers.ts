// List of famous Scrabble players and word game enthusiasts
export const famousScrabblePlayers = [
  "Nigel Richards",
  "David Eldar",
  "Joel Sherman",
  "Harshan Lamabadusuriya",
  "Pakorn Nemitrmansuk",
  "Ganesh Asirvatham",
  "Panupol Sujjayakorn",
  "Dave Wiegand",
  "Sammy Okosagah",
  "Conrad Bassett-Bouchard",
  "Will Anderson",
  "John Chew",
  "Komol Panyasophonlert",
  "Brett Smitheram",
  "Craig Beevers",
  "Allan Simmons",
  "Odette Rio",
  "Toh Weibin",
  "Evan Berofsky",
  "Marlon Hill",
  "Naomi Landau",
  "Nicky Vile",
  "Mikki Nicholson",
  "Akshay Bhandarkar",
  "Sherrie Saint"
];

// Get a random selection of unique Scrabble player names
export const getRandomScrabblePlayers = (count: number): string[] => {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...famousScrabblePlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
};