import mongoose, { Schema } from "mongoose";

const matchSchema = new Schema({
  metadata: {
    dataVersion: String,
    matchId: { type: String, index: { unique: true } },
    participants: [String],
  },
  info: {},
})

const champSchema = new Schema({
  name: String,
  games: Number,
  wins: Number,
  losses: Number,
  winrate: Number,
  pentakills: Number,
})

const statsSchema = new Schema({
  puuid: String,
  summonerName: String,
  games: Number,
  wins: Number,
  losses: Number,
  champStats: [champSchema],
})

const matchConnection = mongoose.createConnection('mongodb://localhost:27017/aram-matches');
const Match = matchConnection.model('Match', matchSchema);
const statsConnection = mongoose.createConnection('mongodb://localhost:27017/aram-stats');
const Stats = statsConnection.model('Stats', statsSchema);

export {Match, Stats};