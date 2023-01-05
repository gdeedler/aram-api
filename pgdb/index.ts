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
};
