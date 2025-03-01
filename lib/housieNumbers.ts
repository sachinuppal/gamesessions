// Generate a random Housie/Tambola ticket
export const generateHousieTicket = (): number[][] => {
  // A Housie ticket has 3 rows and 9 columns
  // Each row has 5 numbers and 4 blank spaces
  // Numbers are arranged in columns: 1-9, 10-19, 20-29, ..., 80-90
  
  const ticket: number[][] = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  
  // For each column, decide which rows will have numbers
  for (let col = 0; col < 9; col++) {
    // Randomly select how many numbers this column will have (1, 2, or 3)
    const numbersInColumn = Math.floor(Math.random() * 3) + 1;
    
    // Randomly select which rows will have numbers
    const rowsWithNumbers: number[] = [];
    while (rowsWithNumbers.length < numbersInColumn) {
      const row = Math.floor(Math.random() * 3);
      if (!rowsWithNumbers.includes(row)) {
        rowsWithNumbers.push(row);
      }
    }
    
    // Generate numbers for this column
    const minNumber = col * 10 + 1;
    const maxNumber = col === 8 ? 90 : (col + 1) * 10;
    
    // Generate unique random numbers for this column
    const columnNumbers: number[] = [];
    while (columnNumbers.length < numbersInColumn) {
      const num = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
      if (!columnNumbers.includes(num)) {
        columnNumbers.push(num);
      }
    }
    
    // Sort the numbers
    columnNumbers.sort((a, b) => a - b);
    
    // Assign numbers to the selected rows
    for (let i = 0; i < numbersInColumn; i++) {
      ticket[rowsWithNumbers[i]][col] = columnNumbers[i];
    }
  }
  
  // Ensure each row has exactly 5 numbers
  for (let row = 0; row < 3; row++) {
    const numbersInRow = ticket[row].filter(num => num !== 0).length;
    
    if (numbersInRow > 5) {
      // Remove excess numbers
      const nonZeroIndices = ticket[row].map((num, idx) => num !== 0 ? idx : -1).filter(idx => idx !== -1);
      const indicesToRemove = [];
      
      while (nonZeroIndices.length - indicesToRemove.length > 5) {
        const randomIndex = Math.floor(Math.random() * nonZeroIndices.length);
        if (!indicesToRemove.includes(nonZeroIndices[randomIndex])) {
          indicesToRemove.push(nonZeroIndices[randomIndex]);
        }
      }
      
      for (const idx of indicesToRemove) {
        ticket[row][idx] = 0;
      }
    } else if (numbersInRow < 5) {
      // Add more numbers
      const zeroIndices = ticket[row].map((num, idx) => num === 0 ? idx : -1).filter(idx => idx !== -1);
      const indicesToFill = [];
      
      while (indicesToFill.length < 5 - numbersInRow) {
        const randomIndex = Math.floor(Math.random() * zeroIndices.length);
        if (!indicesToFill.includes(zeroIndices[randomIndex])) {
          indicesToFill.push(zeroIndices[randomIndex]);
        }
      }
      
      for (const idx of indicesToFill) {
        const minNumber = idx * 10 + 1;
        const maxNumber = idx === 8 ? 90 : (idx + 1) * 10;
        let newNumber;
        
        // Make sure the number is unique in the column
        do {
          newNumber = Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
        } while (ticket[0][idx] === newNumber || ticket[1][idx] === newNumber || ticket[2][idx] === newNumber);
        
        ticket[row][idx] = newNumber;
      }
    }
  }
  
  return ticket;
};

// Generate a list of Housie/Tambola numbers (1-90)
export const generateHousieNumbers = (): number[] => {
  const numbers = Array.from({ length: 90 }, (_, i) => i + 1);
  
  // Shuffle the array using Fisher-Yates algorithm
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  return numbers;
};