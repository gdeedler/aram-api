"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const api = axios_1.default.create({
    headers: {
        'X-Riot-Token': process.env.RIOT_API,
    },
});
(0, axios_retry_1.default)(api, {
    retries: 3,
    retryDelay: () => 60000,
    retryCondition: (err) => {
        var _a;
        if (((_a = err.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
            console.log('Rate limited, retrying after 1 minute');
            return true;
        }
        return false;
    },
});
exports.default = {
    getSummonerPuuid: (summonerName) => {
        return api.get(`https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`);
    },
    getAramMatchIds: (puuid, count, start) => {
        if (count > 100 || count < 1)
            count = 20;
        if (start < 0)
            start = 0;
        return api.get(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`, {
            params: {
                queue: 450,
                count,
                start,
            },
        });
    },
    getMatchData: (matchId) => {
        return api.get(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`);
    },
};
