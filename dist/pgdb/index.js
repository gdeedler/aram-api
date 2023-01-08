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
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool();
function sanitizeString(string) {
    return string.trim().toLowerCase();
}
exports.default = {
    query: (text, params) => pool.query(text, params),
    getSummonerAndAllyStats: (summonerName) => {
        return pool.query(`
      select
        summonername,
        count(*) as games,
        count(*) filter (where win) as wins,
        count(*) filter (where not win) as losses,
        sum(pentakills) as pentakills
      from performance
      where matchid in
        (select matchid
        from performance
        where trim(lower(summonername)) = $1)
      group by summonername
      having count(*) > 5
      order by games desc`, [sanitizeString(summonerName)]);
    },
    getChampStats: (summonerName) => {
        return pool.query(`
      select
        champion,
        count(*) as games,
        count(*) filter (where win) as wins,
        count(*) filter (where not win) as losses,
        sum(pentakills) as pentakills
      from performance
      where trim(lower(summonername)) = $1
      group by champion
      order by games desc
      `, [sanitizeString(summonerName)]);
    },
    getPuuid: (summonerName) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const response = yield pool.query(`
      select puuid
      from summoner
      where trim(lower(summonername)) = $1
    `, [sanitizeString(summonerName)]);
        const puuid = (_a = response.rows[0]) === null || _a === void 0 ? void 0 : _a.puuid;
        if (!puuid)
            return null;
        return puuid;
    }),
    getLastUpdated: (puuid) => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield pool.query(`
      select *
      from summoner
      where puuid = $1
    `, [puuid]);
        return response;
    }),
    setLastUpdated: (summonerName, puuid) => {
        return pool.query(`
      insert into summoner(puuid, summonername, lastupdated)
      values($1, $2, $3)
      on conflict (puuid)
      do
        update set lastupdated = $3
    `, [puuid, summonerName, new Date().toISOString()]);
    },
    insertMatch: (matchid, { puuid, summonerName, win, pentaKills, championName }) => {
        return pool.query(`
      INSERT INTO performance (puuid, matchid, win, pentakills, champion, summonername)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [puuid, matchid, win, pentaKills, championName, summonerName]);
    },
    matchExists: (matchid) => {
        return pool.query(`
      SELECT * from performance WHERE matchid = $1
      `, [matchid]);
    }
};
