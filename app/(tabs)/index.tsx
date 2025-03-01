import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Game Session Tracker</Text>
      </View>
      
      <Text style={styles.subtitle}>Choose your game</Text>
      
      <View style={styles.gamesContainer}>
        <Link href="/poker" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="cards-playing" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Poker</Text>
            <Text style={styles.gameDescription}>
              Track chips, buy-ins, and settlements for your poker games
            </Text>
          </Pressable>
        </Link>
        
        <Link href="/rummy" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="cards" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Rummy</Text>
            <Text style={styles.gameDescription}>
              Play Pool 101 or 201 rummy games with score tracking
            </Text>
          </Pressable>
        </Link>
      </View>
      
      <View style={styles.gamesContainer}>
        <Link href="/bridge" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="cards-outline" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Bridge</Text>
            <Text style={styles.gameDescription}>
              Track rubber or duplicate bridge games with team scoring
            </Text>
          </Pressable>
        </Link>
        
        <Link href="/sequence" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="cards-playing-outline" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Sequence</Text>
            <Text style={styles.gameDescription}>
              Track sequence games with teams and rounds
            </Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.gamesContainer}>
        <Link href="/scrabble" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="alpha-a-box" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Scrabble</Text>
            <Text style={styles.gameDescription}>
              Track word scores and rounds in Scrabble games
            </Text>
          </Pressable>
        </Link>
        
        <Link href="/chess" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="chess-king" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Chess</Text>
            <Text style={styles.gameDescription}>
              Track chess matches with time controls and ratings
            </Text>
          </Pressable>
        </Link>
      </View>
      
      <View style={styles.gamesContainer}>
        <Link href="/housie" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="grid" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Housie</Text>
            <Text style={styles.gameDescription}>
              Track Housie/Tambola games with number calling
            </Text>
          </Pressable>
        </Link>
        
        <Link href="/codenames" asChild>
          <Pressable style={styles.gameCard}>
            <MaterialCommunityIcons name="incognito" size={48} color="#FF5A5F" />
            <Text style={styles.gameTitle}>Codenames</Text>
            <Text style={styles.gameDescription}>
              Track team-based word guessing games
            </Text>
          </Pressable>
        </Link>
      </View>
      
      <View style={styles.quickAccessContainer}>
        <Text style={styles.quickAccessTitle}>Quick Access</Text>
        
        <View style={styles.statsContainer}>
          <Link href="/history" asChild>
            <Pressable style={styles.statCard}>
              <MaterialCommunityIcons name="history" size={24} color="#FF5A5F" />
              <Text style={styles.statText}>Game History</Text>
            </Pressable>
          </Link>
          
          <Link href="/rules" asChild>
            <Pressable style={styles.statCard}>
              <MaterialCommunityIcons name="book-open-variant" size={24} color="#FF5A5F" />
              <Text style={styles.statText}>Game Rules</Text>
            </Pressable>
          </Link>
          
          <Link href="/settings" asChild>
            <Pressable style={styles.statCard}>
              <MaterialCommunityIcons name="cog" size={24} color="#FF5A5F" />
              <Text style={styles.statText}>Settings</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#484848',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#484848',
    marginBottom: 16,
  },
  gamesContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  gameCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#484848',
    marginTop: 12,
    marginBottom: 8,
  },
  gameDescription: {
    fontSize: 14,
    color: '#767676',
    textAlign: 'center',
  },
  quickAccessContainer: {
    marginBottom: 16,
    marginTop: 16,
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#484848',
    marginBottom: 16,
  },
  statsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLink: {
    flex: 1,
    marginLeft: 16,
  },
  statText: {
    color: '#484848',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
});