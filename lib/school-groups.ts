export type School = { id: string; displayName: string; keywords: string[] }
export type SchoolGroup = { id: string; name: string; schools: School[] }

export const schoolGroups: SchoolGroup[] = [
  { id: "boston", name: "波士顿地区", schools: [
    { id: "mit", displayName: "MIT", keywords: ["mit", "massachusetts institute"] },
    { id: "harvard", displayName: "Harvard University", keywords: ["harvard"] },
    { id: "bu", displayName: "Boston University", keywords: ["boston university", "bu "] },
    { id: "northeastern", displayName: "Northeastern University", keywords: ["northeastern"] },
    { id: "tufts", displayName: "Tufts University", keywords: ["tufts"] },
    { id: "bc", displayName: "Boston College", keywords: ["boston college"] },
    { id: "brandeis", displayName: "Brandeis University", keywords: ["brandeis"] },
  ]},
  { id: "connecticut", name: "康涅狄格地区", schools: [
    { id: "yale", displayName: "Yale University", keywords: ["yale"] },
    { id: "uconn", displayName: "University of Connecticut", keywords: ["uconn", "university of connecticut"] },
    { id: "wesleyan", displayName: "Wesleyan University", keywords: ["wesleyan"] },
  ]},
  { id: "nyc", name: "纽约地区", schools: [
    { id: "columbia", displayName: "Columbia University", keywords: ["columbia"] },
    { id: "nyu", displayName: "NYU", keywords: ["nyu", "new york university"] },
    { id: "fordham", displayName: "Fordham University", keywords: ["fordham"] },
    { id: "cooper", displayName: "Cooper Union", keywords: ["cooper union"] },
    { id: "stevens", displayName: "Stevens Institute of Technology", keywords: ["stevens institute", "stevens tech"] },
    { id: "newschool", displayName: "The New School", keywords: ["new school"] },
    { id: "cuny", displayName: "CUNY", keywords: ["cuny", "city university of new york"] },
    { id: "pace", displayName: "Pace University", keywords: ["pace university"] },
  ]},
  { id: "new-jersey", name: "新泽西地区", schools: [
    { id: "princeton", displayName: "Princeton University", keywords: ["princeton"] },
    { id: "rutgers", displayName: "Rutgers University", keywords: ["rutgers"] },
    { id: "njit", displayName: "NJIT", keywords: ["njit", "new jersey institute"] },
    { id: "seton-hall", displayName: "Seton Hall University", keywords: ["seton hall"] },
  ]},
  { id: "upstate-ny", name: "纽约上州", schools: [
    { id: "cornell", displayName: "Cornell University", keywords: ["cornell"] },
    { id: "syracuse", displayName: "Syracuse University", keywords: ["syracuse"] },
    { id: "rochester", displayName: "University of Rochester", keywords: ["university of rochester", "rochester "] },
    { id: "rit", displayName: "RIT", keywords: ["rit", "rochester institute"] },
    { id: "stonybrook", displayName: "Stony Brook University", keywords: ["stony brook", "stonybrook"] },
    { id: "binghamton", displayName: "Binghamton University", keywords: ["binghamton"] },
    { id: "buffalo", displayName: "University at Buffalo", keywords: ["university at buffalo", "suny buffalo"] },
    { id: "rpi", displayName: "RPI", keywords: ["rpi", "rensselaer"] },
  ]},
  { id: "philadelphia", name: "费城地区", schools: [
    { id: "upenn", displayName: "UPenn", keywords: ["upenn", "penn ", "university of pennsylvania"] },
    { id: "drexel", displayName: "Drexel University", keywords: ["drexel"] },
    { id: "temple", displayName: "Temple University", keywords: ["temple"] },
    { id: "villanova", displayName: "Villanova University", keywords: ["villanova"] },
    { id: "swarthmore", displayName: "Swarthmore College", keywords: ["swarthmore"] },
  ]},
  { id: "dc-metro", name: "华盛顿DC地区", schools: [
    { id: "georgetown", displayName: "Georgetown University", keywords: ["georgetown"] },
    { id: "gwu", displayName: "George Washington University", keywords: ["george washington", "gwu"] },
    { id: "umd", displayName: "UMD College Park", keywords: ["umd", "university of maryland"] },
    { id: "american", displayName: "American University", keywords: ["american university"] },
    { id: "gmu", displayName: "George Mason University", keywords: ["george mason", "gmu"] },
    { id: "jhu", displayName: "Johns Hopkins University", keywords: ["johns hopkins", "jhu"] },
  ]},
  { id: "virginia", name: "弗吉尼亚地区", schools: [
    { id: "uva", displayName: "University of Virginia", keywords: ["uva", "university of virginia"] },
    { id: "vt", displayName: "Virginia Tech", keywords: ["virginia tech", "virginia polytechnic"] },
    { id: "wm", displayName: "William & Mary", keywords: ["william mary", "william and mary", "college of william"] },
    { id: "vcu", displayName: "Virginia Commonwealth University", keywords: ["vcu", "virginia commonwealth"] },
  ]},
  { id: "pittsburgh", name: "匹兹堡地区", schools: [
    { id: "cmu", displayName: "Carnegie Mellon University", keywords: ["carnegie mellon", "cmu"] },
    { id: "pitt", displayName: "University of Pittsburgh", keywords: ["pitt", "university of pittsburgh"] },
    { id: "duq", displayName: "Duquesne University", keywords: ["duquesne"] },
  ]},
  { id: "research-triangle", name: "北卡三角区", schools: [
    { id: "duke", displayName: "Duke University", keywords: ["duke"] },
    { id: "unc", displayName: "UNC Chapel Hill", keywords: ["unc", "chapel hill", "north carolina at chapel"] },
    { id: "ncsu", displayName: "NC State", keywords: ["nc state", "ncsu", "north carolina state"] },
    { id: "wake-forest", displayName: "Wake Forest University", keywords: ["wake forest"] },
  ]},
  { id: "atlanta", name: "亚特兰大地区", schools: [
    { id: "gatech", displayName: "Georgia Tech", keywords: ["georgia tech", "gatech"] },
    { id: "emory", displayName: "Emory University", keywords: ["emory"] },
    { id: "gsu", displayName: "Georgia State University", keywords: ["georgia state", "gsu "] },
    { id: "uga", displayName: "University of Georgia", keywords: ["university of georgia", "uga "] },
  ]},
  { id: "nashville", name: "纳什维尔地区", schools: [
    { id: "vanderbilt", displayName: "Vanderbilt University", keywords: ["vanderbilt"] },
    { id: "belmont", displayName: "Belmont University", keywords: ["belmont"] },
  ]},
  { id: "florida", name: "佛罗里达地区", schools: [
    { id: "uf", displayName: "University of Florida", keywords: ["university of florida", "uf "] },
    { id: "fsu", displayName: "Florida State University", keywords: ["florida state", "fsu"] },
    { id: "miami", displayName: "University of Miami", keywords: ["university of miami"] },
    { id: "ucf", displayName: "UCF", keywords: ["ucf", "central florida"] },
    { id: "usf", displayName: "University of South Florida", keywords: ["university of south florida", "usf"] },
    { id: "fiu", displayName: "FIU", keywords: ["fiu", "florida international"] },
  ]},
  { id: "chicago", name: "芝加哥地区", schools: [
    { id: "uchicago", displayName: "UChicago", keywords: ["uchicago", "university of chicago"] },
    { id: "northwestern", displayName: "Northwestern University", keywords: ["northwestern"] },
    { id: "uic", displayName: "UIC", keywords: ["uic", "university of illinois chicago"] },
    { id: "iit", displayName: "Illinois Tech", keywords: ["illinois tech", "iit"] },
    { id: "depaul", displayName: "DePaul University", keywords: ["depaul"] },
    { id: "loyola-chi", displayName: "Loyola University Chicago", keywords: ["loyola chicago"] },
  ]},
  { id: "urbana-champaign", name: "伊利诺伊地区", schools: [
    { id: "uiuc", displayName: "UIUC", keywords: ["uiuc", "university of illinois urbana", "illinois urbana"] },
    { id: "isu", displayName: "Illinois State University", keywords: ["illinois state university"] },
  ]},
  { id: "ann-arbor", name: "安娜堡地区", schools: [
    { id: "umich", displayName: "University of Michigan", keywords: ["university of michigan", "umich", "u of m"] },
    { id: "msu", displayName: "Michigan State University", keywords: ["michigan state", "msu"] },
    { id: "wmu", displayName: "Western Michigan University", keywords: ["western michigan"] },
  ]},
  { id: "ohio", name: "俄亥俄地区", schools: [
    { id: "osu", displayName: "Ohio State University", keywords: ["ohio state", "osu"] },
    { id: "case-western", displayName: "Case Western Reserve University", keywords: ["case western"] },
    { id: "uc", displayName: "University of Cincinnati", keywords: ["university of cincinnati"] },
    { id: "ohio-u", displayName: "Ohio University", keywords: ["ohio university"] },
  ]},
  { id: "indiana", name: "印第安纳地区", schools: [
    { id: "purdue", displayName: "Purdue University", keywords: ["purdue"] },
    { id: "iu", displayName: "Indiana University Bloomington", keywords: ["indiana university", "iu bloomington"] },
    { id: "notredame", displayName: "Notre Dame", keywords: ["notre dame"] },
  ]},
  { id: "twin-cities", name: "明尼苏达地区", schools: [
    { id: "umn", displayName: "University of Minnesota", keywords: ["university of minnesota", "umn", "twin cities"] },
  ]},
  { id: "madison", name: "麦迪逊地区", schools: [
    { id: "wisc", displayName: "UW-Madison", keywords: ["uw-madison", "university of wisconsin-madison", "wisconsin madison"] },
    { id: "wisc-mil", displayName: "UW-Milwaukee", keywords: ["uw-milwaukee", "university of wisconsin-milwaukee"] },
  ]},
  { id: "st-louis", name: "圣路易斯地区", schools: [
    { id: "washu", displayName: "Washington University in St. Louis", keywords: ["washington university in st", "washu", "wustl"] },
    { id: "slu", displayName: "Saint Louis University", keywords: ["saint louis university", "slu"] },
  ]},
  { id: "texas", name: "德克萨斯地区", schools: [
    { id: "utaustin", displayName: "UT Austin", keywords: ["ut austin", "university of texas at austin"] },
    { id: "tamu", displayName: "Texas A&M", keywords: ["texas a", "tamu"] },
    { id: "rice", displayName: "Rice University", keywords: ["rice university"] },
    { id: "utdallas", displayName: "UT Dallas", keywords: ["ut dallas", "university of texas at dallas", "utd"] },
    { id: "smu", displayName: "SMU", keywords: ["smu", "southern methodist"] },
    { id: "houston", displayName: "University of Houston", keywords: ["university of houston"] },
  ]},
  { id: "bay-area", name: "湾区", schools: [
    { id: "stanford", displayName: "Stanford University", keywords: ["stanford"] },
    { id: "berkeley", displayName: "UC Berkeley", keywords: ["uc berkeley", "berkeley", "cal "] },
    { id: "ucsf", displayName: "UCSF", keywords: ["ucsf", "uc san francisco"] },
    { id: "scu", displayName: "Santa Clara University", keywords: ["santa clara"] },
    { id: "sjsu", displayName: "San Jose State", keywords: ["san jose state", "sjsu"] },
    { id: "cmu-sv", displayName: "CMU Silicon Valley", keywords: ["carnegie mellon silicon"] },
  ]},
  { id: "los-angeles", name: "洛杉矶地区", schools: [
    { id: "ucla", displayName: "UCLA", keywords: ["ucla", "uc los angeles"] },
    { id: "usc", displayName: "USC", keywords: ["usc", "southern california"] },
    { id: "caltech", displayName: "Caltech", keywords: ["caltech", "california institute of technology"] },
    { id: "uci", displayName: "UC Irvine", keywords: ["uc irvine", "irvine"] },
  ]},
  { id: "san-diego", name: "圣地亚哥地区", schools: [
    { id: "ucsd", displayName: "UC San Diego", keywords: ["uc san diego", "ucsd"] },
    { id: "sdsu", displayName: "San Diego State University", keywords: ["san diego state", "sdsu"] },
    { id: "usd", displayName: "University of San Diego", keywords: ["university of san diego"] },
  ]},
  { id: "seattle", name: "西雅图地区", schools: [
    { id: "uw", displayName: "University of Washington", keywords: ["university of washington", "uw seattle"] },
    { id: "seattle-u", displayName: "Seattle University", keywords: ["seattle university"] },
    { id: "wsu", displayName: "Washington State University", keywords: ["washington state university", "wsu"] },
  ]},
  { id: "pacific-northwest", name: "俄勒冈地区", schools: [
    { id: "uoregon", displayName: "University of Oregon", keywords: ["university of oregon", "oregon "] },
    { id: "oregonst", displayName: "Oregon State University", keywords: ["oregon state"] },
  ]},
  { id: "mountain-west", name: "科罗拉多/犹他地区", schools: [
    { id: "cuboulder", displayName: "CU Boulder", keywords: ["cu boulder", "university of colorado boulder"] },
    { id: "csu", displayName: "Colorado State University", keywords: ["colorado state university"] },
    { id: "utah", displayName: "University of Utah", keywords: ["university of utah"] },
    { id: "byu", displayName: "BYU", keywords: ["byu", "brigham young"] },
  ]},
  { id: "arizona", name: "亚利桑那地区", schools: [
    { id: "asu", displayName: "Arizona State University", keywords: ["arizona state", "asu"] },
    { id: "uarizona", displayName: "University of Arizona", keywords: ["university of arizona", "u of arizona"] },
  ]},
]

export function findSchool(school: string): School | null {
  if (!school) return null
  const lower = school.toLowerCase()
  for (const group of schoolGroups)
    for (const s of group.schools)
      if (s.keywords.some((k) => lower.includes(k))) return s
  return null
}

export function findGroup(school: string): SchoolGroup | null {
  if (!school) return null
  const lower = school.toLowerCase()
  for (const group of schoolGroups)
    for (const s of group.schools)
      if (s.keywords.some((k) => lower.includes(k))) return group
  return null
}

export function inSameGroup(schoolA: string, schoolB: string): boolean {
  const gA = findGroup(schoolA)
  const gB = findGroup(schoolB)
  if (!gA || !gB) return false
  return gA.id === gB.id
}

export function isSameSchool(schoolA: string, schoolB: string): boolean {
  const sA = findSchool(schoolA)
  const sB = findSchool(schoolB)
  if (!sA || !sB) return false
  return sA.id === sB.id
}
