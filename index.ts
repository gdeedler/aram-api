import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import api from './riotApi';
import {Match, Stats} from './db';
require('dotenv').config();

mongoose.set('strictQuery', true);

const app = express();
const port = 3010;

app.use(morgan('dev'));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/aram-matches');
  console.log('Connected to DB');

  app.get('/stats/:summonerName', async (req, res) => {
    res.sendStatus(200);
  })

  app.get('/stats/:summonerName/refresh', async (req, res) => {
    try {
      const result = await pullNewMatchesForSummoner(req.params.summonerName);
      res.send(`${result} matches updated`).status(200);
    } catch(error) {
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
    if(aramMatchResponse.data.length === 0) {
      areMoreMatches = false;
      break;
    }
    matches = matches.concat(aramMatchResponse.data);
    count += 100;
  }
  const newMatchIds: string[] = [];
  for (const match of matches) {
    const documentExists = await Match.count({'metadata.matchId': match});
    if(!documentExists) newMatchIds.push(match);
  }
  console.log(`${newMatchIds.length} matches to save`)
  const newMatchData = [];
  for (const match of newMatchIds) {
    const response = await api.getMatchData(match);
    newMatchData.push(response.data);
  }
  const result = await Match.create(newMatchData);
  console.log(`${result.length} matches saved to database`);
  return result.length;
}

async function buildSummonerStats(summonerName: string) {

}