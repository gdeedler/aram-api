import { Pool } from 'pg';

const pool = new Pool();

export default {
  query: (text: string, params: string[]) => pool.query(text, params),
  getSummonerAndAllyStats: (summonerName: string) => {
    const trimmedName = summonerName.trim().toLowerCase();
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
      order by games desc`, [trimmedName]);
  },
};
