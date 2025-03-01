// List of famous spies and intelligence agents (real and fictional)
export const famousCodenamesPlayers = [
  "James Bond",
  "Jason Bourne",
  "Ethan Hunt",
  "Jack Ryan",
  "Sydney Bristow",
  "Nikita Mears",
  "Michael Westen",
  "Carrie Mathison",
  "George Smiley",
  "Evelyn Salt",
  "Napoleon Solo",
  "Illya Kuryakin",
  "Natasha Romanoff",
  "Nick Fury",
  "Phil Coulson",
  "Peggy Carter",
  "Maxwell Smart",
  "Austin Powers",
  "Jack Bauer",
  "Annie Walker",
  "Auggie Anderson",
  "Mata Hari",
  "Virginia Hall",
  "Richard Sorge",
  "Sidney Reilly"
];

// Get a random selection of unique codenames player names
export const getRandomCodenamesPlayers = (count: number): string[] => {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...famousCodenamesPlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
};