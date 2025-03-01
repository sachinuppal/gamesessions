import { supabase } from './supabase';
import { isConnected } from './networkUtils';

// Check if a session should be auto-terminated (24 hours)
export const shouldAutoTerminateSession = (createdAt: string): boolean => {
  const sessionDate = new Date(createdAt);
  const now = new Date();
  const diffInHours = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
  return diffInHours >= 24;
};

// Check if a settlement should be marked as settled by goons (7 days)
export const shouldMarkSettledByGoons = (createdAt: string): boolean => {
  const settlementDate = new Date(createdAt);
  const now = new Date();
  const diffInDays = (now.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffInDays >= 7;
};

// Auto-terminate sessions that have been active for more than 24 hours
export const autoTerminateSessions = async (): Promise<void> => {
  try {
    // Check if device is online before proceeding
    const online = await isConnected();
    if (!online) {
      console.log('Device is offline, skipping auto-termination check');
      return;
    }

    // Get all active sessions with a timeout
    const sessionPromise = supabase
      .from('sessions')
      .select('*')
      .eq('status', 'active')
      .is('deleted_at', null);
    
    // Add a timeout to the promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Sessions query timed out')), 5000);
    });
    
    // Race the promises
    const { data: activeSessions, error: sessionsError } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]) as any;

    if (sessionsError) throw sessionsError;

    // Filter sessions that should be auto-terminated
    const sessionsToTerminate = activeSessions?.filter(session => 
      shouldAutoTerminateSession(session.created_at)
    ) || [];

    // Auto-terminate each session
    for (const session of sessionsToTerminate) {
      // Get players for this session with timeout
      const playersPromise = supabase
        .from('players')
        .select('*')
        .eq('session_id', session.id);
      
      const playersTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Players query timed out')), 5000);
      });
      
      const { data: players, error: playersError } = await Promise.race([
        playersPromise,
        playersTimeoutPromise
      ]) as any;

      if (playersError) {
        console.error('Error fetching players:', playersError);
        continue; // Skip this session but continue with others
      }

      // Distribute chips evenly among players (simplified approach)
      const totalBuyIn = players?.reduce((sum, player) => sum + player.total_buy_in, 0) || 0;
      const playerCount = players?.length || 1;
      const chipsPerPlayer = Math.floor(totalBuyIn / playerCount);

      // Update each player's final chips and net amount
      for (const player of players || []) {
        try {
          await supabase
            .from('players')
            .update({
              final_chips: chipsPerPlayer,
              net_amount: chipsPerPlayer - player.total_buy_in
            })
            .eq('id', player.id);
        } catch (error) {
          console.error('Error updating player:', error);
          // Continue with other players
        }
      }

      // Mark session as completed and self-destructed
      try {
        await supabase
          .from('sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            self_destructed: true
          })
          .eq('id', session.id);
      } catch (error) {
        console.error('Error updating session:', error);
        // Continue with other sessions
      }
    }
  } catch (error) {
    console.error('Error auto-terminating sessions:', error);
    // Don't rethrow, just log the error
  }
};

// Mark settlements as settled by goons if they're older than 7 days
export const markSettlementsByGoons = async (): Promise<void> => {
  try {
    // Check if device is online before proceeding
    const online = await isConnected();
    if (!online) {
      console.log('Device is offline, skipping settlements check');
      return;
    }
    
    // Get all unsettled settlements with timeout
    const settlementsPromise = supabase
      .from('settlements')
      .select('*')
      .eq('settled', false)
      .is('settled_by_goons', false);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Settlements query timed out')), 5000);
    });
    
    const { data: unsettledSettlements, error: settlementsError } = await Promise.race([
      settlementsPromise,
      timeoutPromise
    ]) as any;

    if (settlementsError) throw settlementsError;

    // Filter settlements that should be marked as settled by goons
    const settlementsToMark = unsettledSettlements?.filter(settlement => 
      shouldMarkSettledByGoons(settlement.created_at)
    ) || [];

    // Mark each settlement as settled by goons
    for (const settlement of settlementsToMark) {
      try {
        await supabase
          .from('settlements')
          .update({
            settled: true,
            settled_at: new Date().toISOString(),
            settled_by_goons: true
          })
          .eq('id', settlement.id);
      } catch (error) {
        console.error('Error marking settlement:', error);
        // Continue with other settlements
      }
    }
  } catch (error) {
    console.error('Error marking settlements by goons:', error);
    // Don't rethrow, just log the error
  }
};