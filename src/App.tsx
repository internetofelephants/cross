import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import DaySummary from './components/DaySummary';
import GameOver from './components/GameOver';
import { GameStats } from './types';

type ScreenState = 'menu' | 'playing' | 'summary' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [day, setDay] = useState<number>(1);
  
  // Total overall tallies (across days)
  const [totalSaved, setTotalSaved] = useState<number>(0);
  const [totalLost, setTotalLost] = useState<number>(0);

  // Stats from the most recently completed day (to show in the day summary)
  const [dayStats, setDayStats] = useState<GameStats>({
    score: 0,
    day: 1,
    herdTotal: 45,
    herdActive: 0,
    herdCrossed: 0,
    herdLost: 0,
  });

  const handleStartGame = () => {
    setDay(1);
    setTotalSaved(0);
    setTotalLost(0);
    setScreen('playing');
  };

  const handleWaveComplete = (waveCrossed: number, waveLost: number) => {
    // Accumulate total scores
    setTotalSaved(prev => prev + waveCrossed);
    setTotalLost(prev => prev + waveLost);

    // Save stats for the day summary
    const isCompletedMigration = day >= 10;

    setDayStats({
      score: (totalSaved + waveCrossed) * 10,
      day: isCompletedMigration ? day : day + 1, // Prepare Day count for next wave
      herdTotal: isCompletedMigration ? 0 : Math.max(0, (35 + day * 10) - (waveCrossed + waveLost)), // next herd wave total estimation pool
      herdActive: 0,
      herdCrossed: waveCrossed,
      herdLost: waveLost,
    });

    if (isCompletedMigration) {
      setScreen('gameover');
    } else {
      setScreen('summary');
    }
  };

  const handleNextWave = () => {
    setDay(prev => prev + 1);
    setScreen('playing');
  };

  const handleRetryLevel = () => {
    setScreen('playing');
  };

  const handleGameOver = (waveCrossed: number, waveLost: number) => {
    setTotalSaved(prev => prev + waveCrossed);
    setTotalLost(prev => prev + waveLost);
    setScreen('gameover');
  };

  const handleRestartToMenu = () => {
    setScreen('menu');
  };

  const handleResetGame = () => {
    setDay(1);
    setTotalSaved(0);
    setTotalLost(0);
    setDayStats({
      score: 0,
      day: 1,
      herdTotal: 45,
      herdActive: 0,
      herdCrossed: 0,
      herdLost: 0,
    });
    setScreen('menu');
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] font-sans text-[#e5e5e5] flex flex-col justify-between overflow-x-hidden overflow-y-auto relative">
      <div className="flex-1 w-full h-full min-h-screen">
        {screen === 'menu' && (
          <MainMenu onStartGame={handleStartGame} />
        )}

        {screen === 'playing' && (
          <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#0a0a0a] p-2 md:p-6 pb-2">
            <GameCanvas
              day={day}
              onWaveComplete={handleWaveComplete}
              onGameOver={handleGameOver}
              onResetGame={handleResetGame}
            />
          </div>
        )}

        {screen === 'summary' && (
          <DaySummary
            stats={dayStats}
            onNextWave={handleNextWave}
            onResetGame={handleResetGame}
          />
        )}

        {screen === 'gameover' && (
          <GameOver
            dayReached={day}
            isVictory={day >= 10}
            onRetryLevel={handleRetryLevel}
            onNewMigration={handleResetGame}
          />
        )}
      </div>
    </div>
  );
}
