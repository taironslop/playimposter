import { supabase } from './supabaseClient';
import { getRandomWordAndCategory, getRandomWord, WORD_CATEGORIES } from './gameData';

export const getCategories = () => Object.keys(WORD_CATEGORIES);

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createRoom = async (playerName) => {
  const roomCode = generateRoomCode();
  
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      code: roomCode,
      status: 'LOBBY'
    })
    .select()
    .single();

  if (roomError) {
    console.error('Error creating room:', roomError);
    throw roomError;
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_code: roomCode,
      name: playerName
    })
    .select()
    .single();

  if (playerError) {
    console.error('Error creating player:', playerError);
    throw playerError;
  }

  return { room, player };
};

export const joinRoom = async (roomCode, playerName) => {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode.toUpperCase())
    .single();

  if (roomError) {
    console.error('Error finding room:', roomError);
    throw new Error('Sala no encontrada');
  }

  if (room.status !== 'LOBBY') {
    throw new Error('La partida ya comenzó');
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_code: roomCode.toUpperCase(),
      name: playerName
    })
    .select()
    .single();

  if (playerError) {
    console.error('Error joining room:', playerError);
    throw playerError;
  }

  return { room, player };
};

export const getRoom = async (roomCode) => {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .single();

  if (error) {
    console.error('Error getting room:', error);
    throw error;
  }

  return room;
};

export const getPlayers = async (roomCode) => {
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting players:', error);
    throw error;
  }

  return players;
};

export const subscribeToRoom = (roomCode, onRoomChange, onPlayersChange) => {
  const roomSubscription = supabase
    .channel(`room:${roomCode}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${roomCode}`
      },
      (payload) => {
        console.log('Room change:', payload);
        onRoomChange(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_code=eq.${roomCode}`
      },
      async () => {
        const players = await getPlayers(roomCode);
        onPlayersChange(players);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(roomSubscription);
  };
};

export const startGame = async (roomCode, selectedCategory = null) => {
  const players = await getPlayers(roomCode);
  
  if (players.length < 3) {
    throw new Error('Se necesitan al menos 3 jugadores para comenzar');
  }

  let category, word;
  
  if (selectedCategory && WORD_CATEGORIES[selectedCategory]) {
    category = selectedCategory;
    word = getRandomWord(category);
  } else {
    const result = getRandomWordAndCategory();
    category = result.category;
    word = result.word;
  }

  const randomIndex = Math.floor(Math.random() * players.length);
  const impostorId = players[randomIndex].id;

  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      status: 'PLAYING',
      category: category,
      secret_word: word,
      impostor_id: impostorId,
      updated_at: new Date().toISOString()
    })
    .eq('code', roomCode)
    .select()
    .single();

  if (error) {
    console.error('Error starting game:', error);
    throw error;
  }

  return room;
};

export const startVoting = async (roomCode) => {
  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      status: 'VOTING',
      updated_at: new Date().toISOString()
    })
    .eq('code', roomCode)
    .select()
    .single();

  if (error) {
    console.error('Error starting voting:', error);
    throw error;
  }

  return room;
};

export const leaveRoom = async (playerId) => {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId);

  if (error) {
    console.error('Error leaving room:', error);
    throw error;
  }
};

export const voteFor = async (voterId, targetId) => {
  const { data, error } = await supabase
    .from('players')
    .update({ voted_for: targetId })
    .eq('id', voterId)
    .select()
    .single();

  if (error) {
    console.error('Error voting:', error);
    throw error;
  }

  return data;
};

export const clearVotes = async (roomCode) => {
  const { error } = await supabase
    .from('players')
    .update({ voted_for: null })
    .eq('room_code', roomCode);

  if (error) {
    console.error('Error clearing votes:', error);
    throw error;
  }
};

export const resumeDiscussion = async (roomCode) => {
  await clearVotes(roomCode);

  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      status: 'PLAYING',
      updated_at: new Date().toISOString()
    })
    .eq('code', roomCode)
    .select()
    .single();

  if (error) {
    console.error('Error resuming discussion:', error);
    throw error;
  }

  return room;
};

export const eliminatePlayer = async (playerId) => {
  const { data, error } = await supabase
    .from('players')
    .update({ is_alive: false })
    .eq('id', playerId)
    .select()
    .single();

  if (error) {
    console.error('Error eliminating player:', error);
    throw error;
  }

  return data;
};

export const getVoteCounts = (players) => {
  const counts = {};
  
  players.forEach(player => {
    if (player.voted_for) {
      counts[player.voted_for] = (counts[player.voted_for] || 0) + 1;
    }
  });

  return counts;
};

export const checkVotingComplete = (players) => {
  const alivePlayers = players.filter(p => p.is_alive);
  const votedPlayers = alivePlayers.filter(p => p.voted_for !== null);
  return votedPlayers.length === alivePlayers.length;
};

export const getVotingResult = (players) => {
  const alivePlayers = players.filter(p => p.is_alive);
  const voteCounts = getVoteCounts(alivePlayers);
  
  const entries = Object.entries(voteCounts);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  
  if (entries.length > 1 && entries[0][1] === entries[1][1]) {
    return { tie: true, topVotes: entries[0][1] };
  }

  return { 
    tie: false, 
    eliminatedId: entries[0][0], 
    votes: entries[0][1] 
  };
};

export const finishGame = async (roomCode, winnersAreImpostors) => {
  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      status: 'FINISHED',
      updated_at: new Date().toISOString()
    })
    .eq('code', roomCode)
    .select()
    .single();

  if (error) {
    console.error('Error finishing game:', error);
    throw error;
  }

  return room;
};

export const resetPlayersForNewGame = async (roomCode) => {
  const { error } = await supabase
    .from('players')
    .update({ 
      is_alive: true, 
      voted_for: null 
    })
    .eq('room_code', roomCode);

  if (error) {
    console.error('Error resetting players:', error);
    throw error;
  }
};

export const returnToLobby = async (roomCode) => {
  await resetPlayersForNewGame(roomCode);

  const { data: room, error } = await supabase
    .from('rooms')
    .update({
      status: 'LOBBY',
      category: null,
      secret_word: null,
      impostor_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('code', roomCode)
    .select()
    .single();

  if (error) {
    console.error('Error returning to lobby:', error);
    throw error;
  }

  return room;
};
