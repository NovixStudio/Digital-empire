/* ============================================================
   WEB EMPIRE — Digital Tycoon
   Прогрессия со слотами, ветки прокачки по отраслям,
   живой просмотр сайта, iOS 26 Liquid Glass UI
   ============================================================ */

const SAVE_KEY = 'webempire-save-v2';

/* ---------- FULL EN LOCALIZATION HELPERS ----------
   tr(ru,en) — inline pair translator used at call sites throughout the
   game logic (toasts, logs, modal builders, card builders).
   S(ru) — lookup for short strings repeated many times across the UI
   (buttons like "Закрыть"/"Отмена", common labels), backed by STATIC_EN.
   L(obj,'name') — picks the *En-suffixed field on data objects
   (business types, achievements, quests, etc.) when present. */
function isEN(){ return !!(state && state.settings && state.settings.lang==='en'); }
function tr(ru,en){ return isEN() ? en : ru; }
function L(obj,key){ if(!obj) return ''; return isEN() && obj[key+'En']!=null ? obj[key+'En'] : obj[key]; }
const STATIC_EN = {
  'Закрыть':'Close','Отмена':'Cancel','Продолжить':'Continue','Сохранить':'Save','Выбрать':'Select',
  'Сравнить':'Compare','Копировать':'Copy','Пропустить':'Skip','Сбросить':'Reset','Активировать':'Activate',
  'Купить':'Buy','Продать':'Sell','Продать всё':'Sell all','Продать 1':'Sell 1','Шорт 1':'Short 1','Шорт 10':'Short 10',
  'Забрать награду':'Claim reward','Смотреть все':'View all','Открыть рейтинг':'Open leaderboard',
  'Управлять кредитом':'Manage loan','Погасить всё':'Pay off all','Погасить 50%':'Pay off 50%',
  'Переродиться':'Rebirth','Перейти к сайтам':'Go to sites','Переименовать проект':'Rename project',
  'Продолжить как есть':'Continue as is','Продать / закрыть сайт':'Sell / close site',
  'Прокачать бизнес':'Upgrade business','Рекламная кампания':'Ad campaign','Рейтинг конкурентов':'Competitor leaderboard',
  'Отзывы посетителей':'Visitor reviews','Опасная зона':'Danger zone','Обзор':'Overview','О нас':'About',
  'Обычная ×1':'Normal ×1','Событие недели':'Weekly event','Сложность':'Difficulty','Скорость игры':'Game speed',
  'Свободные средства':'Available cash','Сайты':'Sites','Сайт в разработке':'Site under construction',
  'Репутация':'Reputation','Расход':'Expenses','Доход':'Income','Биржа':'Market','Аптайм':'Uptime',
  'Активы':'Assets','Чистые активы':'Net worth','Текущие активы':'Current assets','Стоимость портфеля':'Portfolio value',
  'Портфель':'Portfolio','Текущий буст дохода':'Current income boost','Прежде чем начать':'Before you start',
  'Уведомления':'Notifications','Язык / Language':'Язык / Language','Открыть Boosty →':'Open Boosty →',
  'Перерождений':'Rebirths','Сбросить прогресс?':'Reset progress?','Начать!':'Start!','Далее':'Next',
};
function S(ru){ return isEN() && STATIC_EN[ru] ? STATIC_EN[ru] : ru; }

/* ---------- BOOSTY SUBSCRIPTION CODES ----------
   100 unique unlock codes. Entering a valid code unlocks the paid x2 / x4
   game-speed options for good (stored in state.boosty.unlocked). */
const BOOSTY_CODES = [
  'BOOSTY-0LVS-NUJZ','BOOSTY-0LZJ-JEGE','BOOSTY-1N13-JCAT','BOOSTY-1SWJ-CKJL','BOOSTY-1T2T-ALA7',
  'BOOSTY-1V2I-SQP4','BOOSTY-1W1H-T7PZ','BOOSTY-253J-2D54','BOOSTY-3T60-RJIW','BOOSTY-41IB-LJH7',
  'BOOSTY-4ZW9-XA3K','BOOSTY-53LC-58DR','BOOSTY-55J2-O7S3','BOOSTY-5935-A0L7','BOOSTY-5IQV-NB4G',
  'BOOSTY-5LXO-6QJI','BOOSTY-7E8G-8JDP','BOOSTY-7SRC-BPLJ','BOOSTY-874F-RHOC','BOOSTY-8MDD-4V30',
  'BOOSTY-96QE-3RZS','BOOSTY-9KWV-08HH','BOOSTY-9MX2-X18H','BOOSTY-9T84-AZYT','BOOSTY-9TZE-5R5U',
  'BOOSTY-A7TZ-0YNC','BOOSTY-AFEY-UHZ1','BOOSTY-AXEQ-BNHL','BOOSTY-B1QX-6GVW','BOOSTY-C11E-RTJ5',
  'BOOSTY-CHJ7-55NF','BOOSTY-CVS4-F8CG','BOOSTY-CWBF-UK9E','BOOSTY-CWI6-4CIY','BOOSTY-D14V-E92M',
  'BOOSTY-D84U-89YJ','BOOSTY-DBDW-2PCN','BOOSTY-DHYL-URTP','BOOSTY-DPPQ-0Y9D','BOOSTY-DZR1-YXR2',
  'BOOSTY-E9VI-FTTD','BOOSTY-FEL6-246H','BOOSTY-FL0U-KEYZ','BOOSTY-G0FN-9XUY','BOOSTY-G8SB-I4Q2',
  'BOOSTY-GV0E-38DA','BOOSTY-H2M5-ZJA8','BOOSTY-HE7U-R23G','BOOSTY-HV3A-3ZMF','BOOSTY-I3QK-2IAG',
  'BOOSTY-I7P5-TB94','BOOSTY-ID25-OWF7','BOOSTY-IR4C-OWGZ','BOOSTY-IZZQ-Y72W','BOOSTY-J49I-TN7S',
  'BOOSTY-JXEP-Q85J','BOOSTY-K83T-QLL8','BOOSTY-KDGI-GATJ','BOOSTY-KTAK-PUXQ','BOOSTY-L58K-XO9T',
  'BOOSTY-LY8O-ZCYW','BOOSTY-N9J2-QP89','BOOSTY-NAM1-48P0','BOOSTY-OFQE-WAOU','BOOSTY-OHP6-VZ41',
  'BOOSTY-OKEP-7Y6W','BOOSTY-OM5I-GQPK','BOOSTY-OS9X-TOGN','BOOSTY-PAC5-6T4U','BOOSTY-PBHS-AHXT',
  'BOOSTY-PHR6-2GDS','BOOSTY-PHT0-HL9X','BOOSTY-PJA1-WJ0T','BOOSTY-PNSM-43D8','BOOSTY-PSEI-MVIH',
  'BOOSTY-PVS7-HZIO','BOOSTY-QPGB-7R3O','BOOSTY-RDML-Y4LY','BOOSTY-RIXA-11DP','BOOSTY-SG65-KXVF',
  'BOOSTY-T1GH-R09S','BOOSTY-T9NT-3W5U','BOOSTY-TEIY-ZCOT','BOOSTY-TRP0-J43D','BOOSTY-TVHH-PBMY',
  'BOOSTY-UJV6-OH9S','BOOSTY-UZFK-8UT0','BOOSTY-VYIE-6IVW','BOOSTY-W3ZP-08J3','BOOSTY-WM31-YIHA',
  'BOOSTY-WNNH-J7XV','BOOSTY-X7EE-DTJV','BOOSTY-X7PT-X63C','BOOSTY-XAJI-0Y6D','BOOSTY-XFGC-AQVK',
  'BOOSTY-XLL4-ZKLO','BOOSTY-Y9V8-6WZS','BOOSTY-YKL1-CQ99','BOOSTY-ZBIK-CIDK','BOOSTY-ZHWJ-R64D',
];
const BOOSTY_URL = 'https://boosty.to/';

/* ---------- BUSINESS CONFIG (unlock one at a time) ---------- */
const CATEGORY_META = {
  content:  {icon:'📰', name:'Контент и медиа',   desc:'Аудитория, просмотры, подписчики', nameEn:'Content & media', descEn:'Audience, views, subscribers'},
  commerce: {icon:'🛒', name:'E-commerce',        desc:'Продажи товаров и услуг онлайн', nameEn:'E-commerce', descEn:'Selling goods and services online'},
  software: {icon:'⚙️', name:'Софт и SaaS',       desc:'Подписки и инструменты для бизнеса', nameEn:'Software & SaaS', descEn:'Subscriptions and business tools'},
  social:   {icon:'💬', name:'Соцсети и общение',  desc:'Сообщества, лента, знакомства', nameEn:'Social & communication', descEn:'Communities, feeds, dating'},
  fintech:  {icon:'💳', name:'Финтех',            desc:'Платежи, биржи, цифровые финансы', nameEn:'Fintech', descEn:'Payments, exchanges, digital finance'},
  ai:       {icon:'🤖', name:'Искусственный интеллект', desc:'Нейросети — свои или лицензированные', nameEn:'Artificial Intelligence', descEn:'Neural networks — in-house or licensed'},
  offline:  {icon:'🏢', name:'Офлайн-бизнес',      desc:'Физические точки и реальные услуги', nameEn:'Offline business', descEn:'Physical locations and real-world services'},
  hybrid:   {icon:'🧬', name:'Гибриды',            desc:'Уникальные бизнесы, созданные слиянием двух категорий', nameEn:'Hybrids', descEn:'Unique businesses created by merging two categories'},
};
const CATEGORY_ORDER = ['content','commerce','software','social','fintech','offline','ai'];
// Taxes apply to every category that can generate income, including hybrids —
// unlike CATEGORY_ORDER (used for the shop screen and the Collector
// achievement), hybrids shouldn't get a free pass just because they aren't
// directly purchasable.
const TAX_CATEGORY_ORDER = [...CATEGORY_ORDER, 'hybrid'];


const WEBSITE_TYPES = [
  {id:'blog',    name:'Блог',                nameEn:'Blog',                  icon:'📝', baseCost:220,     baseIncome:1.6,  unlockNetWorth:0,       category:'content'},
  {id:'news',    name:'Новостной портал',     nameEn:'News portal',           icon:'🗞️', baseCost:1050,    baseIncome:6,    unlockNetWorth:2000,    category:'content'},
  {id:'shop',    name:'Интернет-магазин',     nameEn:'Online store',          icon:'🛒', baseCost:1650,    baseIncome:10,   unlockNetWorth:4000,    category:'commerce'},
  {id:'saas',    name:'SaaS-сервис',          nameEn:'SaaS service',          icon:'⚙️', baseCost:12000,   baseIncome:58,   unlockNetWorth:33000,   category:'software'},
  {id:'app',     name:'Мобильное приложение', nameEn:'Mobile app',            icon:'📱', baseCost:22500,   baseIncome:95,   unlockNetWorth:59000,   category:'software'},
  {id:'forum',   name:'Форум сообщества',     nameEn:'Community forum',       icon:'🗨️', baseCost:30000,   baseIncome:130,  unlockNetWorth:78000,   category:'social'},
  {id:'market',  name:'Маркетплейс',          nameEn:'Marketplace',           icon:'🏬', baseCost:27000,   baseIncome:120,  unlockNetWorth:72000,   category:'commerce'},
  {id:'video',   name:'Видеоплатформа',       nameEn:'Video platform',        icon:'📹', baseCost:67500,   baseIncome:260,  unlockNetWorth:182000,  category:'content'},
  {id:'social',  name:'Соцсеть',              nameEn:'Social network',        icon:'💬', baseCost:90000,   baseIncome:340,  unlockNetWorth:234000,  category:'social'},
  {id:'devtool', name:'Dev-инструменты',      nameEn:'Dev tools',             icon:'🧰', baseCost:135000,  baseIncome:480,  unlockNetWorth:338000,  category:'software'},
  {id:'dating',  name:'Дейтинг-платформа',    nameEn:'Dating platform',       icon:'💌', baseCost:165000,  baseIncome:560,  unlockNetWorth:416000,  category:'social'},
  {id:'crypto_exchange', name:'Криптобиржа',  nameEn:'Crypto exchange',       icon:'🪙', baseCost:330000,  baseIncome:1050, unlockNetWorth:845000,  category:'fintech'},
  {id:'ai',      name:'AI-платформа',         nameEn:'AI platform',           icon:'🤖', baseCost:600000,  baseIncome:1900, unlockNetWorth:1300000, category:'ai'},
  {id:'ai_agent',name:'Автономные AI-агенты', nameEn:'Autonomous AI agents',  icon:'🧠', baseCost:2250000, baseIncome:6800, unlockNetWorth:4550000, category:'ai'},
];
const OFFLINE_TYPES = [
  {id:'retail',     name:'Сеть пунктов выдачи',    nameEn:'Pickup point network',   icon:'🏪', baseCost:5250,   baseIncome:26,   unlockNetWorth:12000,   category:'offline'},
  {id:'logistics',  name:'Логистическая компания', nameEn:'Logistics company',      icon:'🚚', baseCost:18000,  baseIncome:78,   unlockNetWorth:42000,  category:'offline'},
  {id:'restaurant', name:'Служба доставки еды',    nameEn:'Food delivery service',  icon:'🍽️', baseCost:39000,  baseIncome:150,  unlockNetWorth:91000,  category:'offline'},
  {id:'gym',        name:'Сеть фитнес-клубов',     nameEn:'Gym chain',              icon:'🏋️', baseCost:82500,  baseIncome:290,  unlockNetWorth:208000, category:'offline'},
  {id:'bank',       name:'Цифровой банк',          nameEn:'Digital bank',           icon:'🏦', baseCost:210000, baseIncome:700,  unlockNetWorth:546000, category:'offline'},
  {id:'realty',     name:'Агентство недвижимости', nameEn:'Real estate agency',     icon:'🏘️', baseCost:480000, baseIncome:1450, unlockNetWorth:1105000, category:'offline'},
];
/* ---------- HYBRID RECIPES — cross-category merges into a unique business ----------
   Not directly buyable (category 'hybrid' is excluded from CATEGORY_ORDER so it
   never appears in the shop list). Created via craftHybrid() once both parent
   sites are owned and their tracks are deep enough (see requiredTrackLevel). */
const HYBRID_RECIPES = [
  {aId:'shop',            bId:'logistics', id:'hybrid_fulfillment',   name:'Fulfillment-империя',        nameEn:'Fulfillment Empire',        icon:'📦', baseIncome:900,  baseCost:180000, requiredTrackLevel:8, bonus:{value:0.20}, desc:'commerce + offline → ускоряет доставку, +20% к общему доходу', descEn:'commerce + offline → speeds up delivery, +20% total income'},
  {aId:'blog',            bId:'social',    id:'hybrid_media',         name:'Медиа-холдинг',              nameEn:'Media Holding',             icon:'📢', baseIncome:1400, baseCost:260000, requiredTrackLevel:8, bonus:{value:0.20}, desc:'content + social → буст трафика всем сайтам, +20% к общему доходу', descEn:'content + social → traffic boost for all sites, +20% total income'},
  {aId:'ai',              bId:'saas',      id:'hybrid_ai_saas',       name:'AI-SaaS Unicorn',            nameEn:'AI-SaaS Unicorn',           icon:'🧬', baseIncome:5200, baseCost:900000, requiredTrackLevel:8, bonus:{value:0.30}, desc:'ai + software → удваивает эффект AI Lab, +30% к общему доходу', descEn:'ai + software → doubles the AI Lab effect, +30% total income'},
  {aId:'crypto_exchange',bId:'bank',       id:'hybrid_fintech',       name:'Финтех-империя',             nameEn:'Fintech Empire',            icon:'🏛️', baseIncome:3800, baseCost:700000, requiredTrackLevel:8, bonus:{value:0.25}, desc:'fintech + offline → снижает волатильность портфеля, +25% к общему доходу', descEn:'fintech + offline → reduces portfolio volatility, +25% total income'},
  {aId:'dating',          bId:'forum',     id:'hybrid_nextgen_social',name:'Соцсеть нового поколения',   nameEn:'Next-Gen Social Network',   icon:'🌐', baseIncome:2200, baseCost:520000, requiredTrackLevel:8, bonus:{value:0.20}, desc:'social + social → авто-прирост репутации, +20% к общему доходу', descEn:'social + social → auto reputation growth, +20% total income'},
  {aId:'restaurant',      bId:'app',       id:'hybrid_superapp',      name:'Суперапп',                   nameEn:'Super App',                 icon:'🍔', baseIncome:1600, baseCost:340000, requiredTrackLevel:8, bonus:{value:0.20}, desc:'offline + software → офлайн-доход получает software-множитель, +20% к общему доходу', descEn:'offline + software → offline income gets the software multiplier, +20% total income'},
];
const MAX_HYBRIDS = 3;
const HYBRID_TYPES = HYBRID_RECIPES.map(r=>({id:r.id, name:r.name, icon:r.icon, baseCost:r.baseCost, baseIncome:r.baseIncome, unlockNetWorth:Infinity, category:'hybrid'}));
const ALL_BUSINESS_TYPES = [...WEBSITE_TYPES, ...OFFLINE_TYPES, ...HYBRID_TYPES];

/* how many total site slots you have, based on net worth — starts at 1! */
const SLOT_MILESTONES = [0, 6500, 26000, 78000, 195000, 520000, 1560000, 5200000, 15600000, 52000000];
function maxSiteSlots(nw){ return SLOT_MILESTONES.filter(t=>nw>=t).length + (typeof hasSkill==='function' && hasSkill('extra_slot') ? 1 : 0) + (typeof state!=='undefined' && state && state.boosty && state.boosty.unlocked ? 1 : 0); }

/* ---------- UPGRADE TRACKS — you choose exactly what to improve ---------- */
const TRACK_META = {
  design:       {name:'Дизайн',          nameEn:'Design',          icon:'🎨', color:'var(--purple)', textOn:'#fff',    costMult:0.32, incomeGrowth:0.09,  desc:'Внешний вид и впечатление посетителей', descEn:'Look and feel, visitor impressions'},
  traffic:      {name:'Трафик',          nameEn:'Traffic',         icon:'📈', color:'var(--teal)',   textOn:'#04170a', costMult:0.42, incomeGrowth:0.15,  desc:'Приток новых посетителей', descEn:'Inflow of new visitors'},
  monetization: {name:'Монетизация',     nameEn:'Monetization',    icon:'💰', color:'var(--green)',  textOn:'#04170a', costMult:0.55, incomeGrowth:0.20,  desc:'Реклама, продажи и подписки', descEn:'Ads, sales, and subscriptions'},
  infra:        {name:'Инфраструктура',  nameEn:'Infrastructure',  icon:'⚙️', color:'var(--blue)',   textOn:'#fff',    costMult:0.24, incomeGrowth:0.06,  desc:'Стабильность, скорость, штат', descEn:'Stability, speed, staff'},
};
const TRACK_ORDER = ['design','traffic','monetization','infra'];
const TRACK_GROWTH_RATE = 1.40;

/* ---------- TRACK LEVEL CAP ----------
   Levels used to grow forever, which made late-game upgrades feel linear
   and pointless. Now each track has a soft cap that only grows via
   prestige (future feature — state.prestige.count) or merging two sites
   of the same type (site.trackCapBonus, see mergeSites()). */
const TRACK_MAX_LEVEL = 10;
function trackMaxLevel(site){
  return TRACK_MAX_LEVEL + (state.prestige.count*5) + (site.trackCapBonus||0);
}

/* ---------- SITE MERGING (same type) ---------- */
const MERGE_COST_MULT = 4;       // merge fee = type.baseCost * this
const MERGE_DOWNTIME_MS = 20000; // merged site earns nothing for this long
const MERGE_CAP_BONUS = Math.round(TRACK_MAX_LEVEL*0.5); // +50% of the base cap, stacks per merge

/* ---------- SITE RENOVATION (single-site staged upgrade loop) ----------
   Прокачал все ветки до потолка → нанял нужное число сотрудников →
   заплатил за "обновление" → потолок трека вырос, можно качать дальше.
   Каждый следующий этап требует больше персонала, но зарплаты по этому
   сайту после каждого обновления становятся дешевле (более опытная,
   оптимизированная команда), плюс сайт получает небольшой постоянный
   бонус к доходу. Не путать со слиянием (mergeSites) — это апгрейд ОДНОГО
   сайта, а не объединение двух. */
const RENOVATION_BASE_STAFF   = 3;     // сотрудников нужно для 1-го обновления
const RENOVATION_STAFF_STEP   = 3;     // + столько сотрудников на каждый следующий этап
const RENOVATION_CAP_BONUS    = Math.round(TRACK_MAX_LEVEL*0.4); // +потолок трека за этап
const RENOVATION_COST_MULT    = 7;     // цена = baseCost * this * (этап+1)
const RENOVATION_SALARY_DECAY = 0.88;  // зарплаты на сайте *= this за этап (дешевеют)
const RENOVATION_INCOME_BONUS = 0.10;  // + постоянный доход за этап (аддитивно к mult)
const RENOVATION_MAX_STAGE = 5;        // максимум обновлений на сайт
const IPO_MIN_RENOVATIONS = 2;         // нужно минимум столько обновлений сайта, чтобы вывести его на IPO
/* ---------- TAXES ----------
   Every in-game day, each business category you own sites in accrues a
   tax bill equal to a share of that category's current daily income.
   Leave a category's bill unpaid too many days in a row and it gets
   audited: income from that category drops until the debt is cleared. */
const TAX_RATE = 0.12;        // share of a category's daily income owed as tax
const TAX_AUDIT_DAYS = 5;     // consecutive unpaid days before an audit kicks in
const TAX_AUDIT_PENALTY = 0.6; // income multiplier while audited (i.e. income -40%)
function siteFullyUpgraded(site){ return TRACK_ORDER.every(k=>site.tracks[k] >= trackMaxLevel(site)); }
// New-site gate: you may only expand into another site once every site you
// already own has been renovated all the way to its final stage. This turns
// "buy a pile of sites" into "master one site, then earn the right to the
// next", which is also why each additional site now costs more (see
// buySite()/renderTypeCard()'s Math.pow(SITE_COUNT_COST_GROWTH, ...) term).
function allOwnedSitesFullyRenovated(){ return state.sites.every(s => (s.renovationStage||0) >= RENOVATION_MAX_STAGE); }
const SITE_COUNT_COST_GROWTH = 1.35; // extra global cost multiplier per site already owned, on top of the per-type multiplier
function renovationStage(site){ return site.renovationStage||0; }
function renovationRequiredStaff(site){ return RENOVATION_BASE_STAFF + renovationStage(site)*RENOVATION_STAFF_STEP; }
function renovationCost(site, type){ return Math.round(type.baseCost * RENOVATION_COST_MULT * (renovationStage(site)+1) * difficultyCostMult()); }
function canRenovateSite(site){ return !!site && renovationStage(site) < RENOVATION_MAX_STAGE && siteFullyUpgraded(site) && site.employees >= renovationRequiredStaff(site); }
function renovateSite(idx){
  const site = state.sites[idx];
  if(!site) return;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(renovationStage(site) >= RENOVATION_MAX_STAGE){ toast(tr('Достигнут максимум обновлений для этого сайта','This site has reached its max renovations')); playSound('error'); return; }
  if(!siteFullyUpgraded(site)){ toast(tr('Сначала прокачайте все ветки до максимума','Max out all tracks first')); playSound('error'); return; }
  if(site.employees < renovationRequiredStaff(site)){ toast(tr('Нужно больше сотрудников для обновления','You need more staff for the update')); playSound('error'); return; }
  const cost = renovationCost(site, type);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.renovationStage = renovationStage(site) + 1;
  site.trackCapBonus = (site.trackCapBonus||0) + RENOVATION_CAP_BONUS;
  site.renovationSalaryMult = (typeof site.renovationSalaryMult==='number' ? site.renovationSalaryMult : 1) * RENOVATION_SALARY_DECAY;
  site.renovationIncomeMult = (typeof site.renovationIncomeMult==='number' ? site.renovationIncomeMult : 1) * (1+RENOVATION_INCOME_BONUS);
  bumpQuest('renovate_site');
  log(`🛠️ ${tr('Обновление','Renovation')} «${esc(site.name)}»: ${tr('этап','stage')} ${site.renovationStage} — ${tr('потолок трека +','level cap +')}${RENOVATION_CAP_BONUS}, ${tr('зарплаты дешевле','cheaper salaries')}`);
  toast(`🛠️ ${tr('Сайт обновлён!','Site renovated!')} +${RENOVATION_CAP_BONUS} ${tr('к потолку уровня','to the level cap')}`);
  playSound('achievement');
  vibrateFeedback(20);
  save(); renderAll();
  refreshSiteViewSections(idx, ['tracks','renovation','employees','stagepill']);
}

/* ---------- AI LAB — build your own model, or license one ---------- */
const AI_LAB = {
  own:      {label:'Собственная нейросеть', labelEn:'In-house neural network', icon:'🧬', costMult:5.5, bonusPerLevel:0.35, maxLevel:5,
             desc:'Обучаете модель под свой продукт с нуля. Дороже и требует апгрейдов, но бонус к доходу растёт с каждым уровнем и не имеет потолка комиссии.',
             descEn:'You train a model for your product from scratch. More expensive and needs upgrades, but the income bonus grows with every level and has no commission ceiling.'},
  licensed: {label:'Лицензия у партнёра',   labelEn:'Partner license',           icon:'💳', costMult:1.8, bonus:0.45,
             desc:'Готовое решение стороннего вендора. Быстро и заметно дешевле собственной разработки, но бонус фиксирован — партнёр забирает часть прибыли.',
             descEn:'A ready-made solution from a third-party vendor. Fast and noticeably cheaper than in-house development, but the bonus is fixed — the partner takes a cut of the profit.'},
};
function aiModelCost(type, kind, ownLevel){
  if(kind==='licensed') return Math.round(type.baseCost * AI_LAB.licensed.costMult);
  return Math.round(type.baseCost * AI_LAB.own.costMult * Math.pow(1.6, ownLevel));
}
function aiIncomeMult(site){
  if(!site.aiModel || !site.aiModel.kind) return 1;
  if(site.aiModel.kind==='licensed') return 1+AI_LAB.licensed.bonus;
  return 1+AI_LAB.own.bonusPerLevel*site.aiModel.ownLevel;
}

/* ---------- DIFFICULTY (chosen once, at new-game setup) ---------- */
const DIFFICULTY_META = {
  normal:   {label:'Обычный', labelEn:'Normal',   icon:'🙂', startCash:450, costMult:1,    desc:'Стандартный баланс — привычный темп роста.', descEn:'Standard balance — a familiar pace of growth.'},
  hardcore: {label:'Хардкор', labelEn:'Hardcore', icon:'🔥', startCash:225, costMult:1.25, desc:'Вдвое меньше стартового капитала, все траты на 25% дороже. Для тех, кто хочет вызов.', descEn:'Half the starting capital, every expense costs 25% more. For those who want a challenge.'},
};
function difficultyCostMult(){ return (DIFFICULTY_META[state.difficulty]||DIFFICULTY_META.normal).costMult; }

/* ---------- CEO SKILL TREE — spent from prestige.skillPoints, earned on rebirth ---------- */
const CEO_SKILLS = [
  {id:'quick_start',  name:'Быстрый старт',            icon:'⚡', cost:1, desc:'+10% к награде за ежедневные задания и стрик'},
  {id:'lucky_events', name:'Деловое чутьё',             icon:'🍀', cost:2, desc:'Случайные события выпадают на 15% чаще'},
  {id:'cheap_hire',   name:'Кадровое агентство',      icon:'🧑‍💼', cost:3, desc:'Найм сотрудников дешевле на 15% навсегда'},
  {id:'cheap_tracks', name:'Оптимизация процессов',    icon:'⚙️', cost:4, desc:'Прокачка треков дешевле на 10% навсегда'},
  {id:'income_boost', name:'Деловая хватка',           icon:'💼', cost:5, desc:'+5% ко всем доходам навсегда'},
  {id:'cheap_merge',  name:'M&A отдел',                icon:'🤝', cost:6, desc:'Слияние сайтов дешевле на 30% навсегда'},
  {id:'extra_slot',   name:'Расширение штаб-квартиры', icon:'🏢', cost:8, desc:'+1 слот под сайты навсегда'},
];
function hasSkill(id){ return !!(state.prestige.skills && state.prestige.skills[id]); }

/* ---------- ACHIEVEMENTS ----------
   Simple one-shot goals checked every tick (and right after actions via
   renderAll's tick-independent callers). Each unlock pays out once and is
   remembered forever in state.achievements. Conditions read from `state`
   directly so they stay cheap to evaluate every second. */
const ACHIEVEMENTS = [
  {id:'first_site',    icon:'🌱', name:'Первый бизнес',       nameEn:'First business',        desc:'Купите свой первый сайт',                descEn:'Buy your first site',                reward:500,    cond:s=>s.sites.length>=1},
  {id:'five_sites',     icon:'🏗️', name:'Растущая империя',    nameEn:'Growing empire',        desc:'Владейте 5 сайтами одновременно',        descEn:'Own 5 sites at the same time',        reward:5000,   cond:s=>s.sites.length>=5},
  {id:'ten_sites',      icon:'🏙️', name:'Конгломерат',         nameEn:'Conglomerate',          desc:'Владейте 10 сайтами одновременно',       descEn:'Own 10 sites at the same time',       reward:25000,  cond:s=>s.sites.length>=10},
  {id:'first_million',  icon:'💵', name:'Первый миллион',      nameEn:'First million',         desc:'Достигните $1 000 000 чистых активов',   descEn:'Reach $1,000,000 net worth',          reward:50000,  cond:s=>netWorth()>=1e6},
  {id:'first_hundred_million', icon:'💎', name:'Магнат',       nameEn:'Tycoon',                desc:'Достигните $100 000 000 чистых активов', descEn:'Reach $100,000,000 net worth',        reward:2000000,cond:s=>netWorth()>=1e8},
  {id:'first_merge',    icon:'🔗', name:'Синергия',            nameEn:'Synergy',               desc:'Слейте два сайта одного типа',           descEn:'Merge two sites of the same type',    reward:10000,  cond:s=>s.sites.some(site=>(site.merged||0)>0)},
  {id:'first_hybrid',   icon:'🧬', name:'Гибридизация',        nameEn:'Hybridization',         desc:'Соберите гибридный бизнес по рецепту',   descEn:'Craft a hybrid business from a recipe', reward:25000,  cond:s=>s.sites.some(site=>HYBRID_RECIPES.some(r=>r.id===site.typeId))},
  {id:'max_track',      icon:'📐', name:'Потолок пробит',      nameEn:'Ceiling broken',        desc:'Прокачайте любой трек до максимума',     descEn:'Max out any upgrade track',           reward:15000,  cond:s=>s.sites.some(site=>TRACK_ORDER.some(k=>site.tracks[k]>=trackMaxLevel(site)))},
  {id:'investor',       icon:'📈', name:'Инвестор',            nameEn:'Investor',              desc:'Портфель акций и крипты на $10 000',     descEn:'Hold $10,000 in stocks and crypto',   reward:8000,   cond:s=>stocksValue()>=10000},
  {id:'landlord',       icon:'🏢', name:'Рантье',              nameEn:'Landlord',              desc:'Владейте 3+ объектами недвижимости',     descEn:'Own 3+ real estate properties',       reward:12000,  cond:s=>Object.values(s.estateOwned).reduce((a,b)=>a+b,0)>=3},
  {id:'week_one',       icon:'📅', name:'Первая неделя',       nameEn:'First week',            desc:'Продержитесь 7 игровых дней',            descEn:'Survive 7 in-game days',              reward:3000,   cond:s=>s.day>=7},
  {id:'streak_master',  icon:'🔥', name:'Постоянство',         nameEn:'Consistency',           desc:'Заходите в игру 7 дней подряд',          descEn:'Log in 7 days in a row',              reward:20000,  cond:s=>(s.dailyStreak.count||0)>=7, skillPoints:1},
  {id:'month_streak',   icon:'🗓️', name:'Железная дисциплина', nameEn:'Iron discipline',       desc:'Заходите в игру 30 дней подряд',         descEn:'Log in 30 days in a row',             reward:150000, cond:s=>(s.dailyStreak.count||0)>=30, skillPoints:2},
  // ---- Daily-quest / seasonal engagement ----
  {id:'quest_starter',  icon:'📋', name:'По плану',            nameEn:'On track',              desc:'Выполните 10 ежедневных заданий (суммарно)', descEn:'Complete 10 daily quests (total)', reward:6000, cond:s=>(s.dailyQuests.totalCompleted||0)>=10},
  {id:'quest_veteran',  icon:'🗂️', name:'Заведённый порядок',  nameEn:'Well-oiled routine',    desc:'Выполните 50 ежедневных заданий (суммарно)', descEn:'Complete 50 daily quests (total)', reward:40000, cond:s=>(s.dailyQuests.totalCompleted||0)>=50, skillPoints:1},
  {id:'season_first',   icon:'🎆', name:'Сезонный игрок',      nameEn:'Seasonal player',       desc:'Заберите награду недельного события',    descEn:'Claim a weekly event reward',         reward:10000,  cond:s=>!!s.seasonEvent.claimed},
  // ---- Hidden / secret achievements — description stays "???" until unlocked ----
  {id:'night_owl',      icon:'🦉', name:'Сова',                nameEn:'Night owl',             desc:'Зайдите в игру между 2:00 и 5:00 ночи',  descEn:'Play the game between 2 and 5 AM',    reward:7000,   cond:s=>{const h=new Date().getHours(); return h>=2&&h<5;}, hidden:true},
  {id:'big_spender',    icon:'💸', name:'Транжира',            nameEn:'Big spender',           desc:'Потратьте $1 000 000 за один день',      descEn:'Spend $1,000,000 in a single day',    reward:20000,  cond:s=>s.finance.todayExpenses>=1000000, hidden:true},
  {id:'debt_daredevil', icon:'🎲', name:'Игра с огнём',        nameEn:'Playing with fire',     desc:'Возьмите кредит, использовав весь доступный лимит', descEn:'Take a loan using your entire available limit', reward:15000, cond:s=>s.loan.principal>0 && s.loan.principal>=maxLoanAmount()*0.98, hidden:true},
  {id:'minimalist',     icon:'🧘', name:'Минималист',          nameEn:'Minimalist',            desc:'Достигните $1 000 000 чистых активов, владея не более чем 3 сайтами', descEn:'Reach $1,000,000 net worth while owning at most 3 sites', reward:30000, cond:s=>netWorth()>=1e6 && s.sites.length<=3, hidden:true, skillPoints:1},
  {id:'collector',      icon:'🗃️', name:'Коллекционер',        nameEn:'Collector',             desc:'Владейте хотя бы одним сайтом каждой категории', descEn:'Own at least one site in every category', reward:25000, cond:s=>CATEGORY_ORDER.every(cat=>s.sites.some(site=>{const t=ALL_BUSINESS_TYPES.find(tt=>tt.id===site.typeId); return t&&t.category===cat;})), hidden:true},
];
function checkAchievements(){
  let unlockedSomething = false;
  ACHIEVEMENTS.forEach(a=>{
    if(state.achievements[a.id]) return;
    if(a.cond(state)){
      state.achievements[a.id] = true;
      state.cash += a.reward;
      if(a.skillPoints){ state.prestige.skillPoints = (state.prestige.skillPoints||0) + a.skillPoints; }
      unlockedSomething = true;
      toast(`🏆 ${tr('Достижение','Achievement')}: ${L(a,'name')} (+${fmt(a.reward)}${a.skillPoints?` · +${a.skillPoints}🌟`:''})`);
      log(`🏆 ${tr('Достижение открыто','Achievement unlocked')}: ${a.icon} ${L(a,'name')} — ${tr('награда','reward')} ${fmt(a.reward)}${a.skillPoints?` (+${a.skillPoints} ${tr('очк. навыков','skill pts')})`:''}`);
      playSound('achievement');
      vibrateFeedback(20);
    }
  });
  if(unlockedSomething){
    save();
    const achBtn = document.getElementById('achievements-btn');
    if(achBtn){
      const unlockedCount = ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length;
      achBtn.textContent = `🏆 Достижения (${unlockedCount}/${ACHIEVEMENTS.length})`;
    }
  }
}
function buildAchievementsHtml(){
  const unlockedCount = ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length;
  const rows = ACHIEVEMENTS.map(a=>{
    const done = !!state.achievements[a.id];
    const isSecret = a.hidden && !done;
    const title = isSecret ? `🔒 ${tr('Секретное достижение','Secret achievement')}` : `${a.icon} ${L(a,'name')}`;
    const desc = isSecret ? '???' : L(a,'desc');
    const rewardTxt = isSecret ? '???' : `${fmt(a.reward)}${a.skillPoints?` · +${a.skillPoints}🌟`:''}`;
    return `<div class="card glass" style="opacity:${done?1:0.55};margin-bottom:8px;">
      <div class="card-title">${title} ${done?'✅':''}</div>
      <div class="card-sub">${desc}</div>
      <div class="card-sub">${tr('Награда','Reward')}: ${rewardTxt}</div>
    </div>`;
  }).join('');
  return `<h3>🏆 ${tr('Достижения','Achievements')} (${unlockedCount}/${ACHIEVEMENTS.length})</h3>${rows}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>`;
}
function openAchievementsModal(){ openModal(buildAchievementsHtml()); }

/* ============================================================
   DAILY QUESTS — 3 simple tasks per in-game calendar day, separate from
   the login streak. Actions elsewhere in the file call bumpQuest(key) to
   move progress; quests are (re)rolled once per real-world day.
   ============================================================ */
const QUEST_POOL = [
  {key:'buy_site',        icon:'🌐', name:'Купите новый сайт',                nameEn:'Buy a new site',                  target:1, reward:0.6},
  {key:'upgrade_track',   icon:'📐', name:'Прокачайте треки сайтов 3 раза',   nameEn:'Upgrade site tracks 3 times',     target:3, reward:0.5},
  {key:'hire',            icon:'🧑‍💼', name:'Наймите сотрудника',              nameEn:'Hire an employee',                target:1, reward:0.4},
  {key:'buy_stock',       icon:'📈', name:'Купите акцию или крипту',         nameEn:'Buy a stock or crypto asset',     target:1, reward:0.35},
  {key:'sell_stock',      icon:'📉', name:'Продайте акцию или крипту',       nameEn:'Sell a stock or crypto asset',    target:1, reward:0.35},
  {key:'open_site',       icon:'🖥️', name:'Откройте карточку любого сайта',  nameEn:'Open any site card',              target:1, reward:0.2},
  {key:'visit_market',    icon:'💹', name:'Загляните на биржу',              nameEn:'Check out the market',            target:1, reward:0.2},
  {key:'view_leaderboard',icon:'🏆', name:'Откройте рейтинг конкурентов',    nameEn:'Open the competitor leaderboard', target:1, reward:0.25},
];
function questReward(tpl){ const base = Math.max(150, Math.round(totalIncomePerSec()*90*tpl.reward) || Math.round(500*tpl.reward)); return Math.round(base * (hasSkill('quick_start')?1.1:1)); }
function rollDailyQuests(){
  const pool = QUEST_POOL.slice();
  const picked = [];
  while(picked.length<3 && pool.length){
    const i = Math.floor(Math.random()*pool.length);
    picked.push(pool.splice(i,1)[0]);
  }
  state.dailyQuests.date = dateKey(new Date());
  state.dailyQuests.counters = {};
  state.dailyQuests.quests = picked.map(tpl=>({key:tpl.key, icon:tpl.icon, name:tpl.name, nameEn:tpl.nameEn, target:tpl.target, reward:questReward(tpl), claimed:false}));
}
function ensureDailyQuests(){
  const today = dateKey(new Date());
  if(state.dailyQuests.date !== today) rollDailyQuests();
}
function bumpQuest(key, n=1){
  if(!state || !state.dailyQuests) return;
  ensureDailyQuests();
  state.dailyQuests.counters[key] = (state.dailyQuests.counters[key]||0) + n;
  refreshDailyQuestCard();
}
function questProgress(q){ return Math.min(q.target, state.dailyQuests.counters[q.key]||0); }
function claimQuest(key){
  const q = state.dailyQuests.quests.find(x=>x.key===key);
  if(!q || q.claimed || questProgress(q) < q.target) return;
  q.claimed = true;
  state.cash += q.reward;
  state.dailyQuests.totalCompleted = (state.dailyQuests.totalCompleted||0)+1;
  log(`📋 ${tr('Ежедневное задание выполнено','Daily quest completed')}: ${L(q,'name')} — +${fmt(q.reward)}`);
  toast(`✅ ${tr('Задание выполнено!','Quest completed!')} +${fmt(q.reward)}`);
  playSound('achievement');
  vibrateFeedback(15);
  checkAchievements();
  save(); renderAll(); refreshDailyQuestCard(); refreshDailyQuestModal();
}
function buildDailyQuestCardHtml(){
  ensureDailyQuests();
  const rows = state.dailyQuests.quests.map(q=>{
    const prog = questProgress(q);
    const done = prog>=q.target;
    const pct = Math.round(prog/q.target*100);
    return `<div class="card glass" style="margin-bottom:8px;${q.claimed?'opacity:.55;':''}">
      <div class="card-row">
        <div class="card-icon">${q.icon}</div>
        <div style="flex:1">
          <div class="card-title">${L(q,'name')} ${q.claimed?'✅':''}</div>
          <div class="card-sub">${prog}/${q.target} · ${tr('награда','reward')} ${fmt(q.reward)}</div>
          <div class="progress-bar"><div style="width:${pct}%"></div></div>
        </div>
      </div>
      ${(done && !q.claimed) ? `<div class="btn-row"><button class="btn btn-green btn-block" onclick="claimQuest('${q.key}')">${S('Забрать награду')}</button></div>` : ''}
    </div>`;
  }).join('');
  const allDone = state.dailyQuests.quests.every(q=>q.claimed);
  return `<h3>📋 ${tr('Задания дня','Daily quests')}</h3><p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${tr('Обновляются каждый календарный день. Выполнено всего','Refresh every calendar day. Total completed')}: ${state.dailyQuests.totalCompleted||0}</p>${rows}
    ${allDone?`<p style="color:var(--green);font-size:12.5px;text-align:center;margin:6px 0;">🎉 ${tr('Все задания дня выполнены!','All daily quests completed!')}</p>`:''}`;
}
function openDailyQuestsModal(){
  ensureDailyQuests();
  openModal(`<div id="quests-modal-body">${buildDailyQuestCardHtml()}</div><div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>`);
}
// Re-renders the quest list in place if the modal is currently open, so
// claiming a reward makes its button disappear immediately instead of
// staying on screen until the modal is closed and reopened.
function refreshDailyQuestModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('quests-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildDailyQuestCardHtml();
}

/* ---------- LIFETIME STATS SCREEN ---------- */
function buildStatsHtml(){
  const ls = state.lifetimeStats;
  const nwSeries = ls.netWorthByDay.length ? ls.netWorthByDay.map(d=>d.nw) : [netWorth()];
  const chartPath = sparklinePath(nwSeries, 300, 60);
  const totalRuns = state.prestige.runs.length;
  const totalRunsCapital = state.prestige.runs.reduce((s,r)=>s+r.netWorth,0) + netWorth();
  return `<h3>📊 ${tr('Общая статистика','Overall stats')}</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${tr('За всё время игры — не только за сегодня','Across all time played — not just today')}</p>
    <svg viewBox="0 0 300 60" style="width:100%;height:60px;margin-bottom:14px;" preserveAspectRatio="none">
      <path d="${chartPath}" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div class="stat-strip">
      <div class="stat-box glass"><div class="lbl">${tr('Всего заработано','Total earned')}</div><div class="val num c-green">${fmt(ls.totalEarned)}</div></div>
      <div class="stat-box glass"><div class="lbl">${tr('Макс. доход/сек','Max income/sec')}</div><div class="val num c-green">${fmt(ls.maxIncomePerSec)}</div></div>
      <div class="stat-box glass"><div class="lbl">${tr('Игровых дней','Game days')}</div><div class="val num">${state.day}</div></div>
      <div class="stat-box glass"><div class="lbl">${S('Перерождений')}</div><div class="val num c-violet">${state.prestige.count}</div></div>
      <div class="stat-box glass"><div class="lbl">${S('Текущие активы')}</div><div class="val num c-green">${fmt(netWorth())}</div></div>
      <div class="stat-box glass"><div class="lbl">${tr('Капитал за карьеру','Career capital')}</div><div class="val num c-amber">${fmt(totalRunsCapital)}</div></div>
      <div class="stat-box glass"><div class="lbl">${tr('Достижения','Achievements')}</div><div class="val num">${ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length}/${ACHIEVEMENTS.length}</div></div>
      <div class="stat-box glass"><div class="lbl">${tr('Лучший сайт','Best site')}</div><div class="val" style="font-size:13px;">${esc(bestSiteName())}</div></div>
    </div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>`;
}
function openStatsModal(){ openModal(buildStatsHtml()); }
// Cheap live patch for the dashboard quest summary chip (see renderDash());
// avoids a full innerHTML rebuild on every bumpQuest() call.
function refreshDailyQuestCard(){
  const el = document.getElementById('quest-chip');
  if(!el) return;
  ensureDailyQuests();
  const done = state.dailyQuests.quests.filter(q=>q.claimed).length;
  const ready = state.dailyQuests.quests.some(q=>!q.claimed && questProgress(q)>=q.target);
  el.textContent = `📋 ${tr('Задания дня','Daily quests')}: ${done}/3${ready?tr(' · есть награда!',' · reward ready!'):''}`;
  el.classList.toggle('quest-ready', ready);
}

/* ============================================================
   SEASONAL EVENT — one special weekly challenge with a unique reward,
   separate from the recurring random EVENT_TYPES twists. Boosty
   subscribers see the new week's event ~2 days early (early-access perk).
   ============================================================ */
const SEASON_THEMES = [
  {name:'Неделя роста трафика',    nameEn:'Traffic Growth Week',  icon:'📈', desc:'Заработайте суммарно {X} за эту неделю', descEn:'Earn a total of {X} this week', mult:400},
  {name:'Неделя сделок',           nameEn:'Deal Week',            icon:'🤝', desc:'Купите или продайте активов на бирже {X} раз', descEn:'Buy or sell market assets {X} times', mult:1, isCount:true, count:8},
  {name:'Неделя экспансии',        nameEn:'Expansion Week',       icon:'🏗️', desc:'Владейте {X} сайтами одновременно',        descEn:'Own {X} sites at the same time',      mult:1, isCount:true, count:6},
];
function isoWeekKey(d){
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay()+6)%7;
  t.setUTCDate(t.getUTCDate()-day+3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(),0,4));
  const week = 1+Math.round(((t-firstThu)/86400000-3+((firstThu.getUTCDay()+6)%7))/7);
  return t.getUTCFullYear()+'-W'+week;
}
function currentSeasonTheme(wk){
  const idx = Math.abs([...wk].reduce((a,c)=>a+c.charCodeAt(0),0)) % SEASON_THEMES.length;
  return SEASON_THEMES[idx];
}
// Early access: Boosty subscribers key off "now", everyone else keys off
// a timestamp shifted 2 days into the past, so the new week's challenge
// (and its unique reward) unlocks for subscribers first.
function seasonEffectiveDate(){
  const shiftMs = state.boosty.unlocked ? 0 : 2*86400000;
  return new Date(Date.now()-shiftMs);
}
function ensureSeasonEvent(){
  const wk = isoWeekKey(seasonEffectiveDate());
  if(state.seasonEvent.weekKey !== wk){
    state.seasonEvent.weekKey = wk;
    state.seasonEvent.progress = 0;
    state.seasonEvent.claimed = false;
    state.seasonEvent.earnedThisWeek = 0;
    state.seasonEvent.extraTrades = 0;
  }
}
function seasonTarget(theme){ return theme.isCount ? theme.count : Math.max(5000, Math.round(totalIncomePerSec()*theme.mult) || 5000); }
function seasonProgressValue(theme){
  if(theme.name.includes('сделок')) return state.seasonEvent.extraTrades||0;
  if(theme.name.includes('экспансии')) return state.sites.length;
  return state.seasonEvent.earnedThisWeek||0;
}
function seasonReward(theme, target){ return Math.max(5000, Math.round(target*(theme.isCount?800:1.2))); }
function buildSeasonEventHtml(standalone){
  ensureSeasonEvent();
  const theme = currentSeasonTheme(state.seasonEvent.weekKey);
  const target = seasonTarget(theme);
  const prog = Math.min(target, seasonProgressValue(theme));
  const done = prog>=target;
  const reward = seasonReward(theme, target);
  const earlyNote = state.boosty.unlocked ? `<p style="color:var(--orange);font-size:11.5px;margin-bottom:8px;">🚀 ${tr('Ранний доступ Boosty: новое событие открывается у вас на 2 дня раньше остальных.','Boosty early access: new events unlock for you 2 days before everyone else.')}</p>` : '';
  return `<h3>${theme.icon} ${L(theme,'name')}</h3>${earlyNote}
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:10px;">${L(theme,'desc').replace('{X}', theme.isCount?target:fmt(target))}</p>
    <div class="progress-bar" style="margin-bottom:8px;"><div style="width:${Math.round(prog/target*100)}%"></div></div>
    <div class="card-sub" style="margin-bottom:12px;">${theme.isCount?prog:fmt(prog)} / ${theme.isCount?target:fmt(target)} · ${tr('награда','reward')} ${fmt(reward)}</div>
    ${done && !state.seasonEvent.claimed ? `<div class="btn-row"><button class="btn btn-green btn-block" onclick="claimSeasonEvent()">${S('Забрать награду')}</button></div>` : ''}
    ${state.seasonEvent.claimed ? `<p style="color:var(--green);font-size:12.5px;text-align:center;">✅ ${tr('Награда уже получена на этой неделе','Reward already claimed this week')}</p>` : ''}
    ${standalone===false ? '' : `<div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>`}`;
}
function claimSeasonEvent(){
  ensureSeasonEvent();
  const theme = currentSeasonTheme(state.seasonEvent.weekKey);
  const target = seasonTarget(theme);
  if(state.seasonEvent.claimed || seasonProgressValue(theme) < target) return;
  const reward = seasonReward(theme, target);
  state.cash += reward;
  state.seasonEvent.claimed = true;
  log(`🎆 ${tr('Награда сезонного события','Seasonal event reward')} «${L(theme,'name')}» ${tr('получена','claimed')} — +${fmt(reward)}`);
  toast(`🎆 +${fmt(reward)} ${tr('за сезонное событие!','from the seasonal event!')}`);
  playSound('achievement');
  vibrateFeedback([15,30,15]);
  checkAchievements();
  save(); renderAll(); closeModal();
}
function openSeasonEventModal(){ openModal(buildSeasonEventHtml()); }

/* ---------- UNIFIED INBOX ----------
   One screen that pulls together everything that used to be scattered
   across separate chips/cards on the dashboard: claimable daily quests,
   the weekly season event, currently-active random events, and a compact
   achievements summary. Frees up a bottom-nav slot since Estate+Status
   were merged into tabs. */
function computeInboxBadgeCount(){
  ensureDailyQuests(); ensureSeasonEvent();
  let n = state.dailyQuests.quests.filter(q=>!q.claimed && questProgress(q)>=q.target).length;
  const theme = currentSeasonTheme(state.seasonEvent.weekKey);
  const target = seasonTarget(theme);
  if(!state.seasonEvent.claimed && seasonProgressValue(theme)>=target) n++;
  n += (state.activeEvents||[]).filter(e=>e.type==='hack'||e.type==='downtime'||e.type==='platformwar').length;
  return n;
}
function refreshInboxBadge(){
  const badge = document.getElementById('inbox-badge');
  if(!badge) return;
  const n = computeInboxBadgeCount();
  badge.style.display = n>0 ? '' : 'none';
  badge.textContent = n>0 ? (n>9?'9+':String(n)) : '';
}
function buildInboxActiveEventsHtml(){
  if(!state.activeEvents || !state.activeEvents.length) return '';
  const icons = {hack:'🦹', downtime:'⚠️', viral:'🔥', blackfriday:'🛍️', platformwar:'⚔️'};
  const rows = state.activeEvents.map(function(e){
    const secsLeft = Math.max(0, Math.round((e.endsAt-Date.now())/1000));
    if(e.type==='hack') return `<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">${icons[e.type]} ${tr('Атака на','Attack on')} «${esc(e.siteName)}»</div><div class="card-sub">${tr('Осталось','Remaining')} ~${secsLeft}${tr('с','s')} · ${tr('доход','income')} −70%</div></div><button class="btn btn-red" style="flex:none;" onclick="payOffHack('${e.id}')">${tr('Откупиться','Pay off')} ${fmt(e.payoff)}</button></div>`;
    if(e.type==='downtime') return `<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">${icons[e.type]} ${tr('Сбой на','Outage at')} «${esc(e.siteName)}»</div><div class="card-sub">${tr('Осталось','Remaining')} ~${secsLeft}${tr('с','s')} · ${tr('доход','income')} −50%</div></div><button class="btn btn-red" style="flex:none;" onclick="payOffDowntime('${e.id}')">${tr('Устранить','Fix')} ${fmt(e.payoff)}</button></div>`;
    if(e.type==='platformwar'){
      const pctLoss = e.severity===2 ? 55 : 35;
      return `<div class="card glass" style="margin-bottom:8px;border-color:rgba(255,69,58,.25);"><div class="card-title">${icons[e.type]} ${tr('Война платформ','Platform war')}: «${esc(e.siteName)}»</div><div class="card-sub">${tr('Осталось','Remaining')} ~${secsLeft}${tr('с','s')} · ${tr('доход','income')} −${pctLoss}%</div><div class="btn-row"><button class="btn btn-red btn-block" onclick="payOffPlatformWar('${e.id}')">${tr('Откупиться','Pay off')} ${fmt(e.payoff)}</button>${e.counterUsed?'':`<button class="btn btn-amber btn-block" onclick="counterPlatformWar('${e.id}')">${tr('Контратаковать','Counter-attack')} ${fmt(e.counterCost)}</button>`}</div></div>`;
    }
    const label = CATEGORY_META[e.category] ? L(CATEGORY_META[e.category],'name') : e.category;
    return `<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">${icons[e.type]} ${label}</div><div class="card-sub">${tr('Осталось','Remaining')} ~${secsLeft}${tr('с','s')} · ${tr('доход','income')} ${e.type==='viral'?'+60%':'+30%'}</div></div></div>`;
  }).join('');
  return `<div class="section-title">⚡ ${tr('Активные события','Active events')}</div><div class="card glass" style="margin-bottom:14px;">${rows}</div>`;
}
function buildInboxAchievementsSummaryHtml(){
  const unlockedCount = ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length;
  const recent = ACHIEVEMENTS.filter(a=>state.achievements[a.id]).slice(-3).reverse();
  const recentHtml = recent.length ? recent.map(a=>`<div class="card-row" style="margin-bottom:6px;"><div class="card-icon">${a.icon}</div><div style="flex:1"><div class="card-title" style="font-size:13px;">${esc(L(a,'name'))}</div><div class="card-sub">${esc(L(a,'desc'))}</div></div></div>`).join('') : `<p style="color:var(--dim);font-size:12.5px;">${tr('Пока нет открытых достижений','No achievements unlocked yet')}</p>`;
  return `<div class="section-title">🏆 ${tr('Достижения','Achievements')} (${unlockedCount}/${ACHIEVEMENTS.length})</div>
    <div class="card glass" style="margin-bottom:14px;">${recentHtml}
      <div class="btn-row" style="margin-top:8px;"><button class="btn btn-outline btn-block" onclick="openAchievementsModal()">${S('Смотреть все')}</button></div>
    </div>`;
}
function renderInbox(){
  refreshInboxBadge();
  const container = document.getElementById('inbox-content');
  if(!container) return;
  container.innerHTML =
    buildInboxActiveEventsHtml() +
    `<div class="section-title">📋 Задания и события</div>` +
    `<div class="card glass" style="margin-bottom:14px;">${buildDailyQuestCardHtml()}</div>` +
    `<div class="card glass" style="margin-bottom:14px;">${buildSeasonEventHtml(false)}</div>` +
    buildInboxAchievementsSummaryHtml();
}

/* ---------- OFFLINE INCOME ----------
   state.lastSeen is kept fresh (Date.now()) every tick while the tab is
   open, and persisted on every save(). On boot, the gap between "now" and
   the last persisted lastSeen is what the player was actually away — we
   pay out a capped, discounted share of it so returning players are
   rewarded without trivializing active play. */
const OFFLINE_CAP_SECONDS = 4*3600;   // offline earnings stop accruing after 4h away
const OFFLINE_MIN_SECONDS = 60;       // ignore quick reloads/tab-switches
const OFFLINE_RATE = 0.5;             // 50% of the normal per-second rate while away
const IDLE_WARN_HOURS = 2;            // show the "⏳ без апгрейда" badge once a site hasn't been touched this long
let pendingWelcomeBack = null; // {offlineCash, offlineSeconds, streakCount, streakReward, streakIsNew}
function computeOfflineEarnings(){
  const elapsed = Math.floor((Date.now() - (state.lastSeen||Date.now())) / 1000);
  if(elapsed < OFFLINE_MIN_SECONDS) return null;
  const boosty = state.boosty.unlocked;
  const cap = boosty ? 24*3600 : OFFLINE_CAP_SECONDS; // Boosty: cap raised to 24h instead of removed outright, to keep active play meaningfully better
  const rate = boosty ? 1.0 : OFFLINE_RATE;
  const capped = Math.min(elapsed, cap);
  const cash = totalIncomePerSec() * capped * rate;
  if(cash < 1) return null;
  state.cash += cash;
  log(`🌙 Офлайн-доход: +${fmt(cash)} за время отсутствия${boosty?' (Boosty: без потолка 50%, до 24ч на 100%)':''}`);
  return {offlineCash: cash, offlineSeconds: elapsed};
}

/* ---------- DAILY STREAK ---------- */
function dateKey(d){ return d.toISOString().slice(0,10); }
function checkDailyStreak(){
  const today = dateKey(new Date());
  const streak = state.dailyStreak;
  if(streak.lastClaim === today) return null; // already claimed today
  const yesterday = dateKey(new Date(Date.now()-86400000));
  if(streak.lastClaim === yesterday) streak.count = (streak.count||0)+1;
  else streak.count = 1; // first visit ever, or streak broken
  streak.lastClaim = today;
  const mult = Math.min(streak.count, 10);
  let reward = Math.max(100, Math.round(totalIncomePerSec()*30*mult) || 100*mult);
  if(hasSkill('quick_start')) reward = Math.round(reward*1.1);
  state.cash += reward;
  log(`📅 Ежедневный бонус: день подряд ${streak.count} — +${fmt(reward)}`);
  return {streakCount: streak.count, streakReward: reward};
}
function showWelcomeBackModal(info){
  const parts = [];
  if(info.offlineCash) parts.push(`<div class="card glass" style="margin-bottom:8px;"><div class="card-title">🌙 Офлайн-доход</div><div class="card-sub">Вас не было ~${Math.round(info.offlineSeconds/60)} мин. Заработано: <b>${fmt(info.offlineCash)}</b></div></div>`);
  if(info.streakReward) parts.push(`<div class="card glass" style="margin-bottom:8px;"><div class="card-title">🔥 Стрик: ${info.streakCount} ${info.streakCount===1?'день':'дней'} подряд</div><div class="card-sub">Бонус за вход: <b>${fmt(info.streakReward)}</b></div></div>`);
  openModal(`<h3>С возвращением, ${esc(state.ceoName)}!</h3>${parts.join('')}
    <div class="btn-row"><button class="btn btn-cyan btn-block" onclick="closeModal()">Продолжить</button></div>`);
  playSound('achievement');
}

/* ============================================================
   PRESTIGE / REBIRTH SYSTEM
   Available once net worth clears prestigeThreshold(). Cashes out
   everything earned this run for permanent "legacy points" that boost
   all future income forever, and raises the track level cap. The 3rd
   rebirth ends the run with a summary screen; after that, "Endless"
   mode lifts the rebirth limit (no further new unlocks, just multiplier
   growth) for people who want to keep playing past the ending.
   ============================================================ */
function genUid(){ return Math.random().toString(36).slice(2,10); }
function prestigeThreshold(){ return 50000000 * Math.pow(2, state.prestige.count); } // $50M, then $100M, $200M...
function legacyPointsFor(nw){ return Math.floor(Math.sqrt(nw/1e6)); }
function prestigeMultiplier(){ return 1 + state.prestige.count*0.5 + state.prestige.points*0.01; }
function bestSiteName(){
  if(!state.sites.length) return '—';
  let best = state.sites[0], bestType = ALL_BUSINESS_TYPES.find(t=>t.id===best.typeId);
  let bestIncome = siteIncome(bestType, best);
  state.sites.forEach(s=>{
    const t = ALL_BUSINESS_TYPES.find(tt=>tt.id===s.typeId);
    const inc = siteIncome(t, s);
    if(inc > bestIncome){ best = s; bestType = t; bestIncome = inc; }
  });
  return bestType.icon + ' ' + best.name;
}
function canRebirth(){ return netWorth() >= prestigeThreshold(); }
function isFinalRebirth(){ return state.prestige.count === 2 && !state.prestige.endless; }
function openRebirthModal(){
  const nw = netWorth();
  if(!canRebirth()){ toast('Нужно $'+fmt(prestigeThreshold())+' чистых активов, чтобы переродиться'); return; }
  const points = legacyPointsFor(nw);
  const newMult = 1 + (state.prestige.count+1)*0.5 + (state.prestige.points+points)*0.01;
  const finalWarning = isFinalRebirth()
    ? '<p style="color:var(--orange);font-size:12.5px;margin-bottom:10px;">⚠️ Это будет 3-е перерождение — оно завершит партию финальным экраном.</p>' : '';
  openModal(
    '<h3>🔄 Переродиться?</h3>' +
    '<p style="color:var(--dim);font-size:13px;margin-bottom:10px;">Наличные, сайты, акции и большая часть активов будут потеряны. Взамен вы получите очки наследия и постоянный множитель дохода.</p>' +
    finalWarning +
    '<div class="card glass" style="margin-bottom:14px;"><div class="card-row"><div style="flex:1"><div class="card-title">+'+points+' очков наследия</div><div class="card-sub">Множитель дохода: ×'+prestigeMultiplier().toFixed(2)+' → ×'+newMult.toFixed(2)+'</div></div></div></div>' +
    '<div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">Отмена</button><button class="btn btn-violet btn-block" onclick="doRebirth()">Переродиться</button></div>'
  );
}
function doRebirth(){
  const nw = netWorth();
  const points = legacyPointsFor(nw);
  const best = bestSiteName();
  state.prestige.runs.push({netWorth:nw, day:state.day, points, bestSite:best});
  state.prestige.points += points;
  state.prestige.skillPoints = (state.prestige.skillPoints||0) + points;
  state.prestige.count += 1;
  log('🔄 Перерождение №'+state.prestige.count+': +'+points+' очков наследия (капитал $'+fmt(nw)+')');
  state.cash = DIFFICULTY_META[state.difficulty] ? DIFFICULTY_META[state.difficulty].startCash : 800;
  state.sites = [];
  state.stocks = {};
  state.estateOwned = {garage:1};
  state.luxuryOwned = {};
  state.propertyIndex = 1;
  state.secondsElapsed = 0;
  state.day = 1;
  state.netWorthHistory = [state.cash];
  state.lastRankIndex = 0;
  state.activeEvents = [];
  state.loan = {principal:0};
  state.shorts = {};
  state.finance = {incomeHist:[],expenseHist:[],todayIncome:0,todayExpenses:0,dailyHistory:[],lastTickCash:state.cash};
  closeModal();
  save();
  renderAll();
  renderSettings();
  toast('✨ Переродились — множитель дохода теперь ×'+prestigeMultiplier().toFixed(2));
  playSound('rebirth');
  vibrateFeedback([20,40,20]);
  if(state.prestige.count >= 3 && !state.prestige.endless && !state.prestige.endingSeen){
    state.prestige.endingSeen = true;
    save();
    setTimeout(function(){ showEndingScreen(); }, 400);
  }
}
function showEndingScreen(){
  const runs = state.prestige.runs;
  const totalCapital = runs.reduce(function(s,r){return s+r.netWorth;}, 0);
  const totalDays = runs.reduce(function(s,r){return s+r.day;}, 0) + state.day;
  const best = runs.reduce(function(a,b){return (b.netWorth>a.netWorth ? b : a);}, runs[0]||{bestSite:'—'});
  document.getElementById('ending-stats').innerHTML =
    '<div class="card glass" style="margin-bottom:10px;"><div class="card-title">Суммарный капитал за все прохождения</div><div class="card-sub num c-green" style="font-size:17px;">'+fmt(totalCapital)+'</div></div>' +
    '<div class="card glass" style="margin-bottom:10px;"><div class="card-title">Всего игровых дней</div><div class="card-sub num" style="font-size:17px;">'+totalDays+'</div></div>' +
    '<div class="card glass"><div class="card-title">Лучший проект за карьеру</div><div class="card-sub" style="font-size:15px;">'+esc(best.bestSite||'—')+'</div></div>';
  document.getElementById('ending-screen').classList.remove('hidden');
}
function continueEndless(){
  state.prestige.endless = true;
  save();
  document.getElementById('ending-screen').classList.add('hidden');
  toast(tr('♾️ Endless-режим включён — лимит перерождений снят','♾️ Endless mode enabled — rebirth limit removed'));
}

/* ---------- CEO SKILL TREE ---------- */
function buySkill(id){
  const sk = CEO_SKILLS.find(s=>s.id===id);
  if(!sk || hasSkill(id)) return;
  if((state.prestige.skillPoints||0) < sk.cost){ toast(tr('Недостаточно очков навыков','Not enough skill points')); playSound('error'); return; }
  state.prestige.skillPoints -= sk.cost;
  if(!state.prestige.skills) state.prestige.skills = {};
  state.prestige.skills[id] = true;
  log(`🌟 Изучен навык CEO: ${sk.name}`);
  toast(`Навык изучен: ${sk.name}`);
  playSound('achievement');
  save(); renderAll();
  openSkillTreeModal();
}
function openSkillTreeModal(){
  const pts = state.prestige.skillPoints||0;
  const rows = CEO_SKILLS.map(sk=>{
    const owned = hasSkill(sk.id);
    return `<div class="card glass" style="margin-bottom:8px;${owned?'opacity:.65;':''}">
      <div class="card-title">${sk.icon} ${sk.name} ${owned?'✅':''}</div>
      <div class="card-sub">${sk.desc}</div>
      ${owned?'':`<div class="btn-row"><button class="btn btn-violet btn-block" ${pts<sk.cost?'disabled':''} onclick="buySkill('${sk.id}')">Изучить за ${sk.cost} 🌟</button></div>`}
    </div>`;
  }).join('');
  openModal(`<h3>🌳 Дерево навыков CEO</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">Очки навыков (сейчас: ${pts} 🌟) начисляются при каждом перерождении наравне с очками наследия и остаются насовсем.</p>
    ${rows}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>`);
}
function runAutoHire(){
  if(!state.prestige.autoHire) return;
  state.sites.forEach(site=>{
    if(site.employees >= employeeCap(site)) return;
    const cost = employeeCost(site);
    if(state.cash > cost*5){
      state.cash -= cost;
      site.employees += 1;
      log(`🤝 Авто-найм: «${esc(site.name)}» +1 сотрудник`);
    }
  });
}
function runAutoUpgrade(){
  if(!state.prestige.autoUpgrade) return;
  state.sites.forEach(site=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    const cap = trackMaxLevel(site);
    let cheapest = null, cheapestCost = Infinity;
    TRACK_ORDER.forEach(k=>{
      if(site.tracks[k] >= cap) return;
      const c = trackUpgradeCost(type, k, site.tracks[k]);
      if(c < cheapestCost){ cheapestCost = c; cheapest = k; }
    });
    if(cheapest && state.cash > cheapestCost*5){
      state.cash -= cheapestCost;
      site.tracks[cheapest] += 1;
      log(`🤖 Авто-прокачка: «${esc(site.name)}» ${TRACK_META[cheapest].icon} → ур. ${site.tracks[cheapest]}`);
    }
  });
}
/* ---------- PER-SITE AUTO-MANAGER ----------
   A one-time cash unlock (independent of the prestige tree) that lets the
   player toggle auto-hire + auto-upgrade individually per site, instead of
   grinding rebirths for the global CEO-skill versions above. */
function autoManagerUnlockCost(){ return Math.round(20000 * difficultyCostMult()); }
function unlockAutoManager(idx){
  if(state.autoManagerUnlocked) return;
  const cost = autoManagerUnlockCost();
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  state.autoManagerUnlocked = true;
  log(`🤖 Разблокирован Авто-менеджер сайтов за ${fmt(cost)} — теперь доступен на каждом сайте`);
  toast(tr('🤖 Авто-менеджер разблокирован!','🤖 Auto-manager unlocked!'));
  playSound('achievement');
  vibrateFeedback(20);
  renderAll(); save();
  if(typeof idx==='number') refreshSiteViewSections(idx, ['automgr']);
}
function toggleSiteAutoManager(idx){
  const site = state.sites[idx];
  if(!site || !state.autoManagerUnlocked) return;
  site.autoManager = !site.autoManager;
  log(`🤖 Авто-менеджер «${esc(site.name)}»: ${site.autoManager?'включён':'выключен'}`);
  toast(site.autoManager ? '🤖 Авто-менеджер включён' : 'Авто-менеджер выключен');
  save();
  refreshSiteViewSections(idx, ['automgr']);
}
function runSiteAutoManagers(){
  if(!state.autoManagerUnlocked) return;
  state.sites.forEach(site=>{
    if(!site.autoManager) return;
    if(site.employees < employeeCap(site)){
      const hcost = employeeCost(site);
      if(state.cash > hcost*5){
        state.cash -= hcost;
        site.employees += 1;
        log(`🧑‍💼 Авто-менеджер «${esc(site.name)}»: +1 сотрудник`);
      }
    }
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    const cap = trackMaxLevel(site);
    let cheapest = null, cheapestCost = Infinity;
    TRACK_ORDER.forEach(k=>{
      if(site.tracks[k] >= cap) return;
      const c = trackUpgradeCost(type, k, site.tracks[k]);
      if(c < cheapestCost){ cheapestCost = c; cheapest = k; }
    });
    if(cheapest && state.cash > cheapestCost*5){
      state.cash -= cheapestCost;
      site.tracks[cheapest] += 1;
      log(`🧑‍💼 Авто-менеджер «${esc(site.name)}»: ${TRACK_META[cheapest].icon} → ур. ${site.tracks[cheapest]}`);
    }
  });
}

/* ============================================================
   RANDOM EVENTS — periodic risk/reward twists on top of the base loop.
   ============================================================ */
const EVENT_CHECK_INTERVAL_MS = 45000;
let nextEventRollAt = Date.now() + EVENT_CHECK_INTERVAL_MS;
function eventSiteMultiplier(site, type){
  let mult = 1;
  state.activeEvents.forEach(function(e){
    if(e.type==='hack' && e.targetUid===site.uid) mult *= 0.3;
    if(e.type==='downtime' && e.targetUid===site.uid) mult *= 0.5;
    if(e.type==='platformwar' && e.targetUid===site.uid) mult *= (e.severity===2 ? 0.45 : 0.65);
    if(e.type==='viral' && e.category===type.category) mult *= 1.6;
    if(e.type==='blackfriday' && e.category===type.category) mult *= 1.3;
  });
  if(state.taxes && state.taxes.audited && state.taxes.audited[type.category]) mult *= TAX_AUDIT_PENALTY;
  return mult;
}
function cleanupExpiredEvents(){
  const now = Date.now();
  const before = state.activeEvents.length;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.endsAt > now; });
  if(state.activeEvents.length !== before) renderEvents();
}
function payOffHack(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  if(state.cash < ev.payoff){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.payoff;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  log('🛡️ Атака на «'+ev.siteName+'» устранена за '+fmt(ev.payoff));
  toast(tr('Хакерская атака устранена','Hacker attack resolved'));
  save(); renderAll(); renderEvents();
}
function payOffDowntime(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  if(state.cash < ev.payoff){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.payoff;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  log('🔧 Сбой на «'+ev.siteName+'» устранён за '+fmt(ev.payoff));
  toast(tr('Сбой инфраструктуры устранён','Infrastructure outage resolved'));
  save(); renderAll(); renderEvents();
}
/* ---------- PLATFORM WAR — a mini-event with a real choice: pay off / wait it out / counterattack ---------- */
function payOffPlatformWar(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  if(state.cash < ev.payoff){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.payoff;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  log('🏳️ Войну платформ у «'+ev.siteName+'» урегулировали мирно за '+fmt(ev.payoff));
  toast(tr('Конфликт улажен','Conflict resolved'));
  save(); renderAll(); renderEvents();
}
function counterPlatformWar(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev || ev.counterUsed) return;
  if(state.cash < ev.counterCost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.counterCost;
  ev.counterUsed = true;
  if(Math.random() < 0.55){
    const reward = Math.round(ev.payoff*0.8);
    state.cash += reward;
    state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
    log('⚔️ Контратака у «'+ev.siteName+'» удалась — отбито '+fmt(reward)+' с бюджета конкурента');
    toast('🎉 Контратака удалась! +'+fmt(reward));
    playSound('achievement');
    vibrateFeedback(15);
  } else {
    ev.severity = 2;
    ev.endsAt = Date.now() + 45000;
    log('⚔️ Контратака у «'+ev.siteName+'» провалилась — конкурент усилил давление, доход просел ещё сильнее');
    toast(tr('😬 Контратака провалилась...','😬 Counter-attack failed...'));
    playSound('error');
  }
  save(); renderAll(); renderEvents();
}
function maybeTriggerRandomEvent(){
  if(Date.now() < nextEventRollAt) return;
  nextEventRollAt = Date.now() + EVENT_CHECK_INTERVAL_MS + Math.random()*EVENT_CHECK_INTERVAL_MS;
  if(!state.sites.length || Math.random() > 0.4*(hasSkill('lucky_events')?1.15:1)) return;
  const roll = Math.random();
  if(roll < 0.18) triggerHack();
  else if(roll < 0.34) triggerViral();
  else if(roll < 0.50) triggerBlackFriday();
  else if(roll < 0.64) triggerPoaching();
  else if(roll < 0.76) triggerMarketShock();
  else if(roll < 0.90) triggerPlatformWar();
  else triggerInfraDowntime();
}
function triggerHack(){
  const candidates = state.sites.filter(function(s){ return !s.insured; });
  if(!candidates.length) return;
  const site = candidates[Math.floor(Math.random()*candidates.length)];
  if(state.activeEvents.some(function(e){ return e.type==='hack' && e.targetUid===site.uid; })) return;
  const duration = 60000 + Math.random()*60000;
  const payoff = Math.round(Math.max(200, netWorth()*0.01));
  state.activeEvents.push({id:genUid(), type:'hack', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, payoff:payoff});
  toast('🦹 Хакерская атака на «'+site.name+'»! Доход просел');
  log('🦹 Хакерская атака на «'+site.name+'» — доход -70% на время атаки. Откупиться: '+fmt(payoff));
  renderEvents();
}
// Sites whose infrastructure track badly lags the other three are at risk
// of a downtime event — insurance and a healthy infra track are the fix.
function infraRiskSites(){
  return state.sites.filter(function(s){
    if(s.insured) return false;
    const avgOther = (s.tracks.design + s.tracks.traffic + s.tracks.monetization) / 3;
    return s.tracks.infra < avgOther*0.5;
  });
}
function triggerInfraDowntime(){
  const candidates = infraRiskSites();
  if(!candidates.length) return;
  const site = candidates[Math.floor(Math.random()*candidates.length)];
  if(state.activeEvents.some(function(e){ return e.type==='downtime' && e.targetUid===site.uid; })) return;
  const duration = 45000 + Math.random()*45000;
  const payoff = Math.round(Math.max(150, netWorth()*0.006));
  state.activeEvents.push({id:genUid(), type:'downtime', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, payoff:payoff});
  toast('⚠️ Сбой инфраструктуры на «'+site.name+'»! Доход −50%');
  log('⚠️ Нехватка инфраструктуры вызвала сбой на «'+site.name+'» — доход −50%. Прокачайте инфраструктуру или застрахуйте сайт, чтобы это не повторялось.');
  renderEvents();
}
// A rival deliberately targets one of your sites — unlike a hack/downtime this
// is a live choice: pay to end it now, ignore it and just eat the reduced
// income until it lapses, or gamble on a cheaper counterattack that either
// ends it early with a cash reward or backfires into a harsher, longer war.
function triggerPlatformWar(){
  if(!state.sites.length) return;
  const site = state.sites[Math.floor(Math.random()*state.sites.length)];
  if(state.activeEvents.some(function(e){ return e.type==='platformwar' && e.targetUid===site.uid; })) return;
  const duration = 60000 + Math.random()*60000;
  const payoff = Math.round(Math.max(250, netWorth()*0.012));
  const counterCost = Math.round(payoff*0.4);
  state.activeEvents.push({id:genUid(), type:'platformwar', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, payoff:payoff, counterCost:counterCost, counterUsed:false, severity:1});
  toast('⚔️ Война платформ: конкурент атакует «'+site.name+'»!');
  log('⚔️ Конкурент развернул «войну платформ» против «'+site.name+'» — доход просел на время конфликта. Откупитесь, переждите или контратакуйте.');
  renderEvents();
}
function triggerViral(){
  const cats = [...new Set(state.sites.map(function(s){ return ALL_BUSINESS_TYPES.find(function(t){return t.id===s.typeId;}).category; }))];
  if(!cats.length) return;
  const category = cats[Math.floor(Math.random()*cats.length)];
  const label = CATEGORY_META[category] ? CATEGORY_META[category].name : category;
  state.activeEvents.push({id:genUid(), type:'viral', category:category, endsAt:Date.now()+90000});
  toast('🔥 Вирусный тренд в категории «'+label+'»! Доход +60%');
  log('🔥 Вирусный тренд подхватил категорию «'+label+'» — доход этих сайтов +60% на 90с');
  renderEvents();
}
function triggerBlackFriday(){
  const cats = [...new Set(state.sites.map(function(s){ return ALL_BUSINESS_TYPES.find(function(t){return t.id===s.typeId;}).category; }))];
  if(!cats.length) return;
  const category = cats[Math.floor(Math.random()*cats.length)];
  const label = CATEGORY_META[category] ? CATEGORY_META[category].name : category;
  state.activeEvents.push({id:genUid(), type:'blackfriday', category:category, endsAt:Date.now()+90000});
  toast('🛍️ Чёрная пятница в «'+label+'»! Доход +30%');
  log('🛍️ Чёрная пятница ускорила категорию «'+label+'» — доход +30% на 90с');
  renderEvents();
}
function triggerPoaching(){
  const withStaff = state.sites.filter(function(s){ return s.employees>0; });
  if(!withStaff.length) return;
  const site = withStaff[Math.floor(Math.random()*withStaff.length)];
  site.employees -= 1;
  toast('😬 Конкурент переманил сотрудника из «'+site.name+'»');
  log('😬 Конкурент переманил сотрудника из «'+site.name+'» — наём: −1');
  save(); renderAll();
}
function triggerMarketShock(){
  const asset = ALL_ASSETS[Math.floor(Math.random()*ALL_ASSETS.length)];
  const hype = Math.random() < 0.5;
  const factor = hype ? (1.3+Math.random()*0.4) : (0.4+Math.random()*0.25);
  stockPrices[asset.sym] = Math.max(0.1, stockPrices[asset.sym]*factor);
  priceHistory[asset.sym].push(stockPrices[asset.sym]);
  toast(hype ? '📈 '+asset.sym+' взлетел на хайпе!' : '📉 '+asset.sym+' рухнул на панике!');
  log(hype ? '📈 Рыночный хайп: '+asset.sym+' резко подорожал' : '📉 Обвал рынка: '+asset.sym+' резко упал в цене');
}
function renderEvents(){
  const card = document.getElementById('events-card');
  const section = document.getElementById('events-section');
  if(!card || !section) return;
  if(!state.activeEvents.length){ section.style.display = 'none'; card.innerHTML = ''; return; }
  section.style.display = '';
  const icons = {hack:'🦹', downtime:'⚠️', viral:'🔥', blackfriday:'🛍️', platformwar:'⚔️'};
  card.innerHTML = state.activeEvents.map(function(e){
    const secsLeft = Math.max(0, Math.round((e.endsAt-Date.now())/1000));
    const secsId = 'ev-secs-'+e.id;
    if(e.type==='hack'){
      return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' Атака на «'+esc(e.siteName)+'»</div><div class="card-sub">Осталось ~<span id="'+secsId+'">'+secsLeft+'</span>с · доход −70%</div></div>'+
        '<button class="btn btn-red" style="flex:none;" onclick="payOffHack(\''+e.id+'\')">Откупиться '+fmt(e.payoff)+'</button></div>';
    }
    if(e.type==='downtime'){
      return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' Сбой на «'+esc(e.siteName)+'»</div><div class="card-sub">Осталось ~<span id="'+secsId+'">'+secsLeft+'</span>с · доход −50%</div></div>'+
        '<button class="btn btn-red" style="flex:none;" onclick="payOffDowntime(\''+e.id+'\')">Устранить '+fmt(e.payoff)+'</button></div>';
    }
    if(e.type==='platformwar'){
      const pctLoss = e.severity===2 ? 55 : 35;
      return '<div class="card glass" style="margin-bottom:8px;border-color:rgba(255,69,58,.25);">'+
        '<div class="card-title">'+icons[e.type]+' Война платформ: «'+esc(e.siteName)+'»</div>'+
        '<div class="card-sub">Осталось ~<span id="'+secsId+'">'+secsLeft+'</span>с · доход −'+pctLoss+'%'+(e.severity===2?' (конкурент усилил атаку)':'')+'</div>'+
        '<div class="btn-row">'+
          '<button class="btn btn-red btn-block" onclick="payOffPlatformWar(\''+e.id+'\')">Откупиться '+fmt(e.payoff)+'</button>'+
          (e.counterUsed?'':'<button class="btn btn-amber btn-block" onclick="counterPlatformWar(\''+e.id+'\')">Контратаковать '+fmt(e.counterCost)+'</button>')+
        '</div>'+
        '<div class="card-sub" style="margin-top:6px;">Или просто переждите — конфликт сам сойдёт на нет через ~<span id="'+secsId+'-b">'+secsLeft+'</span>с</div>'+
        '</div>';
    }
    const label = CATEGORY_META[e.category] ? CATEGORY_META[e.category].name : e.category;
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+label+'</div><div class="card-sub">Осталось ~<span id="'+secsId+'">'+secsLeft+'</span>с · доход '+(e.type==='viral'?'+60%':'+30%')+'</div></div></div>';
  }).join('');
}
// Cheap per-second countdown patch — updates only the "Осталось ~Хс" text
// nodes inside the events card without touching the surrounding buttons.
// Rebuilding the whole card's innerHTML every tick (the old behaviour)
// could destroy a button between a touchstart and touchend on mobile,
// silently swallowing taps on "Откупиться"/"Контратаковать". Full
// rebuilds (renderEvents()) still happen, but only right after the
// active-events list itself actually changes (trigger/cleanup/payoff).
function updateEventsLive(){
  if(!state.activeEvents.length) return;
  state.activeEvents.forEach(function(e){
    const secsLeft = Math.max(0, Math.round((e.endsAt-Date.now())/1000));
    const el = document.getElementById('ev-secs-'+e.id);
    if(el) el.textContent = secsLeft;
    const el2 = document.getElementById('ev-secs-'+e.id+'-b');
    if(el2) el2.textContent = secsLeft;
  });
}

/* ============================================================
   TAXES — daily bill per business category, paid manually from cash.
   ============================================================ */
function categoryIncomePerSec(category){
  let sum = 0;
  state.sites.forEach(site=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    if(type && type.category===category) sum += siteIncome(type, site);
  });
  return sum;
}
function ownedTaxCategories(){
  return TAX_CATEGORY_ORDER.filter(cat=>state.sites.some(s=>{
    const t = ALL_BUSINESS_TYPES.find(tt=>tt.id===s.typeId);
    return t && t.category===cat;
  }));
}
function totalTaxOwed(){
  if(!state.taxes) return 0;
  return Object.values(state.taxes.owed||{}).reduce((a,b)=>a+b,0);
}
// Called once per in-game day (from tick()'s day-rollover block).
function assessDailyTaxes(){
  if(!state.taxes) return;
  ownedTaxCategories().forEach(function(cat){
    const due = Math.round(categoryIncomePerSec(cat) * 86400 * state.taxes.rate);
    if(due <= 0) return;
    state.taxes.owed[cat] = (state.taxes.owed[cat]||0) + due;
    state.taxes.overdueDays[cat] = (state.taxes.overdueDays[cat]||0) + 1;
    if(state.taxes.overdueDays[cat] >= TAX_AUDIT_DAYS && !state.taxes.audited[cat]){
      state.taxes.audited[cat] = true;
      const label = CATEGORY_META[cat] ? L(CATEGORY_META[cat],'name') : cat;
      toast(`🧾 ${tr('Налоговая проверка','Tax audit')}: ${label}!`);
      log(`🧾 ${tr('Налоговая служба начала проверку категории','The tax authority opened an audit for category')} «${esc(label)}» — ${tr('доход снижен, пока долг не погашен','income is reduced until the debt is paid')}`);
      renderEvents();
    }
  });
}
function payTax(category){
  if(!state.taxes) return;
  const owed = Math.round(state.taxes.owed[category]||0);
  if(owed<=0) return;
  if(state.cash < owed){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= owed;
  state.taxes.owed[category] = 0;
  state.taxes.overdueDays[category] = 0;
  state.taxes.audited[category] = false;
  const label = CATEGORY_META[category] ? L(CATEGORY_META[category],'name') : category;
  log(`🧾 ${tr('Уплачены налоги','Taxes paid')}: «${esc(label)}» — ${fmt(owed)}`);
  toast(`🧾 ${tr('Налог уплачен','Tax paid')}: ${fmt(owed)}`);
  playSound('sell');
  save(); renderAll(); renderTaxCard(); refreshTaxModal();
}
function payAllTaxes(){
  const total = totalTaxOwed();
  if(total<=0) return;
  if(state.cash < total){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= total;
  Object.keys(state.taxes.owed).forEach(function(cat){ state.taxes.owed[cat]=0; state.taxes.overdueDays[cat]=0; state.taxes.audited[cat]=false; });
  log(`🧾 ${tr('Уплачены все налоги','All taxes paid')} — ${fmt(total)}`);
  toast(`🧾 ${tr('Все налоги уплачены','All taxes paid')}: ${fmt(total)}`);
  playSound('sell');
  save(); renderAll(); renderTaxCard(); refreshTaxModal();
}
function buildTaxHtml(){
  const cats = ownedTaxCategories();
  if(!cats.length){
    return `<p style="color:var(--dim);font-size:13px;">${tr('Пока нет сайтов, приносящих налогооблагаемый доход.','No sites generating taxable income yet.')}</p>`;
  }
  const total = totalTaxOwed();
  const rows = cats.map(function(cat){
    const meta = CATEGORY_META[cat];
    const owed = Math.round(state.taxes.owed[cat]||0);
    const overdue = state.taxes.overdueDays[cat]||0;
    const audited = !!state.taxes.audited[cat];
    return `<div class="card glass" style="margin-bottom:8px;${audited?'border-color:rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
      <div class="card-row">
        <div class="card-icon">${meta?meta.icon:'📁'}</div>
        <div style="flex:1">
          <div class="card-title">${meta?esc(L(meta,'name')):cat}</div>
          <div class="card-sub">${owed>0?`${tr('Долг','Owed')}: ${fmt(owed)}${overdue>0?' · '+overdue+' '+tr('дн.','d'):''}`:tr('Долгов нет','No debt')}${audited?' · 🧾 '+tr('проверка! доход −40%','audit! income −40%'):''}</div>
        </div>
      </div>
      ${owed>0?`<div class="btn-row"><button class="btn btn-red btn-block" ${state.cash<owed?'disabled':''} onclick="payTax('${cat}')">${tr('Уплатить','Pay')} ${fmt(owed)}</button></div>`:''}
    </div>`;
  }).join('');
  return `<p style="color:var(--dim);font-size:12.5px;margin-bottom:12px;">${tr(`Каждый игровой день с каждой категории сайтов начисляется налог ${Math.round(state.taxes.rate*100)}% от дневного дохода. Если не платить ${TAX_AUDIT_DAYS}+ дней подряд, категорию начинают проверять — доход падает, пока долг не закрыт.`,`Every in-game day, each category of sites accrues a ${Math.round(state.taxes.rate*100)}% tax on its daily income. Leave it unpaid ${TAX_AUDIT_DAYS}+ days in a row and the category gets audited — income drops until the debt is cleared.`)}</p>
    <div id="tax-rows">${rows}</div>
    ${total>0?`<div class="btn-row" style="margin-top:4px;"><button class="btn btn-outline btn-block" ${state.cash<total?'disabled':''} onclick="payAllTaxes()">${tr('Уплатить всё','Pay all')} — ${fmt(total)}</button></div>`:''}`;
}
function openTaxModal(){ openModal(`<h3>🧾 ${tr('Налоги','Taxes')}</h3><div id="tax-modal-body">${buildTaxHtml()}</div>`); }
function refreshTaxModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('tax-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildTaxHtml();
}
function renderTaxCard(){
  const sub = document.getElementById('tax-card-sub');
  if(!sub) return;
  const total = totalTaxOwed();
  const auditedCount = state.taxes && state.taxes.audited ? Object.values(state.taxes.audited).filter(Boolean).length : 0;
  if(total<=0) sub.textContent = tr('Долгов нет — всё оплачено','No debt — all paid up');
  else sub.textContent = `${tr('К уплате','Owed')}: ${fmt(total)}${auditedCount?' · 🧾 '+tr('проверка активна','audit active'):''}`;
}

/* ============================================================
   LOCAL LEADERBOARD — deterministic NPC "competitors".
   ============================================================ */
const NPC_NAMES = [
  {name:'Виктор Соколов', co:'Sokolov Digital'},
  {name:'Аня Лебедева',   co:'Lebedeva Labs'},
  {name:'Марк Штейн',     co:'Stein Ventures'},
  {name:'Дана Ким',       co:'Kim Interactive'},
  {name:'Рустам Ганиев',  co:'Ganiev Holdings'},
  {name:'Ольга Ким',      co:'OK Group'},
];
function generateNpcCompetitors(){
  return NPC_NAMES.map(function(n,i){
    return {
      name:n.name, co:n.co,
      netWorth: 400 + i*600 + Math.random()*800,
      growthRate: 0.03 + Math.random()*0.05 + i*0.006,
    };
  });
}
function growNpcCompetitors(){
  if(!state.npcCompetitors) state.npcCompetitors = generateNpcCompetitors();
  state.npcCompetitors.forEach(function(n){
    const variance = 1 + (Math.random()-0.4)*0.06;
    n.netWorth *= (1 + n.growthRate) * variance;
  });
}
function buildLeaderboardHtml(){
  if(!state.npcCompetitors) state.npcCompetitors = generateNpcCompetitors();
  const rows = state.npcCompetitors.map(function(n){ return {name:n.name, co:n.co, nw:n.netWorth, isPlayer:false, isNpc:true}; });
  rows.push({name:state.ceoName, co:'Ваша империя', nw:netWorth(), isPlayer:true});
  rows.sort(function(a,b){ return b.nw-a.nw; });
  const html = rows.map(function(r,i){
    const buyoutBtn = r.isNpc ? (function(){
      const cost = buyoutCost(r.nw);
      return '<div class="btn-row" style="margin-top:8px;"><button class="btn btn-outline btn-block" '+(state.cash<cost?'disabled':'')+' onclick="buyoutCompetitor(\''+esc(r.name).replace(/'/g,"\\'")+'\')">Поглотить за '+fmt(cost)+'</button></div>';
    })() : '';
    return '<div class="card glass" style="margin-bottom:8px;padding:10px 12px;'+(r.isPlayer?'border:1px solid var(--blue);':'')+'">' +
      '<div class="card-row">' +
      '<div class="card-icon" style="font-size:15px;">#'+(i+1)+'</div>' +
      '<div style="flex:1"><div class="card-title">'+(r.isPlayer?'👑 ':'')+esc(r.name)+(r.isPlayer&&state.boosty.unlocked?' <span class="idle-badge" style="background:rgba(191,90,242,.16);color:var(--purple);border-color:rgba(191,90,242,.3);">🚀 Boosty CEO</span>':'')+'</div><div class="card-sub">'+esc(r.co)+'</div></div>' +
      '<div class="num c-green" style="font-weight:700;">'+fmt(r.nw)+'</div></div>'+
      buyoutBtn+
      '</div>';
  }).join('');
  const bonusPct = Math.round(acquisitionBonusTotal()*100);
  const bonusLine = bonusPct>0 ? ' Бонус от поглощений к доходу: <b class="c-green">+'+bonusPct+'%</b>.' : '';
  return '<h3>🏆 Рейтинг конкурентов</h3><p style="color:var(--dim);font-size:12px;margin-bottom:12px;">Локальный рейтинг — конкуренты растут раз в игровой день. Поглощение убирает конкурента из рейтинга навсегда и даёт постоянный бонус к доходу.'+bonusLine+'</p>'+html+
    '<div class="btn-row" style="margin-top:8px;"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>';
}
function openLeaderboardModal(){ bumpQuest('view_leaderboard'); openModal(buildLeaderboardHtml()); }
/* ---------- NPC BUYOUT — remove a competitor from the board for a permanent income bonus ---------- */
function buyoutCost(npcNetWorth){ return Math.round(npcNetWorth * 1.6 * difficultyCostMult()); }
function buyoutCompetitor(name){
  const idx = state.npcCompetitors.findIndex(function(n){ return n.name===name; });
  if(idx<0) return;
  const npc = state.npcCompetitors[idx];
  const cost = buyoutCost(npc.netWorth);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  state.npcCompetitors.splice(idx,1);
  if(!state.acquiredCompetitors) state.acquiredCompetitors = [];
  state.acquiredCompetitors.push(npc.name);
  log(`🤝 Поглощён конкурент «${esc(npc.name)}» (${esc(npc.co)}) за ${fmt(cost)} — доход +${Math.round(acquisitionBonusTotal()*100)}% навсегда`);
  toast(`🤝 «${npc.name}» поглощён!`);
  playSound('achievement');
  vibrateFeedback(20);
  renderAll(); save();
  openLeaderboardModal();
}

const MAX_EMPLOYEES_BASE = 3;
const EMPLOYEE_BASE_COST = 2100;
const EMPLOYEE_INCOME_BONUS = 0.11;

const STOCKS = [
  {sym:'NEXA',  name:'Nexa Search',      price:42,  vol:0.018, drift:0.0006, type:'stock'},
  {sym:'CLDX',  name:'CloudX Infra',     price:118, vol:0.014, drift:0.0009, type:'stock'},
  {sym:'BYTB',  name:'ByteBank Fintech', price:76,  vol:0.022, drift:0.0002, type:'stock'},
  {sym:'PIXL',  name:'Pixelon Social',   price:29,  vol:0.03,  drift:-0.0002,type:'stock'},
  {sym:'QNTX',  name:'Quantix AI',       price:205, vol:0.028, drift:0.0015, type:'stock'},
  {sym:'STRM',  name:'Streamr Media',    price:54,  vol:0.016, drift:0.0004, type:'stock'},
  {sym:'ORBT',  name:'Orbital Systems',  price:340, vol:0.02,  drift:0.0007, type:'stock'},
  {sym:'MTWB',  name:'MetaWeb Labs',     price:18,  vol:0.035, drift:-0.0004,type:'stock'},
];
const CRYPTO = [
  {sym:'BTX',  name:'BitX Coin',  price:420, vol:0.05,  drift:0.0012, type:'crypto'},
  {sym:'ETL',  name:'EtherLite',  price:180, vol:0.045, drift:0.001,  type:'crypto'},
  {sym:'DOGX', name:'DogeX',      price:0.8, vol:0.08,  drift:0.0,    type:'crypto'},
  {sym:'STBL', name:'StableUnit', price:1,   vol:0.004, drift:0.0,    type:'crypto'},
];
const ALL_ASSETS = [...STOCKS, ...CRYPTO];

const REAL_ESTATE = [
  {id:'garage',   name:'Гараж — родной город',        nameEn:'Garage — hometown',           icon:'🏠', cost:0,       bonus:0.00, single:true},
  {id:'cowork',   name:'Коворкинг — Остин',           nameEn:'Coworking — Austin',           icon:'🏬', cost:5000,    bonus:0.05},
  {id:'rack',     name:'Серверная стойка — Сингапур', nameEn:'Server rack — Singapore',      icon:'🖥️', cost:25000,   bonus:0.10},
  {id:'dc',       name:'Дата-центр — Дубай',          nameEn:'Data center — Dubai',          icon:'🏭', cost:120000,  bonus:0.18},
  {id:'hq',       name:'Штаб-квартира — Нью-Йорк',    nameEn:'Headquarters — New York',      icon:'🏢', cost:600000,  bonus:0.30},
  {id:'satellite',name:'Спутниковый узел — Рейкьявик',nameEn:'Satellite hub — Reykjavik',    icon:'🛰️', cost:3000000, bonus:0.45},
];

const RANKS = [
  {min:0,          title:'Новичок',            titleEn:'Newbie',              icon:'🥉'},
  {min:5000,       title:'Фрилансер',           titleEn:'Freelancer',          icon:'🥈'},
  {min:25000,      title:'Стартапер',           titleEn:'Startupper',          icon:'🥇'},
  {min:100000,     title:'Предприниматель',     titleEn:'Entrepreneur',        icon:'💼'},
  {min:500000,     title:'Бизнесмен',           titleEn:'Businessman',         icon:'🏆'},
  {min:2000000,    title:'Магнат',              titleEn:'Tycoon',              icon:'👑'},
  {min:10000000,   title:'Digital Tycoon',      titleEn:'Digital Tycoon',      icon:'🌍'},
  {min:50000000,   title:'Легенда Web Empire',  titleEn:'Web Empire Legend',   icon:'⭐'},
];

const LUXURY = [
  {id:'watch',   name:'Умные часы премиум',        nameEn:'Premium smartwatch',        icon:'⌚', cost:2000,    rep:5,   slot:'accessory'},
  {id:'car1',    name:'Электрокар Tesla-класса',   nameEn:'Tesla-class electric car',   icon:'🚗', cost:40000,  rep:20,  slot:'garage'},
  {id:'car2',    name:'Гиперкар',                  nameEn:'Hypercar',                   icon:'🏎️', cost:900000, rep:150, slot:'garage'},
  {id:'boat',    name:'Спортивный катер',          nameEn:'Sport boat',                 icon:'🚤', cost:250000, rep:60,  slot:'hangar'},
  {id:'yacht',   name:'Частная яхта',              nameEn:'Private yacht',              icon:'🛥️', cost:5000000,rep:400, slot:'hangar'},
  {id:'jet',     name:'Частный самолёт',           nameEn:'Private jet',                icon:'✈️', cost:20000000,rep:900,slot:'hangar'},
];

/* ---------- LIVE SITE PREVIEW CONFIG ---------- */
const NAME_POOLS = {
  blog:['TechTales','MindFeed','DevDiary','NightOwl','ByteNotes'],
  news:['DailyPulse','NewsWire','FactLine','TrueNorth','TheBrief'],
  shop:['ShopEase','CartNova','BuyBox','TradeHub','QuickBasket'],
  saas:['FlowSuite','TaskPilot','StackOps','CoreDesk','NimbusApp'],
  app:['PocketOS','SnapDo','TapFlow','MiniHub','GoApp'],
  forum:['ThreadZone','TalkNest','CircleUp','HiveMind','ChatPit'],
  market:['MegaMarket','TradePlaza','AllGoods','BazaarX','ShopVerse'],
  video:['StreamBox','ClipWave','ViewNest','PlayLoop','TubeDeck'],
  social:['Chatly','Loopin','Friendzy','Buzzly','Circlet'],
  devtool:['CodeForge','ShipFast','ApiNest','DevRail','BuildKit'],
  dating:['HeartSync','MatchLoop','TwoHearts','SwipeUp','CloseBy'],
  crypto_exchange:['CoinDeck','TradeChain','BlockSwap','CryptoNest','ChainPost'],
  ai:['MindForge','NeuroChat','BrainBox','SynthMind','CogniFlow'],
  ai_agent:['AutoMind','AgentForge','NeuroOps','TaskBrain','SynthAgent'],
  retail:['QuickPoint','BoxDrop','ParcelHub','GrabSpot','DropZone'],
  logistics:['CargoLine','FastRoute','ShipNet','TruckHub','RouteX'],
  restaurant:['FoodFly','MealJet','QuickBite','DishDash','TastyGo'],
  gym:['IronCore','FitZone','PulseGym','FlexHub','PowerBase'],
  bank:['PayCore','VaultX','FinLeap','MoneyNest','CoinKeep'],
  realty:['HomeNest','KeyBase','RealPeak','EstateHub','AddressOne'],
};
const SITE_VISUAL = {
  blog:{accent:'#8b5cf6',domainBase:'blog',heroTitle:'Заметки, которые читают',tagline:'Личный блог о технологиях и стартапах',navLabel:'Статьи',ctaLabel:'Подписаться',itemIcon:'📄',adText:'Продвижение статьи в топ ленты — от $12/день',
    items:[{t:'Как я масштабировал доход',s:'2.3K просмотров'},{t:'10 инструментов разработчика',s:'1.8K просмотров'},{t:'Обзор нового фреймворка',s:'4.1K просмотров'},{t:'История моего стартапа',s:'980 просмотров'},{t:'Гайд по продуктивности',s:'3.4K просмотров'},{t:'Интервью с экспертом',s:'1.2K просмотров'},{t:'Тренды рынка 2026',s:'5.6K просмотров'},{t:'Провал и рост: мой опыт',s:'2.9K просмотров'}]},
  shop:{accent:'#0a84ff',domainBase:'shop',heroTitle:'Всё нужное — в один клик',tagline:'Интернет-магазин с доставкой по всему миру',navLabel:'Каталог',ctaLabel:'В магазин',itemIcon:'🛍️',adText:'Скидка 20% на первый заказ для новых покупателей',
    items:[{t:'Беспроводные наушники',s:'$59'},{t:'Смарт-часы Pro',s:'$129'},{t:'Рюкзак для ноутбука',s:'$45'},{t:'Портативная колонка',s:'$39'},{t:'Настольная лампа LED',s:'$27'},{t:'Термокружка',s:'$18'},{t:'Держатель для телефона',s:'$12'},{t:'Powerbank 20000mAh',s:'$34'}]},
  saas:{accent:'#0a84ff',domainBase:'app',heroTitle:'Автоматизируйте рутину',tagline:'SaaS-платформа для команд и бизнеса',navLabel:'Тарифы',ctaLabel:'Попробовать',itemIcon:'⚡',adText:'Корпоративный тариф со скидкой 30% — только в этом месяце',
    items:[{t:'Автоматизация задач',s:'Core-модуль'},{t:'Аналитика в реальном времени',s:'Pro-модуль'},{t:'Интеграция с CRM',s:'Business'},{t:'Командные дашборды',s:'Team'},{t:'API для разработчиков',s:'Dev'},{t:'Ролевой доступ',s:'Security'},{t:'Отчёты и экспорт',s:'Insights'},{t:'Мобильное приложение',s:'Mobile'}]},
  social:{accent:'#ff375f',domainBase:'social',heroTitle:'Будь на связи с миром',tagline:'Социальная сеть нового поколения',navLabel:'Лента',ctaLabel:'Присоединиться',itemIcon:'💬',adText:'Продвижение поста: охват +50 000 показов',
    items:[{t:'«Запустил свой первый проект!»',s:'1.4K ❤️'},{t:'«Закат сегодня просто огонь»',s:'3.2K ❤️'},{t:'«Новый плейлист для работы»',s:'820 ❤️'},{t:'«5 лет в профессии — итоги»',s:'2.1K ❤️'},{t:'«Кто идёт на митап?»',s:'640 ❤️'},{t:'«Мой рабочий стол 2026»',s:'1.9K ❤️'},{t:'«Секрет продуктивности»',s:'2.7K ❤️'},{t:'«AMA: спрашивайте что угодно»',s:'4.5K ❤️'}]},
  ai:{accent:'#bf5af2',domainBase:'ai',heroTitle:'Спроси у ИИ — получи ответ',tagline:'AI-платформа для бизнеса и творчества',navLabel:'Модели',ctaLabel:'Начать чат',itemIcon:'🤖',adText:'API-доступ для разработчиков — первые 1000 запросов бесплатно',
    items:[{t:'Генерация текста',s:'GPT-модуль'},{t:'Анализ изображений',s:'Vision'},{t:'Голосовой ассистент',s:'Voice'},{t:'Код-ассистент',s:'Dev AI'},{t:'Перевод в реальном времени',s:'Translate'},{t:'Саммаризация документов',s:'Docs AI'},{t:'Генерация изображений',s:'Image AI'},{t:'Чат-бот для бизнеса',s:'Biz AI'}]},
  retail:{accent:'#ff9f0a',domainBase:'retail',heroTitle:'Забери заказ рядом с домом',tagline:'Сеть пунктов выдачи по всей стране',navLabel:'Пункты',ctaLabel:'Найти пункт',itemIcon:'📦',adText:'Открытие нового пункта выдачи — уже в вашем городе',
    items:[{t:'Пункт выдачи №1',s:'Центр города'},{t:'Пункт выдачи №2',s:'Спальный район'},{t:'Пункт выдачи №3',s:'ТЦ «Галерея»'},{t:'Пункт выдачи №4',s:'Вокзал'},{t:'Пункт выдачи №5',s:'Университет'},{t:'Пункт выдачи №6',s:'Бизнес-парк'},{t:'Пункт выдачи №7',s:'Аэропорт'},{t:'Пункт выдачи №8',s:'Новый район'}]},
  restaurant:{accent:'#ff453a',domainBase:'food',heroTitle:'Голоден? Уже везём',tagline:'Служба доставки еды из лучших ресторанов',navLabel:'Меню',ctaLabel:'Заказать',itemIcon:'🍔',adText:'Бесплатная доставка при заказе от $25',
    items:[{t:'Бургер классический',s:'$8'},{t:'Пицца Маргарита',s:'$12'},{t:'Суши-сет',s:'$22'},{t:'Паста Карбонара',s:'$11'},{t:'Салат Цезарь',s:'$9'},{t:'Том Ям',s:'$14'},{t:'Стейк Рибай',s:'$28'},{t:'Десерт Тирамису',s:'$7'}]},
  bank:{accent:'#40c8e4',domainBase:'bank',heroTitle:'Ваши деньги под контролем',tagline:'Цифровой банк без очередей и комиссий',navLabel:'Карты',ctaLabel:'Открыть счёт',itemIcon:'💳',adText:'Кэшбэк 5% на все покупки в первый месяц',
    items:[{t:'Дебетовая карта',s:'Кэшбэк 2%'},{t:'Кредитная карта',s:'0% на 3 мес'},{t:'Вклад «Доходный»',s:'12% годовых'},{t:'Перевод за границу',s:'Без комиссии'},{t:'Инвестиционный счёт',s:'Новинка'},{t:'Ипотека онлайн',s:'От 6.5%'},{t:'Бизнес-счёт',s:'Для ИП'},{t:'Страхование',s:'От $2/мес'}]},
  news:{accent:'#ff453a',domainBase:'news',heroTitle:'Главное — прямо сейчас',tagline:'Новостной портал с проверенными источниками',navLabel:'Рубрики',ctaLabel:'Читать',itemIcon:'🗞️',adText:'Баннер на главной — охват 80 000 читателей/день',
    items:[{t:'Рынки закрылись в плюсе',s:'12K просмотров'},{t:'Технологии: обзор недели',s:'8.4K просмотров'},{t:'Интервью с основателем стартапа',s:'6.1K просмотров'},{t:'Погода: похолодание в выходные',s:'3.9K просмотров'},{t:'Спорт: итоги матча',s:'5.2K просмотров'}]},
  app:{accent:'#30d158',domainBase:'app',heroTitle:'Всё под рукой',tagline:'Мобильное приложение для повседневных задач',navLabel:'Функции',ctaLabel:'Скачать',itemIcon:'📱',adText:'Push-уведомление партнёра — охват всей базы установок',
    items:[{t:'Быстрые заметки',s:'4.8★ в сторе'},{t:'Трекер привычек',s:'4.6★ в сторе'},{t:'Синхронизация с облаком',s:'Pro'},{t:'Виджеты на главный экран',s:'Новинка'},{t:'Тёмная тема',s:'Бесплатно'}]},
  forum:{accent:'#ff9f0a',domainBase:'forum',heroTitle:'Здесь всегда есть с кем поговорить',tagline:'Форум сообщества по интересам',navLabel:'Разделы',ctaLabel:'Вступить',itemIcon:'🗨️',adText:'Закреплённая тема партнёра на 7 дней',
    items:[{t:'Новичок: с чего начать?',s:'134 ответа'},{t:'Мега-тред вопросов и ответов',s:'980 ответов'},{t:'Флудилка недели',s:'2.3K ответов'},{t:'Гайд от модераторов',s:'88 ответов'},{t:'Конкурс на лучший пост',s:'210 участников'}]},
  market:{accent:'#0a84ff',domainBase:'market',heroTitle:'Тысячи продавцов — один маркетплейс',tagline:'Площадка для покупки и продажи от частных продавцов',navLabel:'Категории',ctaLabel:'Продавать',itemIcon:'🏬',adText:'Топ-размещение карточки товара — от $8/день',
    items:[{t:'Электроника от частников',s:'12.4K товаров'},{t:'Одежда и обувь',s:'8.9K товаров'},{t:'Товары для дома',s:'6.7K товаров'},{t:'Хендмейд',s:'2.1K товаров'},{t:'Авто и запчасти',s:'3.4K товаров'}]},
  video:{accent:'#ff375f',domainBase:'watch',heroTitle:'Смотри, снимай, зарабатывай',tagline:'Видеоплатформа с монетизацией для авторов',navLabel:'Каналы',ctaLabel:'Смотреть',itemIcon:'📹',adText:'Реклама перед роликом — охват 200K показов',
    items:[{t:'Как я построил цифровую империю',s:'340K просмотров'},{t:'Обзор нового гаджета',s:'128K просмотров'},{t:'Влог: неделя из жизни',s:'92K просмотров'},{t:'Топ-10 лайфхаков',s:'510K просмотров'},{t:'Прямой эфир: AMA',s:'64K зрителей'}]},
  devtool:{accent:'#8b5cf6',domainBase:'dev',heroTitle:'Инструменты для разработчиков',tagline:'API, SDK и CI/CD в одной панели',navLabel:'Документация',ctaLabel:'Начать',itemIcon:'🧰',adText:'Спонсорский блок в документации — топ-конверсия',
    items:[{t:'REST API',s:'99.98% uptime'},{t:'CI/CD пайплайны',s:'Enterprise'},{t:'SDK для 6 языков',s:'Open Source'},{t:'Логи и мониторинг',s:'Real-time'},{t:'Вебхуки',s:'Instant'}]},
  dating:{accent:'#ff375f',domainBase:'match',heroTitle:'Найди своего человека',tagline:'Платформа знакомств с умным алгоритмом совпадений',navLabel:'Анкеты',ctaLabel:'Смахнуть',itemIcon:'💌',adText:'Продвижение анкеты — вверх выдачи на 24 часа',
    items:[{t:'92% совпадение по интересам',s:'Новая анкета'},{t:'Видео-знакомство',s:'Premium'},{t:'Общие друзья: 4',s:'Рядом с вами'},{t:'История успеха пары недели',s:'❤️ 3.1K'},{t:'Ледоколы для разговора',s:'AI-подсказки'}]},
  crypto_exchange:{accent:'#ffd60a',domainBase:'exchange',heroTitle:'Торгуй криптовалютой 24/7',tagline:'Биржа с низкими комиссиями и быстрым выводом',navLabel:'Торги',ctaLabel:'Торговать',itemIcon:'🪙',adText:'Листинг нового токена — комиссия партнёра $50K',
    items:[{t:'BTC/USD',s:'Спред 0.02%'},{t:'ETH/USD',s:'Спред 0.03%'},{t:'Стейкинг',s:'До 14% годовых'},{t:'Фьючерсы',s:'Плечо x20'},{t:'P2P-обмен',s:'Без комиссии'}]},
  ai_agent:{accent:'#bf5af2',domainBase:'agents',heroTitle:'AI-агенты, которые работают за вас',tagline:'Автономные агенты для бизнес-процессов',navLabel:'Агенты',ctaLabel:'Запустить',itemIcon:'🧠',adText:'Корпоративная лицензия на флот агентов — от $50K/мес',
    items:[{t:'Агент поддержки клиентов',s:'24/7 автономно'},{t:'Агент-аналитик данных',s:'Отчёты каждый час'},{t:'Агент продаж',s:'Автообзвон лидов'},{t:'Агент-рекрутер',s:'Скрининг резюме'},{t:'Оркестратор агентов',s:'Enterprise'}]},
  logistics:{accent:'#ff9f0a',domainBase:'cargo',heroTitle:'Доставим что угодно, куда угодно',tagline:'Логистическая сеть для бизнеса и частных лиц',navLabel:'Маршруты',ctaLabel:'Отследить',itemIcon:'🚚',adText:'Приоритетная доставка для партнёров — от $15/заказ',
    items:[{t:'Экспресс-доставка по городу',s:'До 2 часов'},{t:'Межгород',s:'1-3 дня'},{t:'Складская логистика',s:'Fulfillment'},{t:'Международная доставка',s:'120 стран'},{t:'Трекинг в реальном времени',s:'Live GPS'}]},
  gym:{accent:'#30d158',domainBase:'fit',heroTitle:'Твоя лучшая форма начинается здесь',tagline:'Сеть фитнес-клубов премиум-класса',navLabel:'Клубы',ctaLabel:'Записаться',itemIcon:'🏋️',adText:'Реклама протеиновых батончиков в приложении клуба',
    items:[{t:'Клуб в центре города',s:'24/7'},{t:'Бассейн и SPA',s:'Premium'},{t:'Персональный тренер',s:'От $40/час'},{t:'Групповые занятия',s:'40+ программ'},{t:'Приложение с трекером',s:'Включено'}]},
  realty:{accent:'#0a84ff',domainBase:'realty',heroTitle:'Дом мечты уже здесь',tagline:'Агентство недвижимости полного цикла',navLabel:'Объекты',ctaLabel:'Смотреть',itemIcon:'🏘️',adText:'Топ-размещение объекта — от $30/день',
    items:[{t:'Пентхаус с видом на город',s:'$2.4M'},{t:'Загородный дом',s:'$860K'},{t:'Апартаменты в центре',s:'$540K'},{t:'Коммерческое помещение',s:'$1.1M'},{t:'Студия для инвестиций',s:'$210K'}]},
  hybrid_fulfillment:{accent:'#ff9f0a',domainBase:'fulfill',heroTitle:'От клика до двери — без задержек',tagline:'Fulfillment-империя: склад, доставка и продажи в одной системе',navLabel:'Логистика',ctaLabel:'Отследить заказ',itemIcon:'📦',adText:'Приоритетная полка на складе — от $40/день',
    items:[{t:'Автосортировка заказов',s:'99.2% точность'},{t:'Доставка день-в-день',s:'В 40 городах'},{t:'Умный склад',s:'Роботизирован'},{t:'Возвраты за 1 клик',s:'Новинка'}]},
  hybrid_media:{accent:'#8b5cf6',domainBase:'holding',heroTitle:'Голос, который слышат все',tagline:'Медиа-холдинг: контент и соцсеть в одной экосистеме',navLabel:'Каналы',ctaLabel:'Смотреть эфир',itemIcon:'📢',adText:'Кросс-промо между всеми площадками холдинга',
    items:[{t:'Собственная студия',s:'24/7 эфир'},{t:'Синдикация контента',s:'На все площадки'},{t:'Инфлюенсер-сеть',s:'120+ авторов'},{t:'Аналитика охвата',s:'Real-time'}]},
  hybrid_ai_saas:{accent:'#bf5af2',domainBase:'unicorn',heroTitle:'ИИ внутри каждого модуля',tagline:'AI-SaaS Unicorn: нейросеть, встроенная в бизнес-инструменты',navLabel:'Продукты',ctaLabel:'Открыть консоль',itemIcon:'🧬',adText:'Корпоративная лицензия на весь стек — от $200K/год',
    items:[{t:'AI-автопилот процессов',s:'Enterprise'},{t:'Генеративные отчёты',s:'Pro-модуль'},{t:'Самообучаемые модели',s:'Custom'},{t:'API для партнёров',s:'Открыт'}]},
  hybrid_fintech:{accent:'#ffd60a',domainBase:'empire',heroTitle:'Деньги под управлением одной системы',tagline:'Финтех-империя: биржа и банк под одной крышей',navLabel:'Финансы',ctaLabel:'Открыть счёт',itemIcon:'🏛️',adText:'Объединённый кэшбэк по всем продуктам холдинга',
    items:[{t:'Мультивалютный счёт',s:'Без комиссии'},{t:'Крипто + фиат в одном месте',s:'Instant swap'},{t:'Страхование вкладов',s:'До $250K'},{t:'Инвест-портфель',s:'Авто-балансировка'}]},
  hybrid_nextgen_social:{accent:'#ff375f',domainBase:'nextgen',heroTitle:'Знакомство, которое становится сообществом',tagline:'Соцсеть нового поколения: дейтинг и форум в одном пространстве',navLabel:'Лента',ctaLabel:'Присоединиться',itemIcon:'🌐',adText:'Продвижение профиля во всех разделах сразу',
    items:[{t:'Умные совпадения',s:'AI-подбор'},{t:'Тематические сообщества',s:'2.1K групп'},{t:'Ивенты для участников',s:'Каждую неделю'},{t:'Верификация профиля',s:'Ⓥ Проверено'}]},
  hybrid_superapp:{accent:'#30d158',domainBase:'superapp',heroTitle:'Всё, что нужно, в одном приложении',tagline:'Суперапп: доставка еды и цифровые сервисы вместе',navLabel:'Сервисы',ctaLabel:'Открыть',itemIcon:'🍔',adText:'Единая подписка на все сервисы суперприложения',
    items:[{t:'Доставка еды',s:'От 15 минут'},{t:'Такси и каршеринг',s:'В приложении'},{t:'Платежи и переводы',s:'Встроены'},{t:'Мини-приложения партнёров',s:'40+ сервисов'}]},
};
/* ---------- site preview layouts ----------
   Each business type renders its mockup with one of three page layouts
   instead of a single generic header+hero+grid template, so different
   niches actually look distinct inside the browser mockup. */
const SITE_LAYOUT = {
  blog:'feed', news:'feed', video:'feed', social:'feed', forum:'feed', dating:'feed',
  shop:'grid', market:'grid', retail:'grid', restaurant:'grid', realty:'grid',
  saas:'dash', app:'dash', devtool:'dash', ai:'dash', ai_agent:'dash',
  bank:'dash', crypto_exchange:'dash', logistics:'dash', gym:'dash',
  hybrid_fulfillment:'grid', hybrid_media:'feed', hybrid_ai_saas:'dash',
  hybrid_fintech:'dash', hybrid_nextgen_social:'feed', hybrid_superapp:'grid',
};
function siteLayout(typeId){ return SITE_LAYOUT[typeId] || 'grid'; }
/* Short live-notification pool per layout — used by spawnSiteNotification()
   to make the preview feel like an actual site getting real-time activity
   rather than a static screenshot. */
const SITE_NOTIF_POOL = {
  feed:['💬 Новый комментарий','❤️ Кто-то оценил пост','🔁 Репост от подписчика','👀 +1 к просмотрам в реальном времени'],
  grid:['🛒 Новый заказ оформлен','⭐ Оставлен новый отзыв','📦 Заказ передан в доставку','💳 Оплата прошла успешно'],
  dash:['📈 Новый пользователь зарегистрирован','⚙️ Задача выполнена автоматически','🔔 Новое событие в системе','✅ Синхронизация завершена'],
};
function spawnSiteNotification(site, typeId){
  const page = document.getElementById('sv-page');
  if(!page) return;
  const layout = siteLayout(typeId);
  const pool = SITE_NOTIF_POOL[layout] || SITE_NOTIF_POOL.grid;
  const msg = pool[Math.floor(Math.random()*pool.length)];
  const el = document.createElement('div');
  el.className = 'sp-notif';
  el.textContent = msg;
  page.appendChild(el);
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, 3400);
}
// A faint cursor that drifts across the mockup and "clicks" somewhere —
// cheap flavor that makes the preview read as a live, browsed site rather
// than a static screenshot. Uses CSS custom properties so the same
// keyframe animation can drive a different random path every time.
function spawnFakeCursor(){
  const page = document.getElementById('sv-page');
  if(!page) return;
  const w = page.clientWidth || 280, h = page.clientHeight || 280;
  const el = document.createElement('div');
  el.className = 'sp-cursor';
  el.textContent = '🖱️';
  el.style.setProperty('--sx', (10+Math.random()*(w-40))+'px');
  el.style.setProperty('--sy', (10+Math.random()*(h*0.5))+'px');
  el.style.setProperty('--ex', (10+Math.random()*(w-40))+'px');
  el.style.setProperty('--ey', (h*0.35+Math.random()*(h*0.5))+'px');
  page.appendChild(el);
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, 1750);
}
/* ---------- extra site-view detail: traffic sources + reviews ---------- */
const TRAFFIC_SOURCE_LABELS = ['Поиск','Соцсети','Прямые','Реклама'];
function trafficBreakdown(site){
  // deterministic pseudo-split driven by traffic/monetization levels, always sums to 100
  const seed = (site.tracks.traffic*7 + site.tracks.monetization*13 + site.tracks.infra*3) % 97;
  let a = 30 + (seed%25);
  let b = 20 + ((seed*3)%20);
  let c = 15 + ((seed*5)%15);
  let d = Math.max(5, 100-a-b-c);
  const total = a+b+c+d;
  return [a,b,c,d].map(v=>Math.round(v/total*100));
}
const REVIEW_POOL = [
  {name:'Алексей М.', stars:5, text:'Пользуюсь уже полгода — стабильно и быстро, никаких нареканий.'},
  {name:'Ирина К.',    stars:4, text:'В целом хорошо, но иногда хочется больше функций за те же деньги.'},
  {name:'Дмитрий С.',  stars:5, text:'Лучшее решение в своей категории, всем рекомендую!'},
  {name:'Ольга П.',    stars:4, text:'Удобно и понятно, поддержка отвечает быстро.'},
  {name:'Максим Р.',   stars:5, text:'Не думал, что найду что-то настолько удобное. Топ.'},
  {name:'Екатерина В.',stars:3, text:'Нормально, но были небольшие сбои на прошлой неделе.'},
];
function siteReviews(site){
  const seed = (site.name.length*31 + site.tracks.design*11) % REVIEW_POOL.length;
  const a = REVIEW_POOL[seed];
  const b = REVIEW_POOL[(seed+2)%REVIEW_POOL.length];
  return [a,b];
}
function designStage(lvl){
  if(lvl<3) return 1;
  if(lvl<5) return 2;
  if(lvl<8) return 3;
  if(lvl<12) return 4;
  return 5;
}
const STAGE_META = {
  1:{label:'В разработке',            icon:'🛠️'},
  2:{label:'Базовый лендинг',         icon:'🌱'},
  3:{label:'Растущий трафик',         icon:'📈'},
  4:{label:'Профессиональный дизайн', icon:'💎'},
  5:{label:'Флагманский продукт',     icon:'🚀'},
};
const CYRILLIC_MAP = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
function slugify(str){
  // Old version stripped anything outside [a-z0-9], which silently ate
  // Cyrillic renames entirely — a site renamed in Russian ended up with an
  // empty slug like "www.5.blog.io". Transliterate first, then clean up.
  const translit = (str||'site').toLowerCase().split('').map(ch=>CYRILLIC_MAP[ch]!==undefined?CYRILLIC_MAP[ch]:ch).join('');
  const slug = translit.replace(/[^a-z0-9]+/g,'');
  return slug || 'site';
}
function estimateVisitors(incomePerSec){ return Math.max(3, Math.round(incomePerSec*9 + Math.random()*14)); }
function pickSiteName(typeId){ const pool = NAME_POOLS[typeId] || ['Venture']; return pool[Math.floor(Math.random()*pool.length)]; }

/* ---------- STATE ---------- */
let state = null;
function defaultState(){
  return {
    cash: 450,
    day: 1,
    secondsElapsed: 0,
    netWorthHistory: [450],
    sites: [],            // {typeId, name, employees, tracks:{design,traffic,monetization,infra}}
    stocks: {},            // sym -> shares (stocks + crypto)
    estateOwned: {garage:1},
    luxuryOwned: {},
    propertyIndex: 1,
    lastRankIndex: 0,
    settings: {sound:true, notif:true, speed:1, sfxVolume:90, music:false, musicVolume:35, lang:'ru', pushNotif:false, theme:'dark', unlockedThemes:['dark','light']},
    boosty: {unlocked:false, code:null, theme:'default'},
    ceo: {avatar:'🧑\u200d💼', office:'default'},
    referral: {code:genReferralCode(), referredBy:null, invitesClaimed:0, bonusClaimed:false},
    devMode: false,
    dailyQuests: {date:null, quests:[], counters:{}},
    seasonEvent: {weekKey:null, progress:0, claimed:false},
    onboarding: {done:false, step:0},
    lifetimeStats: {totalEarned:0, maxIncomePerSec:0, netWorthByDay:[], daysTracked:0},
    prestige: {
      count:0, points:0,           // count raises trackMaxLevel(); points feed prestigeMultiplier()
      autoHire:false, autoUpgrade:false, // unlocked after 1st / 2nd rebirth respectively
      endless:false,               // set once the 3rd-rebirth ending has been seen and "Endless" was chosen
      endingSeen:false,
      runs:[],                     // history of past rebirths: {netWorth, day, points, bestSite}
      skillPoints:0,               // spendable currency for the CEO skill tree, earned alongside `points` on rebirth
      skills:{},                   // id -> true, once bought a CEO skill is permanent
    },
    activeEvents: [],               // random events currently in effect, see EVENT_TYPES
    npcCompetitors: generateNpcCompetitors(),
    acquiredCompetitors: [],        // names of NPCs bought out via buyoutCompetitor() — grants a permanent income bonus
    autoManagerUnlocked: false,     // one-time cash purchase, independent of the prestige tree; unlocks the per-site auto-manager toggle
    ceoName: 'Игрок',
    difficulty: 'normal',
    setupDone: false,           // true once the player has gone through new-game setup (name/difficulty)
    log: [],
    lastSeen: Date.now(),
    dailyStreak: {count:0, lastClaim:null},
    achievements: {},
    loan: {principal:0, rating:0, takenDay:null},  // rating grows with on-time full repayments — see loanRate()/maxLoanAmount()
    shorts: {},                    // sym -> {qty, entryPrice, margin} — bets against a stock/crypto
    finance: {
      incomeHist: [],               // rolling per-tick income samples (last 60s), for the dashboard chart
      expenseHist: [],              // rolling per-tick expense samples (last 60s)
      todayIncome: 0,
      todayExpenses: 0,
      dailyHistory: [],             // last 14 days: {day, income, expenses}
      lastTickCash: 450,
    },
    taxes: {
      rate: TAX_RATE,        // share of each category's daily income owed as tax
      owed: {},               // category -> amount currently owed
      overdueDays: {},        // category -> consecutive unpaid days
      audited: {},            // category -> true while under a tax audit penalty
    },
  };
}
let stockPrices = {};
let priceHistory = {};
let marketTab = 'stock';
ALL_ASSETS.forEach(s=>{stockPrices[s.sym]=s.price; priceHistory[s.sym]=[s.price];});

/* ---------- STORAGE ----------
   window.storage only exists inside Claude's artifact sandbox. Outside of it
   (Telegram Web App, itch.io, a plain browser) that API is undefined, so the
   old code silently failed every save/load — the game never actually
   persisted anywhere except inside Claude. We now fall back to
   localStorage (and to Telegram's CloudStorage when running inside a
   Telegram Mini App), so progress is saved wherever this file is hosted. */
function hasClaudeStorage(){ return typeof window!=='undefined' && window.storage && typeof window.storage.set==='function'; }
function hasTelegramStorage(){ return typeof window!=='undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage; }
function tgStorageSet(key,value){ return new Promise(res=>{ try{ window.Telegram.WebApp.CloudStorage.setItem(key,value,()=>res(true)); }catch(e){ res(false); } }); }
function tgStorageGet(key){ return new Promise(res=>{ try{ window.Telegram.WebApp.CloudStorage.getItem(key,(err,val)=>res(err?null:val)); }catch(e){ res(null); } }); }
async function storageSet(key, value){
  if(hasClaudeStorage()){
    try{ await window.storage.set(key, value, false); return true; }catch(e){ /* fall through to next tier */ }
  }
  try{ localStorage.setItem(key, value); return true; }catch(e){ /* localStorage can be blocked (private mode, etc) */ }
  if(hasTelegramStorage()) return tgStorageSet(key, value);
  return false;
}
async function storageGetRaw(key){
  if(hasClaudeStorage()){
    try{ const res = await window.storage.get(key, false); if(res && res.value) return res.value; }catch(e){ /* fall through */ }
  }
  try{ const v = localStorage.getItem(key); if(v) return v; }catch(e){ /* ignore */ }
  if(hasTelegramStorage()) return await tgStorageGet(key);
  return null;
}
async function save(){
  try{
    const ok = await storageSet(SAVE_KEY, JSON.stringify(state));
    const el = document.getElementById('save-info');
    if(el) el.lastChild.textContent = ok ? ('Сохранено · ' + new Date().toLocaleTimeString('ru-RU')) : 'Не удалось сохранить прогресс';
    const dot = document.getElementById('save-dot');
    if(dot && ok){
      dot.classList.remove('saved'); void dot.offsetWidth; dot.classList.add('saved');
    }
  }catch(e){ console.warn('save failed', e); }
}
async function load(){
  try{
    const raw = await storageGetRaw(SAVE_KEY);
    if(raw){ state = JSON.parse(raw); migrate(); return; }
  }catch(e){ /* no save yet, or corrupted save */ }
  state = defaultState();
}
function migrate(){
  if(Array.isArray(state.estateOwned)){ const m={}; state.estateOwned.forEach(id=>m[id]=1); state.estateOwned=m; }
  if(Array.isArray(state.luxuryOwned)){ const m={}; state.luxuryOwned.forEach(id=>m[id]=1); state.luxuryOwned=m; }
  if(typeof state.propertyIndex !== 'number') state.propertyIndex = 1;
  if(!state.estateOwned.garage) state.estateOwned.garage = 1;
  if(typeof state.lastRankIndex !== 'number') state.lastRankIndex = currentRankIndex(netWorth());
  if(!state.boosty) state.boosty = {unlocked:false, code:null};
  if(!state.boosty.unlocked && state.settings.speed > 1) state.settings.speed = 1;
  if(!state.boosty.theme) state.boosty.theme = 'default';
  if(typeof state.settings.sfxVolume !== 'number') state.settings.sfxVolume = 90;
  if(!state.dailyQuests) state.dailyQuests = {date:null, quests:[], counters:{}};
  if(!Array.isArray(state.dailyQuests.quests)) state.dailyQuests.quests = [];
  if(!state.dailyQuests.counters) state.dailyQuests.counters = {};
  if(!state.seasonEvent) state.seasonEvent = {weekKey:null, progress:0, claimed:false};
  if(!state.onboarding) state.onboarding = {done:true, step:0}; // existing saves: skip the tour, they're not new players
  if(!state.lifetimeStats) state.lifetimeStats = {totalEarned:0, maxIncomePerSec:0, netWorthByDay:[], daysTracked:0};
  if(typeof state.lifetimeStats.totalEarned !== 'number') state.lifetimeStats.totalEarned = 0;
  if(typeof state.lifetimeStats.maxIncomePerSec !== 'number') state.lifetimeStats.maxIncomePerSec = 0;
  if(!Array.isArray(state.lifetimeStats.netWorthByDay)) state.lifetimeStats.netWorthByDay = [];
  if(typeof state.lifetimeStats.daysTracked !== 'number') state.lifetimeStats.daysTracked = 0;
  if(!state.prestige) state.prestige = {count:0, points:0};
  if(typeof state.prestige.autoHire !== 'boolean') state.prestige.autoHire = false;
  if(typeof state.prestige.autoUpgrade !== 'boolean') state.prestige.autoUpgrade = false;
  if(typeof state.prestige.endless !== 'boolean') state.prestige.endless = false;
  if(typeof state.prestige.endingSeen !== 'boolean') state.prestige.endingSeen = false;
  if(!Array.isArray(state.prestige.runs)) state.prestige.runs = [];
  if(!Array.isArray(state.activeEvents)) state.activeEvents = [];
  if(!state.npcCompetitors) state.npcCompetitors = generateNpcCompetitors();
  if(!Array.isArray(state.acquiredCompetitors)) state.acquiredCompetitors = [];
  if(typeof state.autoManagerUnlocked !== 'boolean') state.autoManagerUnlocked = false;
  if(!state.ceoName) state.ceoName = 'Игрок';
  if(!state.difficulty) state.difficulty = 'normal';
  if(typeof state.setupDone !== 'boolean') state.setupDone = (state.sites.length > 0 || state.day > 1 || state.cash !== 800);
  if(typeof state.lastSeen !== 'number') state.lastSeen = Date.now();
  if(!state.dailyStreak) state.dailyStreak = {count:0, lastClaim:null};
  if(!state.achievements) state.achievements = {};
  if(typeof state.prestige.skillPoints !== 'number') state.prestige.skillPoints = 0;
  if(!state.prestige.skills) state.prestige.skills = {};
  if(!state.loan) state.loan = {principal:0, rating:0, takenDay:null};
  if(typeof state.loan.principal !== 'number') state.loan.principal = 0;
  if(typeof state.loan.rating !== 'number') state.loan.rating = 0;
  if(typeof state.loan.takenDay !== 'number' && state.loan.takenDay !== null) state.loan.takenDay = null;
  if(!state.shorts) state.shorts = {};
  if(!state.finance) state.finance = {incomeHist:[],expenseHist:[],todayIncome:0,todayExpenses:0,dailyHistory:[],lastTickCash:state.cash};
  if(!state.taxes) state.taxes = {rate:TAX_RATE, owed:{}, overdueDays:{}, audited:{}};
  if(typeof state.taxes.rate !== 'number') state.taxes.rate = TAX_RATE;
  if(!state.taxes.owed) state.taxes.owed = {};
  if(!state.taxes.overdueDays) state.taxes.overdueDays = {};
  if(!state.taxes.audited) state.taxes.audited = {};
  if(typeof state.settings.music !== 'boolean') state.settings.music = false;
  if(typeof state.settings.pushNotif !== 'boolean') state.settings.pushNotif = false;
  if(typeof state.settings.musicVolume !== 'number') state.settings.musicVolume = 35;
  if(!state.settings.lang) state.settings.lang = 'ru';
  if(!state.settings.theme) state.settings.theme = 'dark';
  if(!Array.isArray(state.settings.unlockedThemes)) state.settings.unlockedThemes = ['dark','light'];
  if(!state.settings.unlockedThemes.includes('dark')) state.settings.unlockedThemes.push('dark');
  if(!state.settings.unlockedThemes.includes('light')) state.settings.unlockedThemes.push('light');
  if(typeof DESIGN_THEMES!=='undefined'){
    const curTheme = DESIGN_THEMES.find(t=>t.id===state.settings.theme);
    if(curTheme && curTheme.boosty && !state.boosty.unlocked) state.settings.theme = 'dark';
  }
  if(!state.ceo) state.ceo = {avatar:'🧑\u200d💼', office:'default'};
  if(!state.ceo.avatar) state.ceo.avatar = '🧑\u200d💼';
  if(!state.ceo.office) state.ceo.office = 'default';
  if(!state.referral) state.referral = {code:genReferralCode(), referredBy:null, invitesClaimed:0, bonusClaimed:false};
  if(!state.referral.code) state.referral.code = genReferralCode();
  if(typeof state.referral.invitesClaimed !== 'number') state.referral.invitesClaimed = 0;
  if(typeof state.devMode !== 'boolean') state.devMode = false;
  if(!Array.isArray(state.finance.incomeHist)) state.finance.incomeHist = [];
  if(!Array.isArray(state.finance.expenseHist)) state.finance.expenseHist = [];
  if(typeof state.finance.todayIncome !== 'number') state.finance.todayIncome = 0;
  if(typeof state.finance.todayExpenses !== 'number') state.finance.todayExpenses = 0;
  if(!Array.isArray(state.finance.dailyHistory)) state.finance.dailyHistory = [];
  if(typeof state.finance.lastTickCash !== 'number') state.finance.lastTickCash = state.cash;
  state.sites.forEach(s=>{
    if(!s.name) s.name = pickSiteName(s.typeId);
    if(!s.tracks){
      s.tracks = {design:1,traffic:1,monetization:1,infra:1};
      delete s.level;
    }
    if(!s.aiModel) s.aiModel = {kind:null, ownLevel:0};
    if(typeof s.boostUntil !== 'number') s.boostUntil = 0;
    if(typeof s.trackCapBonus !== 'number') s.trackCapBonus = 0;
    if(typeof s.downtimeUntil !== 'number') s.downtimeUntil = 0;
    if(typeof s.merged !== 'number') s.merged = 0;
    if(typeof s.renovationStage !== 'number') s.renovationStage = 0;
    if(typeof s.renovationSalaryMult !== 'number') s.renovationSalaryMult = 1;
    if(typeof s.renovationIncomeMult !== 'number') s.renovationIncomeMult = 1;
    if(!s.uid) s.uid = genUid();
    if(typeof s.insured !== 'boolean') s.insured = false;
    if(typeof s.autoManager !== 'boolean') s.autoManager = false;
    if(typeof s.ipoed !== 'boolean') s.ipoed = false;
    if(!Array.isArray(s.incomeHistory)) s.incomeHistory = [];
    if(typeof s.lastUpgradeAt !== 'number') s.lastUpgradeAt = Date.now();
    // clamp any pre-existing levels down to the new cap so old saves don't
    // sit above what the UI now considers "max"
    const cap = trackMaxLevel(s);
    TRACK_ORDER.forEach(k=>{ if(s.tracks[k] > cap) s.tracks[k] = cap; });
  });
}

/* ---------- HELPERS ---------- */
function esc(str){
  const d = document.createElement('div');
  d.textContent = str==null ? '' : String(str);
  return d.innerHTML;
}
function fmt(n){
  const sign = n<0?'-':'';
  n = Math.abs(n);
  if(n>=1e12) return sign+'$'+(n/1e12).toFixed(2)+'T';
  if(n>=1e9)  return sign+'$'+(n/1e9).toFixed(2)+'B';
  if(n>=1e6)  return sign+'$'+(n/1e6).toFixed(2)+'M';
  if(n>=1e3)  return sign+'$'+(n/1e3).toFixed(2)+'K';
  return sign+'$'+n.toFixed(n<10?2:0);
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(()=>t.classList.remove('show'), 1900);
}
function log(msg){ pushLogSilent(msg); }
function pushLogSilent(msg){
  state.log.unshift({t: Date.now(), msg});
  state.log = state.log.slice(0,30);
  renderLog();
}

/* ---------- DERIVED VALUES ---------- */
function employeeCap(site){ return Math.min(15, MAX_EMPLOYEES_BASE + Math.floor((site.tracks.infra-1)/2)); }
function trackUpgradeCost(type, trackId, curLevel){
  return Math.round(type.baseCost * TRACK_META[trackId].costMult * Math.pow(TRACK_GROWTH_RATE, curLevel-1) * difficultyCostMult() * (hasSkill('cheap_tracks')?0.9:1));
}
// Cumulative cost of buying `qty` consecutive levels of a track at once,
// starting from curLevel — powers the x1/x5/x10/MAX multi-buy buttons.
function trackUpgradeCostMulti(type, trackId, curLevel, qty, costMult=1){
  let total = 0;
  for(let i=0;i<qty;i++) total += trackUpgradeCost(type, trackId, curLevel+i)*costMult;
  return Math.round(total);
}
// How many consecutive levels of a track the given cash can afford right now,
// never exceeding capLevel (the track's current soft cap) if provided.
function maxAffordableTrackLevels(type, trackId, curLevel, cash, capLevel, costMult=1){
  const room = (typeof capLevel === 'number') ? Math.max(0, capLevel-curLevel) : 999;
  let qty = 0, total = 0;
  while(qty < room){
    const c = trackUpgradeCost(type, trackId, curLevel+qty)*costMult;
    if(total + c > cash) break;
    total += c; qty++;
  }
  return qty;
}
function trackIncomeMultiplier(site){
  let mult = 1;
  TRACK_ORDER.forEach(key=>{
    const lvl = site.tracks[key];
    const growth = TRACK_META[key].incomeGrowth;
    mult *= (1 + (lvl-1)*growth);
  });
  return mult;
}
// Owning a second site of the same type gives a small cross-promo synergy
// bonus, but stacking many more saturates that market — each site beyond
// the 2nd eats into the type's own income a bit (cannibalization).
function sameTypeSynergyMult(site){
  const count = state.sites.filter(s=>s.typeId===site.typeId).length;
  if(count<=1) return 1;
  if(count===2) return 1.08;
  return Math.max(0.6, 1.08 - (count-2)*0.07);
}
function siteIncome(type, site){
  if(site.downtimeUntil && Date.now() < site.downtimeUntil) return 0; // post-merge downtime
  const empBonus = 1 + site.employees*EMPLOYEE_INCOME_BONUS;
  const aiBonus = type.category==='ai' || type.id==='hybrid_ai_saas' ? aiIncomeMult(site) : 1;
  const boostBonus = (site.boostUntil && Date.now() < site.boostUntil) ? 1.5 : 1;
  const eventBonus = eventSiteMultiplier(site, type);
  const synergyMult = sameTypeSynergyMult(site);
  const ipoMult = site.ipoed ? 0.5 : 1; // IPO'd sites keep running but their income is permanently halved after the payout
  const renoMult = (typeof site.renovationIncomeMult==='number') ? site.renovationIncomeMult : 1;
  return type.baseIncome * trackIncomeMultiplier(site) * empBonus * aiBonus * boostBonus * eventBonus * synergyMult * ipoMult * renoMult;
}
function employeeCost(site){ const renoSalary = (typeof site.renovationSalaryMult==='number') ? site.renovationSalaryMult : 1; return Math.round(EMPLOYEE_BASE_COST * Math.pow(1.35, site.employees) * difficultyCostMult() * (hasSkill('cheap_hire')?0.85:1) * renoSalary); }

function estateCount(id){ return state.estateOwned[id]||0; }
function luxuryCount(id){ return state.luxuryOwned[id]||0; }
function estateNextCost(e){ const n=estateCount(e.id); return Math.round(e.cost*Math.pow(1.55, n)); }
/* was Math.pow(1.55, n-1): the 2nd purchase of any property (n=1) landed on
   exponent 0, same price as the 1st. Every property's second unit was
   underpriced by a factor of 1.55x. Now matches luxuryNextCost's (correct)
   pattern of scaling from the very next purchase. */
function luxuryNextCost(l){ const n=luxuryCount(l.id); return Math.round(l.cost*Math.pow(1.4, n)); }
function estateBonusTotal(){ return Math.min(REAL_ESTATE.reduce((s,e)=>s+estateCount(e.id)*e.bonus,0), 4.0); }
function reputationTotal(){ return LUXURY.reduce((s,l)=>s+luxuryCount(l.id)*l.rep,0); }
function reputationBonus(){ return Math.min(reputationTotal()*0.0006, 1.5); }

// Sum of each owned hybrid's passive global bonus (see HYBRID_RECIPES.bonus.value).
function hybridBonusTotal(){
  let bonus = 0;
  state.sites.forEach(s=>{
    const r = HYBRID_RECIPES.find(rec=>rec.id===s.typeId);
    if(r) bonus += r.bonus.value;
  });
  return bonus;
}
// Each acquired NPC competitor (see buyoutCompetitor()) removes them from the
// leaderboard permanently and folds a slice of their former market into ours.
function acquisitionBonusTotal(){
  const n = state.acquiredCompetitors ? state.acquiredCompetitors.length : 0;
  return Math.min(n * 0.04, 0.24);
}
function totalIncomePerSec(){
  let base = 0;
  state.sites.forEach(site=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    base += siteIncome(type, site);
  });
  return base * (1+estateBonusTotal()) * (1+reputationBonus()) * (1+hybridBonusTotal()) * (1+acquisitionBonusTotal()) * prestigeMultiplier() * (hasSkill('income_boost')?1.05:1);
}
function stocksValue(){ let v=0; for(const sym in state.stocks){ v+=state.stocks[sym]*stockPrices[sym]; } return v; }
function estateValue(){ return REAL_ESTATE.reduce((s,e)=>s+estateCount(e.id)*e.cost*0.75*state.propertyIndex,0); }
function luxuryValue(){ return LUXURY.reduce((s,l)=>s+luxuryCount(l.id)*l.cost*0.55,0); }
// Sum of each open short position's collateral + unrealized P&L (see openShort()/closeShort()).
function shortsValue(){
  let v = 0;
  if(!state.shorts) return 0;
  for(const sym in state.shorts){
    const s = state.shorts[sym];
    if(!s || s.qty<=0) continue;
    const price = stockPrices[sym]!==undefined ? stockPrices[sym] : s.entryPrice;
    v += s.margin + (s.entryPrice-price)*s.qty;
  }
  return v;
}
function netWorth(){ return state.cash + stocksValue() + estateValue() + luxuryValue() + shortsValue() - (state.loan?state.loan.principal:0); }
function currentRank(nw){ let r=RANKS[0]; for(const rank of RANKS){ if(nw>=rank.min) r=rank; else break; } return r; }
function currentRankIndex(nw){ return RANKS.indexOf(currentRank(nw)); }

/* ---------- GAME LOOP ---------- */
function tick(){
  // ---- Income/expense tracking (for the "Доходы и расходы" chart) ----
  // Everything that changes state.cash between ticks other than this
  // tick's own passive income is either money the player earned through an
  // action (selling stock/sites, offline catch-up, streak bonuses...) or
  // money the player spent (buying/upgrading/hiring/loan repayments...).
  // Comparing cash to the snapshot taken at the end of the previous tick
  // captures all of that without having to instrument every single
  // purchase function individually.
  const manualDelta = state.cash - state.finance.lastTickCash;
  let tickIncome = Math.max(0, manualDelta);
  let tickExpense = Math.max(0, -manualDelta);

  const ipsNow = totalIncomePerSec();
  const income = ipsNow * state.settings.speed;
  state.cash += income;
  tickIncome += income;
  state.lifetimeStats.totalEarned += income;
  state.seasonEvent.earnedThisWeek = (state.seasonEvent.earnedThisWeek||0) + income;
  if(ipsNow > state.lifetimeStats.maxIncomePerSec) state.lifetimeStats.maxIncomePerSec = ipsNow;
  state.secondsElapsed += state.settings.speed;
  // netWorth() walks sites/stocks/estate/loans, so it's computed once here
  // and reused for every reader below instead of recalculating per reader —
  // this used to run 6-8x per tick (rank check, history sample, header,
  // dashboard...), which was one of the biggest per-second CPU costs.
  let nwNow = netWorth();
  if(state.secondsElapsed >= 86400){
    state.secondsElapsed = 0;
    state.finance.dailyHistory.push({day:state.day, income:state.finance.todayIncome, expenses:state.finance.todayExpenses});
    if(state.finance.dailyHistory.length>14) state.finance.dailyHistory.shift();
    state.finance.todayIncome = 0;
    state.finance.todayExpenses = 0;
    state.day++;
    state.lifetimeStats.netWorthByDay.push({day:state.day, nw:nwNow});
    if(state.lifetimeStats.netWorthByDay.length>200) state.lifetimeStats.netWorthByDay.shift();
    state.lifetimeStats.daysTracked++;
    growNpcCompetitors();
    assessDailyTaxes();
    if(activeScreen==='dash'){ renderFinanceCard(); renderTaxCard(); }
    refreshTaxModal();
  }
  ensureDailyQuests();
  ensureSeasonEvent();

  cleanupExpiredEvents();
  maybeTriggerRandomEvent();
  runAutoHire();
  runAutoUpgrade();
  runSiteAutoManagers();

  if(state.loan.principal > 0){
    const interest = state.loan.principal * loanRate() * (state.settings.speed/86400);
    state.loan.principal += interest;
    tickExpense += interest;
  }

  // Roll the finance samples + daily totals, then snapshot cash for next tick.
  state.finance.incomeHist.push(tickIncome);
  state.finance.expenseHist.push(tickExpense);
  if(state.finance.incomeHist.length>60) state.finance.incomeHist.shift();
  if(state.finance.expenseHist.length>60) state.finance.expenseHist.shift();
  state.finance.todayIncome += tickIncome;
  state.finance.todayExpenses += tickExpense;
  state.finance.lastTickCash = state.cash;

  // Keep a short rolling history of each site's own income/sec, used by the
  // sparkline chart in its site view (buildIncomeChartHtml()).
  state.sites.forEach(site=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    if(!Array.isArray(site.incomeHistory)) site.incomeHistory = [];
    site.incomeHistory.push(siteIncome(type, site));
    if(site.incomeHistory.length>40) site.incomeHistory.shift();
  });

  ALL_ASSETS.forEach(s=>{
    const shock = (Math.random()-0.5) * 2 * s.vol;
    let p = stockPrices[s.sym] * (1 + s.drift + shock);
    p = Math.max(0.1, p);
    stockPrices[s.sym] = p;
    const h = priceHistory[s.sym];
    h.push(p);
    if(h.length>40) h.shift();
  });

  state.propertyIndex *= (1 + 0.00004 * state.settings.speed);

  // Auto-hire/upgrade/managers and the loan/price updates above can change
  // cash, sites, and prices, so nwNow from earlier is stale by this point —
  // recompute once here and reuse for history, rank check, and rendering
  // below instead of calling netWorth() again for each of them.
  nwNow = netWorth();
  state.netWorthHistory.push(nwNow);
  if(state.netWorthHistory.length>60) state.netWorthHistory.shift();

  const rIdx = currentRankIndex(nwNow);
  if(rIdx > state.lastRankIndex){
    state.lastRankIndex = rIdx;
    const r = RANKS[rIdx];
    toast(`🎉 ${tr('Новый ранг','New rank')}: ${r.icon} ${L(r,'title')}!`);
    log(`🎉 ${tr('Повышение статуса: теперь вы —','Status upgrade: you are now —')} ${L(r,'title')}`);
    playSound('rankup');
    vibrateFeedback(20);
  }

  /* ---- Lightweight per-second UI update to prevent screen flicker ----
     Rebuilding whole card lists on a timer (old behaviour, every 1-3s)
     forced the browser to tear down and recreate dozens of
     backdrop-filter glass panels at once — visible as a recurring flash
     on the sites/market/estate/garage screens even when the person
     hadn't touched anything. None of these screens' underlying lists
     change on their own except for cash-driven affordability and (on
     the market screen) live prices, so we now only ever do cheap
     text/attribute patches on a timer. Full list rebuilds still happen,
     but only once, right after an action that actually changes that
     list's structure (buying something, hiring, etc.) — see renderAll(). */
  renderHeader(nwNow);
  renderTicker();
  updateEventsLive();
  if(activeScreen==='dash') renderDash(nwNow);
  updateAffordabilityAll();
  updateMarketLive();
  updateEstateLive();
  updateSiteViewLive();
  updateFinanceLive();
  state.lastSeen = Date.now();
  if(tickCount % 3 === 0) checkAchievements();
  tickCount++;
}
setInterval(tick, 1000);
setInterval(save, 15000);
document.addEventListener('visibilitychange', ()=>{
  document.body.classList.toggle('bg-paused', document.hidden);
  if(document.hidden){ pauseMusicLoop(); } else { resumeMusicLoopIfNeeded(); }
});

/* ---------- ACTIONS ---------- */
function buySite(typeId){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===typeId);
  const nw = netWorth();
  const owned = state.sites.filter(s=>s.typeId===typeId).length;
  // Card rendering treats a type as unlocked forever once you own one, even
  // if net worth later dips (e.g. right after a big purchase). This check
  // used to ignore "owned" and could reject a buy the UI showed as enabled.
  if(nw < type.unlockNetWorth && owned===0){ toast(tr('Ещё не открыто','Not unlocked yet')); playSound('error'); return; }
  if(state.sites.length >= maxSiteSlots(nw)){ toast(tr('Нет свободных слотов — растите активы','No free slots — grow your net worth')); playSound('error'); return; }
  if(state.sites.length>0 && !allOwnedSitesFullyRenovated()){
    toast(tr(`Сначала доведите текущие сайты до макс. обновления (эт. ${RENOVATION_MAX_STAGE}/${RENOVATION_MAX_STAGE})`, `First take your current sites to max renovation (stage ${RENOVATION_MAX_STAGE}/${RENOVATION_MAX_STAGE})`));
    playSound('error'); return;
  }
  const cost = Math.round(type.baseCost * Math.pow(1.6, owned) * Math.pow(SITE_COUNT_COST_GROWTH, state.sites.length) * difficultyCostMult());
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  state.sites.push({typeId, uid:genUid(), name:pickSiteName(typeId), employees:0, tracks:{design:1,traffic:1,monetization:1,infra:1}, aiModel:{kind:null, ownLevel:0}, boostUntil:0, insured:false, autoManager:false, ipoed:false, incomeHistory:[], lastUpgradeAt:Date.now(), renovationStage:0, renovationSalaryMult:1, renovationIncomeMult:1});
  bumpQuest('buy_site');
  log(`🚀 ${tr('Запущен новый проект','New project launched')}: ${L(type,'name')}`);
  toast(`${tr('Куплено','Bought')}: ${L(type,'name')}`);
  playSound('buy');
  vibrateFeedback(15);
  renderAll(); save();
}
function upgradeTrack(idx, trackId, qty=1){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const curLevel = site.tracks[trackId];
  const capLevel = trackMaxLevel(site);
  if(curLevel >= capLevel){ toast(tr('Макс. уровень — объедините сайт или переродитесь','Max level — merge the site or rebirth')); playSound('error'); return; }
  let n = qty==='max' ? maxAffordableTrackLevels(type, trackId, curLevel, state.cash, capLevel) : Math.min(Number(qty), capLevel-curLevel);
  if(n<=0){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  const cost = trackUpgradeCostMulti(type, trackId, curLevel, n);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  const bonus = Math.round(cost*0.06);
  state.cash += bonus;
  site.tracks[trackId] += n;
  site.lastUpgradeAt = Date.now();
  bumpQuest('upgrade_track', n);
  const meta = TRACK_META[trackId];
  const lvlTxt = n>1 ? `${tr('уровень','level')} ${site.tracks[trackId]} (+${n})` : `${tr('уровень','level')} ${site.tracks[trackId]}`;
  log(`${meta.icon} ${esc(site.name)}: ${L(meta,'name')} → ${lvlTxt}`);
  toast(`${meta.icon} ${L(meta,'name')} → ${tr('ур.','lvl')} ${site.tracks[trackId]}${n>1?' (x'+n+')':''} (+${fmt(bonus)} ${tr('бонус','bonus')})`);
  playSound('upgrade');
  if(cost > state.cash*3) vibrateFeedback(15);
  renderAll(); save();
  const sections = ['tracks'];
  if(trackId==='design') sections.push('page','reviews','stagepill');
  else if(trackId==='traffic') sections.push('page','traffic');
  else if(trackId==='infra') sections.push('employees');
  else if(trackId==='monetization') sections.push('page');
  refreshSiteViewSections(idx, sections);
  if(openSiteIdx===idx) spawnSvBurst();
}
/* ---------- SITE MERGING (two sites of the same type) ---------- */
function siteAtMaxTrack(site){ return TRACK_ORDER.some(k=>site.tracks[k] >= trackMaxLevel(site)); }
function mergeCandidates(idx){
  const site = state.sites[idx];
  if(!site || !siteAtMaxTrack(site)) return [];
  return state.sites
    .map((s,i)=>({s,i}))
    .filter(({s,i})=>i!==idx && s.typeId===site.typeId && siteAtMaxTrack(s));
}
function mergeCost(idx){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===state.sites[idx].typeId);
  return Math.round(type.baseCost * MERGE_COST_MULT * (hasSkill('cheap_merge')?0.7:1));
}
function openMergeModal(idx){
  const cands = mergeCandidates(idx);
  if(!cands.length){ toast(tr('Нужен второй сайт того же типа на макс. уровне трека','Need a second site of the same type at max track level')); return; }
  const a = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===a.typeId);
  const cost = mergeCost(idx);
  const rows = cands.map(({s,i})=>{
    const preview = TRACK_ORDER.map(k=>`${TRACK_META[k].icon}${Math.round((a.tracks[k]+s.tracks[k])/2)+2}`).join(' ');
    return `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-title">${esc(s.name)}</div>
      <div class="card-sub">${tr('Итоговые треки','Resulting tracks')}: ${preview}</div>
      <div class="btn-row"><button class="btn btn-violet btn-block" ${state.cash<cost?'disabled':''} onclick="mergeSites(${idx},${i})">${tr('Слить за','Merge for')} ${fmt(cost)}</button></div>
    </div>`;
  }).join('');
  openModal(`<h3>🔗 ${tr('Объединить','Merge')} «${esc(a.name)}»</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">${tr(`Второй сайт исчезнет, слот освободится. Объединённый сайт получит +${MERGE_CAP_BONUS} к потолку уровня трека и уйдёт в простой на ${Math.round(MERGE_DOWNTIME_MS/1000)}с без дохода.`,`The second site will disappear, freeing up a slot. The merged site gets +${MERGE_CAP_BONUS} to its track level cap and goes idle for ${Math.round(MERGE_DOWNTIME_MS/1000)}s with no income.`)}</p>
    ${rows}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Отмена')}</button></div>`);
}
function mergeSites(idx, otherIdx){
  const a = state.sites[idx], b = state.sites[otherIdx];
  if(!a || !b || a.typeId!==b.typeId || !siteAtMaxTrack(a) || !siteAtMaxTrack(b)){ toast(tr('Слияние недоступно','Merge unavailable')); return; }
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===a.typeId);
  const cost = mergeCost(idx);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  TRACK_ORDER.forEach(k=>{ a.tracks[k] = Math.round((a.tracks[k]+b.tracks[k])/2) + 2; });
  a.employees = Math.min(employeeCap(a), a.employees + b.employees);
  const aScore = !a.aiModel||!a.aiModel.kind ? 0 : (a.aiModel.kind==='licensed' ? 0.5 : a.aiModel.ownLevel);
  const bScore = !b.aiModel||!b.aiModel.kind ? 0 : (b.aiModel.kind==='licensed' ? 0.5 : b.aiModel.ownLevel);
  if(bScore > aScore) a.aiModel = JSON.parse(JSON.stringify(b.aiModel));
  a.trackCapBonus = (a.trackCapBonus||0) + MERGE_CAP_BONUS;
  a.merged = (a.merged||0) + 1;
  a.downtimeUntil = Date.now() + MERGE_DOWNTIME_MS;
  closeModal();
  const wasOpenIdx = openSiteIdx;
  state.sites.splice(otherIdx, 1);
  const newIdx = state.sites.indexOf(a);
  log(`🔗 ${tr('Слияние','Merge')}: «${esc(a.name)}» ${tr('поглотил второй','absorbed the second')} ${esc(L(type,'name'))} — ${tr('потолок уровня вырос на','level cap increased by')} ${MERGE_CAP_BONUS}`);
  toast(`${tr('Слияние завершено','Merge complete')} — ${L(type,'name')} ${tr('эволюционировал','evolved')} 🚀`);
  playSound('achievement');
  vibrateFeedback(25);
  save();
  if(wasOpenIdx===idx || wasOpenIdx===otherIdx){ openSiteIdx = null; openSiteView(newIdx); }
  renderAll();
}

/* ---------- HYBRID CRAFTING (recipes across categories) ---------- */
function eligibleHybridRecipes(idx){
  const site = state.sites[idx];
  if(!site) return [];
  const hybridCount = state.sites.filter(s=>HYBRID_RECIPES.some(r=>r.id===s.typeId)).length;
  if(hybridCount >= MAX_HYBRIDS) return [];
  const minTrack = Math.min(...TRACK_ORDER.map(k=>site.tracks[k]));
  const out = [];
  HYBRID_RECIPES.forEach(r=>{
    if(r.aId!==site.typeId && r.bId!==site.typeId) return;
    const partnerTypeId = r.aId===site.typeId ? r.bId : r.aId;
    const partnerIdx = state.sites.findIndex((s,i)=>i!==idx && s.typeId===partnerTypeId);
    if(partnerIdx===-1) return;
    const partner = state.sites[partnerIdx];
    const partnerMinTrack = Math.min(...TRACK_ORDER.map(k=>partner.tracks[k]));
    if(minTrack>=r.requiredTrackLevel && partnerMinTrack>=r.requiredTrackLevel) out.push({recipe:r, partnerIdx});
  });
  return out;
}
function craftHybrid(idx, partnerIdx, recipeId){
  const recipe = HYBRID_RECIPES.find(r=>r.id===recipeId);
  const a = state.sites[idx], b = state.sites[partnerIdx];
  if(!recipe || !a || !b){ toast(tr('Рецепт недоступен','Recipe unavailable')); return; }
  const hybridCount = state.sites.filter(s=>HYBRID_RECIPES.some(r=>r.id===s.typeId)).length;
  if(hybridCount >= MAX_HYBRIDS){ toast(`Лимит гибридов: ${MAX_HYBRIDS}`); return; }
  const cost = Math.round(recipe.baseCost*0.5);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  const newTracks = {};
  TRACK_ORDER.forEach(k=>{ newTracks[k] = Math.max(a.tracks[k], b.tracks[k]); });
  const newSite = {
    typeId: recipe.id,
    uid: genUid(),
    name: recipe.name,
    employees: 0, // capped below, once tracks/infra for the new hybrid are set
    tracks: newTracks,
    aiModel: {kind:null, ownLevel:0},
    boostUntil: 0,
    trackCapBonus: Math.max(a.trackCapBonus||0, b.trackCapBonus||0),
    downtimeUntil: 0,
    merged: 0,
    renovationStage: 0,
    renovationSalaryMult: 1,
    renovationIncomeMult: 1,
  };
  newSite.employees = Math.min(employeeCap(newSite), a.employees + b.employees);
  closeSiteView(); closeModal();
  const hi = Math.max(idx, partnerIdx), lo = Math.min(idx, partnerIdx);
  state.sites.splice(hi,1);
  state.sites.splice(lo,1);
  state.sites.push(newSite);
  log(`🧬 Собран гибрид: ${recipe.icon} ${recipe.name}`);
  toast(`Новый бизнес: ${recipe.name}!`);
  playSound('achievement');
  vibrateFeedback(25);
  renderAll(); save();
}
function openRecipeBookModal(){
  const built = state.sites.filter(s=>HYBRID_RECIPES.some(r=>r.id===s.typeId)).map(s=>s.typeId);
  const rows = HYBRID_RECIPES.map(r=>{
    const typeA = ALL_BUSINESS_TYPES.find(t=>t.id===r.aId);
    const typeB = ALL_BUSINESS_TYPES.find(t=>t.id===r.bId);
    const done = built.includes(r.id);
    return `<div class="card glass" style="opacity:${done?1:0.55};margin-bottom:8px;">
      <div class="card-title">${r.icon} ${r.name} ${done?'✅':''}</div>
      <div class="card-sub">${typeA?typeA.name:r.aId} + ${typeB?typeB.name:r.bId} · оба трека ≥ ур.${r.requiredTrackLevel}</div>
      <div class="card-sub">${r.desc}</div>
    </div>`;
  }).join('');
  openModal(`<h3>📖 Книга рецептов</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">Одновременно можно держать не больше ${MAX_HYBRIDS} гибридов. Активно сейчас: ${built.length}/${MAX_HYBRIDS}.</p>
    ${rows}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>`);
}

function buyLicensedAI(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(site.aiModel.kind){ toast(tr('Модель уже подключена','Model already connected')); return; }
  const cost = aiModelCost(type,'licensed',0);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.aiModel = {kind:'licensed', ownLevel:0};
  log(`💳 ${esc(site.name)}: подключена лицензированная нейросеть партнёра`);
  toast(`Лицензия подключена: +${Math.round(AI_LAB.licensed.bonus*100)}% к доходу`);
  renderAll(); save();
  refreshSiteViewSections(idx, ['ailab']);
  if(openSiteIdx===idx) spawnSvBurst();
}
function developOwnAI(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(site.aiModel.kind==='licensed'){ toast(tr('Уже используется лицензия — своя модель недоступна','A license is already in use — in-house model unavailable')); return; }
  if(site.aiModel.kind==='own' && site.aiModel.ownLevel>=AI_LAB.own.maxLevel){ toast(tr('Максимальный уровень модели достигнут','Maximum model level reached')); return; }
  const cost = aiModelCost(type,'own', site.aiModel.ownLevel);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.aiModel.kind = 'own';
  site.aiModel.ownLevel++;
  log(`🧬 ${esc(site.name)}: собственная нейросеть → уровень ${site.aiModel.ownLevel}`);
  toast(`Модель прокачана до ур. ${site.aiModel.ownLevel}`);
  renderAll(); save();
  refreshSiteViewSections(idx, ['ailab']);
  if(openSiteIdx===idx) spawnSvBurst();
}
const BOOST_COST_MULT = 27;
const BOOST_DURATION_MS = 60000;
function boostSite(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(site.boostUntil && Date.now() < site.boostUntil){ toast(tr('Кампания уже активна','Campaign already active')); return; }
  const cost = Math.round(type.baseCost * BOOST_COST_MULT);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.boostUntil = Date.now() + BOOST_DURATION_MS;
  log(`📢 ${esc(site.name)}: запущена маркетинговая кампания (+50% на 60 сек)`);
  toast(tr('Кампания запущена: +50% дохода на 60 сек','Campaign launched: +50% income for 60 sec'));
  renderAll(); save();
  if(openSiteIdx===idx) updateSiteViewLive();
}
/* ---------- INSURANCE — one-time premium, permanent protection ---------- */
function insuranceCost(site){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  return Math.round(type.baseCost * 0.6 * difficultyCostMult());
}
function buyInsurance(idx){
  const site = state.sites[idx];
  if(site.insured){ toast(tr('Уже застраховано','Already insured')); return; }
  const cost = insuranceCost(site);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.insured = true;
  log(`🛡️ Сайт «${esc(site.name)}» застрахован от атак и сбоев инфраструктуры`);
  toast(tr('Сайт застрахован','Site insured'));
  playSound('buy');
  renderAll(); save();
  refreshSiteViewSections(idx, ['insurance']);
}
/* ---------- IPO — one-time large payout, site stays but its income is permanently halved ---------- */
function ipoValue(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  let invested = type.baseCost;
  TRACK_ORDER.forEach(k=>{ for(let l=1; l<site.tracks[k]; l++) invested += trackUpgradeCost(type, k, l); });
  for(let e=0; e<site.employees; e++) invested += Math.round(EMPLOYEE_BASE_COST * Math.pow(1.35, e) * difficultyCostMult());
  const income = siteIncome(type, site);
  return Math.round((invested*0.9 + income*900) * 10);
}
function confirmIpoSite(idx){
  const site = state.sites[idx];
  if(!site || site.ipoed) return;
  if(renovationStage(site) < IPO_MIN_RENOVATIONS){ toast(tr(`Нужно минимум ${IPO_MIN_RENOVATIONS} обновления сайта для IPO`,`Needs at least ${IPO_MIN_RENOVATIONS} site renovations for an IPO`)); playSound('error'); return; }
  const value = ipoValue(idx);
  openModal(`<h3>📈 Вывести «${esc(site.name)}» на биржу?</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">Разовая крупная выплата <b>${fmt(value)}</b> кэшем. Сайт остаётся у вас и продолжает работать, но его доход падает вдвое навсегда — акции теперь у публичных инвесторов.</p>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">Отмена</button><button class="btn btn-cyan btn-block" onclick="ipoSite(${idx})">Вывести на IPO</button></div>`);
}
function ipoSite(idx){
  const site = state.sites[idx];
  if(!site || site.ipoed) return;
  if(renovationStage(site) < IPO_MIN_RENOVATIONS){ toast(tr(`Нужно минимум ${IPO_MIN_RENOVATIONS} обновления сайта для IPO`,`Needs at least ${IPO_MIN_RENOVATIONS} site renovations for an IPO`)); playSound('error'); return; }
  const value = ipoValue(idx);
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  state.cash += value;
  site.ipoed = true;
  log(`📈 IPO «${esc(site.name)}» (${type.name}): разовая выплата ${fmt(value)}, доход сайта -50% навсегда`);
  toast(`🎉 IPO проведено: +${fmt(value)}`);
  playSound('achievement');
  vibrateFeedback(20);
  closeModal();
  renderAll(); save();
  refreshSiteViewSections(idx, ['tracks','page','ipo']);
}
function renameSitePrompt(idx){
  const site = state.sites[idx];
  openModal(`
    <h3>Переименовать проект</h3>
    <input id="rename-input" class="set-select" style="width:100%;margin-bottom:14px;" maxlength="18" value="${esc(site.name)}" />
    <div class="btn-row">
      <button class="btn btn-outline btn-block" onclick="closeModal()">Отмена</button>
      <button class="btn btn-cyan btn-block" onclick="applyRename(${idx})">Сохранить</button>
    </div>
  `);
  setTimeout(()=>{ const inp=document.getElementById('rename-input'); if(inp) inp.focus(); },50);
}
function applyRename(idx){
  const inp = document.getElementById('rename-input');
  const val = (inp && inp.value.trim()) || '';
  if(val){ state.sites[idx].name = val.slice(0,18); log(`✏️ Проект переименован в «${val}»`); save(); }
  closeModal(); renderAll();
  refreshSiteViewSections(idx, ['title','page']);
}
function hireForSite(idx){
  const site = state.sites[idx];
  const cap = employeeCap(site);
  if(site.employees >= cap){ toast(tr('Нужна прокачка инфраструктуры для найма','Infrastructure upgrade needed to hire')); return; }
  const cost = employeeCost(site);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.employees++;
  bumpQuest('hire');
  log(`👤 Нанят сотрудник в проект ${esc(site.name)}`);
  playSound('buy');
  renderAll(); save();
  refreshSiteViewSections(idx, ['employees','renovation']);
}
function buyStock(sym, qty){
  const price = stockPrices[sym];
  const cost = price*qty;
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  state.stocks[sym] = (state.stocks[sym]||0)+qty;
  bumpQuest('buy_stock');
  state.seasonEvent.extraTrades = (state.seasonEvent.extraTrades||0)+1;
  log(`📈 ${tr('Куплено','Bought')} ${qty} ${tr('акций','shares of')} ${sym} ${tr('по','at')} ${fmt(price)}`);
  toast(`${tr('Куплено','Bought')} ${qty} × ${sym}`);
  playSound('buy');
  renderAll(); save();
}
function sellStock(sym, qty){
  const held = state.stocks[sym]||0;
  if(held < qty){ toast(tr('Недостаточно акций','Not enough shares')); return; }
  const price = stockPrices[sym];
  state.stocks[sym] -= qty;
  state.cash += price*qty;
  bumpQuest('sell_stock');
  state.seasonEvent.extraTrades = (state.seasonEvent.extraTrades||0)+1;
  log(`📉 ${tr('Продано','Sold')} ${qty} ${tr('акций','shares of')} ${sym} ${tr('по','at')} ${fmt(price)}`);
  toast(`${tr('Продано','Sold')} ${qty} × ${sym}`);
  playSound('sell');
  renderAll(); save();
}
/* ---------- SHORT SELLING — bet against a stock/crypto ----------
   Opening a short locks `qty*price` as margin (moved out of state.cash into
   the position itself, see shortsValue() in netWorth()). Closing it returns
   that margin plus/minus (entryPrice-currentPrice)*qty. */
function openShort(sym, qty){
  const price = stockPrices[sym];
  const margin = price*qty;
  if(state.cash < margin){ toast(tr('Недостаточно средств для маржи','Not enough cash for margin')); playSound('error'); return; }
  state.cash -= margin;
  if(!state.shorts) state.shorts = {};
  const existing = state.shorts[sym];
  if(existing && existing.qty>0){
    const totalQty = existing.qty+qty;
    existing.entryPrice = (existing.entryPrice*existing.qty + price*qty)/totalQty;
    existing.margin += margin;
    existing.qty = totalQty;
  } else {
    state.shorts[sym] = {qty, entryPrice:price, margin};
  }
  log(`📉 ${tr('Открыт шорт по','Opened short on')} ${sym}: ${qty} ${tr('шт по','units at')} ${fmt(price)}`);
  toast(`${tr('Шорт открыт','Short opened')}: ${sym} ×${qty}`);
  playSound('sell');
  renderAll(); save();
}
function closeShort(sym, qty){
  const s = state.shorts && state.shorts[sym];
  if(!s || s.qty<=0){ toast(tr('Нет открытой позиции','No open position')); return; }
  qty = Math.min(qty, s.qty);
  const price = stockPrices[sym];
  const pnl = (s.entryPrice - price)*qty;
  const marginBack = (s.margin/s.qty)*qty;
  state.cash += marginBack + pnl;
  s.margin -= marginBack;
  s.qty -= qty;
  if(s.qty<=0.0001) delete state.shorts[sym];
  log(`📈 ${tr('Закрыт шорт по','Closed short on')} ${sym}: ${qty} ${tr('шт','units')}, ${pnl>=0?tr('прибыль','profit'):tr('убыток','loss')} ${fmt(Math.abs(pnl))}`);
  toast(pnl>=0 ? `${tr('Шорт закрыт','Short closed')}: +${fmt(pnl)}` : `${tr('Шорт закрыт','Short closed')}: −${fmt(Math.abs(pnl))}`);
  playSound(pnl>=0?'sell':'error');
  renderAll(); save();
}
/* ---------- LOANS — cash advance against future income ---------- */
const LOAN_DAILY_RATE = 0.05; // 5%/game-day compounding on the outstanding principal — base rate before rating discount
const LOAN_GRACE_DAYS = 5;    // repay a loan in full within this many in-game days to count as "on time"
const LOAN_MAX_RATING = 10;
const LOAN_RATE_DISCOUNT_PER_RATING = 0.06; // -6% of the base rate per rating point, floor at 40% of base
const LOAN_CAP_BONUS_PER_RATING = 0.15;     // +15% loan cap per rating point
const LOAN_RATING_TIERS = [
  {min:0, label:'Без истории', labelEn:'No history'},
  {min:2, label:'Начинающий заёмщик', labelEn:'Beginner borrower'},
  {min:4, label:'Надёжный партнёр', labelEn:'Reliable partner'},
  {min:7, label:'Первоклассный клиент', labelEn:'First-class client'},
  {min:10,label:'VIP-заёмщик', labelEn:'VIP borrower'},
];
function loanRatingLabel(rating){
  let l = LOAN_RATING_TIERS[0];
  LOAN_RATING_TIERS.forEach(t=>{ if(rating>=t.min) l = t; });
  return L(l,'label');
}
function loanRate(){ const base = LOAN_DAILY_RATE * Math.max(0.4, 1 - (state.loan.rating||0)*LOAN_RATE_DISCOUNT_PER_RATING); return state.boosty.unlocked ? base*0.8 : base; }
function maxLoanAmount(){ const base = Math.round((totalIncomePerSec()*600 + netWorth()*0.1) * (1 + (state.loan.rating||0)*LOAN_CAP_BONUS_PER_RATING)); return state.boosty.unlocked ? Math.round(base*1.25) : base; }
function takeLoan(amount){
  amount = Math.round(amount);
  if(amount<=0) return;
  const cap = maxLoanAmount();
  if(state.loan.principal + amount > cap){ toast(tr('Превышен лимит кредита','Loan limit exceeded')); playSound('error'); return; }
  if(state.loan.principal === 0) state.loan.takenDay = state.day; // start of a fresh borrowing streak, for the on-time check
  state.loan.principal += amount;
  state.cash += amount;
  log(`🏦 ${tr('Взят кредит','Loan taken')}: ${fmt(amount)} (${tr('долг','debt')}: ${fmt(state.loan.principal)}, ${tr('ставка','rate')} ${(loanRate()*100).toFixed(1)}%${tr('/день','/day')})`);
  toast(`${tr('Кредит выдан','Loan issued')}: +${fmt(amount)}`);
  playSound('buy');
  renderAll(); save();
}
function repayLoan(amount){
  amount = Math.min(amount, state.loan.principal, state.cash);
  if(amount<=0){ toast(tr('Нечего погашать или не хватает средств','Nothing to repay or not enough cash')); return; }
  state.loan.principal -= amount;
  state.cash -= amount;
  if(state.loan.principal <= 0.01){
    state.loan.principal = 0;
    const onTime = state.loan.takenDay==null || (state.day - state.loan.takenDay) <= LOAN_GRACE_DAYS;
    if(onTime && state.loan.rating < LOAN_MAX_RATING){
      state.loan.rating++;
      log(`🏦 ${tr('Кредит погашен вовремя — кредитный рейтинг вырос','Loan repaid on time — credit rating improved')} (${state.loan.rating}/${LOAN_MAX_RATING}, «${loanRatingLabel(state.loan.rating)}»)`);
      toast(`📈 ${tr('Кредитный рейтинг','Credit rating')}: ${state.loan.rating}/${LOAN_MAX_RATING}`);
    } else {
      log(`🏦 ${tr('Кредит полностью погашен','Loan fully repaid')} (${tr('осталось','remaining')}: ${fmt(0)})`);
    }
    state.loan.takenDay = null;
  } else {
    log(`🏦 ${tr('Погашение кредита','Loan repayment')}: ${fmt(amount)} (${tr('осталось','remaining')}: ${fmt(state.loan.principal)})`);
  }
  toast(`${tr('Погашено','Repaid')}: ${fmt(amount)}`);
  playSound('sell');
  renderAll(); save();
}
function openLoanModal(){
  const cap = maxLoanAmount();
  const debt = state.loan.principal;
  const avail = Math.max(0, cap-debt);
  const rating = state.loan.rating||0;
  openModal(`
    <h3>🏦 ${tr('Кредит под будущий доход','Loan against future income')}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:6px;">${tr('Текущий долг','Current debt')}: ${fmt(debt)} · ${tr('Лимит','Limit')}: ${fmt(cap)} · ${tr('Ставка','Rate')} ${(loanRate()*100).toFixed(1)}%${tr('/игровой день','/game day')}</p>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">🏅 ${tr('Кредитный рейтинг','Credit rating')}: <b style="color:var(--text);">${rating}/${LOAN_MAX_RATING}</b> — «${loanRatingLabel(rating)}»${rating<LOAN_MAX_RATING?tr(`. Гасите кредиты полностью в течение ${LOAN_GRACE_DAYS} игровых дней, чтобы поднять рейтинг — это снижает ставку и повышает лимит.`,`. Repay loans in full within ${LOAN_GRACE_DAYS} in-game days to raise your rating — this lowers the rate and raises the limit.`):''}</p>
    <div class="btn-row">
      <button class="btn btn-violet btn-block" ${avail<1?'disabled':''} onclick="takeLoan(${Math.round(avail*0.25)});closeModal();">${tr('Взять 25%','Take 25%')}</button>
      <button class="btn btn-violet btn-block" ${avail<1?'disabled':''} onclick="takeLoan(${Math.round(avail)});closeModal();">${tr('Взять максимум','Take maximum')}</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-outline btn-block" ${debt<1?'disabled':''} onclick="repayLoan(${Math.round(debt*0.5)});closeModal();">${S('Погасить 50%')}</button>
      <button class="btn btn-outline btn-block" ${debt<1?'disabled':''} onclick="repayLoan(${Math.round(debt)});closeModal();">${S('Погасить всё')}</button>
    </div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>
  `);
}
function buyEstate(id){
  const e = REAL_ESTATE.find(x=>x.id===id);
  if(e.single && estateCount(id)>=1){ toast(tr('Уже куплено','Already purchased')); return; }
  const cost = estateNextCost(e);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  state.estateOwned[id] = estateCount(id)+1;
  log(`🏢 ${tr('Приобретена недвижимость','Real estate acquired')}: ${L(e,'name')} (×${state.estateOwned[id]})`);
  toast(`${tr('Куплено','Bought')}: ${L(e,'name')}`);
  playSound('buy');
  vibrateFeedback(15);
  renderAll(); save();
}
function buyLuxury(id){
  const l = LUXURY.find(x=>x.id===id);
  const cost = luxuryNextCost(l);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  state.luxuryOwned[id] = luxuryCount(id)+1;
  log(`✨ ${tr('Пополнение коллекции','Collection expanded')}: ${L(l,'name')} (×${state.luxuryOwned[id]})`);
  toast(`${tr('Куплено','Bought')}: ${L(l,'name')}`);
  playSound('buy');
  vibrateFeedback(15);
  renderAll(); save();
}
function toggleSwitch(key){
  state.settings[key] = !state.settings[key];
  document.getElementById('sw-notif').classList.toggle('on', state.settings[key]);
  save();
}

/* ---------- SOUND EFFECTS (synthesized, no external files) ---------- */
let audioCtx = null;
function ensureAudioCtx(){
  if(audioCtx) return audioCtx;
  try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ audioCtx = null; }
  return audioCtx;
}
const SOUND_PATTERNS = {
  buy:         [[520,0.07,'sine']],
  upgrade:     [[660,0.06,'triangle'],[880,0.08,'triangle']],
  sell:        [[420,0.09,'sawtooth'],[300,0.1,'sawtooth']],
  error:       [[160,0.12,'square']],
  achievement: [[523,0.09,'triangle'],[659,0.09,'triangle'],[784,0.16,'triangle']],
  rebirth:     [[440,0.14,'sine'],[660,0.14,'sine'],[880,0.24,'sine']],
  rankup:      [[600,0.08,'triangle'],[900,0.16,'triangle']],
};
function playSound(kind){
  if(!state.settings || !state.settings.sound) return;
  const vol = (typeof state.settings.sfxVolume==='number' ? state.settings.sfxVolume : 90) / 100;
  if(vol<=0) return;
  const ctx = ensureAudioCtx();
  if(!ctx) return;
  if(ctx.state==='suspended'){ ctx.resume().catch(()=>{}); }
  const seq = SOUND_PATTERNS[kind] || SOUND_PATTERNS.buy;
  let t = ctx.currentTime;
  seq.forEach(([freq,dur,type])=>{
    try{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16*vol, t+0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t+dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t+dur+0.02);
    }catch(e){}
    t += dur*0.85;
  });
}
/* ---------- LOCAL PUSH NOTIFICATIONS (opt-in) ----------
   Honest limitation: browser Notification API only works while this page's
   JS is still running (e.g. tab/PWA backgrounded on the phone). There is no
   backend push server here, so nothing can fire after the app is fully
   closed/killed — that would require a real push subscription + server. */
function togglePushNotif(){
  if(!state.settings.pushNotif && (!('Notification' in window) || Notification.permission==='denied')){
    toast(tr('Уведомления заблокированы в браузере','Notifications are blocked in the browser')); return;
  }
  if(!state.settings.pushNotif && 'Notification' in window && Notification.permission==='default'){
    Notification.requestPermission().then(perm=>{
      if(perm==='granted'){ state.settings.pushNotif = true; document.getElementById('sw-push-notif').classList.add('on'); save(); toast(tr('Уведомления включены','Notifications enabled')); }
    });
    return;
  }
  state.settings.pushNotif = !state.settings.pushNotif;
  document.getElementById('sw-push-notif').classList.toggle('on', state.settings.pushNotif);
  save();
}
let pushNotifiedStreakDay = null;
let pushNotifiedSeasonWeek = null;
function fireLocalNotification(title, body){
  try{ if('Notification' in window && Notification.permission==='granted') new Notification(title, {body}); }catch(e){}
}
function checkPushNotifConditions(){
  if(!state.settings || !state.settings.pushNotif || !document.hidden) return;
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  // Streak about to lapse: less than 2h left in the local day and today not yet claimed.
  const now = new Date();
  const today = dateKey(now);
  const msLeftToday = new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime() - now.getTime();
  if(state.dailyStreak && state.dailyStreak.lastClaim!==today && msLeftToday < 2*3600000 && pushNotifiedStreakDay!==today){
    pushNotifiedStreakDay = today;
    fireLocalNotification('🔥 Стрик скоро сгорит', `Зайдите в Web Empire в течение ${Math.max(1,Math.round(msLeftToday/60000))} мин, чтобы не потерять серию входов`);
  }
  // Weekly event ending soon and not claimed yet.
  ensureSeasonEvent();
  const wk = state.seasonEvent.weekKey;
  const theme = currentSeasonTheme(wk);
  const target = seasonTarget(theme);
  if(!state.seasonEvent.claimed && seasonProgressValue(theme)>=target && pushNotifiedSeasonWeek!==wk){
    pushNotifiedSeasonWeek = wk;
    fireLocalNotification('🎆 Награда недели готова', `«${theme.name}» выполнено — заберите награду в приложении`);
  }
}
setInterval(checkPushNotifConditions, 60000);
/* ---------- HAPTICS (mobile vibration on notable purchases/events) ---------- */
function vibrateFeedback(ms){
  try{ if(navigator.vibrate) navigator.vibrate(ms); }catch(e){}
}
function togglePrestigeSwitch(key){
  state.prestige[key] = !state.prestige[key];
  const elId = key==='autoHire' ? 'sw-auto-hire' : 'sw-auto-upgrade';
  document.getElementById(elId).classList.toggle('on', state.prestige[key]);
  toast(state.prestige[key] ? 'Включено' : 'Выключено');
  save();
}
function confirmReset(){
  openModal(`
    <h3>${S('Сбросить прогресс?')}</h3>
    <p style="color:var(--dim);font-size:13px;margin-bottom:16px;">${tr('Это действие необратимо. Все сайты, акции, недвижимость и статус будут потеряны.','This action is irreversible. All sites, stocks, real estate, and status items will be lost.')}</p>
    <div class="btn-row">
      <button class="btn btn-outline btn-block" onclick="closeModal()">${S('Отмена')}</button>
      <button class="btn btn-red btn-block" onclick="doReset()">${S('Сбросить')}</button>
    </div>
  `);
}
function doReset(){
  state = defaultState();
  state.npcCompetitors = generateNpcCompetitors();
  applyAccentTheme('default');
  ALL_ASSETS.forEach(s=>{stockPrices[s.sym]=s.price; priceHistory[s.sym]=[s.price];});
  closeModal(); save(); renderAll();
  toast(tr('Прогресс сброшен','Progress reset'));
}

/* ---------- MODAL ---------- */
function openModal(html){ document.getElementById('modal').innerHTML = html; document.getElementById('modal-bg').classList.add('show'); }
function closeModal(){ document.getElementById('modal-bg').classList.remove('show'); }
function openBuyModal(sym){
  const price = stockPrices[sym];
  const held = state.stocks[sym]||0;
  const short = (state.shorts && state.shorts[sym]) || null;
  openModal(`
    <h3>${sym} · ${fmt(price)}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">В портфеле: ${held} акций${short?` · Шорт: ${short.qty.toFixed(2)} шт (вход ${fmt(short.entryPrice)})`:''}</p>
    <div class="btn-row">
      <button class="btn btn-violet btn-block" onclick="buyStock('${sym}',1);closeModal();">Купить 1</button>
      <button class="btn btn-violet btn-block" onclick="buyStock('${sym}',10);closeModal();">Купить 10</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-outline btn-block" onclick="sellStock('${sym}',1);closeModal();" ${held<1?'disabled':''}>Продать 1</button>
      <button class="btn btn-outline btn-block" onclick="sellStock('${sym}',held);closeModal();" ${held<1?'disabled':''}>Продать всё</button>
    </div>
    <div class="section-title" style="margin-top:10px;">📉 Шорт — ставка на падение цены</div>
    <div class="btn-row">
      <button class="btn btn-red btn-block" ${state.cash<price?'disabled':''} onclick="openShort('${sym}',1);closeModal();">Шорт 1</button>
      <button class="btn btn-red btn-block" ${state.cash<price*10?'disabled':''} onclick="openShort('${sym}',10);closeModal();">Шорт 10</button>
    </div>
    ${short ? `<div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeShort('${sym}',${short.qty});closeModal();">Закрыть шорт (${short.qty.toFixed(2)} шт)</button></div>` : ''}
  `);
}

/* ---------- LIVE SITE VIEW ---------- */
let openSiteIdx = null;
let sviteAdvancedOpen = false; // remembered for the session so re-opening a site keeps the accordion state
function toggleSiteAdvanced(){
  sviteAdvancedOpen = !sviteAdvancedOpen;
  const wrap = document.getElementById('sv-advanced-wrap');
  const ic = document.getElementById('sv-advanced-toggle-ic');
  if(wrap) wrap.style.display = sviteAdvancedOpen ? '' : 'none';
  if(ic) ic.textContent = sviteAdvancedOpen ? '▴' : '▾';
}
let dashAdvancedOpen = false;
function toggleDashAdvanced(){
  dashAdvancedOpen = !dashAdvancedOpen;
  const wrap = document.getElementById('dash-advanced-wrap');
  const ic = document.getElementById('dash-advanced-toggle-ic');
  if(wrap) wrap.style.display = dashAdvancedOpen ? '' : 'none';
  if(ic) ic.textContent = dashAdvancedOpen ? '▴' : '▾';
}
let sitePreviewImmersive = false;
let sitePreviewDesktop = false; // toggles the mockup between phone-narrow and wide "desktop" framing
function toggleSitePreviewDevice(){
  sitePreviewDesktop = !sitePreviewDesktop;
  const frame = document.getElementById('sv-browser-frame');
  if(frame) frame.classList.toggle('desktop-mode', sitePreviewDesktop);
  const btn = document.getElementById('sv-device-btn');
  if(btn) btn.textContent = sitePreviewDesktop ? '💻' : '📱';
}
function openSiteView(idx){
  openSiteIdx = idx;
  bumpQuest('open_site');
  document.getElementById('site-view').innerHTML = buildSiteView(idx);
  document.getElementById('site-view-bg').classList.add('show');
}
function closeSiteView(){
  openSiteIdx = null;
  if(sitePreviewImmersive) exitSitePreviewFullscreen();
  document.getElementById('site-view-bg').classList.remove('show');
}
function toggleSitePreviewFullscreen(){
  if(sitePreviewImmersive) exitSitePreviewFullscreen();
  else enterSitePreviewFullscreen();
}
function enterSitePreviewFullscreen(){
  sitePreviewImmersive = true;
  const bg = document.getElementById('site-view-bg');
  if(bg) bg.classList.add('immersive');
  updateFsButton();
  // Best-effort real OS/browser fullscreen — silently ignored where the API
  // is unavailable or blocked (many embedded WebViews). The CSS-only
  // immersive layout above already gives a full-screen result either way.
  try{
    const req = bg && (bg.requestFullscreen || bg.webkitRequestFullscreen || bg.mozRequestFullScreen || bg.msRequestFullscreen);
    if(req){ const r = req.call(bg); if(r && r.catch) r.catch(()=>{}); }
  }catch(e){ /* ignore */ }
}
function exitSitePreviewFullscreen(){
  sitePreviewImmersive = false;
  const bg = document.getElementById('site-view-bg');
  if(bg) bg.classList.remove('immersive');
  updateFsButton();
  try{
    if(document.fullscreenElement || document.webkitFullscreenElement){
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if(exit){ const r = exit.call(document); if(r && r.catch) r.catch(()=>{}); }
    }
  }catch(e){ /* ignore */ }
}
function updateFsButton(){
  const btn = document.getElementById('sv-fs-btn');
  if(!btn) return;
  btn.textContent = sitePreviewImmersive ? '⤡' : '⛶';
  btn.title = sitePreviewImmersive ? 'Выйти из полноэкранного режима' : 'Во весь экран';
}
// Keep state in sync if the person exits real fullscreen via Esc/back gesture
// instead of our button.
function handleFsChange(){
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if(!isFs && sitePreviewImmersive) exitSitePreviewFullscreen();
}
document.addEventListener('fullscreenchange', handleFsChange);
document.addEventListener('webkitfullscreenchange', handleFsChange);
function updateSiteViewLive(){
  if(openSiteIdx===null || !state.sites[openSiteIdx]) return;
  const site = state.sites[openSiteIdx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const income = siteIncome(type, site) * (1+estateBonusTotal()) * (1+reputationBonus());
  const visEl = document.getElementById('sv-visitors');
  if(visEl) visEl.textContent = estimateVisitors(income)+' онлайн сейчас';
  spawnFloatingMoney(income);
  // Occasional live-activity toast, only once the site has actually
  // launched (stage>=2) — keeps a "под конструкцией" site quiet, and
  // caps at roughly one notification every ~7s on average so the mockup
  // doesn't get noisy. The fake cursor is on a separate roll so the two
  // effects don't always fire in the same tick.
  const stage = designStage(site.tracks.design);
  if(stage>=2 && Math.random()<0.14) spawnSiteNotification(site, site.typeId);
  else if(stage>=3 && Math.random()<0.12) spawnFakeCursor();
  updateSiteViewLight(site, type, income);
}
/* Every-second refresh only touches small text nodes and toggles
   `disabled` on affordability-gated buttons in place — no innerHTML
   replacement here, so nothing is torn down/recreated on a timer.
   Structural changes (a track leveling up, hiring, renaming, buying an
   AI model, starting a campaign) instead call refreshSiteViewSections()
   right where they happen, patching only the one or two sections whose
   markup actually needs to change. */
function updateSiteViewLight(site, type, income){
  const container = document.getElementById('site-view');
  if(!container) return;

  const incEl = document.getElementById('sv-income-val');
  if(incEl) incEl.textContent = fmt(income)+'/с';
  const pageIncEl = document.getElementById('sv-page-income');
  if(pageIncEl) pageIncEl.textContent = fmt(income)+'/с';

  // Boost countdown ticks every second and needs its own live text update.
  const boostActive = site.boostUntil && Date.now() < site.boostUntil;
  const boostCost = Math.round(type.baseCost * BOOST_COST_MULT);
  const boostBtn = document.getElementById('sv-boost-btn');
  if(boostBtn){
    if(boostActive){
      const secsLeft = Math.ceil((site.boostUntil-Date.now())/1000);
      boostBtn.textContent = `Активна ещё ${secsLeft}с`;
      boostBtn.disabled = true;
    } else {
      boostBtn.textContent = 'Запустить за '+fmt(boostCost);
      boostBtn.disabled = state.cash < boostCost;
    }
  }
  const boostBadge = document.getElementById('sv-boost-badge');
  if(boostBadge){
    if(boostActive){
      const secsLeft = Math.ceil((site.boostUntil-Date.now())/1000);
      boostBadge.style.display = '';
      boostBadge.textContent = `📢 x1.5 · ${secsLeft}с`;
    } else {
      boostBadge.style.display = 'none';
    }
  }
  // Income sparkline — cheap path-only patch, no rebuild.
  const chartPath = document.getElementById('sv-income-chart-path');
  if(chartPath && site.incomeHistory && site.incomeHistory.length>=2){
    chartPath.setAttribute('d', sparklinePath(site.incomeHistory, 280, 50));
  }
}
// Cash-only afford toggles across the whole app (buy-site cards, estate,
// garage, site-view tracks/AI-lab/hire buttons, etc.) — cheap attribute
// toggles, no DOM replacement, so this can safely run every tick without
// causing any flicker.
function updateAffordabilityAll(){
  document.querySelectorAll('.aff-btn[data-aff-cost]').forEach(btn=>{
    btn.disabled = state.cash < Number(btn.dataset.affCost);
  });
}
function spawnFloatingMoney(income){
  const page = document.getElementById('sv-page');
  if(!page || income<=0) return;
  const el = document.createElement('div');
  el.className = 'sp-float-money';
  el.textContent = '+'+fmt(income*state.settings.speed);
  el.style.left = (18+Math.random()*55)+'%';
  el.style.top = (28+Math.random()*22)+'%';
  page.appendChild(el);
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, 1750);
}
/* ---------- SITE VIEW: SECTION BUILDERS ----------
   Each section below is a pure function of `idx` that returns just the
   HTML for one part of the panel. buildSiteView() composes them for the
   initial open. After that, upgrades/purchases patch only the specific
   wrapper `<div id="sv-...">` whose data actually changed, instead of
   replacing the whole panel's innerHTML. Replacing everything at once
   forced the browser to tear down and recreate a dozen+ frosted-glass
   (`backdrop-filter`) cards simultaneously, which is what caused the
   visible black flash every time you upgraded something. */
function buildPageMockupHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const vis = SITE_VISUAL[type.id];
  const stage = designStage(site.tracks.design);
  const income = siteIncome(type, site) * (1+estateBonusTotal()) * (1+reputationBonus());
  const traffic = site.tracks.traffic;
  const monet = site.tracks.monetization;
  const uptime = Math.min(99.9, 90 + site.tracks.infra*1.3).toFixed(1);

  if(stage===1){
    return `<div class="sp-construction">
      <div class="big">🛠️</div>
      <div style="font-weight:700;color:#1a1d24;margin-bottom:6px;">Сайт в разработке</div>
      <div style="font-size:11.5px;">Прокачайте «Дизайн» до уровня 3, чтобы запустить публичную версию</div>
      <div class="sp-skel" style="width:70%"></div>
      <div class="sp-skel" style="width:50%"></div>
      <div class="sp-skel" style="width:60%"></div>
    </div>`;
  }
  const adsShown = monet>=3;
  const verified = monet>=6;
  const layout = siteLayout(type.id);
  const header = `
    <div class="sp-header" style="--site-accent:${vis.accent}">
      <div class="sp-logo">${type.icon} ${esc(site.name)}${verified?'<span class="sp-verified">✓ Verified</span>':''}</div>
      <div class="sp-navlinks">${stage>=3?`<span>${vis.navLabel}</span><span>О нас</span>`:''}</div>
      <button class="sp-cta">${vis.ctaLabel}</button>
    </div>`;
  const hero = `
    <div class="sp-hero">
      <h2>${vis.heroTitle}</h2>
      <p>${vis.tagline}</p>
      <div class="sp-live"><span class="sp-dot"></span><span id="sv-visitors">${estimateVisitors(income)} онлайн сейчас</span></div>
    </div>`;

  // Stage 2 = bare landing page: just the header + hero, nothing else
  // yet — a visibly different (and honest) "just launched" state instead
  // of immediately showing the full item grid at every stage past 1.
  if(stage===2){
    return `${header}${hero}
      <div style="padding:0 16px 18px;">
        <div class="sp-skel" style="width:85%"></div>
        <div class="sp-skel" style="width:65%"></div>
        <div class="sp-skel" style="width:75%"></div>
      </div>`;
  }

  const itemCount = Math.min(8, 1+traffic);
  // Several business types only have 5 sample items in their pool, so
  // raising "Трафик" past level 5 used to show the exact same static grid
  // forever — no visible reward for the upgrade. Cycle through the pool
  // instead so the grid still visibly grows with traffic level.
  const items = Array.from({length: Math.min(itemCount, vis.items.length*2)}, (_,i)=>vis.items[i % vis.items.length]);
  const photoStage = stage>=4; // richer visuals once the site is professionally designed

  let body;
  if(layout==='feed'){
    body = `<div class="sp-feed">
      ${items.map((it,i)=>`<div class="sp-feed-item">
        <div class="sp-feed-avatar"${photoStage?` style="background:linear-gradient(135deg,${vis.accent},#00000030)"`:''}>${vis.itemIcon}</div>
        <div class="sp-feed-body">
          <div class="sp-feed-title">${it.t}</div>
          <div class="sp-feed-meta">${it.s}</div>
        </div>
      </div>`).join('')}
    </div>`;
  } else if(layout==='dash'){
    const u1 = Math.max(1, Math.round(traffic*3.2 + monet*1.5));
    const u2 = Math.round(income*100)/100;
    // small deterministic bar-chart driven by traffic/monetization so it
    // visibly grows with those tracks instead of being purely decorative
    const bars = Array.from({length:7}, (_,i)=>{
      const seed = (traffic*13 + monet*7 + i*29) % 100;
      return 30 + Math.round(((seed + i*11) % 70));
    });
    body = `<div class="sp-dash-stats">
        <div class="sp-dash-stat"><div class="v">${u1}</div><div class="l">Активных польз.</div></div>
        <div class="sp-dash-stat"><div class="v">${uptime}%</div><div class="l">Аптайм</div></div>
        <div class="sp-dash-stat"><div class="v">$${u2}</div><div class="l">Доход/с</div></div>
      </div>
      <div class="sp-dash-chart">${bars.map(v=>`<div style="height:${v}%;background:${vis.accent}"></div>`).join('')}</div>
      <div class="sp-dash-list">
        ${items.slice(0,6).map(it=>`<div class="sp-dash-row"><span class="dot"></span><span style="flex:1;">${it.t}</span><span style="color:#8b93a7;">${it.s}</span></div>`).join('')}
      </div>`;
  } else {
    body = `<div class="sp-grid">
      ${items.map(it=>`<div class="sp-item">
        <div class="thumb"${photoStage?` style="background:linear-gradient(135deg,${vis.accent},#ffffff40)"`:''}>${vis.itemIcon}</div>
        <div class="t">${it.t}</div><div class="s">${it.s}</div>
      </div>`).join('')}
    </div>`;
  }

  // Stage 5 (flagship): fold a compact taste of social proof — traffic
  // split + one review — right into the mockup itself, not just in the
  // app-chrome cards below the browser frame, so the "real website" feels
  // like it has an actual audience once it's fully matured.
  let proof = '';
  if(stage>=5){
    const tsrc = trafficBreakdown(site);
    const rv = siteReviews(site)[0];
    proof = `<div class="sp-proof">
      <div class="sp-proof-traffic">
        ${TRAFFIC_SOURCE_LABELS.map((lbl,i)=>`<div class="sp-proof-bar" title="${lbl}: ${tsrc[i]}%"><div style="height:${Math.max(6,tsrc[i])}%;background:${vis.accent}"></div></div>`).join('')}
      </div>
      ${rv?`<div class="sp-proof-review">“${esc(rv.text)}” <b>— ${esc(rv.name)}</b> ${'★'.repeat(rv.stars)}</div>`:''}
    </div>`;
  }

  return `${header}${hero}${body}
    ${adsShown?`<div class="sp-ad">📢 <span>${vis.adText}</span></div>`:''}
    ${proof}
    ${stage>=5?`<div class="sp-footstats">
      <div><div class="v" id="sv-page-income">${fmt(income)}/с</div><div class="l">Доход</div></div>
      <div><div class="v">${uptime}%</div><div class="l">Аптайм</div></div>
      <div><span class="sp-badge">✓ Стабильно</span></div>
    </div>`:''}
  `;
}
function buildStagePillHtml(idx){
  const site = state.sites[idx];
  const meta = STAGE_META[designStage(site.tracks.design)];
  return `${meta.icon} ${meta.label}`;
}
function buildTracksHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const capLevel = trackMaxLevel(site);
  return TRACK_ORDER.map(key=>{
    const t = TRACK_META[key];
    const lvl = site.tracks[key];
    const atCap = lvl >= capLevel;
    const curInc = siteIncome(type, site);
    const testSite = JSON.parse(JSON.stringify(site));
    testSite.tracks[key] = Math.min(capLevel, testSite.tracks[key]+1);
    const newInc = siteIncome(type, testSite);
    const delta = newInc - curInc;
    if(atCap){
      return `<div class="card glass track-row">
        <div class="track-top">
          <div class="track-icon" style="background:${t.color}22;color:${t.color};">${t.icon}</div>
          <div style="flex:1">
            <div class="track-name">${t.name} <span class="track-lvl">Ур. ${lvl}/${capLevel}</span></div>
            <div class="track-desc">${t.desc}</div>
          </div>
        </div>
        <div class="track-maxplate">🔒 МАКС. УРОВЕНЬ — объедините сайт или переродитесь</div>
      </div>`;
    }
    const room = capLevel - lvl;
    const qty5 = Math.min(5, room);
    const qty10 = Math.min(10, room);
    const cost = trackUpgradeCost(type, key, lvl);
    const cost5 = trackUpgradeCostMulti(type, key, lvl, qty5);
    const cost10 = trackUpgradeCostMulti(type, key, lvl, qty10);
    const maxQty = maxAffordableTrackLevels(type, key, lvl, state.cash, capLevel);
    const maxCost = maxQty>0 ? trackUpgradeCostMulti(type, key, lvl, maxQty) : cost;
    return `<div class="card glass track-row">
      <div class="track-top">
        <div class="track-icon" style="background:${t.color}22;color:${t.color};">${t.icon}</div>
        <div style="flex:1">
          <div class="track-name">${t.name} <span class="track-lvl">Ур. ${lvl}/${capLevel}</span></div>
          <div class="track-desc">${t.desc}</div>
        </div>
        <div class="track-delta">+${fmt(delta)}/с</div>
      </div>
      <div class="qty-row">
        <button class="qty-btn aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="upgradeTrack(${idx},'${key}',1)"><span class="qn">×1</span><span class="qc">${fmt(cost)}</span></button>
        <button class="qty-btn aff-btn" data-aff-cost="${cost5}" ${(state.cash<cost5||qty5<1)?'disabled':''} onclick="upgradeTrack(${idx},'${key}',${qty5})"><span class="qn">×${qty5}</span><span class="qc">${fmt(cost5)}</span></button>
        <button class="qty-btn aff-btn" data-aff-cost="${cost10}" ${(state.cash<cost10||qty10<1)?'disabled':''} onclick="upgradeTrack(${idx},'${key}',${qty10})"><span class="qn">×${qty10}</span><span class="qc">${fmt(cost10)}</span></button>
        <button class="qty-btn qty-max aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="upgradeTrack(${idx},'${key}','max')"><span class="qn">МАКС${maxQty>1?' ×'+maxQty:''}</span><span class="qc">${maxQty>0?fmt(maxCost):'—'}</span></button>
      </div>
    </div>`;
  }).join('');
}
function buildAiLabHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(type.category!=='ai') return '';
  const am = site.aiModel || {kind:null, ownLevel:0};
  if(!am.kind){
    const licCost = aiModelCost(type,'licensed',0);
    const ownCost = aiModelCost(type,'own',0);
    return `
      <div class="section-title">🧠 AI Lab — выберите модель</div>
      <div class="card glass ai-option">
        <div class="ai-option-head"><span class="ic">${AI_LAB.own.icon}</span><b>${AI_LAB.own.label}</b></div>
        <p>${AI_LAB.own.desc}</p>
        <button class="btn btn-violet btn-block aff-btn" data-aff-cost="${ownCost}" ${state.cash<ownCost?'disabled':''} onclick="developOwnAI(${idx})">Разработать за ${fmt(ownCost)} (+${Math.round(AI_LAB.own.bonusPerLevel*100)}% ур.1)</button>
      </div>
      <div class="card glass ai-option">
        <div class="ai-option-head"><span class="ic">${AI_LAB.licensed.icon}</span><b>${AI_LAB.licensed.label}</b></div>
        <p>${AI_LAB.licensed.desc}</p>
        <button class="btn btn-outline btn-block aff-btn" data-aff-cost="${licCost}" ${state.cash<licCost?'disabled':''} onclick="buyLicensedAI(${idx})">Купить лицензию за ${fmt(licCost)} (+${Math.round(AI_LAB.licensed.bonus*100)}%)</button>
      </div>`;
  } else if(am.kind==='licensed'){
    return `
      <div class="section-title">🧠 AI Lab</div>
      <div class="card glass ai-option">
        <span class="ai-active-badge">${AI_LAB.licensed.icon} Лицензия партнёра активна</span>
        <p style="margin-top:10px;">Доход от нейросети: +${Math.round(AI_LAB.licensed.bonus*100)}%. Бонус фиксирован — партнёр держит комиссию, но апгрейдов не требуется.</p>
      </div>`;
  }
  const maxed = am.ownLevel>=AI_LAB.own.maxLevel;
  const nextCost = aiModelCost(type,'own',am.ownLevel);
  return `
    <div class="section-title">🧠 AI Lab</div>
    <div class="card glass ai-option">
      <span class="ai-active-badge">${AI_LAB.own.icon} Своя модель · ур. ${am.ownLevel}/${AI_LAB.own.maxLevel}</span>
      <p style="margin-top:10px;">Текущий бонус: +${Math.round(AI_LAB.own.bonusPerLevel*am.ownLevel*100)}% к доходу.</p>
      ${maxed?'<div class="card-sub">Модель обучена до максимума 🎉</div>':`<button class="btn btn-violet btn-block aff-btn" data-aff-cost="${nextCost}" ${state.cash<nextCost?'disabled':''} onclick="developOwnAI(${idx})">Прокачать до ур. ${am.ownLevel+1} за ${fmt(nextCost)}</button>`}
    </div>`;
}
function buildEmployeesCardHtml(idx){
  const site = state.sites[idx];
  const cap = employeeCap(site);
  let empDots = '';
  for(let i=0;i<cap;i++) empDots += `<div class="emp-dot ${i<site.employees?'filled':''}"></div>`;
  const empCost = employeeCost(site);
  return `
    <div class="card-row">
      <div class="card-icon">👤</div>
      <div style="flex:1">
        <div class="card-title">Сотрудники ${site.employees}/${cap}</div>
        <div class="card-sub">Каждый даёт +${Math.round(EMPLOYEE_INCOME_BONUS*100)}% к доходу. Больше слотов — прокачивайте инфраструктуру.</div>
        <div class="emp-dots">${empDots}</div>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-violet btn-block${site.employees<cap?' aff-btn':''}" ${site.employees<cap?`data-aff-cost="${empCost}"`:''} ${state.cash<empCost||site.employees>=cap?'disabled':''} onclick="hireForSite(${idx})">Нанять за ${fmt(empCost)}</button>
    </div>`;
}
function buildTrafficHtml(idx){
  const site = state.sites[idx];
  const tsrc = trafficBreakdown(site);
  return `
    <div class="section-title">Источники трафика</div>
    <div class="card glass">
      ${TRAFFIC_SOURCE_LABELS.map((lbl,i)=>`<div class="traffic-row"><span class="lbl2">${lbl}</span><div class="bar"><div style="width:${tsrc[i]}%"></div></div><span class="pct">${tsrc[i]}%</span></div>`).join('')}
    </div>`;
}
function buildMergeHtml(idx){
  const site = state.sites[idx];
  const cands = mergeCandidates(idx);
  if(!cands.length) return '';
  const cost = mergeCost(idx);
  return `
    <div class="section-title">🔗 Слияние сайтов</div>
    <div class="card glass" style="border-color:rgba(64,200,228,.35);background:rgba(64,200,228,.08);">
      <div class="card-title">Есть ${cands.length} кандидат${cands.length===1?'':cands.length<5?'а':'ов'} на слияние</div>
      <div class="card-sub">Оба сайта на макс. уровне трека — объедините их, чтобы поднять потолок на +${MERGE_CAP_BONUS} и продолжить расти.</div>
      <div class="btn-row"><button class="btn btn-cyan btn-block" ${state.cash<cost?'disabled':''} onclick="openMergeModal(${idx})">🔗 Объединить с другим сайтом за ${fmt(cost)}</button></div>
    </div>`;
}
function buildRenovationHtml(idx){
  const site = state.sites[idx];
  if(!site) return '';
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const stage = renovationStage(site);
  if(stage >= RENOVATION_MAX_STAGE){
    return `
      <div class="section-title">🛠️ ${tr('Обновление сайта','Site renovation')} · ${tr('этап','stage')} ${stage}/${RENOVATION_MAX_STAGE}</div>
      <div class="card glass" style="border-color:rgba(191,90,242,.35);background:rgba(191,90,242,.08);">
        <div class="card-title">🏆 ${tr('Максимум обновлений достигнут','Max renovations reached')}</div>
        <div class="card-sub">${tr('Этот сайт обновлён по максимуму — теперь его можно вывести на IPO.','This site is fully renovated — it can now be taken public via IPO.')}</div>
      </div>`;
  }
  const maxed = siteFullyUpgraded(site);
  const needStaff = renovationRequiredStaff(site);
  const cost = renovationCost(site, type);
  const staffOk = site.employees >= needStaff;
  const ready = maxed && staffOk;
  const staffPct = Math.min(100, Math.round((site.employees/needStaff)*100));
  let statusLine;
  if(!maxed){
    statusLine = tr('Прокачайте все ветки до максимума, чтобы открыть обновление','Max out every track to unlock a renovation');
  } else if(!staffOk){
    statusLine = tr(`Наймите ещё сотрудников: ${site.employees}/${needStaff}`,`Hire more staff: ${site.employees}/${needStaff}`);
  } else {
    statusLine = tr('Всё готово — можно обновлять сайт','Everything ready — you can renovate the site');
  }
  return `
    <div class="section-title">🛠️ ${tr('Обновление сайта','Site renovation')}${stage>0?` · ${tr('этап','stage')} ${stage}/${RENOVATION_MAX_STAGE}`:` · 0/${RENOVATION_MAX_STAGE}`}</div>
    <div class="card glass" style="${ready?'border-color:rgba(48,209,88,.4);background:rgba(48,209,88,.08);':''}">
      <div class="card-title">${tr('Следующий этап','Next stage')}: +${RENOVATION_CAP_BONUS} ${tr('к потолку уровня треков','to track level cap')}</div>
      <div class="card-sub">${statusLine}</div>
      <div class="progress-bar" style="margin:8px 0;"><div style="width:${staffPct}%;"></div></div>
      <div class="card-sub">👥 ${tr('Персонал','Staff')}: ${site.employees}/${needStaff} · 💸 ${tr('после обновления зарплаты дешевле на','after the update salaries drop by')} ${Math.round((1-RENOVATION_SALARY_DECAY)*100)}% · 📈 +${Math.round(RENOVATION_INCOME_BONUS*100)}% ${tr('к доходу навсегда','to income forever')}</div>
      <div class="btn-row"><button class="btn btn-green btn-block" ${ready&&state.cash>=cost?'':'disabled'} onclick="renovateSite(${idx})">${tr('Обновить за','Renovate for')} ${fmt(cost)}</button></div>
    </div>`;
}
function buildHybridHtml(idx){
  const eligible = eligibleHybridRecipes(idx);
  if(!eligible.length) return '';
  return `
    <div class="section-title">🧬 Доступен гибридный рецепт</div>
    ${eligible.map(({recipe,partnerIdx})=>{
      const cost = Math.round(recipe.baseCost*0.5);
      return `<div class="card glass" style="border-color:rgba(191,90,242,.4);background:rgba(191,90,242,.08);">
        <div class="card-title">${recipe.icon} ${recipe.name}</div>
        <div class="card-sub">${recipe.desc}</div>
        <div class="btn-row"><button class="btn btn-violet btn-block" ${state.cash<cost?'disabled':''} onclick="craftHybrid(${idx},${partnerIdx},'${recipe.id}')">Создать за ${fmt(cost)}</button></div>
      </div>`;
    }).join('')}`;
}
function buildInsuranceHtml(idx){
  const site = state.sites[idx];
  if(site.insured){
    return `
      <div class="section-title">🛡️ Страхование</div>
      <div class="card glass" style="border-color:rgba(48,209,88,.3);background:rgba(48,209,88,.08);">
        <div class="card-title">🛡️ Сайт застрахован</div>
        <div class="card-sub">Защищён от хакерских атак и сбоев инфраструктуры навсегда</div>
      </div>`;
  }
  const cost = insuranceCost(site);
  return `
    <div class="section-title">🛡️ Страхование</div>
    <div class="card glass">
      <div class="card-title">Застраховать сайт</div>
      <div class="card-sub">Разовый платёж — навсегда защищает от хакерских атак и сбоев инфраструктуры</div>
      <div class="btn-row"><button class="btn btn-outline btn-block" ${state.cash<cost?'disabled':''} onclick="buyInsurance(${idx})">Застраховать за ${fmt(cost)}</button></div>
    </div>`;
}
function buildAutoManagerHtml(idx){
  const site = state.sites[idx];
  if(!state.autoManagerUnlocked){
    const cost = autoManagerUnlockCost();
    return `
      <div class="section-title">🤖 Авто-менеджер</div>
      <div class="card glass">
        <div class="card-row">
          <div class="card-icon">🤖</div>
          <div style="flex:1">
            <div class="card-title">Разблокировать авто-менеджера</div>
            <div class="card-sub">Разовая покупка на всю игру — сайты с включённым авто-менеджером сами нанимают сотрудников и покупают дешёвые апгрейды</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn btn-outline btn-block" ${state.cash<cost?'disabled':''} onclick="unlockAutoManager(${idx})">Разблокировать за ${fmt(cost)}</button></div>
      </div>`;
  }
  return `
    <div class="section-title">🤖 Авто-менеджер</div>
    <div class="card glass">
      <div class="switch-row" style="border-bottom:none;">
        <span>Авто-найм и авто-прокачка на этом сайте</span>
        <div class="switch ${site.autoManager?'on':''}" onclick="toggleSiteAutoManager(${idx})"><div class="knob"></div></div>
      </div>
    </div>`;
}
function buildIpoHtml(idx){
  const site = state.sites[idx];
  if(site.ipoed){
    return `
      <div class="section-title">📈 IPO</div>
      <div class="card glass" style="border-color:rgba(10,132,255,.3);background:rgba(10,132,255,.08);">
        <div class="card-title">📈 Публичная компания</div>
        <div class="card-sub">Уже выведена на биржу — доход сайта снижен вдвое навсегда, разовая выплата уже получена</div>
      </div>`;
  }
  const stage = renovationStage(site);
  const locked = stage < IPO_MIN_RENOVATIONS;
  if(locked){
    return `
      <div class="section-title">📈 IPO</div>
      <div class="card glass">
        <div class="card-row">
          <div class="card-icon">🔒</div>
          <div style="flex:1">
            <div class="card-title">${tr('Пока недоступно','Not available yet')}</div>
            <div class="card-sub">${tr(`Нужно минимум ${IPO_MIN_RENOVATIONS} обновления сайта (сейчас ${stage}/${IPO_MIN_RENOVATIONS}) — прокачайте ветки до максимума и обновите сайт через раздел «Обновление сайта»`,`Needs at least ${IPO_MIN_RENOVATIONS} site renovations (currently ${stage}/${IPO_MIN_RENOVATIONS}) — max out the tracks and renovate the site via the "Site renovation" section`)}</div>
          </div>
        </div>
      </div>`;
  }
  const value = ipoValue(idx);
  return `
    <div class="section-title">📈 IPO</div>
    <div class="card glass">
      <div class="card-row">
        <div class="card-icon">📈</div>
        <div style="flex:1">
          <div class="card-title">Вывести на биржу</div>
          <div class="card-sub">Разовая крупная выплата — но доход сайта упадёт вдвое навсегда. Трейд-офф вместо продажи: сайт остаётся у вас</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn btn-cyan btn-block" onclick="confirmIpoSite(${idx})">Получить ${fmt(value)} через IPO</button></div>
    </div>`;
}
function buildSynergyHtml(idx){
  const site = state.sites[idx];
  const count = state.sites.filter(s=>s.typeId===site.typeId).length;
  if(count<=1) return '';
  const mult = sameTypeSynergyMult(site);
  const pct = Math.round((mult-1)*100);
  const good = pct>=0;
  return `
    <div class="section-title">${good?'🤝':'⚠️'} ${good?'Синергия':'Каннибализация рынка'}</div>
    <div class="card glass" style="border-color:${good?'rgba(48,209,88,.3)':'rgba(255,159,10,.3)'};background:${good?'rgba(48,209,88,.08)':'rgba(255,159,10,.08)'};">
      <div class="card-title">${good?'+':''}${pct}% к доходу этого сайта</div>
      <div class="card-sub">${good?`Второй сайт того же типа даёт кросс-промо буст`:`${count} сайтов этого типа насыщают рынок — доход каждого просел`}</div>
    </div>`;
}
function buildIncomeChartHtml(idx){
  const site = state.sites[idx];
  const h = (site.incomeHistory && site.incomeHistory.length>=2) ? site.incomeHistory : [0,0];
  const path = sparklinePath(h,280,50);
  const cur = h[h.length-1]||0;
  const prev = h.length>1?h[0]:cur;
  const up = cur>=prev;
  return `
    <div class="section-title">📈 Доход во времени</div>
    <div class="card glass">
      <svg viewBox="0 0 280 50" preserveAspectRatio="none" style="width:100%;height:50px;display:block;">
        <path id="sv-income-chart-path" d="${path}" fill="none" stroke="${up?'#30d158':'#ff453a'}" stroke-width="2"/>
      </svg>
      <div class="card-sub" style="margin-top:6px;">Сейчас: ${fmt(cur)}/с</div>
    </div>`;
}
function buildReviewsHtml(idx){
  const site = state.sites[idx];
  const stage = designStage(site.tracks.design);
  const reviews = stage>=2 ? siteReviews(site) : [];
  if(!reviews.length) return '';
  return `
    <div class="section-title">Отзывы посетителей</div>
    ${reviews.map(r=>`<div class="card glass review-card">
      <div class="review-head"><b>${r.name}</b><span class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span></div>
      <div class="review-body">${r.text}</div>
    </div>`).join('')}`;
}
function buildSiteView(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const vis = SITE_VISUAL[type.id];
  const income = siteIncome(type, site) * (1+estateBonusTotal()) * (1+reputationBonus());
  const slug = slugify(site.name);
  const boostActive = site.boostUntil && Date.now() < site.boostUntil;
  const boostSecsLeft = boostActive ? Math.ceil((site.boostUntil-Date.now())/1000) : 0;
  const boostCost = Math.round(type.baseCost * BOOST_COST_MULT);

  return `
    <div class="sv-top">
      <button class="sv-close" onclick="closeSiteView()">✕</button>
      <div class="sv-top-title"><b id="sv-title-name">${esc(site.name)}</b><div id="sv-title-domain">www.${slug}${idx}.${vis.domainBase}.io</div></div>
      <button class="sv-close" title="Переименовать" onclick="renameSitePrompt(${idx})">✏️</button>
      <button class="sv-close" id="sv-fs-btn" title="${sitePreviewImmersive?'Выйти из полноэкранного режима':'Во весь экран'}" onclick="toggleSitePreviewFullscreen()">${sitePreviewImmersive?'⤡':'⛶'}</button>
      <button class="sv-close" id="sv-device-btn" title="Переключить вид: телефон/десктоп" onclick="toggleSitePreviewDevice()">${sitePreviewDesktop?'💻':'📱'}</button>
      <span class="sv-stage-pill" id="sv-stage-pill">${buildStagePillHtml(idx)}</span>
    </div>
    <div class="sv-panel-body">
      <div class="browser-frame${sitePreviewDesktop?' desktop-mode':''}" id="sv-browser-frame">
        <div class="browser-bar">
          <div class="browser-dots"><span></span><span></span><span></span></div>
          <div class="browser-url" id="sv-browser-url">🔒 www.${slug}${idx}.${vis.domainBase}.io</div>
        </div>
        <div class="site-page" id="sv-page">${buildPageMockupHtml(idx)}</div>
      </div>

      <div class="stat-strip" style="grid-template-columns:1fr 1fr;margin:0 0 6px;">
        <div class="stat-box glass"><div class="lbl">Доход сайта</div><div class="val num c-green"><span id="sv-income-val">${fmt(income)}/с</span><span id="sv-boost-badge" class="boost-badge" style="${boostActive?'':'display:none;'}">📢 x1.5 · ${boostSecsLeft}с</span></div></div>
        <div class="stat-box glass"><div class="lbl">Тип бизнеса</div><div class="val" style="font-size:13px;">${type.name}</div></div>
      </div>

      <div class="section-title">Маркетинг</div>
      <div class="card glass">
        <div class="card-row">
          <div class="card-icon">📢</div>
          <div style="flex:1">
            <div class="card-title">Рекламная кампания</div>
            <div class="card-sub">+50% к доходу сайта на 60 секунд</div>
          </div>
        </div>
        <div class="btn-row">
          <button class="btn btn-amber btn-block" id="sv-boost-btn" ${boostActive||state.cash<boostCost?'disabled':''} onclick="boostSite(${idx})">${boostActive?`Активна ещё ${boostSecsLeft}с`:'Запустить за '+fmt(boostCost)}</button>
        </div>
      </div>

      <div class="section-title">Ветки прокачки</div>
      <div id="sv-tracks">${buildTracksHtml(idx)}</div>

      <div class="section-title">Команда</div>
      <div class="card glass" id="sv-employees">${buildEmployeesCardHtml(idx)}</div>

      <div id="sv-traffic">${buildTrafficHtml(idx)}</div>

      <button class="sv-advanced-toggle" id="sv-advanced-toggle" onclick="toggleSiteAdvanced()">
        <span id="sv-advanced-toggle-ic">${sviteAdvancedOpen?'▴':'▾'}</span> Ещё: продвинутые системы
      </button>
      <div id="sv-advanced-wrap" style="${sviteAdvancedOpen?'':'display:none;'}">
        <div id="sv-ailab">${buildAiLabHtml(idx)}</div>
        <div id="sv-incomechart">${buildIncomeChartHtml(idx)}</div>
        <div id="sv-synergy">${buildSynergyHtml(idx)}</div>
        <div id="sv-automgr">${buildAutoManagerHtml(idx)}</div>
        <div id="sv-insurance">${buildInsuranceHtml(idx)}</div>
        <div id="sv-ipo">${buildIpoHtml(idx)}</div>
        <div id="sv-renovation">${buildRenovationHtml(idx)}</div>
        <div id="sv-merge">${buildMergeHtml(idx)}</div>
        <div id="sv-hybrid">${buildHybridHtml(idx)}</div>
        <div id="sv-reviews">${buildReviewsHtml(idx)}</div>
      </div>

      <div class="section-title">Опасная зона</div>
      <div class="card glass" style="border-color:rgba(255,69,58,.25);">
        <div class="card-row">
          <div class="card-icon">💀</div>
          <div style="flex:1">
            <div class="card-title">Продать / закрыть сайт</div>
            <div class="card-sub">Вернёт часть вложенных средств кэшем и освободит слот навсегда</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn btn-red btn-block" onclick="confirmSellSite(${idx})">Продать за ${fmt(siteSellValue(idx))}</button></div>
      </div>
    </div>
  `;
}
/* ---------- SELL / CLOSE SITE ---------- */
function siteSellValue(idx){
  const site = state.sites[idx];
  if(!site) return 0;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  let invested = type.baseCost;
  TRACK_ORDER.forEach(k=>{
    for(let l=1; l<site.tracks[k]; l++) invested += trackUpgradeCost(type, k, l);
  });
  for(let e=0; e<site.employees; e++) invested += Math.round(EMPLOYEE_BASE_COST * Math.pow(1.35, e) * difficultyCostMult());
  return Math.round(invested * 0.35);
}
function confirmSellSite(idx){
  const site = state.sites[idx];
  if(!site) return;
  const value = siteSellValue(idx);
  openModal(`<h3>💀 Продать «${esc(site.name)}»?</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">Сайт и всё, что в него вложено, исчезнут безвозвратно. Слот освободится, вы получите <b>${fmt(value)}</b> кэшем.</p>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">Отмена</button><button class="btn btn-red btn-block" onclick="sellSite(${idx})">Продать</button></div>`);
}
function sellSite(idx){
  const site = state.sites[idx];
  if(!site) return;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const value = siteSellValue(idx);
  state.cash += value;
  log(`💀 ${tr('Продан сайт','Sold site')} «${esc(site.name)}» (${L(type,'name')}) ${tr('за','for')} ${fmt(value)}`);
  toast(`${tr('Продано за','Sold for')} ${fmt(value)}`);
  playSound('sell');
  vibrateFeedback(20);
  closeModal(); closeSiteView();
  state.sites.splice(idx,1);
  renderAll(); save();
}
/* Patches just the section(s) whose underlying data actually changed,
   instead of rebuilding the whole panel. `sections` is an array made up
   of any of: 'tracks','page','ailab','employees','traffic','reviews',
   'stagepill','title'. */
function refreshSiteViewSections(idx, sections){
  if(openSiteIdx!==idx || !state.sites[idx]) return;
  const set = (id, html)=>{ const el=document.getElementById(id); if(el) el.innerHTML = html; };
  if(sections.includes('tracks')){ set('sv-tracks', buildTracksHtml(idx)); set('sv-renovation', buildRenovationHtml(idx)); set('sv-merge', buildMergeHtml(idx)); set('sv-hybrid', buildHybridHtml(idx)); set('sv-synergy', buildSynergyHtml(idx)); if(!state.sites[idx].ipoed) set('sv-ipo', buildIpoHtml(idx)); }
  if(sections.includes('renovation')) set('sv-renovation', buildRenovationHtml(idx));
  if(sections.includes('page')) set('sv-page', buildPageMockupHtml(idx));
  if(sections.includes('ailab')) set('sv-ailab', buildAiLabHtml(idx));
  if(sections.includes('employees')) set('sv-employees', buildEmployeesCardHtml(idx));
  if(sections.includes('traffic')) set('sv-traffic', buildTrafficHtml(idx));
  if(sections.includes('reviews')) set('sv-reviews', buildReviewsHtml(idx));
  if(sections.includes('stagepill')) set('sv-stage-pill', buildStagePillHtml(idx));
  if(sections.includes('insurance')) set('sv-insurance', buildInsuranceHtml(idx));
  if(sections.includes('automgr')) set('sv-automgr', buildAutoManagerHtml(idx));
  if(sections.includes('ipo')) set('sv-ipo', buildIpoHtml(idx));
  if(sections.includes('title')){
    const site = state.sites[idx];
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    const vis = SITE_VISUAL[type.id];
    const slug = slugify(site.name);
    const domain = `www.${slug}${idx}.${vis.domainBase}.io`;
    const nameEl = document.getElementById('sv-title-name'); if(nameEl) nameEl.textContent = site.name;
    const domEl = document.getElementById('sv-title-domain'); if(domEl) domEl.textContent = domain;
    const urlEl = document.getElementById('sv-browser-url'); if(urlEl) urlEl.textContent = '🔒 '+domain;
  }
}
// Small sparkle burst shown right after an upgrade, decoupled from any
// DOM rebuild so it can play even when we only patched a small section.
function spawnSvBurst(){
  const page = document.getElementById('sv-page');
  if(!page) return;
  const b = document.createElement('div');
  b.className = 'burst';
  b.textContent = '✨';
  page.appendChild(b);
  setTimeout(()=>{ if(b.parentNode) b.remove(); }, 650);
}

/* ---------- NAV ---------- */
let activeScreen = 'dash';
let tickCount = 0;
function renderScreenList(screen){
  if(screen==='sites') renderSites();
  else if(screen==='market') renderMarket();
  else if(screen==='estate'){ renderEstate(); renderGarage(); }
  else if(screen==='dash') renderDash();
  else if(screen==='settings') renderSettings();
  else if(screen==='inbox') renderInbox();
}
let assetsTab = 'estate';
function setAssetsTab(tab){
  assetsTab = tab;
  document.getElementById('subtab-estate').classList.toggle('active', tab==='estate');
  document.getElementById('subtab-garage').classList.toggle('active', tab==='garage');
  document.getElementById('assets-panel-estate').style.display = tab==='estate' ? '' : 'none';
  document.getElementById('assets-panel-garage').style.display = tab==='garage' ? '' : 'none';
}
let settingsTab = 'sound';
function setSettingsTab(tab){
  settingsTab = tab;
  ['sound','mode','progress','social','data'].forEach(t=>{
    const btn = document.getElementById('settingstab-'+t);
    const panel = document.getElementById('settings-panel-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
    if(panel) panel.style.display = (t===tab) ? '' : 'none';
  });
}
function nav(screen){
  activeScreen = screen;
  if(screen==='market') bumpQuest('visit_market');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.screen===screen));
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+screen));
  renderScreenList(screen); // refresh immediately so switching tabs never shows stale data
}
document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.screen)));

/* ---------- RENDER ---------- */
function dualSparklinePaths(arrA, arrB, w, h, pad=2){
  if(arrA.length<2) return {a:'',b:'',areaA:'',areaB:''};
  const max = Math.max(1, ...arrA, ...arrB);
  const step = (w-pad*2)/(arrA.length-1);
  const y = v => h-pad-Math.min(1,v/max)*(h-pad*2);
  const build = arr => arr.map((v,i)=>(i===0?'M':'L')+(pad+i*step).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  const buildArea = arr => build(arr) + ` L${(pad+(arr.length-1)*step).toFixed(1)},${h-pad} L${pad},${h-pad} Z`;
  return { a: build(arrA), b: build(arrB), areaA: buildArea(arrA), areaB: buildArea(arrB) };
}
// Full rebuild of the dashboard's income/expenses + credit card. Only called
// on renderAll() (i.e. right after an action) and once per in-game day —
// NOT every tick, since rebuilding a glass card's innerHTML every second is
// exactly the kind of churn that used to cause the screen-flicker bug
// elsewhere in this file. Per-second freshness is handled by the much
// cheaper updateFinanceLive() below instead.
function renderFinanceCard(){
  const el = document.getElementById('finance-card');
  if(!el) return;
  const f = state.finance;
  const inc = f.incomeHist.length ? f.incomeHist : [0,0];
  const exp = f.expenseHist.length ? f.expenseHist : [0,0];
  const paths = dualSparklinePaths(inc, exp, 300, 64);
  const net = f.todayIncome - f.todayExpenses;
  const debt = state.loan.principal;
  const cap = maxLoanAmount();

  const days = f.dailyHistory.slice(-6).concat([{day:state.day, income:f.todayIncome, expenses:f.todayExpenses}]);
  const dayMax = Math.max(1, ...days.map(d=>Math.max(d.income,d.expenses)));
  el._finDayMax = dayMax;
  const barsHtml = days.map((d,i)=>{
    const isToday = i===days.length-1;
    const hI = Math.max(2, Math.round((d.income/dayMax)*46));
    const hE = Math.max(2, Math.round((d.expenses/dayMax)*46));
    return `<div class="fin-bar-col" title="${tr('День','Day')} ${d.day}">
      <div class="fin-bar-pair">
        <div class="fin-bar fin-bar-in" ${isToday?'id="fin-bar-in-today"':''} style="height:${hI}px"></div>
        <div class="fin-bar fin-bar-out" ${isToday?'id="fin-bar-out-today"':''} style="height:${hE}px"></div>
      </div>
      <div class="fin-bar-lbl">${isToday?tr('сег.','tdy'):d.day}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="card-row" style="margin-bottom:2px;">
      <div class="card-icon">💹</div>
      <div style="flex:1">
        <div class="card-title">${tr('Доходы и расходы','Income & expenses')}</div>
        <div class="card-sub">${tr('Сегодня','Today')}: <span class="c-green" id="fin-today-in">+${fmt(f.todayIncome)}</span> / <span class="c-red" id="fin-today-out">−${fmt(f.todayExpenses)}</span> · ${tr('итог','net')} <span id="fin-net" class="${net>=0?'c-green':'c-red'}">${net>=0?'+':'−'}${fmt(Math.abs(net))}</span></div>
      </div>
    </div>
    <svg class="fin-chart" id="fin-svg" viewBox="0 0 300 64" preserveAspectRatio="none">
      <path id="fin-area-in" d="${paths.areaA}" fill="rgba(48,209,88,.16)" stroke="none"></path>
      <path id="fin-area-out" d="${paths.areaB}" fill="rgba(255,69,58,.14)" stroke="none"></path>
      <path id="fin-line-in" d="${paths.a}" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fin-line"></path>
      <path id="fin-line-out" d="${paths.b}" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fin-line"></path>
    </svg>
    <div class="fin-legend"><span><i style="background:var(--green)"></i>${S('Доход')}</span><span><i style="background:var(--red)"></i>${S('Расход')}</span></div>
    <div class="fin-bars" id="fin-bars">${barsHtml}</div>
    <div class="fin-loan-row">
      <div>
        <div class="fin-loan-lbl">🏦 ${tr('Кредит','Loan')} <span id="fin-loan-rating" style="font-weight:400;color:var(--dim);">· 🏅${state.loan.rating||0}/${LOAN_MAX_RATING}</span></div>
        <div class="fin-loan-val" id="fin-loan-val">${debt>0?`${tr('Долг','Debt')} ${fmt(debt)} <span class="dim">/ ${tr('лимит','limit')} ${fmt(cap)}</span>`:`${tr('Доступно до','Available up to')} ${fmt(cap)}`}</div>
      </div>
      <button class="btn ${debt>0?'btn-outline':'btn-amber'}" style="padding:9px 14px;" onclick="openLoanModal()">${debt>0?tr('Управлять','Manage'):tr('Взять кредит','Take a loan')}</button>
    </div>
    <div class="progress-bar" id="fin-loan-progress-wrap" style="margin-top:8px;${debt>0?'':'display:none;'}"><div id="fin-loan-progress" style="width:${cap?Math.min(100,Math.round(debt/cap*100)):0}%;background:linear-gradient(90deg,var(--orange),var(--red));"></div></div>
  `;
}
// Cheap per-tick refresh: only patches text/attributes that actually move
// every second (chart lines, today's bar, loan interest), never touches
// innerHTML, so it never re-triggers the card's entrance animation or
// forces the browser to repaint the whole glass panel.
function updateFinanceLive(){
  if(activeScreen!=='dash') return;
  const el = document.getElementById('finance-card');
  if(!el || !el.firstElementChild) return;
  const f = state.finance;
  const inc = f.incomeHist.length ? f.incomeHist : [0,0];
  const exp = f.expenseHist.length ? f.expenseHist : [0,0];
  const paths = dualSparklinePaths(inc, exp, 300, 64);
  const setD = (id,d)=>{ const p=document.getElementById(id); if(p) p.setAttribute('d', d); };
  setD('fin-area-in', paths.areaA); setD('fin-area-out', paths.areaB);
  setD('fin-line-in', paths.a); setD('fin-line-out', paths.b);

  const net = f.todayIncome - f.todayExpenses;
  const inEl = document.getElementById('fin-today-in'); if(inEl) inEl.textContent = '+'+fmt(f.todayIncome);
  const outEl = document.getElementById('fin-today-out'); if(outEl) outEl.textContent = '−'+fmt(f.todayExpenses);
  const netEl = document.getElementById('fin-net');
  if(netEl){ netEl.textContent = (net>=0?'+':'−')+fmt(Math.abs(net)); netEl.className = net>=0?'c-green':'c-red'; }

  const dayMax = Math.max(1, el._finDayMax||1, f.todayIncome, f.todayExpenses);
  const barIn = document.getElementById('fin-bar-in-today'); if(barIn) barIn.style.height = Math.max(2, Math.round((f.todayIncome/dayMax)*46))+'px';
  const barOut = document.getElementById('fin-bar-out-today'); if(barOut) barOut.style.height = Math.max(2, Math.round((f.todayExpenses/dayMax)*46))+'px';

  const debt = state.loan.principal;
  const cap = maxLoanAmount();
  const loanValEl = document.getElementById('fin-loan-val');
  if(loanValEl) loanValEl.innerHTML = debt>0?`${tr('Долг','Debt')} ${fmt(debt)} <span class="dim">/ ${tr('лимит','limit')} ${fmt(cap)}</span>`:`${tr('Доступно до','Available up to')} ${fmt(cap)}`;
  const progWrap = document.getElementById('fin-loan-progress-wrap');
  const prog = document.getElementById('fin-loan-progress');
  if(progWrap && prog){
    progWrap.style.display = debt>0 ? '' : 'none';
    prog.style.width = (cap?Math.min(100,Math.round(debt/cap*100)):0)+'%';
  }
}
function sparklinePath(arr, w, h, pad=2){
  if(arr.length<2) return '';
  const min=Math.min(...arr), max=Math.max(...arr);
  const range=(max-min)||1;
  const step=(w-pad*2)/(arr.length-1);
  return arr.map((v,i)=>{
    const x=pad+i*step;
    const y=h-pad-((v-min)/range)*(h-pad*2);
    return (i===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
}
let tickerBuilt = false;
function buildTickerOnce(){
  const items = ALL_ASSETS.map(s=>
    `<div class="ticker-item" data-sym="${s.sym}">${s.sym} <b class="tk-price"></b> <span class="tk-arrow"></span></div>`
  ).join('');
  document.getElementById('ticker').innerHTML = items+items;
  tickerBuilt = true;
}
function renderTicker(){
  // Build the ticker DOM once; on every subsequent call just update text in place.
  // Rebuilding innerHTML every second was a main cause of the visible screen flicker.
  if(!tickerBuilt) buildTickerOnce();
  document.querySelectorAll('#ticker .ticker-item').forEach(el=>{
    const sym = el.dataset.sym;
    const p = stockPrices[sym];
    const h = priceHistory[sym];
    const prev = h.length>1?h[h.length-2]:p;
    const up = p>=prev;
    el.querySelector('.tk-price').textContent = fmt(p);
    const arrow = el.querySelector('.tk-arrow');
    arrow.textContent = up?'▲':'▼';
    arrow.className = 'tk-arrow ' + (up?'tick-up':'tick-down');
  });
}
/* Smoothly animates a text node from its last displayed numeric value to
   a new one, instead of snapping instantly — makes cash gains (which land
   in lumps: purchases, offline income, tick income) feel tactile rather
   than just re-painting a label. Cheap: only runs while the value is
   actually changing, via rAF, and self-cancels on rapid re-triggers. */
function animateNumberText(el, newVal){
  if(!el) return;
  const prev = el._animRaw!==undefined ? el._animRaw : newVal;
  el._animRaw = newVal;
  if(Math.abs(newVal-prev) < 0.005){ el.textContent = fmt(newVal); return; }
  if(el.dataset.flash){
    // Only flash on deliberate jumps (a purchase/sale), not the constant
    // trickle of passive per-second income — otherwise it never stops glowing.
    const jump = Math.abs(newVal-prev) > Math.max(5, prev*0.02);
    if(jump){
      el.classList.remove('cash-flash-up','cash-flash-down');
      void el.offsetWidth;
      el.classList.add(newVal>prev ? 'cash-flash-up' : 'cash-flash-down');
    }
  }
  if(el._animFrame) cancelAnimationFrame(el._animFrame);
  const start = performance.now();
  const dur = 380;
  const step = (now)=>{
    const t = Math.min(1, (now-start)/dur);
    const eased = 1-Math.pow(1-t,3);
    el.textContent = fmt(prev + (newVal-prev)*eased);
    if(t<1) el._animFrame = requestAnimationFrame(step);
    else el._animFrame = null;
  };
  el._animFrame = requestAnimationFrame(step);
}
function renderHeader(nw){
  if(nw===undefined) nw = netWorth();
  const r = currentRank(nw);
  document.getElementById('header-rank').textContent = `${r.icon} ${L(r,'title')}`;
  animateNumberText(document.getElementById('header-cash'), state.cash);
}
function renderDash(nw){
  if(nw===undefined) nw = netWorth();
  const ips = totalIncomePerSec();
  const avatar = (state.ceo && state.ceo.avatar) ? state.ceo.avatar+' ' : '';
  document.getElementById('dash-sub').textContent = `${avatar}CEO ${state.ceoName} · ${tr('День','Day')} ${state.day} · ${state.sites.length}/${maxSiteSlots(nw)} ${tr('слотов занято','slots used')}`;
  animateNumberText(document.getElementById('worth-val'), nw);
  document.getElementById('worth-delta').textContent = '+'+fmt(ips)+tr('/сек','/sec');
  animateNumberText(document.getElementById('stat-cash'), state.cash);
  document.getElementById('stat-income').textContent = fmt(ips)+'/с';
  document.getElementById('stat-stocks').textContent = fmt(stocksValue());
  document.getElementById('stat-rep').textContent = reputationTotal();
  renderRebirthCard(nw);

  const svg = document.getElementById('worth-svg');
  svg.innerHTML = `<path d="${sparklinePath(state.netWorthHistory,300,56)}" fill="none" stroke="#30d158" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  const rIdx = currentRankIndex(nw);
  const r = RANKS[rIdx];
  const next = RANKS[rIdx+1];
  document.getElementById('rank-icon').textContent = r.icon;
  document.getElementById('rank-title').textContent = L(r,'title');
  if(next){
    const span = next.min-r.min;
    const prog = Math.min(100, Math.round(((nw-r.min)/span)*100));
    document.getElementById('rank-next').textContent = `${tr('До ранга','To rank')} «${L(next,'title')}»: ${fmt(next.min-nw)}`;
    document.getElementById('rank-progress').style.width = prog+'%';
  } else {
    document.getElementById('rank-next').textContent = tr('Максимальный ранг достигнут','Maximum rank reached');
    document.getElementById('rank-progress').style.width = '100%';
  }
  refreshDailyQuestCard();
  let seasonTargetVal;
  try{ seasonTargetVal = seasonTarget(currentSeasonTheme(state.seasonEvent.weekKey)); }catch(e){ /* season system not ready yet on first render */ }
  renderSeasonCard(seasonTargetVal);
  renderTaxCard();
  updateDashAdvancedBadge(nw, seasonTargetVal);
}
// The rank/rebirth/finance/history group is collapsed by default (see
// toggleDashAdvanced), so anything actionable inside it — a rebirth
// that's ready, an unclaimed season reward — needs a visible cue on the
// collapsed toggle itself, or collapsing it would silently hide state
// the player used to see at a glance.
function updateDashAdvancedBadge(nw, seasonTargetVal){
  const badge = document.getElementById('dash-advanced-badge');
  if(!badge) return;
  const rebirthReady = nw >= prestigeThreshold();
  let seasonReady = false;
  try{
    const theme = currentSeasonTheme(state.seasonEvent.weekKey);
    const target = seasonTargetVal===undefined ? seasonTarget(theme) : seasonTargetVal;
    seasonReady = !state.seasonEvent.claimed && seasonProgressValue(theme) >= target;
  }catch(e){ /* season system not ready yet on first render */ }
  const taxAudit = !!(state.taxes && state.taxes.audited && Object.values(state.taxes.audited).some(Boolean));
  badge.style.display = (rebirthReady || seasonReady || taxAudit) ? '' : 'none';
}
function renderSeasonCard(target){
  const el = document.getElementById('season-card');
  if(!el) return;
  ensureSeasonEvent();
  const theme = currentSeasonTheme(state.seasonEvent.weekKey);
  if(target===undefined) target = seasonTarget(theme);
  const prog = Math.min(target, seasonProgressValue(theme));
  const done = prog>=target;
  const statusTxt = state.seasonEvent.claimed ? `✅ ${tr('Награда получена','Reward claimed')}` : (done ? `🎁 ${tr('Награда готова — заберите!','Reward ready — claim it!')}` : `${theme.isCount?prog:fmt(prog)} / ${theme.isCount?target:fmt(target)}`);
  el.innerHTML = `
    <div class="card-row">
      <div class="card-icon">${theme.icon}</div>
      <div style="flex:1">
        <div class="card-title">${esc(L(theme,'name'))}</div>
        <div class="card-sub">${statusTxt}</div>
      </div>
    </div>`;
}
function renderRebirthCard(nw){
  const wrap = document.getElementById('rebirth-card');
  if(!wrap) return;
  const threshold = prestigeThreshold();
  const ready = nw >= threshold;
  const prog = Math.min(100, Math.round((nw/threshold)*100));
  wrap.innerHTML = `
    <div class="card-row">
      <div class="card-icon">🔄</div>
      <div style="flex:1">
        <div class="card-title">${tr('Перерождение','Rebirth')} (×${prestigeMultiplier().toFixed(2)} ${tr('к доходу','to income')})</div>
        <div class="card-sub">${ready ? tr('Порог достигнут — можно переродиться!','Threshold reached — you can rebirth!') : `${tr('До перерождения','Until rebirth')}: ${fmt(threshold-nw)}`}</div>
      </div>
    </div>
    <div class="progress-bar"><div style="width:${prog}%"></div></div>
    <div class="btn-row"><button class="btn btn-violet btn-block" ${ready?'':'disabled'} onclick="openRebirthModal()">${S('Переродиться')} (${state.prestige.count}${state.prestige.count>=3?'':'/3'})</button></div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openSkillTreeModal()">🌳 ${tr('Дерево навыков CEO','CEO skill tree')} (${state.prestige.skillPoints||0} 🌟)</button></div>
  `;
}
function renderLog(){
  const el = document.getElementById('dash-log');
  if(!state.log.length){ el.innerHTML = `<div class="empty">${tr('Пока тихо. Начните с покупки первого сайта.','It is quiet for now. Start by buying your first site.')}</div>`; return; }
  el.innerHTML = state.log.slice(0,8).map(item=>`<div style="font-size:12.5px;padding:7px 0;border-bottom:1px solid var(--tint-sm);">${item.msg}</div>`).join('');
}
/* Adds a light staggered entrance animation to a freshly-rebuilt list of
   .card elements, instead of every list just snapping into existence.
   Cheap: only touches the elements that were just inserted, once. */
function staggerCards(el){
  if(!el) return;
  Array.from(el.children).forEach((c,i)=>{
    if(!c.classList || !(c.classList.contains('card') || c.classList.contains('stock-row'))) return;
    c.classList.add('card-in');
    c.style.animationDelay = Math.min(i*30,300)+'ms';
  });
}
function renderTypeCard(type){
  const nw = netWorth();
  const owned = state.sites.filter(s=>s.typeId===type.id).length;
  const locked = nw < type.unlockNetWorth && owned===0;
  const slotsFull = state.sites.length >= maxSiteSlots(nw);
  // Gate: can't add another site (of any type) until every site you already
  // own has been renovated all the way to its final stage.
  const needsRenovation = !locked && state.sites.length>0 && !allOwnedSitesFullyRenovated();
  // Visual "locked" state — shown as 🔒 whenever the type isn't owned yet and
  // either the net-worth threshold or the renovation gate is blocking it.
  const showLocked = owned===0 && (locked || needsRenovation);
  const cost = Math.round(type.baseCost * Math.pow(1.6, owned) * Math.pow(SITE_COUNT_COST_GROWTH, state.sites.length) * difficultyCostMult());
  let btnLabel = `${tr('Купить за','Buy for')} ${fmt(cost)}`;
  let disabled = locked || state.cash<cost;
  if(!locked && slotsFull){ btnLabel = tr('Нет свободных слотов','No free slots'); disabled = true; }
  else if(!locked && !slotsFull && needsRenovation){ btnLabel = `🔒 ${tr(`Сначала обновите сайты до эт. ${RENOVATION_MAX_STAGE}`, `First renovate your sites to stage ${RENOVATION_MAX_STAGE}`)}`; disabled = true; }
  // Only mark as an affordability button (auto-toggled every tick as cash
  // changes) when cash is actually the gating factor — locked/slots-full/
  // needs-renovation states shouldn't be silently re-enabled by the
  // cash-only ticker.
  const affAttrs = (!locked && !slotsFull && !needsRenovation) ? `class="btn btn-cyan btn-block aff-btn" data-aff-cost="${cost}"` : `class="btn btn-cyan btn-block"`;
  return `<div class="card glass">
    <div class="card-row">
      <div class="card-icon">${type.icon}</div>
      <div style="flex:1">
        <div class="card-title">${L(type,'name')} <span class="pill ${owned>0?'pill-owned':'pill-locked'}">${owned>0?owned+tr(' шт',' owned'):(showLocked?`🔒 ${tr('закрыто','locked')}`:tr('нет','none'))}</span></div>
        <div class="card-sub">${tr('База дохода','Base income')}: ${fmt(type.baseIncome)}${tr('/с','/s')} ${locked?`· ${tr('откроется при','unlocks at')} $${type.unlockNetWorth.toLocaleString(isEN()?'en-US':'ru-RU')} ${tr('активов','net worth')}`:(needsRenovation&&owned===0?`· ${tr('откроется после полного обновления текущих сайтов','unlocks once your current sites are fully renovated')}`:'')}</div>
      </div>
    </div>
    <div class="btn-row"><button ${affAttrs} ${disabled?'disabled':''} onclick="buySite('${type.id}')">${btnLabel}</button></div>
  </div>`;
}
function renderSites(){
  const el = document.getElementById('sites-list');
  const nw = netWorth();
  const slots = maxSiteSlots(nw);
  // was hardcoded to 8 dots, but SLOT_MILESTONES has 10 tiers — players who
  // unlocked slot 9/10 never saw them represented here.
  const totalDots = SLOT_MILESTONES.length;
  let slotDots = '';
  for(let i=0;i<totalDots;i++){
    let cls = 'slot-dot';
    if(i < state.sites.length) cls += ' filled';
    else if(i < slots) cls += ' next';
    slotDots += `<div class="${cls}"></div>`;
  }
  let html = `<div class="card glass" style="margin-bottom:16px;">
    <div class="card-title">🧩 ${tr('Слоты сайтов','Site slots')}: ${state.sites.length}/${slots}</div>
    <div class="card-sub">${tr('Открывайте новые слоты, наращивая чистые активы — сначала прокачайте то, что уже есть','Unlock new slots by growing your net worth — upgrade what you already have first')}</div>
    <div class="slot-dots">${slotDots}</div>
  </div>`;

  if(state.sites.length>0 && !allOwnedSitesFullyRenovated()){
    const worst = state.sites.reduce((min,s)=>Math.min(min, s.renovationStage||0), RENOVATION_MAX_STAGE);
    html += `<div class="card glass" style="margin-bottom:16px;border-color:rgba(255,159,10,.35);background:rgba(255,159,10,.07);">
      <div class="card-title">🏗️ ${tr('Новый сайт пока закрыт','New site locked for now')}</div>
      <div class="card-sub">${tr('Прокачайте все ветки до потолка и обновите текущие сайты до максимального этапа','Max out every track and renovate your current sites to the final stage')} (${worst}/${RENOVATION_MAX_STAGE}) ${tr('— тогда откроется покупка следующего','— then the next purchase unlocks')}.</div>
    </div>`;
  }

  CATEGORY_ORDER.forEach(catId=>{
    const cat = CATEGORY_META[catId];
    const types = ALL_BUSINESS_TYPES.filter(t=>t.category===catId);
    if(!types.length) return;
    html += `<div class="section-title">${cat.icon} ${L(cat,'name')}</div>`;
    if(catId==='ai'){
      html += `<div class="card glass" style="margin-bottom:10px;background:rgba(191,90,242,.08);border-color:rgba(191,90,242,.3);">
        <div class="card-sub" style="font-size:11.5px;">🧬 ${tr('Открыв AI-бизнес, вы сможете разработать собственную нейросеть или купить готовую лицензию у партнёра — выбор влияет на доход. Подробности — внутри проекта.','Once you unlock an AI business, you can develop your own neural network or buy a ready-made license from a partner — the choice affects income. Details are inside the project.')}</div>
      </div>`;
    }
    types.forEach(type=>{ html += renderTypeCard(type); });
  });

  html += `<div class="section-title">${tr('Мои проекты','My projects')}</div>`;
  if(!state.sites.length){
    html += `<div class="empty">🌱 ${tr('У вас пока нет сайтов — купите первый выше','You do not have any sites yet — buy your first one above')}</div>`;
  } else {
    state.sites.forEach((site, idx)=>{
      const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
      const vis = SITE_VISUAL[type.id];
      const stage = designStage(site.tracks.design);
      const meta = STAGE_META[stage];
      const income = siteIncome(type, site);
      const cap = employeeCap(site);
      let dots = '';
      for(let i=0;i<cap;i++) dots += `<div class="emp-dot ${i<site.employees?'filled':''}"></div>`;
      const tp = TRACK_ORDER.map(k=>`${TRACK_META[k].icon}${site.tracks[k]}`).join('  ');
      const idleHrs = Math.floor((Date.now()-(site.lastUpgradeAt||Date.now()))/3600000);
      const idleBadge = idleHrs>=IDLE_WARN_HOURS ? `<span class="idle-badge">⏳ ${tr('без апгрейда','no upgrades')} ${idleHrs} ${tr('ч','h')}</span>` : '';
      html += `<div class="card glass" style="cursor:pointer;${state.boosty.unlocked?'border:1px solid rgba(255,214,10,.35);box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,214,10,.1);':''}" onclick="openSiteView(${idx})">
        <div class="card-row">
          <div class="card-icon" style="background:${vis.accent}22;">${type.icon}${state.boosty.unlocked?' ✨':''}</div>
          <div style="flex:1">
            <div class="card-title">${esc(site.name)} <span class="pill" style="background:${vis.accent}22;color:${vis.accent};">${meta.icon} ${meta.label}</span> ${idleBadge}</div>
            <div class="card-sub">${L(type,'name')} · ${fmt(income)}${tr('/с','/s')} · ${tp}</div>
            <div class="emp-dots">${dots}</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn btn-outline btn-block" onclick="event.stopPropagation();openSiteView(${idx})">${tr('Открыть сайт и прокачать →','Open site and upgrade →')}</button></div>
      </div>`;
    });
  }
  el.innerHTML = html;
  staggerCards(el);
}
function setMarketTab(tab){
  marketTab = tab;
  document.getElementById('tab-stock').classList.toggle('active', tab==='stock');
  document.getElementById('tab-crypto').classList.toggle('active', tab==='crypto');
  renderMarket();
}
function renderLoanCard(){
  const el = document.getElementById('loan-card');
  if(!el) return;
  const debt = state.loan.principal;
  const cap = maxLoanAmount();
  const rating = state.loan.rating||0;
  el.innerHTML = `
    <div class="card-row">
      <div class="card-icon">🏦</div>
      <div style="flex:1">
        <div class="card-title">${tr('Кредит под будущий доход','Loan against future income')}</div>
        <div class="card-sub">${debt>0?`${tr('Долг','Debt')}: ${fmt(debt)} · ${tr('Лимит','Limit')}: ${fmt(cap)}`:`${tr('Доступно','Available')}: ${fmt(cap)} · ${tr('Ставка','Rate')} ${(loanRate()*100).toFixed(1)}%${tr('/день','/day')}`}</div>
        <div class="card-sub">🏅 ${tr('Рейтинг','Rating')}: ${rating}/${LOAN_MAX_RATING} — «${loanRatingLabel(rating)}»</div>
      </div>
    </div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openLoanModal()">${tr('Управлять кредитом','Manage loan')}</button></div>
  `;
}
function renderMarket(){
  document.getElementById('mkt-value').textContent = fmt(stocksValue());
  document.getElementById('mkt-cash').textContent = fmt(state.cash);
  renderLoanCard();
  const el = document.getElementById('stocks-card');
  const list = marketTab==='crypto' ? CRYPTO : STOCKS;
  el.innerHTML = list.map(s=>{
    const p = stockPrices[s.sym];
    const h = priceHistory[s.sym];
    const prev = h.length>1?h[0]:p;
    const up = p>=prev;
    const held = state.stocks[s.sym]||0;
    const path = sparklinePath(h,100,30);
    return `<div class="stock-row" id="stock-row-${s.sym}" onclick="openBuyModal('${s.sym}')">
      <div class="stock-sym"><b>${s.sym}</b><div>${s.name}</div></div>
      <svg class="stock-spark" viewBox="0 0 100 30" preserveAspectRatio="none"><path class="stock-spark-path" d="${path}" fill="none" stroke="${up?'#30d158':'#ff453a'}" stroke-width="2"/></svg>
      <div>
        <div class="stock-price ${up?'c-green':'c-red'}">${fmt(p)}</div>
        ${held>0?`<div class="stock-held">${held}${tr(' шт','x')}</div>`:''}
      </div>
    </div>`;
  }).join('');
  staggerCards(el);
}
// Updates prices/sparklines/holdings in place every tick instead of
// rebuilding the whole list — the rows themselves never get torn down.
function updateMarketLive(){
  if(activeScreen!=='market') return;
  const valEl = document.getElementById('mkt-value'); if(valEl) valEl.textContent = fmt(stocksValue());
  const cashEl = document.getElementById('mkt-cash'); if(cashEl) cashEl.textContent = fmt(state.cash);
  renderLoanCard();
  const list = marketTab==='crypto' ? CRYPTO : STOCKS;
  list.forEach(s=>{
    const row = document.getElementById('stock-row-'+s.sym);
    if(!row) return;
    const p = stockPrices[s.sym];
    const h = priceHistory[s.sym];
    const prev = h.length>1?h[0]:p;
    const up = p>=prev;
    const priceEl = row.querySelector('.stock-price');
    if(priceEl){ priceEl.textContent = fmt(p); priceEl.className = 'stock-price '+(up?'c-green':'c-red'); }
    const pathEl = row.querySelector('.stock-spark-path');
    if(pathEl){ pathEl.setAttribute('d', sparklinePath(h,100,30)); pathEl.setAttribute('stroke', up?'#30d158':'#ff453a'); }
    const held = state.stocks[s.sym]||0;
    let heldEl = row.querySelector('.stock-held');
    if(held>0){
      if(!heldEl){ heldEl = document.createElement('div'); heldEl.className='stock-held'; priceEl.parentElement.appendChild(heldEl); }
      heldEl.textContent = held+tr(' шт','x');
    } else if(heldEl){ heldEl.remove(); }
  });
}
function renderEstate(){
  document.getElementById('estate-bonus').textContent = '+'+Math.round(estateBonusTotal()*100)+'%';
  const el = document.getElementById('estate-list');
  el.innerHTML = `<div class="stat-box glass" style="margin-bottom:14px;"><div class="lbl">${tr('Индекс рынка недвижимости','Real estate market index')}</div><div class="val num c-amber" id="estate-index-val">×${state.propertyIndex.toFixed(3)}</div></div>` +
  REAL_ESTATE.map(e=>{
    const count = estateCount(e.id);
    const capped = e.single && count>=1;
    const cost = estateNextCost(e);
    return `<div class="card glass">
      <div class="card-row">
        <div class="card-icon">${e.icon}</div>
        <div style="flex:1">
          <div class="card-title">${L(e,'name')} ${count>0?`<span class="pill pill-owned">×${count}</span>`:''}</div>
          <div class="card-sub">${e.cost===0?tr('Стартовая локация','Starting location'):tr('Буст дохода за объект','Income boost per property')+': +'+Math.round(e.bonus*100)+'%'}</div>
        </div>
      </div>
      ${capped?'':`<div class="btn-row"><button class="btn btn-amber btn-block aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="buyEstate('${e.id}')">${count>0?tr('Купить ещё за','Buy another for')+' '+fmt(cost):tr('Купить за','Buy for')+' '+fmt(cost)}</button></div>`}
    </div>`;
  }).join('');
  staggerCards(el);
}
// The property index drifts slowly every tick; just update its text
// instead of rebuilding the whole estate card list for it.
function updateEstateLive(){
  if(activeScreen!=='estate') return;
  const el = document.getElementById('estate-index-val');
  if(el) el.textContent = '×'+state.propertyIndex.toFixed(3);
}
function renderLuxuryCard(l){
  const count = luxuryCount(l.id);
  const cost = luxuryNextCost(l);
  return `<div class="card glass">
    <div class="card-row">
      <div class="card-icon">${l.icon}</div>
      <div style="flex:1">
        <div class="card-title">${L(l,'name')} ${count>0?`<span class="pill pill-owned">×${count}</span>`:''}</div>
        <div class="card-sub">+${l.rep} ${tr('к репутации за штуку','reputation per unit')}</div>
      </div>
    </div>
    <div class="btn-row"><button class="btn btn-amber btn-block aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="buyLuxury('${l.id}')">${count>0?tr('Купить ещё за','Buy another for')+' '+fmt(cost):tr('Купить за','Buy for')+' '+fmt(cost)}</button></div>
  </div>`;
}
function renderGarage(){
  const rep = reputationTotal();
  document.getElementById('garage-bonus').textContent = rep+' → +'+Math.round(reputationBonus()*100)+'%';
  const el = document.getElementById('garage-list');
  let html = buildCeoOfficeCardHtml();
  html += `<div class="fleet-group-title">⌚ ${tr('Аксессуары','Accessories')}</div>`;
  LUXURY.filter(l=>l.slot==='accessory').forEach(l=>{ html += renderLuxuryCard(l); });
  html += `<div class="fleet-group-title">🚗 ${tr('Гараж (флот автомобилей)','Garage (car fleet)')}</div>`;
  LUXURY.filter(l=>l.slot==='garage').forEach(l=>{ html += renderLuxuryCard(l); });
  html += `<div class="fleet-group-title">✈️ ${tr('Ангар (яхты и самолёты)','Hangar (yachts and jets)')}</div>`;
  LUXURY.filter(l=>l.slot==='hangar').forEach(l=>{ html += renderLuxuryCard(l); });
  el.innerHTML = html;
  staggerCards(el);
}
function renderSettings(){
  document.getElementById('sw-notif').classList.toggle('on', state.settings.notif);
  renderThemeGrid();
  renderSpeedSelect();
  renderBoostyCard();
  updateSpeedFx();
  const toggleCard = document.getElementById('prestige-toggles-card');
  const rowHire = document.getElementById('row-auto-hire');
  const rowUpgrade = document.getElementById('row-auto-upgrade');
  if(toggleCard && rowHire && rowUpgrade){
    const showHire = state.prestige.count >= 1;
    const showUpgrade = state.prestige.count >= 2;
    toggleCard.style.display = (showHire||showUpgrade) ? '' : 'none';
    rowHire.style.display = showHire ? '' : 'none';
    rowUpgrade.style.display = showUpgrade ? '' : 'none';
    document.getElementById('sw-auto-hire').classList.toggle('on', state.prestige.autoHire);
    document.getElementById('sw-auto-upgrade').classList.toggle('on', state.prestige.autoUpgrade);
  }
  const achBtn = document.getElementById('achievements-btn');
  if(achBtn){
    const unlockedCount = ACHIEVEMENTS.filter(a=>state.achievements[a.id]).length;
    achBtn.textContent = `🏆 ${tr('Достижения','Achievements')} (${unlockedCount}/${ACHIEVEMENTS.length})`;
  }
  const swPush = document.getElementById('sw-push-notif');
  if(swPush) swPush.classList.toggle('on', state.settings.pushNotif);
  const langRu = document.getElementById('lang-ru-btn'), langEn = document.getElementById('lang-en-btn');
  if(langRu) langRu.classList.toggle('active', (state.settings.lang||'ru')==='ru');
  if(langEn) langEn.classList.toggle('active', state.settings.lang==='en');
  updateDevModeUI();
}
function renderSpeedSelect(){
  const sel = document.getElementById('set-speed');
  if(!sel) return;
  const unlocked = state.boosty.unlocked;
  sel.innerHTML = `
    <option value="1">${S('Обычная ×1')}</option>
    <option value="2">${unlocked?tr('Ускоренная ×2','Fast ×2'):tr('Ускоренная ×2','Fast ×2')+' 🔒 Boosty'}</option>
    <option value="4">${unlocked?tr('Ускоренная ×4','Fast ×4'):tr('Ускоренная ×4','Fast ×4')+' 🔒 Boosty'}</option>
  `;
  sel.value = state.settings.speed;
}
function onSpeedChange(val){
  val = parseFloat(val);
  if(val>1 && !state.boosty.unlocked){
    toast(tr('🔒 Ускорение ×2/×4 доступно только по Boosty-подписке','🔒 ×2/×4 speed is only available with a Boosty subscription'));
    document.getElementById('set-speed').value = state.settings.speed;
    return;
  }
  state.settings.speed = val;
  updateSpeedFx();
  save();
  toast(val>1 ? `⚡ ${tr('Скорость игры','Game speed')}: ×${val}` : tr('Скорость игры: обычная','Game speed: normal'));
}
function updateSpeedFx(){
  const el = document.getElementById('speed-fx');
  if(!el) return;
  if(state.settings.speed>1){
    el.classList.add('show');
    document.getElementById('speed-fx-val').textContent = state.settings.speed;
  } else {
    el.classList.remove('show');
  }
}
const ACCENT_THEMES = [
  {id:'default', name:'Классика',  nameEn:'Classic',  icon:'🔵', vars:{'--blue':'#0a84ff','--teal':'#40c8e4','--purple':'#bf5af2'}},
  {id:'emerald', name:'Изумруд',   nameEn:'Emerald',  icon:'🟢', vars:{'--blue':'#30d158','--teal':'#00c896','--purple':'#34c759'}},
  {id:'sunset',  name:'Закат',     nameEn:'Sunset',   icon:'🟠', vars:{'--blue':'#ff9f0a','--teal':'#ff375f','--purple':'#ff6482'}},
  {id:'royal',   name:'Роялти',    nameEn:'Royalty',  icon:'🟣', vars:{'--blue':'#bf5af2','--teal':'#ffd60a','--purple':'#8e44ff'}},
];
function applyAccentTheme(id){
  const theme = ACCENT_THEMES.find(t=>t.id===id) || ACCENT_THEMES[0];
  Object.keys(theme.vars).forEach(k=>document.documentElement.style.setProperty(k, theme.vars[k]));
}
/* ---------- DESIGN THEMES (dark/light are free, all other themes require an active Boosty subscription) ---------- */
const DESIGN_THEMES = [
  {id:'dark', name:'Тёмная', nameEn:'Dark', icon:'🌑', boosty:false,
    vars:{'--bg':'#000000','--text':'#f2f2f7','--dim':'#98989f','--dim2':'#6c6c70','--glass':'rgba(255,255,255,0.055)','--glass2':'rgba(255,255,255,0.09)','--glass-strong':'rgba(255,255,255,0.14)','--border':'rgba(255,255,255,0.12)','--border-strong':'rgba(255,255,255,0.22)',
    '--blue':'#0a84ff','--green':'#30d158','--orange':'#ff9f0a','--red':'#ff453a','--purple':'#bf5af2','--pink':'#ff375f','--teal':'#40c8e4','--yellow':'#ffd60a',
    '--surface':'rgba(20,20,22,.55)','--surface-strong':'rgba(28,28,30,.85)','--tint-xs':'rgba(255,255,255,.02)','--tint-sm':'rgba(255,255,255,.07)','--tint-md':'rgba(255,255,255,.12)','--tint-lg':'rgba(255,255,255,.2)'}},
  {id:'light', name:'Светлая', nameEn:'Light', icon:'☀️', boosty:false,
    vars:{'--bg':'#eef0f4','--text':'#161618','--dim':'#5b5b60','--dim2':'#84848a','--glass':'rgba(0,0,0,0.04)','--glass2':'rgba(0,0,0,0.065)','--glass-strong':'rgba(0,0,0,0.11)','--border':'rgba(0,0,0,0.1)','--border-strong':'rgba(0,0,0,0.2)',
    '--blue':'#0066e0','--green':'#1fa952','--orange':'#e07800','--red':'#e0302a','--purple':'#9a3fd6','--pink':'#e02458','--teal':'#0d95b8','--yellow':'#cf9c00',
    '--surface':'rgba(255,255,255,.72)','--surface-strong':'rgba(255,255,255,.92)','--tint-xs':'rgba(0,0,0,.025)','--tint-sm':'rgba(0,0,0,.08)','--tint-md':'rgba(0,0,0,.14)','--tint-lg':'rgba(0,0,0,.22)'}},
  {id:'neon', name:'Неон', nameEn:'Neon', icon:'💜', boosty:true,
    vars:{'--bg':'#050014','--text':'#f5eaff','--dim':'#b79ee0','--dim2':'#8a6fb0','--glass':'rgba(191,90,242,0.07)','--glass2':'rgba(191,90,242,0.13)','--glass-strong':'rgba(191,90,242,0.2)','--border':'rgba(191,90,242,0.25)','--border-strong':'rgba(191,90,242,0.4)',
    '--blue':'#bf5af2','--green':'#40c8e4','--orange':'#ff9f0a','--red':'#ff375f','--purple':'#d264ff','--pink':'#ff2e9c','--teal':'#5ce1e6','--yellow':'#f5d76e',
    '--surface':'rgba(20,4,36,.6)','--surface-strong':'rgba(28,8,48,.88)','--tint-xs':'rgba(191,90,242,.025)','--tint-sm':'rgba(191,90,242,.09)','--tint-md':'rgba(191,90,242,.15)','--tint-lg':'rgba(191,90,242,.25)'}},
  {id:'gold', name:'Золото', nameEn:'Gold', icon:'🟡', boosty:true,
    vars:{'--bg':'#120d02','--text':'#fff6e0','--dim':'#c9ad76','--dim2':'#8f7a52','--glass':'rgba(255,214,10,0.06)','--glass2':'rgba(255,214,10,0.11)','--glass-strong':'rgba(255,214,10,0.18)','--border':'rgba(255,214,10,0.22)','--border-strong':'rgba(255,214,10,0.35)',
    '--blue':'#ffd60a','--green':'#c9e265','--orange':'#ff9f0a','--red':'#ff6b45','--purple':'#e0a24a','--pink':'#ffb454','--teal':'#e8c66b','--yellow':'#ffe680',
    '--surface':'rgba(28,20,4,.6)','--surface-strong':'rgba(36,26,6,.88)','--tint-xs':'rgba(255,214,10,.025)','--tint-sm':'rgba(255,214,10,.08)','--tint-md':'rgba(255,214,10,.14)','--tint-lg':'rgba(255,214,10,.22)'}},
  {id:'ocean', name:'Океан', nameEn:'Ocean', icon:'🌊', boosty:true,
    vars:{'--bg':'#010b14','--text':'#e3f6ff','--dim':'#7fb8cf','--dim2':'#4f8aa3','--glass':'rgba(64,200,228,0.06)','--glass2':'rgba(64,200,228,0.11)','--glass-strong':'rgba(64,200,228,0.18)','--border':'rgba(64,200,228,0.22)','--border-strong':'rgba(64,200,228,0.35)',
    '--blue':'#0a84ff','--green':'#20d9a8','--orange':'#ffb454','--red':'#ff6b6b','--purple':'#6ab8ff','--pink':'#4fd8e0','--teal':'#40c8e4','--yellow':'#ffd980',
    '--surface':'rgba(4,18,28,.6)','--surface-strong':'rgba(6,26,38,.88)','--tint-xs':'rgba(64,200,228,.025)','--tint-sm':'rgba(64,200,228,.08)','--tint-md':'rgba(64,200,228,.14)','--tint-lg':'rgba(64,200,228,.22)'}},
];
function applyDesignTheme(id){
  const theme = DESIGN_THEMES.find(t=>t.id===id) || DESIGN_THEMES[0];
  Object.keys(theme.vars).forEach(k=>document.documentElement.style.setProperty(k, theme.vars[k]));
  document.documentElement.setAttribute('data-design-theme', theme.id);
}
function isThemeOwned(id){
  const theme = DESIGN_THEMES.find(t=>t.id===id);
  if(!theme) return false;
  if(!theme.boosty) return true;
  return !!state.boosty.unlocked;
}
function selectDesignTheme(id){
  const theme = DESIGN_THEMES.find(t=>t.id===id);
  if(!theme) return;
  if(!isThemeOwned(id)){
    toast(tr('🔒 Эта тема доступна только с Boosty-подпиской','🔒 This theme is only available with a Boosty subscription'));
    playSound('error');
    setSettingsTab('progress');
    return;
  }
  state.settings.theme = id;
  applyDesignTheme(id);
  if(state.boosty.unlocked) applyAccentTheme(state.boosty.theme);
  toast(tr('🎨 Тема применена: ','🎨 Theme applied: ')+L(theme,'name'));
  renderSettings();
  renderAll();
  save();
}
function renderThemeGrid(){
  const el = document.getElementById('theme-grid');
  if(!el) return;
  el.innerHTML = DESIGN_THEMES.map(t=>{
    const active = state.settings.theme===t.id;
    const owned = isThemeOwned(t.id);
    const badge = active ? `<div class="theme-active-pill">✓ ${tr('АКТИВНА','ACTIVE')}</div>` : (!owned ? `<div class="theme-lock">🔒 Boosty</div>` : '');
    const dots = ['--blue','--teal','--purple','--orange'].map(k=>`<div class="theme-swatch-dot" style="background:${t.vars[k]};"></div>`).join('');
    return `<button class="theme-card ${active?'active':''}" onclick="selectDesignTheme('${t.id}')">
      ${badge}
      <div class="theme-swatch" style="background:${t.vars['--bg']};box-shadow:inset 0 0 0 1px ${t.vars['--border']};">${dots}</div>
      <div class="theme-card-name">${t.icon} ${L(t,'name')}</div>
      <div class="theme-card-sub">${owned ? (active?tr('Выбрана','Selected'):tr('Нажмите, чтобы применить','Tap to apply')) : tr('Только с Boosty','Boosty only')}</div>
    </button>`;
  }).join('');
}
function setBoostyTheme(id){
  if(!state.boosty.unlocked){ toast(tr('🔒 Темы доступны только по Boosty','🔒 Themes are only available with Boosty')); return; }
  state.boosty.theme = id;
  applyAccentTheme(id);
  renderSettings();
  save();
  const t = ACCENT_THEMES.find(x=>x.id===id);
  toast(tr('🎨 Тема применена: ','🎨 Theme applied: ')+(t?L(t,'name'):id));
}
function renderBoostyCard(){
  const el = document.getElementById('boosty-card');
  if(!el) return;
  if(state.boosty.unlocked){
    const themeBtns = ACCENT_THEMES.map(t=>`<button class="btn ${state.boosty.theme===t.id?'btn-violet':'btn-outline'}" style="padding:9px 10px;font-size:11.5px;" onclick="setBoostyTheme('${t.id}')">${t.icon} ${L(t,'name')}</button>`).join('');
    el.innerHTML = `
      <div class="boosty-head"><div class="boosty-ic">🚀</div><div class="boosty-title">${tr('Boosty активирован','Boosty activated')} <span class="unlocked-pill">✓ ${tr('РАЗБЛОКИРОВАНО','UNLOCKED')}</span></div></div>
      <div class="boosty-desc">${tr('Спасибо за поддержку! Ваши привилегии:','Thanks for your support! Your perks:')}</div>
      <ul style="margin:6px 0 10px 18px;color:var(--dim);font-size:12px;line-height:1.7;">
        <li>⚡ ${tr('Ускорение игры ×2 и ×4 (в настройках скорости)','Game speed ×2 and ×4 (in speed settings)')}</li>
        <li>🌙 ${tr('Офлайн-доход без потолка на 50% + 100% в первые 24ч','Uncapped offline income at 50% + 100% for the first 24h')}</li>
        <li>🤖 ${tr('Авто-менеджер сайтов открыт бесплатно','Site auto-manager unlocked for free')}</li>
        <li>🏦 ${tr('Ставка по кредиту ниже на 20%, лимит выше на 25%','Loan rate 20% lower, limit 25% higher')}</li>
        <li>🧩 ${tr('+1 дополнительный слот под сайт','+1 extra site slot')}</li>
        <li>🚀 ${tr('Бейдж «Boosty CEO» в рейтинге конкурентов','"Boosty CEO" badge on the competitor leaderboard')}</li>
        <li>🎆 ${tr('Ранний доступ к сезонным событиям (на 2 дня раньше)','Early access to seasonal events (2 days earlier)')}</li>
      </ul>
      <div class="card-sub" style="margin-bottom:6px;">🎨 ${tr('Косметическая тема интерфейса','Interface cosmetic theme')}:</div>
      <div class="btn-row" style="flex-wrap:wrap;">${themeBtns}</div>
      <div class="boosty-status ok" style="margin-top:10px;">${tr('Код','Code')}: ${esc(state.boosty.code||'')}</div>
    `;
  } else {
    el.innerHTML = `
      <div class="boosty-head"><div class="boosty-ic">🚀</div><div class="boosty-title">${tr('Boosty-подписка','Boosty subscription')} <span class="lock-pill">🔒 ${tr('привилегии','perks')}</span></div></div>
      <div class="boosty-desc">${tr('Оформите подписку на Boosty и введите полученный код. Даёт удобство и косметику — баланс для бесплатных игроков не меняется:','Subscribe on Boosty and enter the code you receive. It gives convenience and cosmetics — balance for free players is unaffected:')}</div>
      <ul style="margin:6px 0 10px 18px;color:var(--dim);font-size:12px;line-height:1.7;">
        <li>⚡ ${tr('Ускорение игры ×2 / ×4','Game speed ×2 / ×4')}</li>
        <li>🌙 ${tr('Офлайн-доход без потолка','Uncapped offline income')}</li>
        <li>🤖 ${tr('Авто-менеджер сайтов бесплатно','Site auto-manager for free')}</li>
        <li>🏦 ${tr('Льготная ставка и лимит по кредиту','Discounted loan rate and limit')}</li>
        <li>🧩 ${tr('+1 слот под сайт','+1 site slot')}</li>
        <li>🎨 ${tr('Эксклюзивные темы интерфейса','Exclusive interface themes')}</li>
        <li>🚀 ${tr('Бейдж CEO в рейтинге','CEO badge on the leaderboard')}</li>
        <li>🎆 ${tr('Ранний доступ к сезонным событиям','Early access to seasonal events')}</li>
      </ul>
      <div class="boosty-input-row">
        <input type="text" class="set-select" id="boosty-code-input" placeholder="BOOSTY-XXXX-XXXX" maxlength="20">
        <button class="btn btn-cyan" onclick="redeemBoosty()">${S('Активировать')}</button>
      </div>
      <div class="boosty-status" id="boosty-status"></div>
      <a class="boosty-link" href="${BOOSTY_URL}" target="_blank" rel="noopener">${S('Открыть Boosty →')}</a>
    `;
  }
}
function redeemBoosty(){
  const input = document.getElementById('boosty-code-input');
  const statusEl = document.getElementById('boosty-status');
  if(!input) return;
  const code = input.value.trim().toUpperCase();
  if(!code){ if(statusEl){statusEl.textContent=tr('Введите код','Enter a code'); statusEl.className='boosty-status err';} return; }
  if(!BOOSTY_CODES.includes(code)){
    if(statusEl){ statusEl.textContent=tr('❌ Неверный код','❌ Invalid code'); statusEl.className='boosty-status err'; }
    toast(tr('❌ Неверный код Boosty','❌ Invalid Boosty code'));
    return;
  }
  state.boosty.unlocked = true;
  state.boosty.code = code;
  state.autoManagerUnlocked = true; // Boosty perk: auto-manager is free instead of a cash unlock
  applyAccentTheme(state.boosty.theme);
  toast(tr('🎉 Boosty активирован! Все привилегии подписки разблокированы','🎉 Boosty activated! All subscription perks are unlocked'));
  log(tr('🚀 Активирована Boosty-подписка — ускорение, безлимитный офлайн-доход, авто-менеджер, льготный кредит, +1 слот, бейдж CEO и ранний доступ к сезонным событиям','🚀 Boosty subscription activated — speed boost, unlimited offline income, auto-manager, discounted loan, +1 slot, CEO badge and early access to seasonal events'));
  renderSettings();
  renderAll();
  save();
}
function renderAll(){
  renderHeader();
  renderTicker();
  renderDash();
  renderFinanceCard();
  // Only rebuild the screen the person is actually looking at — the other
  // three screens' card lists are hidden behind display:none anyway, and
  // nav() already does a full refresh the moment someone switches to one,
  // so there's no need to tear down and rebuild all four every single
  // time any action happens anywhere in the app (e.g. upgrading a site
  // used to silently rebuild the estate/garage/market lists too).
  if(activeScreen!=='dash') renderScreenList(activeScreen);
  refreshInboxBadge();
}

/* ---------- MAIN MENU ---------- */
function hasSavedProgress(){ return !!state.setupDone || state.sites.length > 0 || state.day > 1; }
function mmPlay(){
  document.getElementById('main-menu').classList.add('hidden');
  if(hasSavedProgress()){
    nav('dash');
    if(pendingWelcomeBack){ showWelcomeBackModal(pendingWelcomeBack); pendingWelcomeBack = null; save(); }
  }
  else showSetupScreen();
}
// Settings used to be reachable from the main menu by simply hiding the menu
// and switching to the settings screen — but that left the full bottom nav
// (Дашборд/Сайты/Биржа/...) sitting right there, letting you tap straight
// into the game without ever pressing "Играть". body.pregame now hides the
// header + bottom nav while settings is open pre-game, and shows a dedicated
// "← Назад в меню" button instead.
function mmSettings(){
  document.body.classList.add('pregame');
  document.getElementById('main-menu').classList.add('hidden');
  nav('settings');
}
function mmBackFromSettings(){
  document.body.classList.remove('pregame');
  showMainMenu();
}
function showMainMenu(){
  const cBtn = document.getElementById('mm-continue-btn');
  if(cBtn) cBtn.style.display = hasSavedProgress() ? '' : 'none';
  document.getElementById('main-menu').classList.remove('hidden');
}

/* ---------- NEW GAME SETUP (CEO name + difficulty) ---------- */
let chosenDifficulty = 'normal';
function renderDifficultyButtons(){
  const el = document.getElementById('setup-diff-row');
  if(!el) return;
  el.innerHTML = Object.keys(DIFFICULTY_META).map(key=>{
    const d = DIFFICULTY_META[key];
    return `<button class="diff-btn${key===chosenDifficulty?' active':''}" onclick="setDifficulty('${key}')">
      <div class="dt">${d.icon} ${L(d,'label')}</div>
      <div class="dd">${L(d,'desc')}</div>
    </button>`;
  }).join('');
}
function setDifficulty(key){ chosenDifficulty = key; renderDifficultyButtons(); }
function showSetupScreen(){
  chosenDifficulty = 'normal';
  renderDifficultyButtons();
  const inp = document.getElementById('setup-name-input');
  if(inp) inp.value = '';
  document.getElementById('setup-screen').classList.remove('hidden');
  setTimeout(()=>{ if(inp) inp.focus(); }, 50);
}
function confirmSetup(){
  const inp = document.getElementById('setup-name-input');
  const name = (inp && inp.value.trim()) || tr('Игрок','Player');
  state.ceoName = name.slice(0,18);
  state.difficulty = chosenDifficulty;
  state.cash = DIFFICULTY_META[chosenDifficulty].startCash;
  state.setupDone = true;
  document.getElementById('setup-screen').classList.add('hidden');
  save(); renderAll();
  nav('dash');
  toast(`${tr('Добро пожаловать','Welcome')}, ${state.ceoName}! ${tr('Режим','Mode')}: ${L(DIFFICULTY_META[chosenDifficulty],'label')}`);
  if(!state.onboarding.done) setTimeout(startOnboarding, 500);
}

/* ---------- ONBOARDING TOUR (first-time players only) ---------- */
const ONBOARD_STEPS = [
  {icon:'👋', title:'Добро пожаловать в WEB EMPIRE!', titleEn:'Welcome to WEB EMPIRE!', text:'Быстрый тур на 20 секунд — покажем, куда жать в первые минуты. Потом полностью уберём.', textEn:'A quick 20-second tour — we\'ll show you where to tap in the first few minutes, then get out of your way.'},
  {icon:'🌐', title:'Начните с вкладки «Сайты»', titleEn:'Start with the "Sites" tab', text:'Внизу экрана откройте «Сайты» и купите свой первый бизнес — это основной источник дохода.', textEn:'At the bottom of the screen, open "Sites" and buy your first business — it\'s your main source of income.'},
  {icon:'📐', title:'Прокачивайте треки', titleEn:'Upgrade your tracks', text:'Внутри каждого сайта есть 4 трека: дизайн, трафик, монетизация, инфраструктура. Прокачивайте самый дешёвый — это быстрее всего окупается.', textEn:'Every site has 4 tracks: design, traffic, monetization, infrastructure. Upgrade the cheapest one — it pays off the fastest.'},
  {icon:'💵', title:'Следите за чистыми активами', titleEn:'Keep an eye on net worth', text:'Карточка «Чистые активы» на дашборде — главный показатель роста. От неё зависят новые слоты под сайты и ранги.', textEn:'The "Net worth" card on the dashboard is your main growth metric. It determines new site slots and ranks.'},
  {icon:'📋', title:'Не забывайте про задания', titleEn:'Don\'t forget your quests', text:'На дашборде появится плашка «Задания дня» — 3 простых цели с наградой. Обновляются каждый день.', textEn:'A "Daily quests" panel will appear on the dashboard — 3 simple goals with a reward. They refresh every day.'},
  {icon:'⚙️', title:'Готово!', titleEn:'All set!', text:'Остальное — в разделе «Ещё» (настройки, достижения, Boosty). Удачи в построении империи!', textEn:'Everything else is under "More" (settings, achievements, Boosty). Good luck building your empire!'},
];
let onboardStepIdx = 0;
function startOnboarding(){
  onboardStepIdx = 0;
  document.getElementById('onboard-bg').classList.add('show');
  renderOnboardStep();
}
function renderOnboardStep(){
  const s = ONBOARD_STEPS[onboardStepIdx];
  const dots = ONBOARD_STEPS.map((_,i)=>`<div class="onboard-dot${i===onboardStepIdx?' active':''}"></div>`).join('');
  const isLast = onboardStepIdx === ONBOARD_STEPS.length-1;
  document.getElementById('onboard-card').innerHTML = `
    <div class="onboard-icon">${s.icon}</div>
    <div class="onboard-title">${esc(L(s,'title'))}</div>
    <div class="onboard-text">${esc(L(s,'text'))}</div>
    <div class="onboard-dots">${dots}</div>
    <div class="btn-row">
      ${isLast?'':`<button class="btn btn-outline btn-block" onclick="finishOnboarding()">${S('Пропустить')}</button>`}
      <button class="btn btn-cyan btn-block" onclick="onboardNext()">${isLast?S('Начать!'):S('Далее')}</button>
    </div>`;
}
function onboardNext(){
  if(onboardStepIdx >= ONBOARD_STEPS.length-1){ finishOnboarding(); return; }
  onboardStepIdx++;
  renderOnboardStep();
}
function finishOnboarding(){
  state.onboarding.done = true;
  document.getElementById('onboard-bg').classList.remove('show');
  save();
}

/* ---------- BOOT ---------- */
/* ============================================================
   СОЦФИЧИ, АТМОСФЕРА И ТЕХНИЧЕСКИЕ УЛУЧШЕНИЯ (июль 2026)
   ============================================================ */

/* ---------- 5. СОЦФИЧИ ---------- */

/* -- 5.1 Реферальная система --
   Без собственного бота-бэкенда невозможно гарантированно начислить
   бонус ПРИГЛАШАЮЩЕМУ (это должен делать сервер/бот, который видит
   обоих пользователей). Поэтому реализована честная клиентская
   половина: у каждого игрока есть свой персональный код, ссылка вида
   ?ref=CODE (а внутри Telegram — t.me/<bot>?start=ref_CODE), и при
   переходе по такой ссылке НОВЫЙ игрок получает стартовый бонус один
   раз. Код реферера сохраняется в его сохранении, чтобы бот-бэкенд
   (если/когда он появится) мог досчитать вознаграждение по логам. */
function genReferralCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i=0;i<6;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function getTelegramBotUsername(){
  return 'WebEmpireGameBot';
}
function referralLink(){
  const bot = getTelegramBotUsername();
  const inTelegram = !!(window.Telegram && window.Telegram.WebApp);
  if(inTelegram) return `https://t.me/${bot}?start=ref_${state.referral.code}`;
  const url = new URL(location.href);
  url.searchParams.set('ref', state.referral.code);
  return url.toString();
}
function detectIncomingReferral(){
  try{
    let refCode = null;
    if(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param){
      const sp = window.Telegram.WebApp.initDataUnsafe.start_param;
      if(sp && sp.startsWith('ref_')) refCode = sp.slice(4);
    }
    if(!refCode){
      const params = new URLSearchParams(location.search);
      if(params.get('ref')) refCode = params.get('ref');
    }
    if(refCode && refCode !== state.referral.code && !state.referral.referredBy && !hasSavedProgress()){
      state.referral.referredBy = refCode;
    }
  }catch(e){}
}
function claimReferralBonus(){
  if(!state.referral.referredBy || state.referral.bonusClaimed){ toast(tr('Бонус недоступен','Bonus unavailable')); return; }
  state.referral.bonusClaimed = true;
  state.cash += 500;
  toast(tr('🎁 +$500 за переход по реферальной ссылке!','🎁 +$500 for using a referral link!'));
  log('🎁 Получен бонус новичка +$500 по реферальной ссылке от '+esc(state.referral.referredBy));
  playSound('buy');
  renderAll(); save();
  closeModal();
}
function openReferralModal(){
  const link = referralLink();
  const hasIncoming = state.referral.referredBy && !state.referral.bonusClaimed;
  openModal(`
    <h3>🎁 Пригласить друга</h3>
    <p style="color:var(--dim);font-size:13px;margin-bottom:12px;">Отправьте другу свою ссылку. Она пометит его игру вашим кодом — когда появится бот-бэкенд, вы оба сможете получить награду за приглашение.</p>
    <div class="boosty-input-row">
      <input type="text" class="set-select" id="ref-link-input" readonly value="${esc(link)}">
      <button class="btn btn-cyan" onclick="copyReferralLink()">Копировать</button>
    </div>
    <div class="card-sub" style="margin:12px 0 4px;">Ваш код: <b class="num">${esc(state.referral.code)}</b> · приглашений отмечено: ${state.referral.invitesClaimed}</div>
    ${hasIncoming ? `<div class="btn-row" style="margin-top:14px;"><button class="btn btn-violet btn-block" onclick="claimReferralBonus()">🎁 Забрать бонус новичка (+$500)</button></div>` : ''}
    <div class="btn-row" style="margin-top:14px;"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>
  `);
}
function copyReferralLink(){
  const input = document.getElementById('ref-link-input');
  if(!input) return;
  try{
    input.select(); input.setSelectionRange(0,999);
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value);
    else document.execCommand('copy');
    toast(tr('🔗 Ссылка скопирована','🔗 Link copied'));
  }catch(e){ toast(tr('Не удалось скопировать — выделите вручную','Could not copy — select manually')); }
}

/* -- 5.2 Карточка-скриншот прогресса -- */
function buildShareCardCanvas(){
  const cv = document.createElement('canvas');
  cv.width = 800; cv.height = 450;
  const ctx = cv.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,800,450);
  grad.addColorStop(0,'#0a1830'); grad.addColorStop(1,'#1a0a30');
  ctx.fillStyle = grad; ctx.fillRect(0,0,800,450);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for(let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(100+i*140, 60+((i%2)*300), 90, 0, Math.PI*2); ctx.fill(); }
  ctx.fillStyle = '#40c8e4'; ctx.font = '700 30px Inter, sans-serif';
  ctx.fillText('🌐 WEB EMPIRE', 40, 60);
  ctx.fillStyle = '#98989f'; ctx.font = '400 16px Inter, sans-serif';
  ctx.fillText('Digital Tycoon', 40, 86);
  const nw = netWorth();
  const rank = currentRank(nw);
  ctx.font = '64px sans-serif'; ctx.fillText(state.ceo.avatar||'🧑\u200d💼', 40, 170);
  ctx.fillStyle = '#f2f2f7'; ctx.font = '700 26px Inter, sans-serif';
  ctx.fillText(`CEO ${state.ceoName}`, 120, 150);
  ctx.fillStyle = '#ffd60a'; ctx.font = '600 18px Inter, sans-serif';
  ctx.fillText(`${rank.icon} ${L(rank,'title')}`, 120, 178);
  ctx.fillStyle = '#30d158'; ctx.font = '700 46px JetBrains Mono, monospace';
  ctx.fillText('$'+fmt(nw), 40, 260);
  ctx.fillStyle = '#98989f'; ctx.font = '400 16px Inter, sans-serif';
  ctx.fillText(S('Чистые активы'), 40, 285);
  const stats = [
    [tr('День','Day'), state.day],
    [tr('Сайтов','Sites'), state.sites.length],
    [tr('Доход/сек','Income/sec'), '$'+fmt(totalIncomePerSec())],
    [S('Перерождений'), state.prestige.count],
  ];
  stats.forEach((s,i)=>{
    const x = 40 + i*190;
    ctx.fillStyle = '#6c6c70'; ctx.font = '400 13px Inter, sans-serif';
    ctx.fillText(s[0], x, 340);
    ctx.fillStyle = '#f2f2f7'; ctx.font = '700 22px JetBrains Mono, monospace';
    ctx.fillText(String(s[1]), x, 368);
  });
  ctx.fillStyle = '#6c6c70'; ctx.font = '400 13px Inter, sans-serif';
  ctx.fillText(tr('webempire.game · построй свою цифровую империю','webempire.game · build your digital empire'), 40, 420);
  return cv;
}
function openShareCardModal(){
  openModal(`<h3>🖼️ Карточка прогресса</h3>
    <div id="share-card-preview" style="border-radius:14px;overflow:hidden;margin:10px 0;border:1px solid var(--border);"></div>
    <div class="btn-row">
      <button class="btn btn-cyan btn-block" onclick="downloadShareCard()">⬇️ Скачать PNG</button>
      <button class="btn btn-outline btn-block" id="share-card-share-btn" onclick="shareCardNatively()">📤 Поделиться</button>
    </div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>`);
  const cv = buildShareCardCanvas();
  cv.style.width = '100%'; cv.style.display = 'block';
  const holder = document.getElementById('share-card-preview');
  if(holder) holder.appendChild(cv);
  if(!(navigator.share)){ const b=document.getElementById('share-card-share-btn'); if(b) b.style.display='none'; }
}
function downloadShareCard(){
  const cv = document.querySelector('#share-card-preview canvas') || buildShareCardCanvas();
  const a = document.createElement('a');
  a.download = 'web-empire-progress.png';
  a.href = cv.toDataURL('image/png');
  a.click();
  toast(tr('⬇️ Карточка сохранена','⬇️ Card saved'));
}
async function shareCardNatively(){
  const cv = document.querySelector('#share-card-preview canvas') || buildShareCardCanvas();
  try{
    cv.toBlob(async (blob)=>{
      if(!blob) return;
      const file = new File([blob], 'web-empire-progress.png', {type:'image/png'});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title:'Web Empire', text:`Мой прогресс в Web Empire: $${fmt(netWorth())}!`});
      } else {
        await navigator.share({title:'Web Empire', text:`Мой прогресс в Web Empire: $${fmt(netWorth())}!`});
      }
    }, 'image/png');
  }catch(e){ toast(tr('Не удалось поделиться','Could not share')); }
}

/* -- 5.3 Сравнение с друзьями --
   Без сервера сравнение реализовано через компактный "код прогресса":
   каждый игрок генерирует у себя такой код и присылает его другу
   (в Telegram-чат, например), а друг вставляет его в это же окно. */
function myCompareCode(){
  const payload = {n:state.ceoName, a:state.ceo.avatar, nw:Math.round(netWorth()), d:state.day, s:state.sites.length, r:state.prestige.count, ip:Math.round(totalIncomePerSec())};
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
function openCompareModal(){
  openModal(`<h3>🆚 Сравнить с другом</h3>
    <p style="color:var(--dim);font-size:13px;margin-bottom:10px;">Отправьте другу свой код, а его код вставьте сюда — увидите, кто впереди.</p>
    <div class="card-sub" style="margin-bottom:4px;">Ваш код:</div>
    <div class="boosty-input-row">
      <input type="text" class="set-select" id="my-compare-code" readonly value="${myCompareCode()}">
      <button class="btn btn-cyan" onclick="copyCompareCode()">Копировать</button>
    </div>
    <div class="card-sub" style="margin:14px 0 4px;">Код друга:</div>
    <div class="boosty-input-row">
      <input type="text" class="set-select" id="friend-compare-code" placeholder="Вставьте код друга">
      <button class="btn btn-violet" onclick="runCompare()">Сравнить</button>
    </div>
    <div id="compare-result"></div>
    <div class="btn-row" style="margin-top:14px;"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>`);
}
function copyCompareCode(){
  const input = document.getElementById('my-compare-code');
  if(!input) return;
  try{ input.select(); input.setSelectionRange(0,999); if(navigator.clipboard) navigator.clipboard.writeText(input.value); else document.execCommand('copy'); toast(tr('🔗 Код скопирован','🔗 Code copied')); }catch(e){}
}
function runCompare(){
  const input = document.getElementById('friend-compare-code');
  const resEl = document.getElementById('compare-result');
  if(!input || !resEl) return;
  let friend;
  try{ friend = JSON.parse(decodeURIComponent(escape(atob(input.value.trim())))); }
  catch(e){ resEl.innerHTML = '<p style="color:var(--red);font-size:13px;margin-top:10px;">Неверный код</p>'; return; }
  const me = {n:state.ceoName, a:state.ceo.avatar, nw:Math.round(netWorth()), d:state.day, s:state.sites.length, r:state.prestige.count, ip:Math.round(totalIncomePerSec())};
  const rows = [
    ['Чистые активы', '$'+fmt(me.nw), '$'+fmt(friend.nw), me.nw>=friend.nw],
    ['Доход/сек', '$'+fmt(me.ip), '$'+fmt(friend.ip), me.ip>=friend.ip],
    ['День', me.d, friend.d, me.d>=friend.d],
    ['Сайтов', me.s, friend.s, me.s>=friend.s],
    ['Перерождений', me.r, friend.r, me.r>=friend.r],
  ];
  resEl.innerHTML = `
    <div class="card-row" style="margin-top:14px;">
      <div style="flex:1;text-align:center;"><div style="font-size:28px;">${esc(me.a||'🧑\u200d💼')}</div><div class="card-title" style="font-size:13px;">${esc(me.n)} (вы)</div></div>
      <div style="padding:0 10px;color:var(--dim);">VS</div>
      <div style="flex:1;text-align:center;"><div style="font-size:28px;">${esc(friend.a||'🧑\u200d💼')}</div><div class="card-title" style="font-size:13px;">${esc(friend.n||'Друг')}</div></div>
    </div>
    <div style="margin-top:8px;">${rows.map(r=>`
      <div class="switch-row" style="padding:8px 0;">
        <span style="flex:1;color:${r[3]?'var(--green)':'var(--dim)'};text-align:left;font-size:12.5px;">${r[1]}</span>
        <span style="width:110px;text-align:center;color:var(--dim);font-size:11px;">${r[0]}</span>
        <span style="flex:1;color:${!r[3]?'var(--green)':'var(--dim)'};text-align:right;font-size:12.5px;">${r[2]}</span>
      </div>`).join('')}</div>`;
}

/* ---------- 6. КОНТЕНТ / АТМОСФЕРА ---------- */

/* -- 6.1 Кастомизация CEO: аватар + кабинет -- */
const CEO_AVATARS = [
  {id:'a0', icon:'🧑\u200d💼', name:'Классика',      unlockRank:0},
  {id:'a1', icon:'👩\u200d💻', name:'Разработчица',   unlockRank:0},
  {id:'a2', icon:'🧑\u200d💻', name:'Разработчик',    unlockRank:1},
  {id:'a3', icon:'🕶️',        name:'Инкогнито',      unlockRank:2},
  {id:'a4', icon:'🤵',        name:'Инвестор',       unlockRank:3},
  {id:'a5', icon:'🦾',        name:'Киборг',         unlockRank:4},
  {id:'a6', icon:'🧙',        name:'Гуру рынка',     unlockRank:5},
  {id:'a7', icon:'👽',        name:'Тайкун из будущего', unlockRank:6},
  {id:'a8', icon:'👑',        name:'Легенда',        unlockRank:7},
];
const CEO_OFFICES = [
  {id:'default', name:'Гараж-старт',     icon:'🏚️', grad:'linear-gradient(135deg,#1c1c1e,#2c2c2e)', unlockRebirths:0},
  {id:'openspace', name:'Опенспейс',     icon:'🏢', grad:'linear-gradient(135deg,#0a2540,#0a84ff33)', unlockRebirths:0},
  {id:'penthouse', name:'Пентхаус',      icon:'🌆', grad:'linear-gradient(135deg,#2a0a40,#bf5af233)', unlockRebirths:1},
  {id:'skyscraper', name:'Небоскрёб',    icon:'🏙️', grad:'linear-gradient(135deg,#0a3020,#30d15833)', unlockRebirths:2},
  {id:'orbital', name:'Орбитальный офис', icon:'🛰️', grad:'linear-gradient(135deg,#1a0a30,#40c8e433)', unlockRebirths:3},
];
function ceoUnlockedAvatars(){ const idx = currentRankIndex(netWorth()); return CEO_AVATARS.filter(a=>a.unlockRank<=idx); }
function ceoUnlockedOffices(){ return CEO_OFFICES.filter(o=>o.unlockRebirths<=state.prestige.count); }
function setCeoAvatar(id){
  const a = CEO_AVATARS.find(x=>x.id===id);
  if(!a || !ceoUnlockedAvatars().some(x=>x.id===id)){ toast(tr('🔒 Ещё не разблокировано','🔒 Not unlocked yet')); return; }
  state.ceo.avatar = a.icon; renderAll(); openCeoCustomizeModal(); save();
}
function setCeoOffice(id){
  const o = CEO_OFFICES.find(x=>x.id===id);
  if(!o || !ceoUnlockedOffices().some(x=>x.id===id)){ toast(tr('🔒 Нужно больше перерождений','🔒 More rebirths needed')); return; }
  state.ceo.office = o.id; renderGarage(); openCeoCustomizeModal(); save();
}
function openCeoCustomizeModal(){
  const unlockedA = ceoUnlockedAvatars().map(a=>a.id);
  const unlockedO = ceoUnlockedOffices().map(o=>o.id);
  const avatarHtml = CEO_AVATARS.map(a=>{
    const locked = !unlockedA.includes(a.id);
    return `<button class="btn ${state.ceo.avatar===a.icon?'btn-violet':'btn-outline'}" style="padding:10px 6px;font-size:22px;position:relative;" ${locked?'disabled':''} onclick="setCeoAvatar('${a.id}')" title="${esc(a.name)}">${locked?'🔒':a.icon}</button>`;
  }).join('');
  const officeHtml = CEO_OFFICES.map(o=>{
    const locked = !unlockedO.includes(o.id);
    return `<button class="btn ${state.ceo.office===o.id?'btn-violet':'btn-outline'}" style="padding:9px 8px;font-size:12px;" ${locked?'disabled':''} onclick="setCeoOffice('${o.id}')">${locked?'🔒 ':o.icon+' '}${esc(o.name)}${locked?' (перерождение '+o.unlockRebirths+')':''}</button>`;
  }).join('');
  openModal(`<h3>🎭 Кабинет CEO</h3>
    <p style="color:var(--dim);font-size:13px;margin-bottom:10px;">Чисто косметическая настройка — статус-символ, растущий вместе с вашим рангом и перерождениями.</p>
    <div class="card-sub" style="margin-bottom:6px;">Аватар (открывается рангом)</div>
    <div class="btn-row" style="flex-wrap:wrap;">${avatarHtml}</div>
    <div class="card-sub" style="margin:14px 0 6px;">Кабинет (открывается перерождением)</div>
    <div class="btn-row" style="flex-wrap:wrap;flex-direction:column;">${officeHtml}</div>
    <div class="btn-row" style="margin-top:14px;"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>`);
}
function buildCeoOfficeCardHtml(){
  const office = CEO_OFFICES.find(o=>o.id===state.ceo.office) || CEO_OFFICES[0];
  return `<div class="card glass" style="margin-bottom:14px;cursor:pointer;background:${office.grad};" onclick="openCeoCustomizeModal()">
    <div class="card-row">
      <div class="card-icon" style="font-size:30px;">${esc(state.ceo.avatar||'🧑\u200d💼')}</div>
      <div style="flex:1">
        <div class="card-title">CEO ${esc(state.ceoName)}</div>
        <div class="card-sub">${office.icon} ${esc(office.name)} · нажмите, чтобы настроить</div>
      </div>
      <div class="card-icon" style="font-size:18px;">🎭</div>
    </div>
  </div>`;
}

/* -- 6.2 Фоновая музыка (синтезированный луп, Web Audio API) -- */
let musicNodes = null;
function startMusicLoop(){
  if(musicNodes) return;
  const ctx = ensureAudioCtx();
  if(!ctx) return;
  if(ctx.state==='suspended'){ ctx.resume().catch(()=>{}); }
  const vol = (typeof state.settings.musicVolume==='number' ? state.settings.musicVolume : 35) / 100;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.05*vol), ctx.currentTime+1.2);
  const chords = [[220,277.18,329.63],[196,246.94,293.66],[174.61,220,261.63],[196,246.94,293.66]];
  let chordIdx = 0;
  const pads = [];
  function playChord(){
    pads.forEach(p=>{ try{ p.gain.gain.cancelScheduledValues(ctx.currentTime); p.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime+1.5); p.osc.stop(ctx.currentTime+1.6); }catch(e){} });
    pads.length = 0;
    const freqs = chords[chordIdx % chords.length];
    chordIdx++;
    freqs.forEach(f=>{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime+2);
      osc.connect(gain); gain.connect(master);
      osc.start();
      pads.push({osc, gain});
    });
  }
  playChord();
  const intervalId = setInterval(()=>{ if(musicNodes) playChord(); }, 6000);
  musicNodes = {ctx, master, intervalId, pads, _playChord: playChord};
}
function stopMusicLoop(){
  if(!musicNodes) return;
  const {master, intervalId, pads, ctx} = musicNodes;
  clearInterval(intervalId);
  try{
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime+0.8);
    pads.forEach(p=>{ try{ p.osc.stop(ctx.currentTime+0.9); }catch(e){} });
  }catch(e){}
  musicNodes = null;
}
/* Battery fix: fully stop the loop (clear interval, stop oscillators, suspend ctx)
   when the tab is hidden, instead of letting setInterval/oscillators keep running
   in the background. Restart cleanly when the tab becomes visible again. */
function pauseMusicLoop(){
  if(!musicNodes) return;
  const {intervalId, ctx} = musicNodes;
  clearInterval(intervalId);
  musicNodes.intervalId = null;
  try{ if(ctx && ctx.state==='running') ctx.suspend(); }catch(e){}
}
function resumeMusicLoopIfNeeded(){
  if(!state.settings || !state.settings.music) return;
  if(musicNodes && musicNodes.intervalId==null){
    const {ctx} = musicNodes;
    try{ if(ctx && ctx.state==='suspended') ctx.resume().catch(()=>{}); }catch(e){}
    musicNodes.intervalId = setInterval(()=>{ if(musicNodes) musicNodes._playChord && musicNodes._playChord(); }, 6000);
  }
}
function toggleMusic(){
  state.settings.music = !state.settings.music;
  document.getElementById('sw-music').classList.toggle('on', state.settings.music);
  if(state.settings.music) startMusicLoop(); else stopMusicLoop();
  save();
}
function onMusicVolumeChange(val){
  state.settings.musicVolume = Number(val);
  const lbl = document.getElementById('set-music-volume-val');
  if(lbl) lbl.textContent = val+'%';
  if(musicNodes){ const vol = state.settings.musicVolume/100; musicNodes.master.gain.linearRampToValueAtTime(Math.max(0.0001,0.05*vol), musicNodes.ctx.currentTime+0.3); }
  save();
}

/* ---------- 7. ТЕХНИЧЕСКОЕ ---------- */

/* -- 7.1 Локализация EN --
   Базовая i18n-инфраструктура + перевод статичной оболочки интерфейса
   (нижняя навигация, заголовки экранов, настройки, главное меню).
   Динамические тексты внутри игровой логики (сотни строк во всех
   функциях рендера) остаются на русском в этой версии — полный
   перевод каждой строки требует отдельного большого прохода по
   каждой функции. */
const I18N = {
  ru: {
    'nav.dash':'Дашборд', 'nav.sites':'Сайты', 'nav.market':'Биржа', 'nav.estate':'Активы', 'nav.inbox':'Уведомления', 'nav.settings':'Ещё',
    'title.dash':'Обзор', 'title.sites':'Мой бизнес', 'title.market':'Биржа', 'title.estate':'Активы', 'title.inbox':'Уведомления', 'title.settings':'Настройки',
    'settings.lang':'Язык / Language', 'settings.social':'Сообщество',
    'mm.play':'🚀 Играть', 'mm.continue':'▶ Продолжить', 'mm.settings':'⚙️ Настройки',
    'mm.tag':'Digital Tycoon — построй свою цифровую империю',
    'mm.foot':'v2.0 · прогресс сохраняется автоматически',
    'setup.title':'Прежде чем начать',
    'setup.sub':'Представьтесь и выберите сложность — это можно будет увидеть, но не поменять позже',
    'setup.namelabel':'Как вас зовут?',
    'setup.difflabel':'Сложность',
    'setup.start':'🚀 Начать бизнес',
    'ending.title':'Карьера завершена',
    'ending.tag':'Три перерождения позади — это финал основной истории WEB EMPIRE',
    'ending.endless':'♾️ Играть в Endless-режиме',
    'ending.continue':'Продолжить как есть',
    'speedfx.label':'Ускорение',
    'dash.networth':'Чистые активы','dash.cash':'Наличные','dash.incomepersec':'Доход/сек','dash.portfolio':'Портфель','dash.reputation':'Репутация',
    'dash.activeevents':'⚡ Активные события','dash.moretoggle':'Ещё: ранг, перерождение, финансы, история',
    'dash.nextrank':'До следующего ранга: —','dash.seasonevent':'Событие недели','dash.loading':'Загрузка...',
    'dash.taxes':'Налоги',
    'dash.quickactions':'Быстрые действия','dash.upgradebiz':'Прокачать бизнес','dash.upgradebizsub':'Выберите, что именно улучшить','dash.gotosites':'Перейти к сайтам',
    'dash.leaderboard':'Рейтинг конкурентов','dash.leaderboardsub':'Сравните свою империю с локальными NPC','dash.openleaderboard':'Открыть рейтинг',
    'dash.eventfeed':'Лента событий',
    'sites.sub':'Прокачивайте отдельно дизайн, трафик, монетизацию и инфраструктуру',
    'sites.recipebook':'📖 Книга рецептов гибридов',
    'market.sub':'Акции и криптовалюта. Цены меняются каждую секунду.',
    'market.portfoliovalue':'Стоимость портфеля','market.cash':'Свободные средства',
    'market.stocks':'📈 Акции','market.crypto':'🪙 Крипто',
    'estate.sub':'Недвижимость и статус-символы — оба дают постоянный буст к доходу',
    'estate.realestate':'🏢 Недвижимость','estate.status':'🚗 Статус',
    'estate.currentboost':'Текущий буст дохода','estate.reptoboost':'Репутация → буст дохода',
    'inbox.sub':'Всё, что требует внимания — в одном месте',
    'settings.backtomenu':'← Назад в меню',
    'settings.tab.design':'🎨 Дизайн','settings.tab.mode':'🎯 Режим игры','settings.tab.progress':'🏆 Прогресс','settings.tab.social':'👥 Сообщество','settings.tab.data':'💾 Данные',
    'settings.modes.title':'Режимы игры скоро появятся','settings.modes.sub':'Сайты, приложения и нейросети как отдельные режимы — в разработке',
    'settings.eventnotif':'Уведомления о событиях','settings.theme':'🎨 Тема оформления',
    'settings.gamespeed':'Скорость игры',
    'settings.achievements':'🏆 Достижения','settings.dailyquests':'📋 Задания дня','settings.stats':'📊 Общая статистика',
    'settings.autohire':'🤝 Авто-найм сотрудников','settings.autoupgrade':'🤖 Авто-прокачка треков',
    'settings.pushnotif':'🔔 Локальные уведомления',
    'settings.pushnotifsub':'Напомнит, если стрик скоро сгорит или событие недели заканчивается — только пока приложение открыто в фоне (не после полного закрытия)',
    'settings.boosty':'Boosty-подписка',
    'settings.invitefriend':'🎁 Пригласить друга','settings.progresscard':'🖼️ Карточка прогресса','settings.compare':'🆚 Сравнить с другом','settings.ceooffice':'🎭 Кабинет CEO',
    'settings.exportsave':'📤 Экспорт сохранения в файл','settings.importsave':'📥 Импорт сохранения из файла','settings.resetprogress':'🗑️ Сбросить прогресс',
    'settings.autosave':'Автосохранение каждые 15 сек',
    'settings.devmode':'🛠️ Режим тестирования (dev)','settings.dev.skipday':'⏭️ Пропустить день','settings.dev.prestigepts':'+50 очков перерождения',
    'settings.dev.automanager':'🤖 Открыть авто-менеджер','settings.dev.maxtracks':'🌐 Макс. уровень всех треков','settings.dev.disable':'Выключить dev-режим',
  },
  en: {
    'nav.dash':'Dashboard', 'nav.sites':'Sites', 'nav.market':'Market', 'nav.estate':'Assets', 'nav.inbox':'Notifications', 'nav.settings':'More',
    'title.dash':'Overview', 'title.sites':'My Business', 'title.market':'Stock Market', 'title.estate':'Assets', 'title.inbox':'Notifications', 'title.settings':'Settings',
    'settings.lang':'Язык / Language', 'settings.social':'Community',
    'mm.play':'🚀 Play', 'mm.continue':'▶ Continue', 'mm.settings':'⚙️ Settings',
    'mm.tag':'Digital Tycoon — build your digital empire',
    'mm.foot':'v2.0 · progress saves automatically',
    'setup.title':'Before you start',
    'setup.sub':'Introduce yourself and pick a difficulty — visible later, but not changeable',
    'setup.namelabel':'What\'s your name?',
    'setup.difflabel':'Difficulty',
    'setup.start':'🚀 Start business',
    'ending.title':'Career complete',
    'ending.tag':'Three rebirths behind you — this is the end of WEB EMPIRE\'s main story',
    'ending.endless':'♾️ Play Endless mode',
    'ending.continue':'Continue as is',
    'speedfx.label':'Boost',
    'dash.networth':'Net worth','dash.cash':'Cash','dash.incomepersec':'Income/sec','dash.portfolio':'Portfolio','dash.reputation':'Reputation',
    'dash.activeevents':'⚡ Active events','dash.moretoggle':'More: rank, rebirth, finances, history',
    'dash.nextrank':'To next rank: —','dash.seasonevent':'Weekly event','dash.loading':'Loading...',
    'dash.taxes':'Taxes',
    'dash.quickactions':'Quick actions','dash.upgradebiz':'Upgrade business','dash.upgradebizsub':'Choose what to improve','dash.gotosites':'Go to sites',
    'dash.leaderboard':'Competitor leaderboard','dash.leaderboardsub':'Compare your empire with local NPCs','dash.openleaderboard':'Open leaderboard',
    'dash.eventfeed':'Event feed',
    'sites.sub':'Upgrade design, traffic, monetization, and infrastructure separately',
    'sites.recipebook':'📖 Hybrid recipe book',
    'market.sub':'Stocks and crypto. Prices change every second.',
    'market.portfoliovalue':'Portfolio value','market.cash':'Available cash',
    'market.stocks':'📈 Stocks','market.crypto':'🪙 Crypto',
    'estate.sub':'Real estate and status symbols — both give a permanent income boost',
    'estate.realestate':'🏢 Real estate','estate.status':'🚗 Status',
    'estate.currentboost':'Current income boost','estate.reptoboost':'Reputation → income boost',
    'inbox.sub':'Everything that needs attention — in one place',
    'settings.backtomenu':'← Back to menu',
    'settings.tab.design':'🎨 Design','settings.tab.mode':'🎯 Game mode','settings.tab.progress':'🏆 Progress','settings.tab.social':'👥 Community','settings.tab.data':'💾 Data',
    'settings.modes.title':'Game modes coming soon','settings.modes.sub':'Sites, apps, and neural networks as separate modes — in development',
    'settings.eventnotif':'Event notifications','settings.theme':'🎨 Interface theme',
    'settings.gamespeed':'Game speed',
    'settings.achievements':'🏆 Achievements','settings.dailyquests':'📋 Daily quests','settings.stats':'📊 Overall stats',
    'settings.autohire':'🤝 Auto-hire employees','settings.autoupgrade':'🤖 Auto-upgrade tracks',
    'settings.pushnotif':'🔔 Local notifications',
    'settings.pushnotifsub':'Reminds you if your streak is about to break or the weekly event is ending — only while the app is open in the background (not after fully closing it)',
    'settings.boosty':'Boosty subscription',
    'settings.invitefriend':'🎁 Invite a friend','settings.progresscard':'🖼️ Progress card','settings.compare':'🆚 Compare with a friend','settings.ceooffice':'🎭 CEO office',
    'settings.exportsave':'📤 Export save to file','settings.importsave':'📥 Import save from file','settings.resetprogress':'🗑️ Reset progress',
    'settings.autosave':'Autosaves every 15 sec',
    'settings.devmode':'🛠️ Test mode (dev)','settings.dev.skipday':'⏭️ Skip a day','settings.dev.prestigepts':'+50 rebirth points',
    'settings.dev.automanager':'🤖 Unlock auto-manager','settings.dev.maxtracks':'🌐 Max level all tracks','settings.dev.disable':'Disable dev mode',
  }
};
function t(key){
  const lang = (state && state.settings && state.settings.lang) || 'ru';
  return (I18N[lang] && I18N[lang][key]) || I18N.ru[key] || key;
}
function setLanguage(lang){
  state.settings.lang = lang;
  applyLanguage();
  renderAll();
  if(activeScreen==='settings') renderSettings();
  save();
}
function applyLanguage(){
  const lang = state.settings.lang || 'ru';
  document.documentElement.lang = lang;
  const ruBtn = document.getElementById('lang-ru-btn'), enBtn = document.getElementById('lang-en-btn');
  if(ruBtn) ruBtn.classList.toggle('active', lang==='ru');
  if(enBtn) enBtn.classList.toggle('active', lang!=='ru');
  document.querySelectorAll('.nav-item').forEach(btn=>{
    const scr = btn.dataset.screen;
    const span = btn.querySelector('span:last-child');
    if(span) span.textContent = t('nav.'+scr);
  });
  const titleMap = {'screen-dash':'title.dash','screen-sites':'title.sites','screen-market':'title.market','screen-estate':'title.estate','screen-inbox':'title.inbox','screen-settings':'title.settings'};
  Object.keys(titleMap).forEach(id=>{
    const el = document.querySelector('#'+id+' .page-title');
    if(el) el.textContent = t(titleMap[id]);
  });
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.dataset.i18n); });
}

/* -- 7.2 PWA-манифест + офлайн-кэш через service worker -- */
function setupPwaManifest(){
  try{
    const cv = document.createElement('canvas'); cv.width=512; cv.height=512;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0,0,512,512); g.addColorStop(0,'#0a84ff'); g.addColorStop(1,'#bf5af2');
    c.fillStyle = g; c.fillRect(0,0,512,512);
    c.font = '320px sans-serif'; c.textAlign='center'; c.textBaseline='middle';
    c.fillText('🌐', 256, 288);
    const iconUrl = cv.toDataURL('image/png');
    const manifest = {
      name: 'Web Empire — Digital Tycoon',
      short_name: 'Web Empire',
      start_url: './',
      display: 'standalone',
      background_color: '#000000',
      theme_color: '#0a84ff',
      icons: [
        {src: iconUrl, sizes:'512x512', type:'image/png'},
        {src: iconUrl, sizes:'192x192', type:'image/png'},
      ],
    };
    const blob = new Blob([JSON.stringify(manifest)], {type:'application/manifest+json'});
    const url = URL.createObjectURL(blob);
    const link = document.getElementById('pwa-manifest-link');
    if(link) link.href = url;
    const iconLink = document.getElementById('pwa-icon-link');
    if(iconLink) iconLink.href = iconUrl;
    const appleIconLink = document.getElementById('pwa-apple-icon-link');
    if(appleIconLink) appleIconLink.href = iconUrl;
  }catch(e){ console.warn('PWA manifest setup failed', e); }
}
function registerServiceWorker(){
  try{
    if(!('serviceWorker' in navigator)) return;
    if(location.protocol!=='https:' && location.hostname!=='localhost') return;
    const swCode = "self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open('web-empire-v1').then(c=>c.add(self.registration.scope)).catch(()=>{}));});"
      + "self.addEventListener('activate',e=>{self.clients.claim();});"
      + "self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(res=>{const copy=res.clone();caches.open('web-empire-v1').then(c=>c.put(e.request,copy)).catch(()=>{});return res;}).catch(()=>caches.match(e.request).then(r=>r||caches.match(self.registration.scope))));});";
    const blob = new Blob([swCode], {type:'text/javascript'});
    const swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl).catch(()=>{});
  }catch(e){}
}

/* -- 7.3 Экспорт/импорт сейва в файл -- */
function exportSave(){
  try{
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url; a.download = `web-empire-save-${stamp}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
    toast(tr('📤 Сохранение экспортировано в файл','📤 Save exported to file'));
  }catch(e){ toast(tr('❌ Не удалось экспортировать сохранение','❌ Could not export save')); }
}
function importSaveFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      if(typeof parsed !== 'object' || parsed===null || typeof parsed.cash !== 'number'){
        toast(tr('❌ Файл не похож на сохранение Web Empire','❌ This file does not look like a Web Empire save')); return;
      }
      pendingImportJson = JSON.stringify(parsed);
      openModal(`<h3>📥 Импортировать сохранение?</h3>
        <p style="color:var(--dim);font-size:13px;margin-bottom:16px;">Текущий прогресс будет заменён данными из файла. Это действие необратимо.</p>
        <div class="btn-row">
          <button class="btn btn-outline btn-block" onclick="closeModal()">Отмена</button>
          <button class="btn btn-red btn-block" onclick="applyImportedSave()">Импортировать</button>
        </div>`);
    }catch(e){ toast(tr('❌ Не удалось прочитать файл сохранения','❌ Could not read save file')); }
  };
  reader.readAsText(file);
  document.getElementById('import-save-input').value = '';
}
let pendingImportJson = null;
function applyImportedSave(){
  try{
    if(!pendingImportJson) return;
    state = JSON.parse(pendingImportJson);
    pendingImportJson = null;
    migrate();
    applyAccentTheme(state.boosty.unlocked ? state.boosty.theme : 'default');
    ALL_ASSETS.forEach(s=>{stockPrices[s.sym]=s.price; priceHistory[s.sym]=[s.price];});
    closeModal();
    save();
    renderSettings(); renderAll(); applyLanguage();
    toast(tr('✅ Сохранение импортировано','✅ Save imported'));
  }catch(e){ toast(tr('❌ Ошибка импорта','❌ Import error')); }
}

/* -- 7.4 Тестовый режим / dev-флаги --
   Скрыт за 7 нажатиями на номер версии внизу настроек — не мешает
   обычным игрокам, но доступен для быстрого тестирования новых фич. */
let versionTapCount = 0, versionTapTimer = null;
function tapVersion(){
  versionTapCount++;
  clearTimeout(versionTapTimer);
  versionTapTimer = setTimeout(()=>{ versionTapCount = 0; }, 1500);
  if(versionTapCount >= 7){
    versionTapCount = 0;
    state.devMode = true;
    toast(tr('🛠️ Dev-режим включён','🛠️ Dev mode enabled'));
    renderSettings();
    save();
  }
}
function disableDevMode(){
  state.devMode = false;
  renderSettings();
  save();
}
// Shows/hides the hidden dev-tools card in Settings → Данные based on
// state.devMode. Was being called from renderSettings() but never
// defined, which threw a ReferenceError every time settings rendered.
function updateDevModeUI(){
  const card = document.getElementById('devmode-card');
  if(card) card.style.display = state.devMode ? '' : 'none';
}
function devGiveCash(amount){ state.cash += amount; toast('🛠️ +$'+fmt(amount)); renderAll(); save(); }
function devSkipDay(){
  state.day += 1;
  checkDailyStreak();
  ensureDailyQuests();
  ensureSeasonEvent();
  toast('🛠️ День пропущен: день '+state.day);
  renderAll(); save();
}
function devGivePrestigePoints(n){
  state.prestige.points += n;
  state.prestige.skillPoints += Math.round(n/5);
  toast('🛠️ +'+n+' очков перерождения, +'+Math.round(n/5)+' очков навыков');
  renderAll(); save();
}
function devUnlockAutoManager(){ state.autoManagerUnlocked = true; toast(tr('🛠️ Авто-менеджер открыт','🛠️ Auto-manager unlocked')); renderAll(); save(); }
function devMaxSites(){
  state.sites.forEach(s=>{ const cap = trackMaxLevel(s); TRACK_ORDER.forEach(k=>{ s.tracks[k] = cap; }); });
  toast(tr('🛠️ Все треки прокачаны до максимума','🛠️ All tracks maxed out'));
  renderAll(); save();
}

(async function boot(){
  setupPwaManifest();
  registerServiceWorker();
  await load();
  detectIncomingReferral();
  applyDesignTheme(state.settings.theme || 'dark');
  applyAccentTheme(state.boosty.unlocked ? state.boosty.theme : 'default');
  if(hasSavedProgress()){
    const offline = computeOfflineEarnings();
    const streak = checkDailyStreak();
    if(offline || streak){
      pendingWelcomeBack = Object.assign({}, offline, streak);
      checkAchievements();
    }
  }
  state.lastSeen = Date.now();
  renderSettings();
  renderLog();
  renderAll();
  applyLanguage();
  showMainMenu();
  if(state.settings.music){
    const armMusic = ()=>{ startMusicLoop(); document.removeEventListener('click', armMusic); document.removeEventListener('touchend', armMusic); };
    document.addEventListener('click', armMusic, {once:true});
    document.addEventListener('touchend', armMusic, {once:true});
  }
})();