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
const db_1 = require("./db");
require('dotenv').config();
mongoose_1.default.set('strictQuery', true);
const app = (0, express_1.default)();
const port = 3010;
app.use((0, morgan_1.default)('dev'));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.connect('mongodb://localhost:27017/aram-matches');
        console.log('Connected to DB');
        app.get('/stats/:summonerName', (req, res) => __awaiter(this, void 0, void 0, function* () {
            res.sendStatus(200);
        }));
        app.get('/stats/:summonerName/refresh', (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield pullNewMatchesForSummoner(req.params.summonerName);
                res.send(`${result} matches updated`).status(200);
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
        const newMatchData = [];
        for (const match of newMatchIds) {
            const response = yield riotApi_1.default.getMatchData(match);
            newMatchData.push(response.data);
        }
        const result = yield db_1.Match.create(newMatchData);
        console.log(`${result.length} matches saved to database`);
        return result.length;
    });
}
function buildSummonerStats(summonerName) {
    return __awaiter(this, void 0, void 0, function* () {
    });
}
