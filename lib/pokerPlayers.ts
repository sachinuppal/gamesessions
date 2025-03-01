// List of famous international poker players
export const famousPokerPlayers = [
  "Phil Ivey",
  "Daniel Negreanu",
  "Doyle Brunson",
  "Phil Hellmuth",
  "Johnny Chan",
  "Erik Seidel",
  "Fedor Holz",
  "Vanessa Selbst",
  "Justin Bonomo",
  "Bryn Kenney",
  "Dan Bilzerian",
  "Antonio Esfandiari",
  "Jason Koon",
  "Patrik Antonius",
  "Tom Dwan",
  "Gus Hansen",
  "Jennifer Harman",
  "Maria Ho",
  "Liv Boeree",
  "Chris Moneymaker",
  "Scotty Nguyen",
  "Tony G",
  "Sam Trickett",
  "Stephen Chidwick",
  "David Peters"
];

// Get a random selection of unique poker player names
export const getRandomPokerPlayers = (count: number): string[] => {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...famousPokerPlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
};