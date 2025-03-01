import React, { useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type GameDrawerRef = {
  open: () => void;
  close: () => void;
};

const GameDrawer = forwardRef<GameDrawerRef, {}>((_, ref) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    open: () => {
      bottomSheetRef.current?.expand();
    },
    close: () => {
      bottomSheetRef.current?.close();
    }
  }));

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['70%'], []);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  // Game options
  const games = [
    {
      id: 'poker',
      name: 'Poker',
      icon: 'cards-playing',
      route: '/poker',
      description: 'Track chips, buy-ins, and settlements'
    },
    {
      id: 'rummy',
      name: 'Rummy',
      icon: 'cards',
      route: '/rummy',
      description: 'Play Pool 101 or 201 with score tracking'
    },
    {
      id: 'bridge',
      name: 'Bridge',
      icon: 'cards-outline',
      route: '/bridge',
      description: 'Track rubber or duplicate bridge games'
    },
    {
      id: 'sequence',
      name: 'Sequence',
      icon: 'cards-playing-outline',
      route: '/sequence',
      description: 'Track sequence games with teams'
    },
    {
      id: 'scrabble',
      name: 'Scrabble',
      icon: 'alpha-a-box',
      route: '/scrabble',
      description: 'Track word scores and rounds'
    },
    {
      id: 'chess',
      name: 'Chess',
      icon: 'chess-king',
      route: '/chess',
      description: 'Track chess matches with time controls'
    },
    {
      id: 'housie',
      name: 'Housie',
      icon: 'grid',
      route: '/housie',
      description: 'Track Housie/Tambola games'
    },
    {
      id: 'codenames',
      name: 'Codenames',
      icon: 'incognito',
      route: '/codenames',
      description: 'Track team-based word guessing games'
    }
  ];

  const navigateToGame = (route: string) => {
    bottomSheetRef.current?.close();
    setTimeout(() => {
      router.push(route);
    }, 300); // Small delay to allow the drawer to close
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.indicator}
      backgroundStyle={styles.sheetBackground}
    >
      <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>Select a Game</Text>
        
        <View style={styles.gamesContainer}>
          {games.map((game) => (
            <Pressable
              key={game.id}
              style={styles.gameOption}
              onPress={() => navigateToGame(game.route)}
            >
              <View style={styles.gameIconContainer}>
                <MaterialCommunityIcons name={game.icon as any} size={32} color="#FF5A5F" />
              </View>
              <View style={styles.gameTextContainer}>
                <Text style={styles.gameName}>{game.name}</Text>
                <Text style={styles.gameDescription}>{game.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#767676" />
            </Pressable>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#ffffff',
  },
  indicator: {
    backgroundColor: '#767676',
    width: 40,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#484848',
    marginBottom: 24,
    textAlign: 'center',
  },
  gamesContainer: {
    marginBottom: 24,
  },
  gameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  gameIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  gameTextContainer: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#484848',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: '#767676',
  },
});

export default GameDrawer;