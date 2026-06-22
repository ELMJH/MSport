import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  Heart, 
  Star, 
  Settings, 
  RefreshCw, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Clock, 
  Info, 
  Play, 
  ShieldAlert,
  SlidersHorizontal,
  X
} from "lucide-react";
import { Match, UserPreferences } from "./types";
import { ONBOARDING_LEAGUES, ONBOARDING_TEAMS, LeagueSelection, TeamSelection } from "./data";

export default function App() {
  // State for requested date (defaults to today's date)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  // Active filters and views
  const [activeTab, setActiveTab] = useState<"yesterday" | "today" | "tomorrow" | "custom">("today");
  const [filterLive, setFilterLive] = useState<boolean>(false);
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<number | string>("all");
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  
  // Matches state
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorExists, setErrorExists] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState<boolean>(false);
  
  // Preferences (Favorites) setup states
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem("msport_preferences");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      favoriteLeagues: [39, 140, 307], // Defaults: Premier League, La Liga, Saudi League
      favoriteTeams: ["Real Madrid", "Al-Hilal", "Manchester City"] // Defaults
    };
  });
  
  // Onboarding Modal visibility
  const [showPrefModal, setShowPrefModal] = useState<boolean>(() => {
    return localStorage.getItem("msport_onboarded") === null;
  });

  // Fetch matches whenever selectedDate changes
  const fetchMatches = async (dateStr: string, isLiveOnly: boolean) => {
    setLoading(true);
    setErrorExists(null);
    try {
      let url = `/api/fixtures?date=${dateStr}`;
      if (isLiveOnly) {
        url = `/api/fixtures?live=all`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("حدث خطأ أثناء تحميل بيانات المباريات");
      }
      
      const data = await response.json();
      if (data && Array.isArray(data.response)) {
        setMatches(data.response);
        setIsUsingMockData(!!data.isMockPayload);
      } else {
        throw new Error("تسيق الرد البرمجي غير صالح");
      }
    } catch (err: any) {
      console.error(err);
      setErrorExists(err.message || "عذرًا، تعذر الاتصال بالخادم الرئيسي للمباريات");
    } finally {
      setLoading(false);
    }
  };

  // Synchronize dynamic dates when tabs change
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    
    if (activeTab === "today") {
      setSelectedDate(todayStr);
      setFilterLive(false);
      fetchMatches(todayStr, false);
    } else if (activeTab === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yestStr = yesterday.toISOString().split("T")[0];
      setSelectedDate(yestStr);
      setFilterLive(false);
      fetchMatches(yestStr, false);
    } else if (activeTab === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomStr = tomorrow.toISOString().split("T")[0];
      setSelectedDate(tomStr);
      setFilterLive(false);
      fetchMatches(tomStr, false);
    } else {
      // Custom date preserves selected custom input
      fetchMatches(selectedDate, false);
    }
  }, [activeTab]);

  // Handle custom date selection
  const handleCustomDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    setActiveTab("custom");
    fetchMatches(dateStr, false);
  };

  // Toggle Live filter
  const handleLiveToggle = () => {
    const nextLiveState = !filterLive;
    setFilterLive(nextLiveState);
    if (nextLiveState) {
      // Query server live matches directly
      fetchMatches(new Date().toISOString().split("T")[0], true);
    } else {
      // Rollback to active tab date matches
      fetchMatches(selectedDate, false);
    }
  };

  // Save onboarding favorites
  const handleSavePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem("msport_preferences", JSON.stringify(newPrefs));
    localStorage.setItem("msport_onboarded", "true");
    setShowPrefModal(false);
    // Refresh to apply weights sorting
    fetchMatches(selectedDate, filterLive);
  };

  // Helper to check if match status is Live
  const isMatchLive = (statusShort: string) => {
    return ["1H", "2H", "HT", "ET", "P"].includes(statusShort);
  };

  // Algorithm to calculate dynamic Match priority rating for lists (lower value = higher priority)
  const calculateMatchWeight = (match: Match) => {
    let weight = 1000; // Base baseline
    
    const leagueId = match.league.id;
    const homeTeam = match.teams.home.name;
    const awayTeam = match.teams.away.name;
    const statusShort = match.fixture.status.short;
    
    const isLive = isMatchLive(statusShort);
    
    // 1. LIVE Match boost (top priority)
    if (isLive) {
      weight -= 1500;
    }
    
    // 2. Favorite Team boost
    const isHomeFav = preferences.favoriteTeams.some(
      fav => fav.toLowerCase() === homeTeam.toLowerCase()
    );
    const isAwayFav = preferences.favoriteTeams.some(
      fav => fav.toLowerCase() === awayTeam.toLowerCase()
    );
    if (isHomeFav || isAwayFav) {
      weight -= 800;
    }
    
    // 3. Favorite League boost
    const isLeagueFav = preferences.favoriteLeagues.includes(leagueId);
    if (isLeagueFav) {
      weight -= 600;
    }
    
    // 4. Custom Competition Tier Rankings
    if (leagueId === 2) weight += 5;       // دوري أبطال أوروبا
    else if (leagueId === 39) weight += 10;   // الدوري الإنجليزي الممتاز
    else if (leagueId === 140) weight += 15;  // الدوري الإسباني
    else if (leagueId === 135) weight += 20;  // الدوري الإيطالي
    else if (leagueId === 78) weight += 25;   // الدوري الألماني
    else if (leagueId === 61) weight += 30;   // الدوري الفرنسي
    else if (leagueId === 531) weight += 35;  // الكأس الخيرية الإنجليزية
    else if (leagueId === 307) weight += 40;  // دوري روشن السعودي
    else if (leagueId === 233) weight += 45;  // الدوري المصري
    else if (leagueId === 200) weight += 50;  // البطولة المغربية الاحترافية
    else if (leagueId === 6) weight += 55;    // كأس الأمم الأفريقية (الكان)
    else if (leagueId === 9) weight += 60;    // الشان
    else if (leagueId === 482) weight += 65;  // البطولة العربية للأندية
    else if (leagueId === 10) weight += 400;  // المباريات الودية (Lower default ranking)
    else weight += 150;                       // بقية البطولات الدوري العام

    return weight;
  };

  // Filter & Sort matches
  const processedMatches = [...matches]
    .filter(match => {
      // League Filter
      if (selectedLeagueFilter !== "all" && match.league.id !== Number(selectedLeagueFilter)) {
        return false;
      }
      // Live Filter helper (if state says so)
      if (filterLive && !isMatchLive(match.fixture.status.short)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort primarily by computed weight
      return calculateMatchWeight(a) - calculateMatchWeight(b);
    });

  // Get active unique leagues on this day for the custom quick dropdown selector
  const activeLeaguesMap: Record<number, { id: number; name: string; country: string; logo: string }> = {};
  matches.forEach(m => {
    if (!activeLeaguesMap[m.league.id]) {
      activeLeaguesMap[m.league.id] = {
        id: m.league.id,
        name: m.league.name,
        country: m.league.country,
        logo: m.league.logo
      };
    }
  });
  const activeLeaguesList = Object.values(activeLeaguesMap).sort((a, b) => {
    // Sort leagues list by priority order as well
    const priorityA = preferences.favoriteLeagues.includes(a.id) ? 1 : 10;
    const priorityB = preferences.favoriteLeagues.includes(b.id) ? 1 : 10;
    return priorityA - priorityB;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-lime-400 selection:text-black">
      
      {/* HEADER ZONE */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3.5 transition-all">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-red-600/30">
              M
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 font-mono">
                MSPORT<span className="text-red-500 font-sans text-xs font-semibold px-1 rounded bg-red-600/10 border border-red-500/20">LIVE</span>
              </h1>
              <p className="text-[10px] text-zinc-400/85 font-mono">Real-time match hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Preferences wizard trigger */}
            <button
              id="pref-trigger-btn"
              onClick={() => setShowPrefModal(true)}
              className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 active:scale-95 active:text-lime-400 text-zinc-300 transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              <span className="hidden xs:inline">التفضيلات</span>
            </button>

            {/* Quick Refresh */}
            <button
              id="refresh-btn"
              onClick={() => fetchMatches(selectedDate, filterLive)}
              disabled={loading}
              className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 active:scale-95 transition-all text-sm flex items-center ${loading ? 'animate-spin' : 'hover:border-zinc-700 hover:bg-zinc-850 active:text-lime-400'}`}
              title="تحديث الجدول"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* CORE MOBILE CONTAINER (OPTIMIZED FOR ALL MOBILE & TABLET DEVICE FRAMES) */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20">
        
        {/* MATCH TIMELINE DATE FILTER CONTAINER */}
        <section id="date-navigation" className="space-y-3">
          <div className="flex items-center justify-between gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/60">
            {/* Yesterday */}
            <button
              id="btn-tab-yesterday"
              onClick={() => setActiveTab("yesterday")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg text-center transition-all duration-150 active:scale-95 ${activeTab === 'yesterday' ? 'bg-red-600 text-white font-bold shadow' : 'text-zinc-400 hover:text-white active:text-lime-400'}`}
            >
              الأمس
            </button>
            {/* Today */}
            <button
              id="btn-tab-today"
              onClick={() => setActiveTab("today")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg text-center transition-all duration-150 active:scale-95 relative ${activeTab === 'today' ? 'bg-red-600 text-white font-bold shadow' : 'text-zinc-400 hover:text-white active:text-lime-400'}`}
            >
              اليوم
              <span className="absolute top-1 right-[10%] w-1.5 h-1.5 bg-lime-400 rounded-full animate-ping"></span>
            </button>
            {/* Tomorrow */}
            <button
              id="btn-tab-tomorrow"
              onClick={() => setActiveTab("tomorrow")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg text-center transition-all duration-150 active:scale-95 ${activeTab === 'tomorrow' ? 'bg-red-600 text-white font-bold shadow' : 'text-zinc-400 hover:text-white active:text-lime-400'}`}
            >
              الغد
            </button>
          </div>

          {/* DYNAMIC CALENDAR SELECTOR AND CUSTOM BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Custom Interactive Datepicker */}
            <div className="flex-1 flex items-center gap-2 bg-zinc-900/40 px-2.5 py-1.5 rounded-lg border border-zinc-900/80 text-xs">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <input
                id="native-datepicker"
                type="date"
                value={selectedDate}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                className="bg-transparent focus:outline-none text-zinc-300 font-mono flex-1 text-center cursor-pointer text-xs"
              />
            </div>
            
            {/* Live Filter Indicator Capsule */}
            <button
              id="toggle-live-filter"
              onClick={handleLiveToggle}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5 border active:scale-95 ${filterLive ? 'bg-red-600 border-red-500 text-white hover:bg-red-700 active:text-lime-300 shadow-lg shadow-red-600/10' : 'bg-zinc-900 border-zinc-800 text-red-500 hover:border-zinc-700 hover:bg-zinc-850 active:text-lime-400'}`}
            >
              <span className={`w-2 h-2 rounded-full bg-red-500 ${filterLive ? 'animate-pulse' : ''}`} />
              مباشر حالياً
            </button>
          </div>
        </section>

        {/* FEED FILTER SELECTORS */}
        <section id="feed-filters" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="league-filter-select" className="text-xs text-zinc-400 font-medium font-sans">تصفية حسب الدوري</label>
            {selectedLeagueFilter !== "all" && (
              <button 
                onClick={() => setSelectedLeagueFilter("all")} 
                className="text-[10px] text-lime-400 hover:underline cursor-pointer"
              >
                مسح الفلتر
              </button>
            )}
          </div>
          <select
            id="league-filter-select"
            value={selectedLeagueFilter}
            onChange={(e) => setSelectedLeagueFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-red-500 transition-colors"
          >
            <option value="all">جميع الدوريات والبطولات المتوفرة</option>
            {activeLeaguesList.map((lg) => (
              <option key={lg.id} value={lg.id}>
                {preferences.favoriteLeagues.includes(lg.id) ? "★ " : ""}
                {lg.name} ({lg.country})
              </option>
            ))}
          </select>
        </section>

        {/* MOCK BACKUP FEED BANNER (Visible only when API responses are fallbacks) */}
        {isUsingMockData && (
          <div className="bg-red-950/25 border border-red-900/60 p-2.5 rounded-lg text-zinc-400 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-zinc-300 font-semibold mb-0.5">وضع النمط التجريبي للبيانات</p>
              <p className="text-[11px] leading-relaxed">
                تم تفعيل عرض جدول المباريات المباشر التفاعلي كنسخة احتياطية لتجنب نفاد حصة استدعاءات الـ API. النتائج والتوقيتات متوافقة ديناميكياً مع تفضيلاتك.
              </p>
            </div>
          </div>
        )}

        {/* MATCHES TIMELINE FEED VIEW ("قائمة طولية صغيرة") */}
        <div className="space-y-3">
          
          {loading ? (
            // Custom CSS Shimmer Skeletons
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 h-20 animate-pulse flex flex-col justify-between">
                  <div className="w-1/3 h-3.5 bg-zinc-800 rounded"></div>
                  <div className="flex items-center justify-between">
                    <div className="w-1/4 h-3 bg-zinc-850 rounded"></div>
                    <div className="w-1/6 h-5 bg-zinc-800 rounded"></div>
                    <div className="w-1/4 h-3 bg-zinc-850 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : errorExists && matches.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-850 rounded-xl p-6 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto animate-bounce" />
              <div>
                <p className="text-zinc-200 font-semibold text-sm">عذرًا، فشل جلب بيانات المباريات</p>
                <p className="text-xs text-zinc-500 mt-1">{errorExists}</p>
              </div>
              <button
                onClick={() => fetchMatches(selectedDate, filterLive)}
                className="py-1.5 px-4 rounded-lg bg-lime-400 text-neutral-950 text-xs font-bold hover:bg-lime-300 transition-all active:scale-95 inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
              </button>
            </div>
          ) : processedMatches.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-900/60 rounded-xl p-8 text-center space-y-3">
              <span className="text-3xl">⚽</span>
              <p className="text-xs text-zinc-400">لا توجد مباريات جارية أو مجدولة {filterLive ? 'حالياً' : 'لهذا اليوم'}</p>
              {filterLive && (
                <button
                  onClick={() => setFilterLive(false)}
                  className="text-xs text-lime-400 hover:underline cursor-pointer"
                >
                  عرض كافة مباريات اليوم
                </button>
              )}
            </div>
          ) : (
            // STAGGERED TRANSITION FEED container
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {processedMatches.map((match) => {
                  const isLive = isMatchLive(match.fixture.status.short);
                  const isHomeFavTeam = preferences.favoriteTeams.some(
                    t => t.toLowerCase() === match.teams.home.name.toLowerCase()
                  );
                  const isAwayFavTeam = preferences.favoriteTeams.some(
                    t => t.toLowerCase() === match.teams.away.name.toLowerCase()
                  );
                  const isFavLeague = preferences.favoriteLeagues.includes(match.league.id);
                  const isFavoriteMatch = isHomeFavTeam || isAwayFavTeam || isFavLeague;
                  
                  const isExpanded = expandedMatchId === match.fixture.id;
                  
                  // Local time formatting using standard numerals (Eng)
                  const matchTimeStr = new Date(match.fixture.date).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                  });

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      key={match.fixture.id}
                      className={`group overflow-hidden rounded-xl bg-zinc-900 border transition-all duration-150 ${isExpanded ? 'border-red-600/50 bg-zinc-900/90 shadow-md shadow-red-950/20' : 'border-zinc-850 hover:border-zinc-700/80'}`}
                    >
                      {/* LEAGUE HEADER BADGE ZONE */}
                      <div className="flex items-center justify-between bg-zinc-900/85 px-3 py-1.5 border-b border-zinc-950/60">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <img 
                            referrerPolicy="no-referrer"
                            src={match.league.logo} 
                            alt={match.league.name} 
                            className="w-4 h-4 object-contain rounded"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <span className="text-[10px] text-zinc-400 truncate max-w-[200px] font-medium leading-none">
                            {match.league.name === "Premier League" ? "الدوري الإنجليزي الممتاز" :
                             match.league.name === "La Liga" ? "الدوري الإسباني" :
                             match.league.name === "Serie A" ? "الدوري الإيطالي" :
                             match.league.name === "Bundesliga" ? "الدوري الألماني" :
                             match.league.name === "Ligue 1" ? "الدوري الفرنسي" :
                             match.league.name === "Saudi Pro League" ? "دوري روشن السعودي" :
                             match.league.name === "Egyptian Premier League" ? "الدوري المصري الممتاز" :
                             match.league.name === "Botola Pro" ? "البطولة المغربية الاحترافية" :
                             match.league.name === "UEFA Champions League" ? "دوري أبطال أوروبا" :
                             match.league.name === "Africa Cup of Nations" ? "كأس الأمم الأفريقية" : 
                             match.league.name}
                          </span>
                        </div>

                        {/* Right tags */}
                        <div className="flex items-center gap-1">
                          {isFavoriteMatch && (
                            <span 
                              className="text-[9px] bg-lime-400/15 text-lime-400 border border-lime-400/20 px-1 rounded-full flex items-center gap-0.5"
                              title="مباراة تتبع تفضيلاتك"
                            >
                              <Star className="w-2 h-2 fill-lime-400" /> مفضلة
                            </span>
                          )}
                          {isLive && (
                            <span className="text-[9px] bg-red-600 px-1 py-0.5 rounded text-white font-bold animate-pulse flex items-center gap-0.5">
                              ● مباشر
                            </span>
                          )}
                        </div>
                      </div>

                      {/* MAIN MATCH DETAILS STRIP */}
                      <button
                        onClick={() => setExpandedMatchId(isExpanded ? null : match.fixture.id)}
                        className="w-full text-left p-3 flex items-center justify-between gap-1 cursor-pointer focus:outline-none focus:bg-zinc-850/40 relative active:bg-zinc-850 duration-100"
                      >
                        {/* HOME TEAM */}
                        <div className="flex-1 flex flex-col xs:flex-row items-center justify-end gap-1.5 text-right overflow-hidden min-w-0 pr-1">
                          <span className={`text-xs font-bold truncate max-w-[120px] xs:max-w-none ${isHomeFavTeam ? 'text-lime-400' : 'text-zinc-200'}`}>
                            {match.teams.home.name === "Real Madrid" ? "ريال مدريد" :
                             match.teams.home.name === "Barcelona" ? "برشلونة" :
                             match.teams.home.name === "Manchester City" ? "مانشستر سيتي" :
                             match.teams.home.name === "Liverpool" ? "ليفربول" :
                             match.teams.home.name === "Arsenal" ? "أرسنال" :
                             match.teams.home.name === "Manchester United" ? "مانشستر يونايتد" :
                             match.teams.home.name === "Bayern Munich" ? "بايرن ميونخ" :
                             match.teams.home.name === "PSG" ? "باريس سان جيرمان" :
                             match.teams.home.name === "Juventus" ? "يوفنتوس" :
                             match.teams.home.name === "Al-Hilal" ? "الهلال" :
                             match.teams.home.name === "Al-Nassr" ? "النصر" :
                             match.teams.home.name === "Al Ahly" ? "الأهلي" :
                             match.teams.home.name === "Zamalek SC" ? "الزمالك" :
                             match.teams.home.name === "Raja Club Athletic" ? "الرجاء" :
                             match.teams.home.name === "Wydad AC" ? "الوداد" :
                             match.teams.home.name}
                          </span>
                          <img 
                            referrerPolicy="no-referrer"
                            src={match.teams.home.logo} 
                            alt={match.teams.home.name}
                            className="w-5 h-5 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>

                        {/* CORE COUNT / SCORE KICK-OFF AXIS */}
                        <div className="w-24 shrink-0 flex flex-col items-center justify-center py-1 rounded bg-zinc-950/40 border border-zinc-850">
                          {match.fixture.status.short === "NS" ? (
                            // Not Started -> Display Game Time ONLY (Eng Numerals always)
                            <div className="text-center">
                              <span className="text-xs font-mono font-bold tracking-tight text-zinc-300">
                                {matchTimeStr}
                              </span>
                              <span className="block text-[9px] text-zinc-500 font-sans mt-0.5">تبدأ قريباً</span>
                            </div>
                          ) : (
                            // Live or Finished Match Score Display
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1.5 font-bold font-mono text-sm tracking-tight text-white">
                                <span className={match.teams.home.winner === false ? 'text-zinc-500' : 'text-lime-400'}>
                                  {match.goals.home ?? 0}
                                </span>
                                <span className="text-zinc-600 px-0.5 text-xs">-</span>
                                <span className={match.teams.away.winner === false ? 'text-zinc-500' : 'text-lime-400'}>
                                  {match.goals.away ?? 0}
                                </span>
                              </div>
                              <span className={`block text-[9px] font-semibold mt-0.5 ${isLive ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`}>
                                {isLive ? `${match.fixture.status.elapsed}'` :
                                 match.fixture.status.short === "FT" ? "انتهت" : 
                                 match.fixture.status.short === "HT" ? "شوط أول" :
                                 match.fixture.status.short}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* AWAY TEAM */}
                        <div className="flex-1 flex flex-col xs:flex-row-reverse items-center justify-end gap-1.5 text-left overflow-hidden min-w-0 pl-1">
                          <span className={`text-xs font-bold truncate max-w-[120px] xs:max-w-none ${isAwayFavTeam ? 'text-lime-400' : 'text-zinc-200'}`}>
                            {match.teams.away.name === "Real Madrid" ? "ريال مدريد" :
                             match.teams.away.name === "Barcelona" ? "برشلونة" :
                             match.teams.away.name === "Manchester City" ? "مانشستر سيتي" :
                             match.teams.away.name === "Liverpool" ? "ليفربول" :
                             match.teams.away.name === "Arsenal" ? "أرسنال" :
                             match.teams.away.name === "Manchester United" ? "مانشستر يونايتد" :
                             match.teams.away.name === "Bayern Munich" ? "بايرن ميونخ" :
                             match.teams.away.name === "PSG" ? "باريس سان جيرمان" :
                             match.teams.away.name === "Juventus" ? "يوفنتوس" :
                             match.teams.away.name === "Al-Hilal" ? "الهلال" :
                             match.teams.away.name === "Al-Nassr" ? "النصر" :
                             match.teams.away.name === "Al Ahly" ? "الأهلي" :
                             match.teams.away.name === "Zamalek SC" ? "الزمالك" :
                             match.teams.away.name === "Raja Club Athletic" ? "الرجاء" :
                             match.teams.away.name === "Wydad AC" ? "الوداد" :
                             match.teams.away.name}
                          </span>
                          <img 
                            referrerPolicy="no-referrer"
                            src={match.teams.away.logo} 
                            alt={match.teams.away.name}
                            className="w-5 h-5 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      </button>

                      {/* EXPANDABLE MATCH DETAILS DRAWER */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="bg-black/40 border-t border-zinc-950 px-3.5 py-3 text-xs space-y-2.5 text-zinc-300"
                          >
                            <div className="grid grid-cols-2 gap-4 text-[11px] leading-relaxed">
                              <div>
                                <span className="block text-zinc-500 font-sans mb-0.5">الملعب والموقع</span>
                                <span className="font-semibold text-zinc-200">
                                  {match.fixture.venue.name || "معلومات الملعب غير متوفرة"} ، {match.fixture.venue.city || ""}
                                </span>
                              </div>
                              <div>
                                <span className="block text-zinc-500 font-sans mb-0.5">حكم اللقاء</span>
                                <span className="font-semibold text-zinc-200">
                                  {match.fixture.referee || "غير محدد"}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-[11px]">
                              {/* Details half time */}
                              {match.score.halftime.home !== null && (
                                <div className="text-zinc-400">
                                  <span>الشوط الأول: </span>
                                  <span className="font-mono font-bold text-zinc-200 ml-1">
                                    ({match.score.halftime.away ?? 0} - {match.score.halftime.home ?? 0})
                                  </span>
                                </div>
                              )}
                              
                              {/* Status long Arabic label translation */}
                              <div className="text-right text-[10px] text-zinc-400">
                                <span className="text-zinc-500">الجولة: </span>
                                <span className="text-zinc-300 font-mono">{match.league.round}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

        </div>
        
        {/* FOOTER METRICS INFO */}
        <footer className="pt-6 text-center space-y-2 border-t border-zinc-900">
          <p className="text-[10px] text-zinc-500 tracking-tight leading-relaxed">
            موقع <span className="font-bold text-zinc-300">MSport</span> يعرض جدول المباريات مرتبة آلياً حسب الأهمية: المباشر أولاً، يليه المفضل لديك، ثم الدوريات الكبرى والبطولات العربية الشهيرة.
          </p>
          <p className="text-[10px] text-zinc-600 font-mono">
            Time: UTC • Numbers: Eng Standard
          </p>
        </footer>
      </main>

      {/* 
        ========================================================================
        ONBOARDING SETUP MODAL (WELCOME / REOPEN FAV SELECTOR)
        ========================================================================
      */}
      <AnimatePresence>
        {showPrefModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-red-500 fill-red-500/20" />
                  <div>
                    <h2 className="text-sm font-bold text-white">تخصيص جدول رياضي</h2>
                    <p className="text-[10px] text-zinc-400">اختر دورياتك وفرقك المفضلة لتظهر دائماً في الأعلى</p>
                  </div>
                </div>
                {/* Allow closing if already onboarded once */}
                {localStorage.getItem("msport_onboarded") && (
                  <button 
                    onClick={() => setShowPrefModal(false)}
                    className="p-1 text-zinc-400 hover:text-white rounded bg-zinc-850 hover:bg-zinc-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Preferences Configurator Content */}
              <div className="p-4 overflow-y-auto space-y-5 flex-1 select-none text-right" dir="rtl">
                
                {/* 1. SELECT LEAGUES */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-red-500 border-r-2 border-red-500 pr-2">البطولات والدوريات المفضلة</h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ONBOARDING_LEAGUES.map((league) => {
                      const isSelected = preferences.favoriteLeagues.includes(league.id);
                      return (
                        <button
                          key={league.id}
                          onClick={() => {
                            let nextLeagues = [...preferences.favoriteLeagues];
                            if (isSelected) {
                              nextLeagues = nextLeagues.filter(id => id !== league.id);
                            } else {
                              nextLeagues.push(league.id);
                            }
                            setPreferences({ ...preferences, favoriteLeagues: nextLeagues });
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg border text-right transition-all duration-150 cursor-pointer ${isSelected ? 'bg-red-650/15 border-red-600 text-white' : 'bg-zinc-900/60 border-zinc-850 text-zinc-300 hover:border-zinc-805'}`}
                        >
                          <div className="flex items-center gap-2 text-right">
                            <img referrerPolicy="no-referrer" src={league.logo} alt={league.nameEn} className="w-5 h-5 object-contain" />
                            <div>
                              <p className="text-xs font-bold leading-tight">{league.nameAr}</p>
                              <p className="text-[9px] text-zinc-500 font-mono">{league.nameEn}</p>
                            </div>
                          </div>

                          <div className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? 'bg-lime-400 border-lime-400 text-black' : 'border-zinc-700 bg-transparent'}`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SELECT TEAMS */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-red-500 border-r-2 border-red-500 pr-2">الأندية والمنتخبات العالمية والعربية</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ONBOARDING_TEAMS.map((team) => {
                      const isSelected = preferences.favoriteTeams.includes(team.name);
                      return (
                        <button
                          key={team.name}
                          onClick={() => {
                            let nextTeams = [...preferences.favoriteTeams];
                            if (isSelected) {
                              nextTeams = nextTeams.filter(t => t !== team.name);
                            } else {
                              nextTeams.push(team.name);
                            }
                            setPreferences({ ...preferences, favoriteTeams: nextTeams });
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-right transition-all duration-150 cursor-pointer ${isSelected ? 'bg-red-650/15 border-red-600 text-white' : 'bg-zinc-900/40 border-zinc-850 text-zinc-300 hover:border-zinc-800'}`}
                        >
                          <img referrerPolicy="no-referrer" src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                          <div className="flex-1 text-right min-w-0">
                            <p className="text-[11px] font-bold leading-tight truncate">{team.nameAr}</p>
                            <p className="text-[8px] text-zinc-500 truncate">{team.country}</p>
                          </div>
                          
                          <div className={`w-3 h-3 rounded flex items-center justify-center border shrink-0 ${isSelected ? 'bg-lime-400 border-lime-400 text-black' : 'border-zinc-700 bg-transparent'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Modal Save action button (Lime Green Accent on Click) */}
              <div className="p-4 bg-zinc-900 border-t border-zinc-850">
                <button
                  id="save-pref-btn"
                  onClick={() => handleSavePreferences(preferences)}
                  className="w-full py-2.5 rounded-xl bg-lime-400 text-black font-extrabold text-xs tracking-tight hover:bg-lime-300 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-lime-400/15"
                >
                  حفظ التفضيلات وتخصيص الموقع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
