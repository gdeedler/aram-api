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
const summonerCache = {};
exports.default = {
    getSummonerPuuid: (summonerName) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('getSummoner:', summonerName);
        if (!summonerCache[summonerName]) {
            console.log('getSummonerData', summonerName);
            const response = yield api.get(`https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}`);
            summonerCache[summonerName] = response;
        }
        return summonerCache[summonerName];
    }),
    getAramMatchIds: (puuid, count, start, timestamp) => {
        console.log('Get aram matches:', puuid, count);
        if (count > 100 || count < 1)
            count = 20;
        if (start < 0)
            start = 0;
        return api.get(`https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`, {
            params: {
                queue: 450,
                count,
                start,
                startTime: timestamp,
            },
        });
    },
    getMatchData: (matchId) => {
        console.log('getMatchData:', matchId);
        return api.get(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`);
    },
    getActiveGameInfo: (summonerId) => {
        console.log('getActiveGameInfo:', summonerId);
        return api.get(`https://na1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/${summonerId}`);
    }
};
