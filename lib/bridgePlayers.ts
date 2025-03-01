// List of famous international bridge players
export const famousBridgePlayers = [
  "Bob Hamman",
  "Zia Mahmood",
  "Jeff Meckstroth",
  "Eric Rodwell",
  "Bobby Wolff",
  "Geir Helgemo",
  "Tor Helness",
  "Giorgio Duboin",
  "Norberto Bocchi",
  "Alfredo Versace",
  "Lorenzo Lauria",
  "Fulvio Fantoni",
  "Claudio Nunes",
  "Agustin Madala",
  "Cezary Balicki",
  "Adam Zmudzinski",
  "Michael Rosenberg",
  "Boye Brogeland",
  "Sabine Auken",
  "Marion Michielsen",
  "Nicola Smith",
  "Benedicte Cronier",
  "Sylvie Willard",
  "Jill Meyers",
  "Kerri Sanborn"
];

// Get a random selection of unique bridge player names
export const getRandomBridgePlayers = (count: number): string[] => {
  // Shuffle the array using Fisher-Yates algorithm
  const shuffled = [...famousBridgePlayers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return the first 'count' elements
  return shuffled.slice(0, count);
};