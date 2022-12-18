import mongoose, { Schema } from 'mongoose';

const matchSchema = new Schema(
  {
    metadata: {
      dataVersion: String,
      matchId: { type: String, index: { unique: true } },
      participants: { type: [String], index: true },
    },
    info: {
      participants: [
        {
          puuid: { type: String, index: true },
          win: Boolean,
          pentaKills: Number,
          championName: String,
        },
      ],
    },
  },
  { strict: false }
);

const champSchema = new Schema({
  name: String,
  games: Number,
  wins: Number,
  losses: Number,
  winrate: Number,
  pentaKills: Number,
});

const statsSchema = new Schema({
  puuid: {type: String, index: true, unique: true},
  summonerName: {type: String, index: true, unique: true},
  champStats: [champSchema],
  matchStats: {},
});

const matchConnection = mongoose.createConnection(
  'mongodb://localhost:27017/aram-matches'
);
const Match = matchConnection.model('Match', matchSchema);
const statsConnection = mongoose.createConnection(
  'mongodb://localhost:27017/aram-stats'
);
const Stats = statsConnection.model('Stats', statsSchema);

export { Match, Stats};
