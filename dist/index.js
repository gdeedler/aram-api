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
        app.get('/livestats', (req, res) => __awaiter(this, void 0, void 0, function* () {
            let summonerQuery = req.query.summonerName;
            if (!summonerQuery) {
                res.sendStatus(400);
                return;
            }
            const summonerNames = Array.isArray(summonerQuery) ? summonerQuery : [summonerQuery];
            const gameInfos = summonerNames.map(summonerName => getActiveGameStats(summonerName + ''));
            const response = yield Promise.all(gameInfos);
            res.json(response);
        }));
        app.get('/summonerstats/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = (yield pgdb_1.default.getSummonerAndAllyStats(req.params.summonerName)).rows;
                if (stats.length === 0) {
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
                    });
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
            }
            catch (error) {
                console.error(error);
                res.sendStatus(400);
            }
        }));
        app.get('/champstats/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = (yield pgdb_1.default.getChampStats(req.params.summonerName)).rows;
                stats.forEach((champ) => {
                    champ.games = parseInt(champ.games);
                    champ.wins = parseInt(champ.wins);
                    champ.pentaKills = parseInt(champ.pentakills);
                    champ.losses = parseInt(champ.losses);
                    champ.winrate = Math.trunc((champ.wins / champ.games) * 100);
                    delete champ.pentakills;
                });
                res.send(stats);
            }
            catch (error) {
                console.error(error);
                res.sendStatus(400);
            }
        }));
        app.get('/refresh/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const summonerName = req.params.summonerName;
                let puuid = yield getPuuid(summonerName);
                const response = (yield pgdb_1.default.getLastUpdated(puuid)).rows[0];
                let lastUpdated = 0;
                if (response) {
                    lastUpdated = Date.parse(response.lastupdated);
                }
                yield pullNewMatchesForSummoner(summonerName, puuid, lastUpdated);
                yield pgdb_1.default.setLastUpdated(summonerName, puuid);
                res.sendStatus(200);
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
function getPuuid(summonerName) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let puuid = yield pgdb_1.default.getPuuid(summonerName);
        if (typeof puuid !== 'string') {
            puuid = (_a = (yield riotApi_1.default.getSummonerPuuid(summonerName)).data) === null || _a === void 0 ? void 0 : _a.puuid;
        }
        if (typeof puuid !== 'string')
            throw Error(`Invalid summoner name ${summonerName}`);
        return puuid;
    });
}
function getSummonerId(summonerName) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const summonerId = (_a = (yield riotApi_1.default.getSummonerPuuid(summonerName)).data) === null || _a === void 0 ? void 0 : _a.id;
        if (typeof summonerId !== 'string')
            throw Error(`Invalid summoner name ${summonerName}`);
        return summonerId;
    });
}
function getActiveGameStats(summonerName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const summonerId = yield getSummonerId(summonerName);
            const gameStats = yield riotApi_1.default.getActiveGameInfo(summonerId);
            return {
                summonerName,
                gameMode: gameStats.data.gameMode,
                gameId: gameStats.data.gameId,
                gameLength: gameStats.data.gameLength,
                champion: gameStats.data.participants.find((participant) => summonerId === participant.summonerId)
            };
        }
        catch (err) {
            return {
                summonerName,
                gameMode: 'INACTIVE'
            };
        }
    });
}
function pullNewMatchesForSummoner(summonerName, puuid, timestamp = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        let matches = [];
        let count = 0;
        let areMoreMatches = true;
        while (areMoreMatches) {
            const aramMatchResponse = yield riotApi_1.default.getAramMatchIds(puuid, 100, count, timestamp / 1000);
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
            yield saveMatchDataPostgres(response.data);
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
function saveMatchDataPostgres(match) {
    return __awaiter(this, void 0, void 0, function* () {
        const matchid = match.metadata.matchId;
        for (const participant of match.info.participants) {
            const response = yield pgdb_1.default.insertMatch(matchid, participant);
        }
    });
}
