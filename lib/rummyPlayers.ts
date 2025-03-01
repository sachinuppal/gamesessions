// List of famous Indian rummy players and celebrities known to play rummy
export const famousRummyPlayers = [
  "Virat Kohli",
  "MS Dhoni",
  "Sachin Tendulkar",
  "Aamir Khan",
  "Shah Rukh Khan",
  "Amitabh Bachchan",
  "Deepika Padukone",
  "Priyanka Chopra",
  "Anushka Sharma",
  "Rohit Sharma",
  "Ravindra Jadeja",
  "Hardik Pandya",
  "Saina Nehwal",
  "PV Sindhu",
  "Sania Mirza",
  "Rahul Dravid",
  "Anil Kumble",
  "Kapil Dev",
  "Sunil Gavaskar",
  "Ranbir Kapoor",
  "Ranveer Singh",
  "Akshay Kumar",
  "Salman Khan",
  "Kareena Kapoor",
  "Katrina Kaif"
];

// Get a random selection of unique rummy player names
export const getRandomRummyPlayers = (count: number): string[] => {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...famousRummyPlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
};