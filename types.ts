interface AramStats {
  [key: string]: ChampStats;
}

interface ChampStats {champion: string, games: number, wins: number}