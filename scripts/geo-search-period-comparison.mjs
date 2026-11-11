import assert from 'node:assert/strict';
const DAY = 86400000;
function dates(period) {
  const parse = s => { assert.match(s || '', /^\d{4}-\d{2}-\d{2}$/); const t=Date.parse(s+'T00:00:00Z'); assert.ok(Number.isFinite(t) && new Date(t).toISOString().slice(0,10)===s, 'Invalid date'); return t; };
  const from=parse(period.from),to=parse(period.to);
  assert.ok(to >= from && to-from <= 366*DAY, 'Invalid period');
  return Array.from({length:(to-from)/DAY+1},(_,i)=>new Date(from+i*DAY).toISOString().slice(0,10));
}
// Accept property-level DAILY rows only, with fresh-data disabled at collection time.
// Page/query rows have different aggregation and cannot replace property totals.
export function compareSearchPeriods({property,searchType,includeFreshData,aggregation,rows,previous,current}) {
  assert.equal(property,'sc-domain:kun-online.com','Use the same canonical domain property');
  assert.equal(searchType,'web','Web comparison must not mix image/video search');
  assert.equal(includeFreshData,false,'Exclude provisional fresh data');
  assert.equal(aggregation,'property_daily','Property daily totals required');
  const before=dates(previous),after=dates(current);
  assert.equal(before.length,after.length,'Periods must have equal duration');
  assert.ok(previous.to < current.from,'Periods must not overlap');
  assert.ok(Array.isArray(rows) && rows.length > 0,'No source rows');
  const byDate=new Map();
  for(const row of rows) {
    assert.equal(row.search_type,searchType,'Mixed search types');
    assert.ok(!('page' in row) && !('query' in row),'Page/query totals cannot substitute property totals');
    assert.ok(!byDate.has(row.date),'Duplicate daily totals');
    for(const key of ['clicks','impressions','position']) assert.ok(Number.isFinite(row[key]) && row[key]>=0,'Invalid metric');
    byDate.set(row.date,row);
  }
  const summarize = days => {
    const missing=days.filter(d=>!byDate.has(d));
    assert.equal(missing.length,0,'Incomplete period; absent rows are not confirmed zero: '+missing.join(', '));
    const selected=days.map(d=>byDate.get(d));
    const sum=k=>selected.reduce((n,r)=>n+r[k],0);
    const impressions=sum('impressions'),clicks=sum('clicks');
    return {from:days[0],to:days.at(-1),days:days.length,clicks,impressions,
      ctr:impressions?clicks/impressions:null,
      position:impressions?selected.reduce((n,r)=>n+r.position*r.impressions,0)/impressions:null};
  };
  return {property,searchType,previous:summarize(before),current:summarize(after),
    limits:['Positions use impression weighting of source daily averages, which may be rounded.',
      'Search performance does not measure indexed-page count or prove causality.',
      'GA4 distinct users require an original period-level query; never sum daily users.']};
}
