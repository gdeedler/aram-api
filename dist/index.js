"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const riotApi_1 = __importDefault(require("./riotApi"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const pgdb_1 = __importDefault(require("./pgdb"));
require('dotenv').config();
mongoose_1.default.set('strictQuery', true);
const app = (0, express_1.default)();
const port = 3010;
app.use((0, morgan_1.default)('short'));
app.use((0, cors_1.default)());
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.connect('mongodb://localhost:27017/aram-matches');
        console.log('Connected to DB');
        app.get('/stats/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield db_1.Stats.findOne({
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
            }
            catch (error) {
                console.error(error);
                res.sendStatus(400);
            }
        }));
        app.get('/stats/:summonerName/refresh', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                let count = yield pullNewMatchesForSummoner(req.params.summonerName);
                let stats = yield buildSummonerStats(req.params.summonerName);
                if (stats.acknowledged) {
                    res.sendStatus(200);
                }
                else {
                    throw Error('Stats lookup failed');
                }
            }
            catch (error) {
                console.error(error);
                res.sendStatus(400);
            }
        }));
        app.get('/summonerstats/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = (yield pgdb_1.default.getSummonerAndAllyStats(req.params.summonerName)).rows;
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
            }
            catch (error) {
                console.error(error);
                res.sendStatus(400);
            }
        }));
        app.listen(port, () => console.log(`Server listening on port ${port}`));
    });
}
main();
function pullNewMatchesForSummoner(summonerName) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield riotApi_1.default.getSummonerPuuid(summonerName);
        const puuid = response.data.puuid;
        let matches = [];
        let count = 0;
        let areMoreMatches = true;
        while (areMoreMatches) {
            const aramMatchResponse = yield riotApi_1.default.getAramMatchIds(puuid, 100, count);
            if (aramMatchResponse.data.length === 0) {
                areMoreMatches = false;
                break;
            }
            matches = matches.concat(aramMatchResponse.data);
            count += 100;
        }
        const newMatchIds = [];
        for (const match of matches) {
            const documentExists = yield db_1.Match.count({ 'metadata.matchId': match });
            if (!documentExists)
                newMatchIds.push(match);
        }
        console.log(`${newMatchIds.length} matches to save`);
        let newMatchData = [];
        let matchSaveCount = 0;
        let totalSaveCount = 0;
        for (const match of newMatchIds) {
            const response = yield riotApi_1.default.getMatchData(match);
            newMatchData.push(response.data);
            matchSaveCount++;
            totalSaveCount++;
            if (matchSaveCount > 5) {
                const result = yield db_1.Match.create(newMatchData);
                matchSaveCount = 0;
                newMatchData = [];
                console.log(`${result.length} matches saved to database`);
            }
        }
        const result = yield db_1.Match.create(newMatchData);
        console.log(`${totalSaveCount} matches saved to database`);
        return result.length;
    });
}
function buildSummonerStats(summonerName, puuid = '') {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield riotApi_1.default.getSummonerPuuid(summonerName);
        puuid = response.data.puuid;
        summonerName = response.data.name;
        const matches = yield db_1.Match.find({ 'info.participants.puuid': puuid });
        const summonerStats = {
            summonerName,
            puuid,
            games: 0,
            wins: 0,
            losses: 0,
            winrate: 0,
            pentaKills: 0,
        };
        const playerStats = [];
        const champHash = {};
        const allyMatches = [];
        const allyHash = {};
        const topAllies = [];
        for (const match of matches) {
            if (!((_a = match.info) === null || _a === void 0 ? void 0 : _a.participants))
                continue;
            for (const participant of match.info.participants) {
                if (participant.puuid === puuid) {
                    playerStats.push(participant);
                }
                else {
                    allyMatches.push(participant);
                }
            }
        }
        for (const { championName, win, pentaKills } of playerStats) {
            //Summoner data
            summonerStats.games++;
            if (win) {
                summonerStats.wins++;
            }
            else {
                summonerStats.losses++;
            }
            if (pentaKills) {
                summonerStats.pentaKills += pentaKills;
            }
            //Champion data splitting
            if (!championName)
                break;
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
            }
            else {
                champHash[championName].losses++;
            }
            if (pentaKills)
                champHash[championName].pentaKills += pentaKills;
        }
        for (const match of allyMatches) {
            const allySummonerName = match.summonerName;
            const win = match.win;
            if (!allySummonerName)
                continue;
            if (!allyHash[allySummonerName]) {
                allyHash[allySummonerName] = {
                    summonerName: allySummonerName,
                    games: 0,
                    wins: 0,
                    losses: 0,
                    winrate: 0,
                };
            }
            allyHash[allySummonerName].games++;
            if (win) {
                allyHash[allySummonerName].wins++;
            }
            else {
                allyHash[allySummonerName].losses++;
            }
        }
        //Summoner data calculations
        summonerStats.winrate = Math.trunc((summonerStats.wins / summonerStats.games) * 100);
        //Champion data calculations and array building, then sort by games
        const champDataArray = [];
        Object.values(champHash).forEach((champ) => {
            champ.winrate = Math.trunc((champ.wins / champ.games) * 100);
            champDataArray.push(champ);
        });
        champDataArray.sort((a, b) => b.games - a.games);
        //Ally data calculations and sorting
        for (const summoner in allyHash) {
            if (allyHash[summoner].games > 5) {
                topAllies.push(allyHash[summoner]);
            }
        }
        topAllies.forEach((ally) => {
            ally.winrate = Math.trunc((ally.wins / ally.games) * 100);
        });
        topAllies.sort((a, b) => b.games - a.games);
        const dbResponse = yield db_1.Stats.updateOne({ puuid }, {
            puuid,
            summonerName,
            lowerCaseName: summonerName.toLowerCase(),
            champStats: champDataArray,
            matchStats: summonerStats,
            allyStats: topAllies,
        }, {
            upsert: true,
        });
        return dbResponse;
    });
}
