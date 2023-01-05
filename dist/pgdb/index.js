"use strict";
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
};
