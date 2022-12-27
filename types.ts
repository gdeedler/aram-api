interface AramStats {
  [key: string]: ChampStats;
}

interface ChampStats {
  champion: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  pentaKills: number;
}

interface ChampHash {
  [champName: string]: ChampStats;
}

interface AllyHash {
  [summonerName: string]: {
    summonerName: string;
    games: number;
    wins: number;
    losses: number;
    winrate: number;
  };
}

interface AllyStats {
  summonerName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
}

interface SummonerStats {
  puuid: string;
  summonerName: string;
  games: number;
  wins: number;
  losses: number;
  pentaKills: number;
  winrate: number;
}
