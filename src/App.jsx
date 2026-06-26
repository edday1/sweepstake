import { useState, useEffect } from "react";

const PARTICIPANTS = ["Harry", "Niamh", "Ruby", "Mack", "Sarah", "Ed"];

const TEAMS = {
  Harry: ["ENG", "NOR", "URU", "ECU", "EGY", "CUR", "TUN", "SAU"],
  Niamh: ["BRA", "COL", "MOR", "TUR", "SWE", "HAI", "SAF", "NZL"],
  Ruby:  ["POR", "USA", "SEN", "SCO", "AUS", "SWI", "UZB", "JOR"],
  Mack:  ["ARG", "NED", "CRO", "CAN", "IRN", "GHA", "ALG", "QAT"],
  Sarah: ["ESP", "BEL", "JPN", "KOR", "DRC", "BOS", "PAN", "AUT"],
  Ed:    ["FRA", "GER", "MEX", "IVC", "PAR", "CZE", "CPV", "IRQ"],
};

const ESPN_MAP = {
  "England":"ENG","Norway":"NOR","Uruguay":"URU","Ecuador":"ECU","Egypt":"EGY",
  "Curaçao":"CUR","Curacao":"CUR","Tunisia":"TUN","Saudi Arabia":"SAU",
  "Brazil":"BRA","Colombia":"COL","Morocco":"MOR","Türkiye":"TUR","Turkey":"TUR","Sweden":"SWE",
  "Haiti":"HAI","South Africa":"SAF","New Zealand":"NZL",
  "Portugal":"POR","USA":"USA","United States":"USA","Senegal":"SEN","Scotland":"SCO",
  "Australia":"AUS","Switzerland":"SWI","Uzbekistan":"UZB","Jordan":"JOR",
  "Argentina":"ARG","Netherlands":"NED","Croatia":"CRO","Canada":"CAN","Iran":"IRN",
  "Ghana":"GHA","Algeria":"ALG","Qatar":"QAT",
  "Spain":"ESP","Belgium":"BEL","Japan":"JPN","South Korea":"KOR","Korea Republic":"KOR",
  "DR Congo":"DRC","Congo DR":"DRC","Bosnia-Herzegovina":"BOS","Bosnia and Herzegovina":"BOS","Bosnia & Herzegovina":"BOS",
  "Panama":"PAN","Austria":"AUT",
  "France":"FRA","Germany":"GER","Mexico":"MEX","Ivory Coast":"IVC","Côte d'Ivoire":"IVC",
  "Cote d'Ivoire":"IVC","Paraguay":"PAR","Czech Republic":"CZE","Czechia":"CZE",
  "Cape Verde":"CPV","Cabo Verde":"CPV","Iraq":"IRQ",
};

const FLAG = {
  ENG:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",NOR:"🇳🇴",URU:"🇺🇾",ECU:"🇪🇨",EGY:"🇪🇬",CUR:"🇨🇼",TUN:"🇹🇳",SAU:"🇸🇦",
  BRA:"🇧🇷",COL:"🇨🇴",MOR:"🇲🇦",TUR:"🇹🇷",SWE:"🇸🇪",HAI:"🇭🇹",SAF:"🇿🇦",NZL:"🇳🇿",
  POR:"🇵🇹",USA:"🇺🇸",SEN:"🇸🇳",SCO:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",AUS:"🇦🇺",SWI:"🇨🇭",UZB:"🇺🇿",JOR:"🇯🇴",
  ARG:"🇦🇷",NED:"🇳🇱",CRO:"🇭🇷",CAN:"🇨🇦",IRN:"🇮🇷",GHA:"🇬🇭",ALG:"🇩🇿",QAT:"🇶🇦",
  ESP:"🇪🇸",BEL:"🇧🇪",JPN:"🇯🇵",KOR:"🇰🇷",DRC:"🇨🇩",BOS:"🇧🇦",PAN:"🇵🇦",AUT:"🇦🇹",
  FRA:"🇫🇷",GER:"🇩🇪",MEX:"🇲🇽",IVC:"🇨🇮",PAR:"🇵🇾",CZE:"🇨🇿",CPV:"🇨🇻",IRQ:"🇮🇶",
};

