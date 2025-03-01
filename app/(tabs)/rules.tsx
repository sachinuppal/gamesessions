import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type GameType = 'poker' | 'rummy' | 'bridge' | 'sequence' | 'chess' | 'scrabble' | 'housie' | 'codenames';

export default function RulesScreen() {
  const [selectedGame, setSelectedGame] = useState<GameType>('poker');

  const renderPokerRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Poker Hand Rankings</Text>
      <Text style={styles.subtitle}>
        From strongest to weakest, here are all the poker hands you need to know
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#1</Text>
          <Text style={styles.handName}>Royal Flush</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            The highest possible hand: ten, jack, queen, king, ace, all of the same suit.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>A♠ K♠ Q♠ J♠ 10♠</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#2</Text>
          <Text style={styles.handName}>Straight Flush</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Five consecutive cards of the same suit.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>9♣ 8♣ 7♣ 6♣ 5♣</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#3</Text>
          <Text style={styles.handName}>Four of a Kind</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Four cards of the same rank.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>K♠ K♣ K♦ K♥ 7♦</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#4</Text>
          <Text style={styles.handName}>Full House</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Three cards of one rank and two of another.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>J♥ J♣ J♦ 8♠ 8♥</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#5</Text>
          <Text style={styles.handName}>Flush</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Any five cards of the same suit.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>A♥ J♥ 8♥ 6♥ 2♥</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#6</Text>
          <Text style={styles.handName}>Straight</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Five consecutive cards of different suits.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>9♥ 8♣ 7♠ 6♦ 5♥</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#7</Text>
          <Text style={styles.handName}>Three of a Kind</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Three cards of the same rank.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>Q♠ Q♣ Q♦ 8♥ 4♠</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#8</Text>
          <Text style={styles.handName}>Two Pair</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Two different pairs of cards.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>10♥ 10♣ 8♦ 8♠ K♥</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#9</Text>
          <Text style={styles.handName}>One Pair</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Two cards of the same rank.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>A♠ A♥ K♦ Q♣ 4♥</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.rank}>#10</Text>
          <Text style={styles.handName}>High Card</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            When no other hand is made, the highest card plays.
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>A♦ J♠ 8♣ 6♥ 4♦</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderRummyRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Rummy Rules</Text>
      <Text style={styles.subtitle}>
        Basic rules for Indian Rummy (Pool 101 and Pool 201)
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Objective</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            The objective of rummy is to arrange all your cards into valid sets and sequences, and then make a valid declaration.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Valid Combinations</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Sequence:</Text> Three or more consecutive cards of the same suit.
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Set:</Text> Three or four cards of the same rank but different suits.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Pool 101 vs Pool 201</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Pool 101:</Text> Players are eliminated when their score reaches or exceeds 101 points.
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Pool 201:</Text> Players are eliminated when their score reaches or exceeds 201 points.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Scoring</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Face cards (K, Q, J):</Text> 10 points each
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Ace:</Text> 10 points
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Number cards:</Text> Face value (e.g., 8 of hearts = 8 points)
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Jokers:</Text> 0 points
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Winning</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            The last player remaining after all others have been eliminated wins the game and the prize pool.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderBridgeRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Bridge Rules</Text>
      <Text style={styles.subtitle}>
        Basic rules for Contract Bridge
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Game Overview</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Contract Bridge is played by four players in two partnerships, with partners sitting opposite each other.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Dealing</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Each player gets 13 cards</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Deal rotates clockwise</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Teams are North-South and East-West</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Bidding</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Starts with dealer</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Each bid must be higher than the last</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Can pass instead of bidding</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Bidding ends after three consecutive passes</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Playing the Hand</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Declarer plays both their hand and dummy</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Must follow suit if possible</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Highest card of led suit wins trick</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Trump suit outranks other suits</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Scoring</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Points for making contract</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Bonus points for game and slam contracts</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Penalties for failing to make contract</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSequenceRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Sequence Rules</Text>
      <Text style={styles.subtitle}>
        Basic rules for playing Sequence
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Game Overview</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            Sequence is a board and card game where players try to form rows of five chips on the board by playing cards from their hand.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Setup</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• 2-12 players in 2 or 3 teams</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Each player gets 6-7 cards</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Teams use different colored chips</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Playing the Game</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Play a card from your hand</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Place a chip on matching board space</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Draw a new card</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Jacks have special rules</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Winning</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Form two sequences to win</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Sequences must be 5 chips in a row</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Can be horizontal, vertical, or diagonal</Text>
          </Text>
        </View>
      </View>
    </View>
  );

  const renderChessRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Chess Rules</Text>
      <Text style={styles.subtitle}>
        Basic rules and time controls for chess
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Game Setup</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Board setup:</Text> 8x8 squares, alternating colors
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Piece placement:</Text> Specific starting positions for each piece
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• White moves first</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Time Controls</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Bullet:</Text> 1 minute + 0 seconds increment
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Blitz:</Text> 3 minutes + 2 seconds or 5 minutes + 0 seconds
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Rapid:</Text> 10 minutes + 0 seconds or 15 minutes + 10 seconds
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Classical:</Text> 30 minutes or more
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Basic Rules</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Each piece moves differently</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Capture opponent's pieces by moving onto their square</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Check: King is under attack</Text>
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Checkmate: King is in check with no legal moves</Text>
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Special Moves</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Castling:</Text> King and rook special move
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• En Passant:</Text> Special pawn capture
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Pawn Promotion:</Text> Pawn reaches opposite end
          </Text>
        </View>
      </View>
    </View>
  );

  const renderScrabbleRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Scrabble Rules</Text>
      <Text style={styles.subtitle}>
        Basic rules and scoring for Scrabble
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Game Setup</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            2-4 players compete to score points by forming words on a 15×15 board using letter tiles.
          </Text>
          <Text style={styles.description}>
            Each player draws 7 tiles from the bag to start.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Playing Words</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Valid Words:</Text>
          </Text>
          <Text style={styles.description}>• Must be in the official Scrabble dictionary</Text>
          <Text style={styles.description}>• Must connect to existing words</Text>
          <Text style={styles.description}>• Must read left to right or top to bottom</Text>
          <Text style={styles.description}>• First word must cover center star</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Premium Squares</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Letter Multipliers:</Text>
          </Text>
          <Text style={styles.description}>• Double Letter Score (DLS)</Text>
          <Text style={styles.description}>• Triple Letter Score (TLS)</Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Word Multipliers:</Text>
          </Text>
          <Text style={styles.description}>• Double Word Score (DWS)</Text>
          <Text style={styles.description}>• Triple Word Score (TWS)</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Scoring</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Basic Points:</Text> Each letter has a point value (1-10)
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Multipliers:</Text> Apply letter multipliers first, then word multipliers
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Bingo Bonus:</Text> +50 points for using all 7 tiles
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Special Moves</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>Exchange:</Text> Trade any number of tiles (miss your turn)
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Pass:</Text> Skip your turn
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>Challenge:</Text> Contest opponent's word (no penalty in tournament play)
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Game End</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>Game ends when:</Text>
          <Text style={styles.description}>• All tiles are drawn and one player uses all their tiles</Text>
          <Text style={styles.description}>• No more plays are possible</Text>
          <Text style={styles.description}>• All players pass twice in succession</Text>
          <Text style={styles.description}>
            Subtract the value of remaining tiles from final scores
          </Text>
        </View>
      </View>
    </View>
  );

  const renderHousieRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Housie Rules</Text>
      <Text style={styles.subtitle}>
        Basic rules for playing Housie (also known as Tambola or Bingo)
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Game Setup</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Tickets:</Text> Each player buys one or more tickets
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Numbers:</Text> 1-90 are used in the game
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Ticket Format:</Text> 3 rows × 9 columns with 5 numbers per row
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Gameplay</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Number Calling:</Text> Numbers are randomly drawn and announced
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Marking:</Text> Players mark called numbers on their tickets
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Verification:</Text> Winners must be verified by checking called numbers
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Winning Patterns</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Early Five:</Text> First to mark any 5 numbers
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Top Line:</Text> Complete the top row
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Middle Line:</Text> Complete the middle row
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Bottom Line:</Text> Complete the bottom row
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Full House:</Text> Complete all numbers on the ticket
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Prizes</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Multiple Prizes:</Text> Different prizes for each winning pattern
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Full House:</Text> Usually carries the largest prize
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Claims:</Text> Must be made immediately when achieved
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCodenamesRules = () => (
    <View style={styles.rulesContainer}>
      <Text style={styles.title}>Codenames Rules</Text>
      <Text style={styles.subtitle}>
        Basic rules for the team-based word guessing game
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Game Setup</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Teams:</Text> Players split into Red and Blue teams
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Roles:</Text> Each team has a Spymaster and Operatives
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Grid:</Text> 5×5 grid of word cards
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Gameplay</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Spymaster's Turn:</Text>
          </Text>
          <Text style={styles.description}>• Gives one-word clue and a number</Text>
          <Text style={styles.description}>• Number indicates how many words relate to clue</Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Team's Turn:</Text>
          </Text>
          <Text style={styles.description}>• Discuss and guess words</Text>
          <Text style={styles.description}>• Can guess up to number + 1 words</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Special Cards</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Innocent Bystander:</Text> Ends team's turn
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Opponent's Agent:</Text> Helps opponent, ends turn
          </Text>
          <Text style={styles.description}>
            <Text style={styles.bold}>• Assassin:</Text> Immediately ends game, team loses
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.handName}>Winning</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>Team wins by either:</Text>
          <Text style={styles.description}>• Finding all their agents first</Text>
          <Text style={styles.description}>• Opponent team reveals the Assassin</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gameSelector}>
        <Pressable
          style={[styles.gameOption, selectedGame === 'poker' && styles.selectedGameOption]}
          onPress={() => setSelectedGame('poker')}>
          <MaterialCommunityIcons 
            name="cards-playing" 
            size={16} 
            color={selectedGame === 'poker' ? '#FF5A
            }
  )
  )
}