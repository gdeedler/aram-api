require('dotenv').config();
import axios from 'axios';
import axiosRetry from 'axios-retry';

const api = axios.create({
  headers: {
    'X-Riot-Token': process.env.RIOT_API,
  },
});

axiosRetry(api, {
  retries: 3,
  retryDelay: () => 60000,
  retryCondition: (err) => {
    if (err.response?.status === 429) {
      console.log('Rate limited, retrying after 1 minute');
      return true;
    }
    return false;
  },
});

export default {
  getSummonerPuuid: (summonerName: string) => {
    return api.get(
      `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`
    );
  },
  getAramMatchIds: (puuid: string, count: number, start: number, timestamp: number) => {
    if (count > 100 || count < 1) count = 20;
    if (start < 0) start = 0;
    return api.get(
      `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`,
      {
        params: {
          queue: 450, //ARAM
          count,
          start,
          startTime: timestamp,
        },
      }
    );
  },
  getMatchData: (matchId: string) => {
    return api.get(
      `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`
    );
  },
  getActiveGameInfo: (summonerId: string) => {
    return api.get(
      `https://na1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${summonerId}`
    )
  }
};