const COLORS = {
  Harry:"#e63946",Niamh:"#2a9d8f",Ruby:"#e9c46a",
  Mack:"#457b9d",Sarah:"#a8dadc",Ed:"#f4a261",
};

async function fetchAllResults() {
  const ranges = ["20260611-20260630", "20260701-20260719"];
  const events = [];
  for (const range of ranges) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=${range}`;
    const res = await fetch(url);
    const data = await res.json();
    (data.events || []).forEach(e => events.push(e));
  }

  const teamResults = [];
  const matches = [];

  events.forEach(ev => {
    const comp = ev.competitions?.[0];
    if (!comp) return;
    if (comp.status?.type?.name !== "STATUS_FULL_TIME") return;
    const [home, away] = comp.competitors || [];
    if (!home || !away) return;
    const homeName = home.team?.displayName || "";
    const awayName = away.team?.displayName || "";
    const homeScore = parseInt(home.score || 0);
    const awayScore = parseInt(away.score || 0);
    const homeCode = ESPN_MAP[homeName];
    const awayCode = ESPN_MAP[awayName];
    const date = ev.date?.slice(0,10) || "";

    // Store match for display tab
    matches.push({
      homeCode: homeCode || homeName,
      awayCode: awayCode || awayName,
      homeScore, awayScore, date, id: ev.id,
      homeOwner: PARTICIPANTS.find(p => TEAMS[p].includes(homeCode)),
      awayOwner: PARTICIPANTS.find(p => TEAMS[p].includes(awayCode)),
    });

    // Store per-team entries for points calc
    if (homeCode) {
      const r = homeScore > awayScore ? "W" : homeScore === awayScore ? "D" : "L";
      teamResults.push({ team:homeCode, result:r, id:ev.id+"_h" });
    }
    if (awayCode) {
      const r = awayScore > homeScore ? "W" : awayScore === homeScore ? "D" : "L";
      teamResults.push({ team:awayCode, result:r, id:ev.id+"_a" });
    }
  });

  return { teamResults, matches };
}

// Fetch knockout stage fixtures from ESPN - includes placeholder names until confirmed,
// then real team names automatically once the bracket locks in. No manual updates needed.
async function fetchKnockoutFixtures() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260628-20260719`;
  const res = await fetch(url);
  const data = await res.json();
  const events = data.events || [];

  return events.map(ev => {
    const comp = ev.competitions?.[0];
    if (!comp) return null;
    const [home, away] = comp.competitors || [];
    if (!home || !away) return null;
    const homeName = home.team?.displayName || "TBC";
    const awayName = away.team?.displayName || "TBC";
    const homeCode = ESPN_MAP[homeName];
    const awayCode = ESPN_MAP[awayName];
    return {
      date: ev.date?.slice(0,10) || "",
      time: ev.date ? new Date(ev.date).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false}) : "",
      home: homeCode || homeName,
      away: awayCode || awayName,
      confirmed: !!(homeCode && awayCode),
      id: ev.id,
    };
  }).filter(Boolean);
}

function calcPoints(teamResults, teams) {
  let pts=0,w=0,d=0,l=0;
  teamResults.forEach(r => {
    if (!teams.includes(r.team)) return;
    if (r.result==="W"){pts+=3;w++;} else if(r.result==="D"){pts+=1;d++;} else l++;
  });
  return {pts,w,d,l};
}

function todayStr() { return new Date().toISOString().slice(0,10); }

