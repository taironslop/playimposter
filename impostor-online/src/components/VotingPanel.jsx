import React, { useState } from 'react';
import { voteFor, getVoteCounts } from '../services/supabaseService';

const VotingPanel = ({ players, currentPlayerId, roomCode, onVoteComplete }) => {
  const [voting, setVoting] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const isAlive = currentPlayer?.is_alive;
  const isSpectator = currentPlayer?.is_spectator;
  const hasVoted = currentPlayer?.voted_for !== null;
  const alivePlayers = players.filter(p => p.is_alive && !p.is_spectator);
  const voteCounts = getVoteCounts(players);

  const handleVote = async (targetId) => {
    if (!isAlive || hasVoted || voting) return;
    
    setVoting(true);
    setSelectedPlayer(targetId);
    
    try {
      await voteFor(currentPlayerId, targetId);
      if (onVoteComplete) onVoteComplete();
    } catch (err) {
      console.error('Error voting:', err);
      setSelectedPlayer(null);
    } finally {
      setVoting(false);
    }
  };

  const getVoteCountForPlayer = (playerId) => {
    return voteCounts[playerId] || 0;
  };

  const getVotersForPlayer = (playerId) => {
    return players.filter(p => p.voted_for === playerId).map(p => p.name);
  };

  const totalVotes = alivePlayers.filter(p => p.voted_for !== null).length;
  const totalAlivePlayers = alivePlayers.length;

  return (
    <div className="space-y-4">
      {/* Voting Progress */}
      <div className="bg-dark-surface rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-text-secondary">Progreso de votación</span>
          <span className="text-white font-bold">{totalVotes}/{totalAlivePlayers}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-neon-violet h-2 rounded-full transition-all duration-300"
            style={{ width: `${(totalVotes / totalAlivePlayers) * 100}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      {isSpectator && (
        <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 text-center">
          <span className="text-yellow-400">👁️ Eres espectador. No puedes votar.</span>
        </div>
      )}

      {!isSpectator && !isAlive && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
          <span className="text-gray-400">💀 Estás eliminado. No puedes votar.</span>
        </div>
      )}

      {!isSpectator && isAlive && hasVoted && (
        <div className="bg-neon-violet/20 border border-neon-violet rounded-lg p-4 text-center">
          <span className="text-neon-violet">✓ Ya votaste. Esperando a los demás...</span>
        </div>
      )}

      {/* Players List */}
      <div className="space-y-3">
        {alivePlayers.map((player) => {
          const voteCount = getVoteCountForPlayer(player.id);
          const voters = getVotersForPlayer(player.id);
          const isMe = player.id === currentPlayerId;
          const isMyVote = currentPlayer?.voted_for === player.id;

          return (
            <div
              key={player.id}
              className={`rounded-xl p-4 transition-all ${
                isMyVote 
                  ? 'bg-red-900/30 border-2 border-red-500' 
                  : 'bg-dark-surface border border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    isMe ? 'bg-neon-violet' : 'bg-gray-600'
                  }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-white font-medium">{player.name}</span>
                    {isMe && <span className="text-neon-lime text-xs ml-2">(Tú)</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Vote Count */}
                  {voteCount > 0 && (
                    <div className="flex items-center space-x-1 bg-red-500/20 px-3 py-1 rounded-full">
                      <span className="text-red-400 font-bold">{voteCount}</span>
                      <span className="text-red-400 text-sm">
                        {voteCount === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                  )}

                  {/* Vote Button */}
                  {!isMe && isAlive && !hasVoted && !isSpectator && (
                    <button
                      onClick={() => handleVote(player.id)}
                      disabled={voting}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        voting && selectedPlayer === player.id
                          ? 'bg-gray-600 text-gray-400 cursor-wait'
                          : 'bg-red-600 hover:bg-red-500 text-white hover:scale-105'
                      }`}
                    >
                      {voting && selectedPlayer === player.id ? '...' : '🗳️ VOTAR'}
                    </button>
                  )}

                  {isMyVote && (
                    <span className="text-red-400 text-sm font-medium">Tu voto</span>
                  )}
                </div>
              </div>

              {/* Voters List */}
              {voters.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <span className="text-text-secondary text-xs">
                    Votado por: {voters.join(', ')}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Dead Players */}
      {players.filter(p => !p.is_alive).length > 0 && (
        <div className="mt-6">
          <h4 className="text-text-secondary text-sm mb-2">Eliminados</h4>
          <div className="flex flex-wrap gap-2">
            {players.filter(p => !p.is_alive).map(player => (
              <div 
                key={player.id}
                className="bg-gray-800/50 px-3 py-1 rounded-full text-gray-500 text-sm flex items-center space-x-1"
              >
                <span>💀</span>
                <span>{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingPanel;
