import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import api from './riotApi';
import cors from 'cors';
import { Match, Stats } from './db';
import pgdb from './pgdb';
require('dotenv').config();

mongoose.set('strictQuery', true);

const app = express();
const port = 3010;

app.use(morgan('short'));
app.use(cors());

async function main() {
  await mongoose.connect('mongodb://localhost:27017/aram-matches');
  console.log('Connected to DB');

  app.get('/stats/:summonerName', async (req, res) => {
    try {
      const stats = await Stats.findOne({
        lowerCaseName: req.params.summonerName.toLowerCase(),
      });
      if (stats === null) {
        res.send({
          summonerName: req.params.summonerName,
          puuid: 0,
          champStats: [],
          matchStats: {
            summonerName: req.params.summonerName,
            games: 0,
            wins: 0,
            losses: 0,
            winrate: 0,
            pentaKills: 0,
          },
        });
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

  app.get('/summonerstats/:summonerName', async (req, res) => {
    try {
      const stats = (await pgdb.getSummonerAndAllyStats(req.params.summonerName)).rows;
      stats.forEach((summoner) => {
        summoner.wins = parseInt(summoner.wins);
        summoner.games = parseInt(summoner.games);
        summoner.pentaKills = parseInt(summoner.pentakills);
        summoner.losses = parseInt(summoner.losses);
        summoner.winrate = Math.trunc((summoner.wins / summoner.games) * 100);
        delete summoner.pentakills;
      })
      const summonerStats = {
        summonerName: stats[0].summonerName,
        matchStats: stats.shift(),
        allyStats: stats,
      }
      res.send(summonerStats);
    } catch (error) {
      console.error(error);
      res.sendStatus(400);
    }
  })
  app.get('/champstats/:summonerName', async (req, res) => {
    try {
      const stats = (await pgdb.getChampStats(req.params.summonerName)).rows;
      stats.forEach((champ) => {
        champ.games = parseInt(champ.games);
        champ.wins = parseInt(champ.wins);
        champ.pentaKills = parseInt(champ.pentakills);
        champ.losses = parseInt(champ.losses);
        champ.winrate = Math.trunc((champ.wins / champ.games) * 100);
        delete champ.pentakills;
      })
      res.send(stats);
    } catch (error) {
      console.error(error);
      res.sendStatus(400);
    }
  })

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
  let newMatchData = [];
  let matchSaveCount = 0;
  let totalSaveCount = 0;
  for (const match of newMatchIds) {
    const response = await api.getMatchData(match);
    newMatchData.push(response.data);
    matchSaveCount++;
    totalSaveCount++;
    if(matchSaveCount > 5) {
      const result = await Match.create(newMatchData);
      matchSaveCount = 0;
      newMatchData = [];
      console.log(`${result.length} matches saved to database`);
    }
  }
  const result = await Match.create(newMatchData);
  console.log(`${totalSaveCount} matches saved to database`);
  return result.length;
}

async function buildSummonerStats(summonerName: string, puuid: string = '') {
  let response = await api.getSummonerPuuid(summonerName);
  puuid = response.data.puuid;
  summonerName = response.data.name;

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

  const playerStats = [];
  const champHash: ChampHash = {};
  const allyMatches = [];
  const allyHash: AllyHash = {};
  const topAllies: AllyStats[] = [];

  for (const match of matches) {
    if (!match.info?.participants) continue;
    for (const participant of match.info.participants) {
      if (participant.puuid === puuid) {
        playerStats.push(participant);
      } else {
        allyMatches.push(participant);
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

  for (const match of allyMatches) {
    const allySummonerName = match.summonerName;
    const win = match.win;
    if(!allySummonerName) continue;
    if(!allyHash[allySummonerName]) {
      allyHash[allySummonerName] = {
        summonerName: allySummonerName,
        games: 0,
        wins: 0,
        losses: 0,
        winrate: 0,
      }
    }

    allyHash[allySummonerName].games++;
    if(win) {
      allyHash[allySummonerName].wins++;
    } else {
      allyHash[allySummonerName].losses++;
    }
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

  //Ally data calculations and sorting
  for (const summoner in allyHash) {
    if(allyHash[summoner].games > 5) {
      topAllies.push(allyHash[summoner]);
    }
  }
  topAllies.forEach((ally) => {
    ally.winrate = Math.trunc((ally.wins / ally.games) * 100)
  })
  topAllies.sort((a,b) => b.games - a.games);


  const dbResponse = await Stats.updateOne(
    { puuid },
    {
      puuid,
      summonerName,
      lowerCaseName: summonerName.toLowerCase(),
      champStats: champDataArray,
      matchStats: summonerStats,
      allyStats: topAllies,
    },
    {
      upsert: true,
    }
  );

  return dbResponse;
}