const FIXTURES = [
  // Thu 11 Jun
  {date:"2026-06-11",time:"20:00",home:"MEX",away:"SAF",tv:"ITV"},
  {date:"2026-06-12",time:"03:00",home:"KOR",away:"CZE",tv:"ITV"},
  // Fri 12 Jun
  {date:"2026-06-12",time:"20:00",home:"CAN",away:"BOS",tv:"BBC"},
  {date:"2026-06-13",time:"02:00",home:"USA",away:"PAR",tv:"BBC"},
  // Sat 13 Jun
  {date:"2026-06-13",time:"20:00",home:"QAT",away:"SWI",tv:"ITV"},
  {date:"2026-06-13",time:"23:00",home:"BRA",away:"MOR",tv:"BBC"},
  {date:"2026-06-14",time:"02:00",home:"HAI",away:"SCO",tv:"BBC"},
  // Sun 14 Jun
  {date:"2026-06-14",time:"05:00",home:"AUS",away:"TUR",tv:"ITV"},
  {date:"2026-06-14",time:"18:00",home:"GER",away:"CUR",tv:"ITV"},
  {date:"2026-06-14",time:"21:00",home:"NED",away:"JPN",tv:"ITV"},
  {date:"2026-06-15",time:"00:00",home:"IVC",away:"ECU",tv:"BBC"},
  {date:"2026-06-15",time:"03:00",home:"SWE",away:"TUN",tv:"ITV"},
  // Mon 15 Jun
  {date:"2026-06-15",time:"17:00",home:"ESP",away:"CPV",tv:"ITV"},
  {date:"2026-06-15",time:"20:00",home:"BEL",away:"EGY",tv:"BBC"},
  {date:"2026-06-15",time:"23:00",home:"SAU",away:"URU",tv:"ITV"},
  {date:"2026-06-16",time:"02:00",home:"IRN",away:"NZL",tv:"BBC"},
  // Tue 16 Jun
  {date:"2026-06-16",time:"20:00",home:"FRA",away:"SEN",tv:"BBC"},
  {date:"2026-06-16",time:"23:00",home:"IRQ",away:"NOR",tv:"BBC"},
  {date:"2026-06-17",time:"02:00",home:"ARG",away:"ALG",tv:"ITV"},
  // Wed 17 Jun
  {date:"2026-06-17",time:"05:00",home:"AUT",away:"JOR",tv:"BBC"},
  {date:"2026-06-17",time:"18:00",home:"POR",away:"DRC",tv:"BBC"},
  {date:"2026-06-17",time:"21:00",home:"ENG",away:"CRO",tv:"ITV"},
  {date:"2026-06-18",time:"00:00",home:"GHA",away:"PAN",tv:"ITV"},
  {date:"2026-06-18",time:"03:00",home:"UZB",away:"COL",tv:"BBC"},
  // Thu 18 Jun
  {date:"2026-06-18",time:"17:00",home:"CZE",away:"SAF",tv:"BBC"},
  {date:"2026-06-18",time:"20:00",home:"SWI",away:"BOS",tv:"ITV"},
  {date:"2026-06-18",time:"23:00",home:"CAN",away:"QAT",tv:"ITV"},
  {date:"2026-06-19",time:"02:00",home:"MEX",away:"KOR",tv:"BBC"},
  // Fri 19 Jun
  {date:"2026-06-19",time:"20:00",home:"USA",away:"AUS",tv:"BBC"},
  {date:"2026-06-19",time:"23:00",home:"SCO",away:"MOR",tv:"ITV"},
  {date:"2026-06-20",time:"02:00",home:"BRA",away:"HAI",tv:"ITV"},
  // Sat 20 Jun
  {date:"2026-06-20",time:"05:00",home:"TUR",away:"PAR",tv:"ITV"},
  {date:"2026-06-20",time:"18:00",home:"NED",away:"SWE",tv:"BBC"},
  {date:"2026-06-20",time:"21:00",home:"GER",away:"IVC",tv:"ITV"},
  {date:"2026-06-21",time:"01:00",home:"ECU",away:"CUR",tv:"BBC"},
  // Sun 21 Jun
  {date:"2026-06-21",time:"05:00",home:"TUN",away:"JPN",tv:"BBC"},
  {date:"2026-06-21",time:"17:00",home:"ESP",away:"SAU",tv:"BBC"},
  {date:"2026-06-21",time:"20:00",home:"BEL",away:"IRN",tv:"ITV"},
  {date:"2026-06-21",time:"23:00",home:"URU",away:"CPV",tv:"BBC"},
  {date:"2026-06-22",time:"02:00",home:"NZL",away:"EGY",tv:"ITV"},
  // Mon 22 Jun
  {date:"2026-06-22",time:"18:00",home:"ARG",away:"AUT",tv:"BBC"},
  {date:"2026-06-22",time:"22:00",home:"FRA",away:"IRQ",tv:"BBC"},
  {date:"2026-06-23",time:"01:00",home:"NOR",away:"SEN",tv:"ITV"},
  // Tue 23 Jun
  {date:"2026-06-23",time:"04:00",home:"JOR",away:"ALG",tv:"ITV"},
  {date:"2026-06-23",time:"18:00",home:"POR",away:"UZB",tv:"ITV"},
  {date:"2026-06-23",time:"21:00",home:"ENG",away:"GHA",tv:"BBC"},
  {date:"2026-06-24",time:"00:00",home:"PAN",away:"CRO",tv:"BBC"},
  {date:"2026-06-24",time:"03:00",home:"COL",away:"DRC",tv:"ITV"},
  // Wed 24 Jun
  {date:"2026-06-24",time:"20:00",home:"BOS",away:"QAT",tv:"ITV"},
  {date:"2026-06-24",time:"20:00",home:"SWI",away:"CAN",tv:"ITV"},
  {date:"2026-06-24",time:"23:00",home:"MOR",away:"HAI",tv:"BBC"},
  {date:"2026-06-24",time:"23:00",home:"SCO",away:"BRA",tv:"BBC"},
  {date:"2026-06-25",time:"02:00",home:"CZE",away:"MEX",tv:"BBC"},
  {date:"2026-06-25",time:"02:00",home:"SAF",away:"KOR",tv:"BBC"},
  // Thu 25 Jun
  {date:"2026-06-25",time:"21:00",home:"CUR",away:"IVC",tv:"BBC"},
  {date:"2026-06-25",time:"21:00",home:"ECU",away:"GER",tv:"BBC"},
  {date:"2026-06-26",time:"00:00",home:"JPN",away:"SWE",tv:"BBC"},
  {date:"2026-06-26",time:"00:00",home:"TUN",away:"NED",tv:"BBC"},
  // Fri 26 Jun
  {date:"2026-06-26",time:"03:00",home:"PAR",away:"AUS",tv:"ITV"},
  {date:"2026-06-26",time:"03:00",home:"TUR",away:"USA",tv:"ITV"},
  {date:"2026-06-26",time:"20:00",home:"NOR",away:"FRA",tv:"ITV"},
  {date:"2026-06-26",time:"20:00",home:"SEN",away:"IRQ",tv:"ITV"},
  // Sat 27 Jun
  {date:"2026-06-27",time:"01:00",home:"CPV",away:"SAU",tv:"ITV"},
  {date:"2026-06-27",time:"01:00",home:"URU",away:"ESP",tv:"ITV"},
  {date:"2026-06-27",time:"04:00",home:"EGY",away:"IRN",tv:"BBC"},
  {date:"2026-06-27",time:"04:00",home:"NZL",away:"BEL",tv:"BBC"},
  {date:"2026-06-27",time:"22:00",home:"CRO",away:"GHA",tv:"ITV"},
  {date:"2026-06-27",time:"22:00",home:"PAN",away:"ENG",tv:"ITV"},
  // Sun 28 Jun
  {date:"2026-06-28",time:"00:30",home:"COL",away:"POR",tv:"BBC"},
  {date:"2026-06-28",time:"00:30",home:"DRC",away:"UZB",tv:"BBC"},
  {date:"2026-06-28",time:"03:00",home:"ALG",away:"AUT",tv:"BBC"},
  {date:"2026-06-28",time:"03:00",home:"JOR",away:"ARG",tv:"BBC"},
  // Round of 32
  {date:"2026-06-28",time:"20:00",home:"KOR",away:"CAN",tv:"TBC",stage:"R32"},
  {date:"2026-06-29",time:"18:00",home:"BRA",away:"JPN",tv:"TBC",stage:"R32"},
  {date:"2026-06-29",time:"21:30",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-06-30",time:"02:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-06-30",time:"18:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-06-30",time:"22:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-01",time:"02:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-01",time:"17:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-01",time:"21:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-02",time:"01:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-02",time:"20:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-03",time:"00:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-03",time:"04:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-03",time:"19:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-03",time:"23:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  {date:"2026-07-04",time:"02:30",home:"TBC",away:"TBC",tv:"TBC",stage:"R32"},
  // Round of 16
  {date:"2026-07-04",time:"18:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  {date:"2026-07-04",time:"22:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  {date:"2026-07-05",time:"21:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  {date:"2026-07-06",time:"00:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  {date:"2026-07-06",time:"18:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  {date:"2026-07-06",time:"22:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  {date:"2026-07-07",time:"21:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  {date:"2026-07-08",time:"00:00",home:"TBC",away:"TBC",tv:"TBC",stage:"R16"},
  // Quarter Finals
  {date:"2026-07-09",time:"21:00",home:"TBC",away:"TBC",tv:"TBC",stage:"QF"},
  {date:"2026-07-10",time:"00:00",home:"TBC",away:"TBC",tv:"TBC",stage:"QF"},
  {date:"2026-07-10",time:"21:00",home:"TBC",away:"TBC",tv:"TBC",stage:"QF"},
  {date:"2026-07-11",time:"00:00",home:"TBC",away:"TBC",tv:"TBC",stage:"QF"},
  // Semi Finals
  {date:"2026-07-14",time:"01:00",home:"TBC",away:"TBC",tv:"TBC",stage:"SF"},
  {date:"2026-07-15",time:"01:00",home:"TBC",away:"TBC",tv:"TBC",stage:"SF"},
  // 3rd Place & Final
  {date:"2026-07-18",time:"21:00",home:"TBC",away:"TBC",tv:"TBC",stage:"3rd"},
  {date:"2026-07-19",time:"21:00",home:"TBC",away:"TBC",tv:"BBC+ITV",stage:"Final"},
];

export default function App() {
  const [teamResults, setTeamResults] = useState([]);
  const [matches, setMatches] = useState([]);
  const [knockoutLive, setKnockoutLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [tab, setTab] = useState("leaderboard");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllResults();
      setTeamResults(data.teamResults);
      setMatches(data.matches);
      const knockout = await fetchKnockoutFixtures().catch(() => []);
      setKnockoutLive(knockout);
      setLastFetched(todayStr());
    } catch(e) {
      setError("Couldn't fetch results: " + e.message);
    }
    setLoading(false);
  }

  const leaderboard = PARTICIPANTS.map(p => {
    const stats = calcPoints(teamResults, TEAMS[p]);
    return { name:p, ...stats };
  }).sort((a,b) => b.pts-a.pts || b.w-a.w);

  const matchesByDate = matches.reduce((acc,m) => {
    (acc[m.date] = acc[m.date] || []).push(m);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", background:"#0d1117", minHeight:"100vh", color:"#e6edf3" }}>
      <div style={{ background:"linear-gradient(135deg,#1a1f2e,#0d1117)", borderBottom:"2px solid #21262d", padding:"20px 16px 0" }}>
        <div style={{ maxWidth:700, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:32 }}>⚽</span>
              <div>
                <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:"#fff" }}>World Cup 2026</h1>
                <p style={{ margin:0, fontSize:12, color:"#8b949e" }}>Family Sweepstake · 3pts win · 1pt draw</p>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <button onClick={loadData} disabled={loading} style={{
                background:"#21262d", border:"1px solid #30363d", color:loading?"#8b949e":"#e6edf3",
                borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:loading?"default":"pointer"
              }}>{loading ? "⏳ Loading..." : "↻ Refresh"}</button>
              {lastFetched && <div style={{ fontSize:10, color:"#8b949e", marginTop:3 }}>Updated {lastFetched}</div>}
            </div>
          </div>
          {error && <div style={{ background:"#3d1f1f", border:"1px solid #f85149", borderRadius:6, padding:"6px 10px", fontSize:12, color:"#f85149", margin:"8px 0" }}>{error}</div>}
          <div style={{ display:"flex", marginTop:12 }}>
            {["leaderboard","results","teams","fixtures"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background:tab===t?"#21262d":"transparent", border:"none",
                borderBottom:tab===t?"2px solid #f4a261":"2px solid transparent",
                color:tab===t?"#fff":"#8b949e", padding:"8px 12px",
                fontSize:12, fontWeight:600, cursor:"pointer", textTransform:"capitalize"
              }}>
                {t==="leaderboard"?"🏆 Board":t==="results"?"📊 Results":t==="teams"?"👥 Teams":"📅 Fixtures"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 16px" }}>

        {tab==="leaderboard" && (
          <div>
            {loading && <p style={{ color:"#8b949e", textAlign:"center" }}>Fetching results from ESPN...</p>}
            {leaderboard.map((p,i) => (
              <div key={p.name} style={{
                background:"#161b22", border:`1px solid ${i===0?"#f4a261":"#21262d"}`,
                borderRadius:12, padding:"14px 18px", marginBottom:10,
                display:"flex", alignItems:"center", gap:14,
                boxShadow:i===0?"0 0 20px #f4a26133":"none"
              }}>
                <div style={{ fontSize:i===0?28:20, width:36, textAlign:"center" }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                </div>
                <img src={`/sweepstake/${p.name.toLowerCase()}.png`} alt={p.name}
                  style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", border:`2px solid ${COLORS[p.name]}` }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontWeight:700, fontSize:16 }}>{p.name}</span>
                  </div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {TEAMS[p.name].map(t => (
                      <span key={t} style={{ background:"#21262d", borderRadius:4, padding:"2px 7px", fontSize:11, color:"#8b949e", fontWeight:600 }}>
                        {FLAG[t]||"🌍"} {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:28, fontWeight:900, color:i===0?"#f4a261":"#e6edf3" }}>{p.pts}</div>
                  <div style={{ fontSize:11, color:"#8b949e" }}>pts</div>
                  <div style={{ fontSize:11, color:"#8b949e", marginTop:2 }}>{p.w}W {p.d}D {p.l}L</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="results" && (
          <div>
            <h3 style={{ fontSize:13, color:"#8b949e", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
              Completed Matches ({matches.length})
            </h3>
            {loading && <p style={{ color:"#8b949e", fontSize:13 }}>Loading...</p>}
            {matches.length===0 && !loading && <p style={{ color:"#8b949e", fontSize:13 }}>No completed matches yet.</p>}
            {Object.entries(matchesByDate).sort(([a],[b]) => b.localeCompare(a)).map(([date, dayMatches]) => (
              <div key={date}>
                <div style={{ fontSize:12, color:"#8b949e", fontWeight:600, margin:"12px 0 6px", textTransform:"uppercase", letterSpacing:1 }}>{date}</div>
                {dayMatches.map(m => (
                  <div key={m.id} style={{
                    background:"#161b22", border:"1px solid #21262d", borderRadius:8,
                    padding:"10px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:8
                  }}>
                    {/* Home team */}
                    <span style={{ fontSize:16 }}>{FLAG[m.homeCode]||"🌍"}</span>
                    <span style={{ fontWeight:700, fontSize:13 }}>{m.homeCode}</span>
                    {m.homeOwner && <span style={{ fontSize:11, color:COLORS[m.homeOwner] }}>({m.homeOwner})</span>}
                    {/* Score */}
                    <span style={{ fontWeight:900, fontSize:15, color:"#e6edf3", margin:"0 6px" }}>{m.homeScore}-{m.awayScore}</span>
                    {/* Away team */}
                    {m.awayOwner && <span style={{ fontSize:11, color:COLORS[m.awayOwner] }}>({m.awayOwner})</span>}
                    <span style={{ fontWeight:700, fontSize:13 }}>{m.awayCode}</span>
                    <span style={{ fontSize:16 }}>{FLAG[m.awayCode]||"🌍"}</span>
                    {/* Points */}
                    <span style={{ marginLeft:"auto", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
                      {m.homeOwner && <span style={{ color: m.homeScore > m.awayScore ? "#3fb950" : m.homeScore === m.awayScore ? "#e3b341" : "#8b949e" }}>
                        {m.homeOwner} {m.homeScore > m.awayScore ? "+3" : m.homeScore === m.awayScore ? "+1" : "0"}
                      </span>}
                      {m.homeOwner && m.awayOwner && <span style={{ color:"#8b949e" }}> · </span>}
                      {m.awayOwner && <span style={{ color: m.awayScore > m.homeScore ? "#3fb950" : m.awayScore === m.homeScore ? "#e3b341" : "#8b949e" }}>
                        {m.awayOwner} {m.awayScore > m.homeScore ? "+3" : m.awayScore === m.homeScore ? "+1" : "0"}
                      </span>}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab==="teams" && (
          <div>
            {PARTICIPANTS.map(p => (
              <div key={p} style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[p] }}/>
                    <span style={{ fontWeight:700 }}>{p}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:COLORS[p] }}>{calcPoints(teamResults, TEAMS[p]).pts} pts</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {TEAMS[p].map(t => {
                    const pts = teamResults.filter(r=>r.team===t).reduce((s,r)=>s+(r.result==="W"?3:r.result==="D"?1:0),0);
                    return (
                      <span key={t} style={{
                        background:pts>0?"#1e3a2f":"#21262d",
                        border:pts>0?"1px solid #3fb950":"1px solid transparent",
                        borderRadius:4, padding:"3px 9px", fontSize:12, fontWeight:600
                      }}>
                        {FLAG[t]||"🌍"} {t}{pts>0?` +${pts}`:""}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="fixtures" && (() => {
          const today = todayStr();
          // Merge: replace knockout placeholder fixtures with live ESPN data by date, if available
          const liveByDate = knockoutLive.reduce((acc,k) => { (acc[k.date]=acc[k.date]||[]).push(k); return acc; }, {});
          const mergedFixtures = FIXTURES.map(f => {
            if (!f.stage) return f; // group stage, keep as-is
            const liveMatches = liveByDate[f.date];
            if (!liveMatches || !liveMatches.length) return f;
            // Try to find a live match at the same time, else just take in order
            const liveMatch = liveMatches.find(l => l.time === f.time) || liveMatches.shift();
            if (!liveMatch) return f;
            return { ...f, home: liveMatch.home, away: liveMatch.away, confirmed: liveMatch.confirmed };
          });
          const byDate = mergedFixtures.reduce((acc,f) => { (acc[f.date]=acc[f.date]||[]).push(f); return acc; }, {});
          return (
            <div>
              <p style={{ fontSize:12, color:"#8b949e", marginBottom:12 }}>All times BST. Knockout teams fill in automatically once confirmed.</p>
              {Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, games]) => {
                const d = new Date(date);
                const label = d.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });
                const isPast = date < today;
                const isToday = date === today;
                return (
                  <div key={date}>
                    <div style={{ fontSize:12, fontWeight:700, margin:"14px 0 6px", color: isToday?"#f4a261":isPast?"#484f58":"#e6edf3", textTransform:"uppercase", letterSpacing:1 }}>
                      {isToday ? "⚡ TODAY" : label}
                    </div>
                    {games.map((f,i) => (
                      <div key={i} style={{
                        background:"#161b22", border:"1px solid #21262d",
                        borderRadius:8, padding:"8px 12px", marginBottom:5,
                        display:"flex", alignItems:"center", gap:8,
                        opacity: isPast ? 0.5 : 1
                      }}>
                        <span style={{ fontSize:11, color:"#8b949e", minWidth:36, fontWeight:600 }}>{f.time}</span>
                        {!FLAG[f.home] ? (
                          <span style={{ fontSize:12, color:"#8b949e", fontStyle:"italic" }}>
                            {f.stage === "R32" ? "Round of 32" : f.stage === "R16" ? "Round of 16" : f.stage === "QF" ? "Quarter Final" : f.stage === "SF" ? "Semi Final" : f.stage === "3rd" ? "3rd Place Play-off" : "Final"}
                            {f.home && f.home !== "TBC" && !["R32","R16","QF","SF","Final","3rd Place"].includes(f.home) ? ` · ${f.home} v ${f.away}` : " · TBC"}
                          </span>
                        ) : (() => {
                          const homeOwner = PARTICIPANTS.find(p => TEAMS[p].includes(f.home));
                          const awayOwner = PARTICIPANTS.find(p => TEAMS[p].includes(f.away));
                          return (<>
                            <span style={{ fontSize:14 }}>{FLAG[f.home]||"🌍"}</span>
                            <span style={{ fontSize:12, fontWeight:700 }}>{f.home}</span>
                            {homeOwner && <span style={{ fontSize:10, color:COLORS[homeOwner] }}>({homeOwner})</span>}
                            <span style={{ fontSize:11, color:"#8b949e", margin:"0 4px" }}>v</span>
                            {awayOwner && <span style={{ fontSize:10, color:COLORS[awayOwner] }}>({awayOwner})</span>}
                            <span style={{ fontSize:12, fontWeight:700 }}>{f.away}</span>
                            <span style={{ fontSize:14 }}>{FLAG[f.away]||"🌍"}</span>
                          </>);
                        })()}
                        <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, padding:"2px 6px", borderRadius:4,
                          background: f.tv==="BBC" ? "#1565c0" : f.tv==="ITV" ? "#8b0000" : f.tv==="BBC+ITV" ? "#2d6a4f" : "#21262d", color:"#fff" }}>{f.tv==="TBC" ? "TBC" : f.tv}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

