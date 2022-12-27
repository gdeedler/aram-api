"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stats = exports.Match = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const matchSchema = new mongoose_1.Schema({
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
                summonerName: String,
            },
        ],
    },
}, { strict: false });
const champSchema = new mongoose_1.Schema({
    champion: String,
    games: Number,
    wins: Number,
    losses: Number,
    winrate: Number,
    pentaKills: Number,
});
const statsSchema = new mongoose_1.Schema({
    puuid: { type: String, index: true },
    summonerName: { type: String, index: true },
    champStats: [champSchema],
    matchStats: {
        summonerName: String,
        puuid: String,
        games: Number,
        wins: Number,
        losses: Number,
        winrate: Number,
        pentaKills: Number,
    },
    allyStats: [
        {
            summonerName: String,
            games: Number,
            wins: Number,
            losses: Number,
            winrate: Number,
        }
    ]
});
const matchConnection = mongoose_1.default.createConnection('mongodb://localhost:27017/aram-matches');
const Match = matchConnection.model('Match', matchSchema);
exports.Match = Match;
const statsConnection = mongoose_1.default.createConnection('mongodb://localhost:27017/aram-stats');
const Stats = statsConnection.model('Stats', statsSchema);
exports.Stats = Stats;
