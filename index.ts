import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import api from './riotApi';
import { Match, Stats } from './db';
require('dotenv').config();

mongoose.set('strictQuery', true);

const app = express();
const port = 3010;

app.use(morgan('dev'));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/aram-matches');
  console.log('Connected to DB');

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if (req.method == 'OPTIONS') {
      res.header(
        'Access-Control-Allow-Methods',
        'PUT, POST, PATCH, DELETE, GET'
      );
      return res.status(200).json({});
    }

    next();
  });

  app.get('/stats/:summonerName', async (req, res) => {
    try {
      const stats = await Stats.findOne({
        summonerName: req.params.summonerName,
      });
      if (stats === null) {
        res.sendStatus(204);
        return;
      }
      res.send(stats).status(200);
    } catch (error) {
      console.error(error);
      res.sendStatus(400);
    }
  });

  app.get('/stats/:summonerName/refresh', async (req, res) => {
    try {
      let count = await pullNewMatchesForSummoner(req.params.summonerName);
      let stats = await buildSummonerStats(req.params.summonerName);
      if (stats.acknowledged) {
        res.sendStatus(200);
      } else {
        throw Error('Stats lookup failed');
      }
    } catch (error) {
      console.error(error);
      res.sendStatus(400);
    }
  });

  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

main();

async function pullNewMatchesForSummoner(summonerName: string) {
  const response = await api.getSummonerPuuid(summonerName);
  const puuid = response.data.puuid;
  let matches: string[] = [];
  let count = 0;
  let areMoreMatches = true;
  while (areMoreMatches) {
    const aramMatchResponse = await api.getAramMatchIds(puuid, 100, count);
    if (aramMatchResponse.data.length === 0) {
      areMoreMatches = false;
      break;
    }
    matches = matches.concat(aramMatchResponse.data);
    count += 100;
  }
  const newMatchIds: string[] = [];
  for (const match of matches) {
    const documentExists = await Match.count({ 'metadata.matchId': match });
    if (!documentExists) newMatchIds.push(match);
  }
  console.log(`${newMatchIds.length} matches to save`);
  const newMatchData = [];
  for (const match of newMatchIds) {
    const response = await api.getMatchData(match);
    newMatchData.push(response.data);
  }
  const result = await Match.create(newMatchData);
  console.log(`${result.length} matches saved to database`);
  return result.length;
}

async function buildSummonerStats(summonerName: string, puuid: string = '') {
  if (puuid.length === 0) {
    const response = await api.getSummonerPuuid(summonerName);
    puuid = response.data.puuid;
  }
  const matches = await Match.find({ 'info.participants.puuid': puuid });
  const summonerStats: SummonerStats = {
    summonerName,
    puuid,
    games: 0,
    wins: 0,
    losses: 0,
    winrate: 0,
    pentaKills: 0,
  };

  const champHash: ChampHash = {};
  const playerStats = [];

  for (const match of matches) {
    if (match.info?.participants) {
      for (const participant of match.info.participants) {
        if (participant.puuid === puuid) {
          playerStats.push(participant);
        }
      }
    }
  }

  for (const { championName, win, pentaKills } of playerStats) {
    //Summoner data
    summonerStats.games++;
    if (win) {
      summonerStats.wins++;
    } else {
      summonerStats.losses++;
    }
    if (pentaKills) {
      summonerStats.pentaKills += pentaKills;
    }

    //Champion data splitting
    if (!championName) break;
    if (!champHash[championName]) {
      champHash[championName] = {
        champion: championName,
        games: 0,
        wins: 0,
        losses: 0,
        winrate: 0,
        pentaKills: 0,
      };
    }
    champHash[championName].games++;
    if (win) {
      champHash[championName].wins++;
    } else {
      champHash[championName].losses++;
    }
    if (pentaKills) champHash[championName].pentaKills += pentaKills;
  }

  //Summoner data calculations
  summonerStats.winrate = Math.trunc(
    (summonerStats.wins / summonerStats.games) * 100
  );

  //Champion data calculations and array building, then sort by games
  const champDataArray: ChampStats[] = [];
  Object.values(champHash).forEach((champ) => {
    champ.winrate = Math.trunc((champ.wins / champ.games) * 100);
    champDataArray.push(champ);
  });
  champDataArray.sort((a, b) => b.games - a.games);

  const response = await Stats.updateOne(
    { puuid },
    {
      puuid,
      summonerName,
      champStats: champDataArray,
      matchStats: summonerStats,
    },
    {
      upsert: true,
    }
  );

  return response;
}
