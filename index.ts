import express, { NextFunction, Request, Response } from 'express';
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

  app.get('/livestats', async (req, res) => {
    let summonerQuery = req.query.summonerName
    if (!summonerQuery) {
      res.sendStatus(400)
      return
    }
    const summonerNames = Array.isArray(summonerQuery) ? summonerQuery : [summonerQuery]

    const gameInfos = summonerNames.map(summonerName => getActiveGameStats(summonerName + ''))
    const response = await Promise.all(gameInfos)
    res.json(response)
  })

  app.get('/summonerstats/:summonerName', async (req, res) => {
    try {
      const stats = (
        await pgdb.getSummonerAndAllyStats(req.params.summonerName)
      ).rows;
      if(stats.length === 0) {
        res.send({
          matchStats: {
            summonername: req.params.summonerName,
            games: 0,
            wins: 0,
            losses: 0,
            pentaKills: 0,
            winrate: 0,
          },
          allyStats: [],
        })
        return;
      }
      stats.forEach((summoner) => {
        summoner.wins = parseInt(summoner.wins);
        summoner.games = parseInt(summoner.games);
        summoner.pentaKills = parseInt(summoner.pentakills);
        summoner.losses = parseInt(summoner.losses);
        summoner.winrate = Math.trunc((summoner.wins / summoner.games) * 100);
        delete summoner.pentakills;
      });
      const summonerStats = {
        summonerName: stats[0].summonerName,
        matchStats: stats.shift(),
        allyStats: stats,
      };
      res.send(summonerStats);
    } catch (error) {
      console.error(error);
      res.sendStatus(400);
    }
  });
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
      });
      res.send(stats);
    } catch (error) {
      console.error(error);
      res.sendStatus(400);
    }
  });
  app.get('/refresh/:summonerName', async (req, res) => {
    try {
      const summonerName = req.params.summonerName;
      let puuid = await getPuuid(summonerName);
      const response = (await pgdb.getLastUpdated(puuid)).rows[0];
      let lastUpdated = 0;
      if (response) {
        lastUpdated = Date.parse(response.lastupdated);
      }
      await pullNewMatchesForSummoner(summonerName, puuid, lastUpdated)
      await pgdb.setLastUpdated(summonerName, puuid);
      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.sendStatus(400);
    }
  });

  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

main();

async function getPuuid(summonerName: string) {
  let puuid: string = await pgdb.getPuuid(summonerName);
  if (typeof puuid !== 'string') {
    puuid = (await api.getSummonerPuuid(summonerName)).data?.puuid;
  }
  if (typeof puuid !== 'string')
    throw Error(`Invalid summoner name ${summonerName}`);
  return puuid;
}

async function getSummonerId(summonerName: string) {
  const summonerId = (await api.getSummonerPuuid(summonerName)).data?.id;
  if (typeof summonerId !== 'string')
    throw Error(`Invalid summoner name ${summonerName}`);
  return summonerId;
}

async function getActiveGameStats(summonerName: string ) {
  try {
    const summonerId = await getSummonerId(summonerName)
    const gameStats = await api.getActiveGameInfo(summonerId)
    return {
      summonerName,
      gameMode: gameStats.data.gameMode
    }
  } catch (err) {
    return {
      summonerName,
      gameMode: 'INACTIVE'
    }
  }
}

async function pullNewMatchesForSummoner(summonerName: string, puuid: string, timestamp: number = 0) {
  let matches: string[] = [];
  let count = 0;
  let areMoreMatches = true;
  while (areMoreMatches) {
    const aramMatchResponse = await api.getAramMatchIds(puuid, 100, count, timestamp / 1000);
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
    await saveMatchDataPostgres(response.data);
    matchSaveCount++;
    totalSaveCount++;
    if (matchSaveCount > 5) {
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

async function saveMatchDataPostgres(match: any) {
  const matchid: string = match.metadata.matchId;
  for (const participant of match.info.participants) {
    const response = await pgdb.insertMatch(matchid, participant);
  }
}
