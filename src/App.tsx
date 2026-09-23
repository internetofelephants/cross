import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import UpgradeMenu from './components/UpgradeMenu';
import GameOver from './components/GameOver';
import { Upgrades, GameStats } from './types';

type ScreenState = 'menu' | 'playing' | 'upgrades' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [day, setDay] = useState<number>(1);
  const [goldCorms, setGoldCorms] = useState<number>(0);
  
  // Total overall tallies (across days)
  const [totalSaved, setTotalSaved] = useState<number>(0);
  const [totalLost, setTotalLost] = useState<number>(0);

  // Stats from the most recently completed day (to show in upgrade shop)
  const [dayStats, setDayStats] = useState<GameStats>({
    score: 0,
    goldCorms: 0,
    day: 1,
    herdTotal: 45,
    herdActive: 0,
    herdCrossed: 0,
    herdLost: 0,
  });

  const [upgrades, setUpgrades] = useState<Upgrades>({
    leaderSpeed: 0,
    herdStamina: 0,
    hornDefense: 0,
    thickHides: 0,
    distractionsCount: 0,
  });

  const handleStartGame = () => {
    setDay(1);
    setGoldCorms(0);
    setTotalSaved(0);
    setTotalLost(0);
    setUpgrades({
      leaderSpeed: 0,
      herdStamina: 0,
      hornDefense: 0,
      thickHides: 0,
      distractionsCount: 0,
    });
    setScreen('playing');
  };

  const handleWaveComplete = (waveCrossed: number, waveLost: number) => {
    // Accumulate total scores
    setTotalSaved(prev => prev + waveCrossed);
    setTotalLost(prev => prev + waveLost);

    const gainedGold = waveCrossed * 12; // 12 gold corms per successful Crossing
    const updatedGold = goldCorms + gainedGold;
    setGoldCorms(updatedGold);

    // Save stats for the shop display
    const isCompletedMigration = day >= 10;

    setDayStats({
      score: (totalSaved + waveCrossed) * 10,
      goldCorms: updatedGold,
      day: isCompletedMigration ? day : day + 1, // Prepare Day count for next wave
      herdTotal: isCompletedMigration ? 0 : Math.max(0, (35 + day * 10) - (waveCrossed + waveLost)), // next herd wave total estimation pool
      herdActive: 0,
      herdCrossed: waveCrossed,
      herdLost: waveLost,
    });

    if (isCompletedMigration) {
      setScreen('gameover');
    } else {
      setScreen('upgrades');
    }
  };

  const handlePurchaseUpgrade = (key: keyof Upgrades, cost: number) => {
    if (goldCorms >= cost) {
      setGoldCorms(prev => prev - cost);
      setUpgrades(prev => ({
        ...prev,
        [key]: prev[key] + 1,
      }));
      setDayStats(prev => ({
        ...prev,
        goldCorms: prev.goldCorms - cost,
      }));
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
    setGoldCorms(0);
    setTotalSaved(0);
    setTotalLost(0);
    setUpgrades({
      leaderSpeed: 0,
      herdStamina: 0,
      hornDefense: 0,
      thickHides: 0,
      distractionsCount: 0,
    });
    setDayStats({
      score: 0,
      goldCorms: 0,
      day: 1,
      herdTotal: 45,
      herdActive: 0,
      herdCrossed: 0,
      herdLost: 0,
    });
    setScreen('menu');
  };

  return (
    <div className="w-full h-full bg-[#0a0a0a] font-sans text-[#e5e5e5] flex flex-col justify-between overflow-hidden relative">
      <div className="flex-1 w-full h-full min-h-screen">
        {screen === 'menu' && (
          <MainMenu onStartGame={handleStartGame} />
        )}

        {screen === 'playing' && (
          <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#0a0a0a] p-2 md:p-6 pb-2">
            <GameCanvas
              day={day}
              upgrades={upgrades}
              onWaveComplete={handleWaveComplete}
              onGameOver={handleGameOver}
              initialGoldCorms={goldCorms}
              onResetGame={handleResetGame}
            />
          </div>
        )}

        {screen === 'upgrades' && (
          <UpgradeMenu
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
