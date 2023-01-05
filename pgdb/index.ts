import { Pool } from 'pg';

const pool = new Pool();

function sanitizeString(string: string) {
  return string.trim().toLowerCase();
}

export default {
  query: (text: string, params: string[]) => pool.query(text, params),
  getSummonerAndAllyStats: (summonerName: string) => {
    return pool.query(
      `
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
      order by games desc`,
      [sanitizeString(summonerName)]
    );
  },
  getChampStats: (summonerName: string) => {
    return pool.query(
      `
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
      `,
      [sanitizeString(summonerName)]
    );
  },
  getPuuid: async (summonerName: string) => {
    const response = await pool.query(
      `
      select puuid
      from summoner
      where trim(lower(summonername)) = $1
    `,
      [sanitizeString(summonerName)]
    );
    const puuid = response.rows[0]?.puuid;
    if (!puuid) return null;
    return puuid;
  },
  getLastUpdated: async (puuid: string) => {
    const response = await pool.query(
      `
      select *
      from summoner
      where puuid = $1
    `,
      [puuid]
    );
    return response;
  },
  setLastUpdated: (summonerName: string, puuid: string) => {
    return pool.query(
      `
      insert into summoner(puuid, summonername, lastupdated)
      values($1, $2, $3)
      on conflict (puuid)
      do
        update set lastupdated = $3
    `,
      [puuid, summonerName, new Date().toISOString()]
    );
  },
  insertMatch: (
    matchid: string,
    { puuid, summonerName, win, pentaKills, championName }: any
  ) => {
    return pool.query(
      `
      INSERT INTO performance (puuid, matchid, win, pentakills, champion, summonername)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [puuid, matchid, win, pentaKills, championName, summonerName]
    );
  },
};
