export interface LeagueSelection {
  id: number;
  nameAr: string;
  nameEn: string;
  logo: string;
  category: "european" | "arab" | "cups" | "other";
}

export interface TeamSelection {
  name: string;
  nameAr: string;
  logo: string;
  country: string;
}

export const ONBOARDING_LEAGUES: LeagueSelection[] = [
  {
    id: 39,
    nameAr: "الدوري الإنجليزي الممتاز",
    nameEn: "Premier League",
    logo: "https://media.api-sports.io/football/leagues/39.png",
    category: "european"
  },
  {
    id: 140,
    nameAr: "الدوري الإسباني",
    nameEn: "La Liga",
    logo: "https://media.api-sports.io/football/leagues/140.png",
    category: "european"
  },
  {
    id: 135,
    nameAr: "الدوري الإيطالي",
    nameEn: "Serie A",
    logo: "https://media.api-sports.io/football/leagues/135.png",
    category: "european"
  },
  {
    id: 78,
    nameAr: "الدوري الألماني",
    nameEn: "Bundesliga",
    logo: "https://media.api-sports.io/football/leagues/78.png",
    category: "european"
  },
  {
    id: 61,
    nameAr: "الدوري الفرنسي",
    nameEn: "Ligue 1",
    logo: "https://media.api-sports.io/football/leagues/61.png",
    category: "european"
  },
  {
    id: 307,
    nameAr: "دوري روشن السعودي",
    nameEn: "Saudi Pro League",
    logo: "https://media.api-sports.io/football/leagues/307.png",
    category: "arab"
  },
  {
    id: 233,
    nameAr: "الدوري المصري الممتاز",
    nameEn: "Egyptian Premier League",
    logo: "https://media.api-sports.io/football/leagues/233.png",
    category: "arab"
  },
  {
    id: 200,
    nameAr: "البطولة المغربية الاحترافية",
    nameEn: "Botola Pro",
    logo: "https://media.api-sports.io/football/leagues/200.png",
    category: "arab"
  },
  {
    id: 2,
    nameAr: "دوري أبطال أوروبا",
    nameEn: "UEFA Champions League",
    logo: "https://media.api-sports.io/football/leagues/2.png",
    category: "cups"
  },
  {
    id: 6,
    nameAr: "كأس الأمم الأفريقية",
    nameEn: "Africa Cup of Nations",
    logo: "https://media.api-sports.io/football/leagues/6.png",
    category: "cups"
  }
];

export const ONBOARDING_TEAMS: TeamSelection[] = [
  {
    name: "Real Madrid",
    nameAr: "ريال مدريد",
    logo: "https://media.api-sports.io/football/teams/541.png",
    country: "Spain"
  },
  {
    name: "Barcelona",
    nameAr: "برشلونة",
    logo: "https://media.api-sports.io/football/teams/529.png",
    country: "Spain"
  },
  {
    name: "Manchester City",
    nameAr: "مانشستر سيتي",
    logo: "https://media.api-sports.io/football/teams/50.png",
    country: "England"
  },
  {
    name: "Liverpool",
    nameAr: "ليفربول",
    logo: "https://media.api-sports.io/football/teams/40.png",
    country: "England"
  },
  {
    name: "Arsenal",
    nameAr: "أرسنال",
    logo: "https://media.api-sports.io/football/teams/42.png",
    country: "England"
  },
  {
    name: "Manchester United",
    nameAr: "مانشستر يونايتد",
    logo: "https://media.api-sports.io/football/teams/33.png",
    country: "England"
  },
  {
    name: "Bayern Munich",
    nameAr: "بايرن ميونخ",
    logo: "https://media.api-sports.io/football/teams/157.png",
    country: "Germany"
  },
  {
    name: "PSG",
    nameAr: "باريس سان جيرمان",
    logo: "https://media.api-sports.io/football/teams/85.png",
    country: "France"
  },
  {
    name: "Juventus",
    nameAr: "يوفنتوس",
    logo: "https://media.api-sports.io/football/teams/496.png",
    country: "Italy"
  },
  {
    name: "Al-Hilal",
    nameAr: "الهلال السعودي",
    logo: "https://media.api-sports.io/football/teams/2939.png",
    country: "Saudi Arabia"
  },
  {
    name: "Al-Nassr",
    nameAr: "النصر السعودي",
    logo: "https://media.api-sports.io/football/teams/2940.png",
    country: "Saudi Arabia"
  },
  {
    name: "Al Ahly",
    nameAr: "الأهلي المصري",
    logo: "https://media.api-sports.io/football/teams/1023.png",
    country: "Egypt"
  },
  {
    name: "Zamalek SC",
    nameAr: "الزمالك المصري",
    logo: "https://media.api-sports.io/football/teams/1024.png",
    country: "Egypt"
  },
  {
    name: "Raja Club Athletic",
    nameAr: "الرجاء الرياضي",
    logo: "https://media.api-sports.io/football/teams/1021.png",
    country: "Morocco"
  },
  {
    name: "Wydad AC",
    nameAr: "الوداد الرياضي",
    logo: "https://media.api-sports.io/football/teams/1020.png",
    country: "Morocco"
  }
];
