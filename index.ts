import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Schema } from 'mongoose';

mongoose.set('strictQuery', true);

const app = express();
const port = 3010;

app.use(morgan('dev'));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/aram-matches');
  console.log('Connected to DB');

  app.get('/stats/:summonerName', async (req, res) => {
    const response =
      (await Match.count({
        'info.participants.summonerName': req.params.summonerName,
      })) + '';
    console.log('Match: ', response);
    res.send(response).status(200);
  });

  app.get('/champstats/:summonerName', async (req, res) => {
    const response: AramStats = {};
    for await (const doc of Match.find({
      'info.participants.summonerName': req.params.summonerName,
    })) {
      for(const {summonerName, championName, win} of doc.info?.participants) {
        if (summonerName === req.params.summonerName) {
          if(typeof championName === 'string' && typeof win === 'boolean') {
            if (!response[championName]) {
              response[championName] = {champion: championName, games: 0, wins: 0}
            }
            response[championName].games++;
            if (win) response[championName].wins++
          }
        }
      }
    }
    let champData: ChampStats[] = [];
    for (const champion in response) {
      champData.push(response[champion])
    }
    champData.sort((a, b) => b.games - a.games)

    res.send(champData);
  });

  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

main();

const matchSchema = new Schema({
  metadata: {
    dataVersion: String,
    matchId: { type: String, index: { unique: true } },
    participants: [String],
  },
  info: {},
});
const Match = mongoose.model('Match', matchSchema);
