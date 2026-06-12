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

// ESPN team name -> our code
const ESPN_MAP = {
  "England":"ENG","Norway":"NOR","Uruguay":"URU","Ecuador":"ECU","Egypt":"EGY",
  "Curaçao":"CUR","Curacao":"CUR","Tunisia":"TUN","Saudi Arabia":"SAU",
  "Brazil":"BRA","Colombia":"COL","Morocco":"MOR","Turkey":"TUR","Sweden":"SWE",
  "Haiti":"HAI","South Africa":"SAF","New Zealand":"NZL",
  "Portugal":"POR","USA":"USA","United States":"USA","Senegal":"SEN","Scotland":"SCO",
  "Australia":"AUS","Switzerland":"SWI","Uzbekistan":"UZB","Jordan":"JOR",
  "Argentina":"ARG","Netherlands":"NED","Croatia":"CRO","Canada":"CAN","Iran":"IRN",
  "Ghana":"GHA","Algeria":"ALG","Qatar":"QAT",
  "Spain":"ESP","Belgium":"BEL","Japan":"JPN","South Korea":"KOR","Korea Republic":"KOR",
  "DR Congo":"DRC","Congo DR":"DRC","Bosnia and Herzegovina":"BOS","Bosnia & Herzegovina":"BOS",
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

const CACHE_KEY = "wc2026_espn_cache";
const CACHE_DATE_KEY = "wc2026_espn_date";

// Tournament date range
const START = "20260611";
const END   = "20260719";

// Use allorigins as CORS proxy
function espnUrl(dates) {
  const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=${dates}`;
  return `https://api.allorigins.win/get?url=${encodeURIComponent(base)}`;
}

async function fetchAllResults() {
  // Fetch in two chunks to stay under ESPN limit
  const chunk1 = await fetch(espnUrl(`${START}-20260630`)).then(r=>r.json());
  const chunk2 = await fetch(espnUrl(`20260701-${END}`)).then(r=>r.json());
  
  const parse = (raw) => {
    const data = JSON.parse(raw.contents);
    return (data.events || []);
  };

  const events = [...parse(chunk1), ...parse(chunk2)];
  const results = [];

  events.forEach(ev => {
    const comp = ev.competitions?.[0];
    if (!comp) return;
    const status = comp.status?.type?.name;
    // Only completed matches
    if (status !== "STATUS_FINAL") return;

    const [home, away] = comp.competitors || [];
    if (!home || !away) return;

    const homeName = home.team?.displayName || home.team?.name || "";
    const awayName = away.team?.displayName || away.team?.name || "";
    const homeScore = parseInt(home.score || 0);
    const awayScore = parseInt(away.score || 0);
    const homeCode = ESPN_MAP[homeName];
    const awayCode = ESPN_MAP[awayName];
    const date = ev.date?.slice(0,10) || "";
    const stage = ev.season?.slug || "group";

    if (homeCode) {
      const r = homeScore > awayScore ? "W" : homeScore === awayScore ? "D" : "L";
      results.push({ team: homeCode, opponent: awayCode || awayName, result: r, date, stage, id: ev.id + "_h" });
    }
    if (awayCode) {
      const r = awayScore > homeScore ? "W" : awayScore === homeScore ? "D" : "L";
      results.push({ team: awayCode, opponent: homeCode || homeName, result: r, date, stage, id: ev.id + "_a" });
    }
  });

  return results;
}

function calcPoints(results, teams) {
  let pts=0,w=0,d=0,l=0;
  results.forEach(r => {
    if (!teams.includes(r.team)) return;
    if (r.result==="W"){pts+=3;w++;} else if(r.result==="D"){pts+=1;d++;} else l++;
  });
  return {pts,w,d,l};
}

function todayStr() {
  return new Date().toISOString().slice(0,10);
}

export default function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [tab, setTab] = useState("leaderboard");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(force = false) {
    setLoading(true);
    setError(null);
    try {
      const cachedDate = localStorage.getItem(CACHE_DATE_KEY);
      const cachedData = localStorage.getItem(CACHE_KEY);
      const today = todayStr();

      if (!force && cachedDate === today && cachedData) {
        setResults(JSON.parse(cachedData));
        setLastFetched(cachedDate);
        setLoading(false);
        return;
      }

      const data = await fetchAllResults();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_DATE_KEY, today);
      setResults(data);
      setLastFetched(today);
    } catch(e) {
      setError("Couldn't fetch results: " + e.message);
      // Fall back to cache if available
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setResults(JSON.parse(cached));
        setLastFetched(localStorage.getItem(CACHE_DATE_KEY));
      }
    }
    setLoading(false);
  }

  const leaderboard = PARTICIPANTS.map(p => {
    const stats = calcPoints(results, TEAMS[p]);
    return { name: p, ...stats };
  }).sort((a,b) => b.pts - a.pts || b.w - a.w);

  const allTeams = [...new Set(Object.values(TEAMS).flat())].sort();

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',sans-serif", background:"#0d1117", minHeight:"100vh", color:"#e6edf3" }}>
      {/* Header */}
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
              <button onClick={() => loadData(true)} disabled={loading} style={{
                background:"#21262d", border:"1px solid #30363d", color: loading ? "#8b949e" : "#e6edf3",
                borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor: loading ? "default" : "pointer"
              }}>{loading ? "⏳ Loading..." : "↻ Refresh"}</button>
              {lastFetched && <div style={{ fontSize:10, color:"#8b949e", marginTop:3 }}>Updated {lastFetched}</div>}
            </div>
          </div>
          {error && <div style={{ background:"#3d1f1f", border:"1px solid #f85149", borderRadius:6, padding:"6px 10px", fontSize:12, color:"#f85149", margin:"8px 0" }}>{error}</div>}
          <div style={{ display:"flex", gap:0, marginTop:12 }}>
            {["leaderboard","results","teams"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab===t?"#21262d":"transparent",
                border:"none", borderBottom: tab===t?"2px solid #f4a261":"2px solid transparent",
                color: tab===t?"#fff":"#8b949e", padding:"8px 16px",
                fontSize:13, fontWeight:600, cursor:"pointer", textTransform:"capitalize"
              }}>
                {t==="leaderboard"?"🏆 Leaderboard":t==="results"?"📊 Results":"👥 Teams"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 16px" }}>

        {/* LEADERBOARD */}
        {tab==="leaderboard" && (
          <div>
            {loading && <p style={{ color:"#8b949e", textAlign:"center" }}>Fetching results from ESPN...</p>}
            {leaderboard.map((p,i) => (
              <div key={p.name} style={{
                background:"#161b22", border:`1px solid ${i===0?"#f4a261":"#21262d"}`,
                borderRadius:12, padding:"14px 18px", marginBottom:10,
                display:"flex", alignItems:"center", gap:14,
                boxShadow: i===0?"0 0 20px #f4a26133":"none"
              }}>
                <div style={{ fontSize:i===0?28:20, width:36, textAlign:"center" }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[p.name] }}/>
                    <span style={{ fontWeight:700, fontSize:16 }}>{p.name}</span>
                  </div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                    {TEAMS[p.name].map(t => (
                      <span key={t} style={{
                        background:"#21262d", borderRadius:4, padding:"2px 7px",
                        fontSize:11, color:"#8b949e", fontWeight:600
                      }}>{FLAG[t]||"🌍"} {t}</span>
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

        {/* RESULTS */}
        {tab==="results" && (
          <div>
            <h3 style={{ fontSize:13, color:"#8b949e", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
              Completed Matches ({results.length} team entries)
            </h3>
            {loading && <p style={{ color:"#8b949e", fontSize:13 }}>Loading...</p>}
            {results.length===0 && !loading && <p style={{ color:"#8b949e", fontSize:13 }}>No completed matches yet.</p>}
            {/* Group by date */}
            {Object.entries(
              results.reduce((acc, r) => {
                (acc[r.date] = acc[r.date] || []).push(r);
                return acc;
              }, {})
            ).sort(([a],[b]) => b.localeCompare(a)).map(([date, dayResults]) => (
              <div key={date}>
                <div style={{ fontSize:12, color:"#8b949e", fontWeight:600, margin:"12px 0 6px", textTransform:"uppercase", letterSpacing:1 }}>{date}</div>
                {dayResults.map(r => {
                  const owner = PARTICIPANTS.find(p => TEAMS[p].includes(r.team));
                  return (
                    <div key={r.id} style={{
                      background:"#161b22", border:"1px solid #21262d", borderRadius:8,
                      padding:"8px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:10
                    }}>
                      <span style={{ fontSize:16 }}>{FLAG[r.team]||"🌍"}</span>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:700, fontSize:13 }}>{r.team}</span>
                        {r.opponent && <span style={{ color:"#8b949e", fontSize:12 }}> vs {FLAG[r.opponent]||""} {r.opponent}</span>}
                        {owner && <span style={{ fontSize:11, marginLeft:8, color:COLORS[owner] }}>({owner})</span>}
                      </div>
                      <span style={{ fontWeight:900, fontSize:14,
                        color:r.result==="W"?"#3fb950":r.result==="D"?"#e3b341":"#f85149" }}>
                        {r.result==="W"?"+3":r.result==="D"?"+1":"0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* TEAMS */}
        {tab==="teams" && (
          <div>
            {PARTICIPANTS.map(p => (
              <div key={p} style={{ background:"#161b22", border:"1px solid #21262d", borderRadius:10, padding:"12px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[p] }}/>
                    <span style={{ fontWeight:700 }}>{p}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:COLORS[p] }}>
                    {calcPoints(results, TEAMS[p]).pts} pts
                  </span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {TEAMS[p].map(t => {
                    const teamResults = results.filter(r => r.team === t);
                    const pts = teamResults.reduce((s,r) => s + (r.result==="W"?3:r.result==="D"?1:0), 0);
                    return (
                      <span key={t} style={{
                        background: pts > 0 ? "#1e3a2f" : "#21262d",
                        border: pts > 0 ? "1px solid #3fb950" : "1px solid transparent",
                        borderRadius:4, padding:"3px 9px", fontSize:12, fontWeight:600
                      }}>
                        {FLAG[t]||"🌍"} {t} {pts > 0 ? <span style={{ color:"#3fb950" }}>+{pts}</span> : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
