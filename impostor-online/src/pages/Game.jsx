import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  subscribeToRoom, 
  getRoom, 
  getPlayers, 
  startVoting, 
  resumeDiscussion,
  checkVotingComplete,
  checkVotingResolved,
  getVotingResult,
  eliminatePlayer,
  finishGame,
  returnToLobby
} from '../services/supabaseService';
import VotingPanel from '../components/VotingPanel';
import CountdownOverlay from '../components/CountdownOverlay';

const Game = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode, playerId, playerName } = location.state || {};

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResult, setShowResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownTriggered, setCountdownTriggered] = useState(false);

  const activePlayers = players.filter(p => !p.is_spectator);
  const isHost = activePlayers.length > 0 && activePlayers[0]?.id === playerId;
  const currentPlayer = players.find(p => p.id === playerId);
  const isAlive = currentPlayer?.is_alive;
  const isSpectator = currentPlayer?.is_spectator;

  const processVotingResult = useCallback(async () => {
    const result = getVotingResult(players);

    if (!result) {
      setProcessing(false);
      return;
    }

    if (result.tie) {
      setShowResult({ type: 'tie' });
      setProcessing(false);
      return;
    }

    const eliminatedPlayer = players.find(p => p.id === result.eliminatedId);
    const wasImpostor = eliminatedPlayer?.id === room.impostor_id;

    try {
      await eliminatePlayer(result.eliminatedId);

      if (wasImpostor) {
        await finishGame(roomCode, false);
        setShowResult({ 
          type: 'impostor_caught', 
          player: eliminatedPlayer,
          word: room.secret_word
        });
      } else {
        const remainingAlive = players.filter(
          p => p.is_alive && !p.is_spectator && p.id !== result.eliminatedId
        );
        const impostorAlive = remainingAlive.some(p => p.id === room.impostor_id);
        
        if (!impostorAlive || remainingAlive.length <= 2) {
          await finishGame(roomCode, true);
          const impostor = players.find(p => p.id === room.impostor_id);
          setShowResult({ 
            type: 'impostor_wins', 
            player: eliminatedPlayer,
            impostor: impostor,
            word: room.secret_word
          });
        } else {
          setShowResult({ 
            type: 'innocent_eliminated', 
            player: eliminatedPlayer 
          });
        }
      }
    } catch (err) {
      console.error('Error processing votes:', err);
    } finally {
      setProcessing(false);
    }
  }, [players, room, roomCode]);

  useEffect(() => {
    if (!roomCode || !playerId) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        const roomData = await getRoom(roomCode);
        const playersData = await getPlayers(roomCode);
        setRoom(roomData);
        setPlayers(playersData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading game:', err);
        navigate('/');
      }
    };

    loadData();

    const unsubscribe = subscribeToRoom(
      roomCode,
      (newRoom) => {
        setRoom(newRoom);
        if (newRoom.status === 'LOBBY') {
          navigate('/lobby', { state: { roomCode, playerId, playerName } });
        }
      },
      (newPlayers) => setPlayers(newPlayers)
    );

    const pollId = setInterval(async () => {
      try {
        const [latestRoom, latestPlayers] = await Promise.all([
          getRoom(roomCode),
          getPlayers(roomCode)
        ]);
        setRoom(latestRoom);
        setPlayers(latestPlayers);
      } catch (err) {
        // ignore polling errors
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollId);
    };
  }, [roomCode, playerId, playerName, navigate]);

  useEffect(() => {
    if (
      room?.status === 'VOTING' && 
      !showResult && 
      !countdownTriggered &&
      players.length > 0 &&
      (checkVotingComplete(players) || checkVotingResolved(players))
    ) {
      setCountdownTriggered(true);
      setShowCountdown(true);
    }
  }, [players, room?.status, showResult, countdownTriggered]);

  useEffect(() => {
    if (room?.status === 'PLAYING') {
      setCountdownTriggered(false);
      setShowResult(null);
    }
  }, [room?.status]);

  const isImpostor = room?.impostor_id === playerId;

  const handleStartVoting = async () => {
    if (processing) return;
    if (room?.status !== 'PLAYING') return;
    setError(null);
    setProcessing(true);
    try {
      await startVoting(roomCode);
      const [updatedRoom, updatedPlayers] = await Promise.all([
        getRoom(roomCode),
        getPlayers(roomCode)
      ]);
      setRoom(updatedRoom);
      setPlayers(updatedPlayers);
    } catch (err) {
      console.error('Error starting voting:', err);
      setError('No se pudo iniciar la votación. Reintenta.');
    } finally {
      setProcessing(false);
    }
  };

  const handleResumeDiscussion = async () => {
    setProcessing(true);
    try {
      await resumeDiscussion(roomCode);
      setShowResult(null);
      setCountdownTriggered(false);
    } catch (err) {
      console.error('Error resuming discussion:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReturnToLobby = async () => {
    setProcessing(true);
    try {
      await returnToLobby(roomCode);
    } catch (err) {
      console.error('Error returning to lobby:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCountdownComplete = async () => {
    setShowCountdown(false);
    setProcessing(true);
    await processVotingResult();
  };

  const votingComplete = checkVotingComplete(players);
  const votingResolved = checkVotingResolved(players);

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-white text-xl">Cargando partida...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      {/* Countdown Overlay */}
      {showCountdown && (
        <CountdownOverlay onComplete={handleCountdownComplete} />
      )}

      <div className="max-w-4xl w-full">
        {/* Category Header */}
        <div className="text-center mb-8">
          <span className="text-text-secondary text-lg">Categoría</span>
          <h2 className="text-3xl font-bold text-neon-lime mt-1">{room.category}</h2>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Spectator Notice */}
        {isSpectator && (
          <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-lg mb-6 text-center">
            <span className="font-semibold">👁️ Modo Espectador</span>
            <p className="text-sm mt-1">Estás viendo la partida pero no puedes participar</p>
          </div>
        )}

        {/* Role Card - Only show during PLAYING and not spectator */}
        {room.status === 'PLAYING' && !isSpectator && (
          <div className={`rounded-2xl p-8 mb-8 text-center shadow-2xl border-2 ${
            isImpostor 
              ? 'bg-gradient-to-br from-red-900/50 to-red-950/50 border-red-500' 
              : 'bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border-emerald-500'
          }`}>
            {isImpostor ? (
              <>
                <div className="text-6xl mb-4">🎭</div>
                <h1 className="text-4xl font-black text-red-400 mb-2">
                  ERES EL IMPOSTOR
                </h1>
                <p className="text-red-300/80 text-lg">
                  No conoces la palabra secreta. ¡Finge que la sabes!
                </p>
                <p className="text-text-secondary mt-4 text-sm">
                  Escucha las pistas de los demás e intenta adivinar la palabra
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-emerald-400 text-lg mb-2">La palabra secreta es:</p>
                <h1 className="text-5xl font-black text-white mb-4">
                  {room.secret_word}
                </h1>
                <p className="text-emerald-300/80">
                  Da pistas sutiles sin revelar la palabra
                </p>
              </>
            )}
          </div>
        )}

        {/* Voting Phase */}
        {room.status === 'VOTING' && !showResult && !showCountdown && (
          <div className="game-card mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-yellow-400">🗳️ Votación</h3>
              {isHost && (
                <button
                  onClick={handleResumeDiscussion}
                  disabled={processing}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  ⏪ Continuar Discusión
                </button>
              )}
            </div>
            
            <VotingPanel 
              players={players}
              currentPlayerId={playerId}
              roomCode={roomCode}
            />

            {/* Waiting message when outcome is decided */}
            {(votingComplete || votingResolved) && (
              <div className="mt-6 text-center">
                <p className="text-yellow-400 animate-pulse">
                  ✓ Votación decidida. Procesando...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Voting Result Modal */}
        {showResult && (
          <div className="game-card mb-6">
            {showResult.type === 'tie' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">⚖️</div>
                <h3 className="text-3xl font-bold text-yellow-400 mb-2">¡Empate!</h3>
                <p className="text-text-secondary mb-6">
                  No hubo mayoría. Nadie fue eliminado.
                </p>
                {isHost && (
                  <button
                    onClick={handleResumeDiscussion}
                    disabled={processing}
                    className="neon-button"
                  >
                    Continuar Discusión
                  </button>
                )}
              </div>
            )}

            {showResult.type === 'innocent_eliminated' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">💀</div>
                <h3 className="text-3xl font-bold text-orange-400 mb-2">
                  {showResult.player.name} fue eliminado
                </h3>
                <p className="text-emerald-400 text-xl mb-6">
                  ¡Era inocente! El impostor sigue entre nosotros...
                </p>
                {isHost && (
                  <button
                    onClick={handleResumeDiscussion}
                    disabled={processing}
                    className="neon-button"
                  >
                    Continuar Partida
                  </button>
                )}
              </div>
            )}

            {showResult.type === 'impostor_caught' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-3xl font-bold text-emerald-400 mb-2">
                  ¡Victoria de los Inocentes!
                </h3>
                <p className="text-white text-xl mb-2">
                  {showResult.player.name} era el impostor
                </p>
                <p className="text-text-secondary mb-6">
                  La palabra secreta era: <span className="text-neon-lime font-bold">{showResult.word}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {isHost && (
                    <button
                      onClick={handleReturnToLobby}
                      disabled={processing}
                      className="neon-button"
                    >
                      🔄 Volver al Lobby
                    </button>
                  )}
                </div>
              </div>
            )}

            {showResult.type === 'impostor_wins' && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎭</div>
                <h3 className="text-3xl font-bold text-red-400 mb-2">
                  ¡Victoria del Impostor!
                </h3>
                <p className="text-white text-xl mb-2">
                  {showResult.impostor.name} era el impostor y no fue descubierto
                </p>
                <p className="text-text-secondary mb-6">
                  La palabra secreta era: <span className="text-neon-lime font-bold">{showResult.word}</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {isHost && (
                    <button
                      onClick={handleReturnToLobby}
                      disabled={processing}
                      className="neon-button"
                    >
                      🔄 Volver al Lobby
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Players List - During PLAYING */}
        {room.status === 'PLAYING' && (
          <div className="game-card mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Jugadores</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg text-center ${
                    player.id === playerId 
                      ? 'bg-neon-violet/20 border border-neon-violet' 
                      : 'bg-dark-bg'
                  } ${!player.is_alive ? 'opacity-50' : ''}`}
                >
                  <span className="text-white font-medium">
                    {!player.is_alive && '💀 '}{player.name}
                  </span>
                  {player.id === playerId && (
                    <span className="text-neon-lime text-xs block">(Tú)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Instructions - During PLAYING */}
        {room.status === 'PLAYING' && (
          <>
            <div className="bg-dark-surface/50 rounded-lg p-4 mb-6">
              <h4 className="text-white font-semibold mb-2">📋 Instrucciones</h4>
              <ul className="text-text-secondary text-sm space-y-1">
                <li>• Cada jugador debe dar una pista relacionada con la palabra</li>
                <li>• Las pistas deben ser sutiles: ni muy obvias ni muy vagas</li>
                <li>• Observa las pistas de los demás para identificar al impostor</li>
                <li>• Cuando estén listos, inicien la votación</li>
              </ul>
            </div>

            {!isSpectator && (
              <button
                onClick={handleStartVoting}
                disabled={processing}
                className={`w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105 ${
                  processing ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                🗳️ Iniciar Votación
              </button>
            )}
          </>
        )}

        {/* Game Finished */}
        {room.status === 'FINISHED' && !showResult && (
          <div className="game-card text-center py-8">
            <h3 className="text-2xl font-bold text-white mb-4">Partida Finalizada</h3>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isHost && (
                <button
                  onClick={handleReturnToLobby}
                  disabled={processing}
                  className="neon-button"
                >
                  🔄 Volver al Lobby
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
