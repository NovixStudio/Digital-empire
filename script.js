/* ============================================================
   DIGITAL EMPIRE — Digital Tycoon
   Прогрессия со слотами, ветки прокачки по отраслям,
   живой просмотр сайта, iOS 26 Liquid Glass UI
   ============================================================ */

const SAVE_KEY = 'webempire-unified-save-v1';
// Старые ключи трёх раздельных игр — только для одноразовой миграции при
// первом запуске объединённого движка. Не удаляем их из storage: если в
// миграции найдётся баг, у игрока не потеряются исходные сейвы.
const LEGACY_SAVE_KEYS = {
  sites:  'webempire-save-v2',
  apps:   'appempire-save-v1',
  neural: 'neuralempire-save-v1',
};

/* ---------- GAME TIME SCALE ----------
   1 in-game hour = 60 real seconds → a full 24h in-game day takes
   GAME_DAY_SECONDS = 1440 real seconds of *in-game* time (24 in-game
   minutes worth of seconds). Everything that used to assume "1 game day ==
   86400 real seconds" (day rollover, the in-game clock, daily tax/payroll/
   loan-interest accrual) is driven off this constant so the whole game's
   pacing scales together.
   ITEM 5: the base pace is 1 real second = 2 in-game seconds
   (state.settings.speed = 2, applied every tick() — see below), so a game
   day now rolls over roughly every 720 real seconds (12 real minutes)
   instead of 1440.
   NOTE: this is unrelated to the 86400000-ms constants used elsewhere for
   real-world calendar math (daily streaks, weekly numbering) — those stay
   tied to actual wall-clock days and are untouched. */
const GAME_DAY_SECONDS = 1440;          // in-game seconds per in-game day
const GAME_TIME_SCALE = 86400 / GAME_DAY_SECONDS; // in-game seconds per real second (60)

/* ---------- CALENDAR (ITEM 1: "1 день = 1 секунда", как в популярных играх) ----------
   This is a separate, purely cosmetic calendar layer — state.calendarDay —
   that advances by exactly 1 calendar day per real second (once per tick(),
   which itself fires once per real second via setInterval(tick,1000)), fully
   independent of state.day (the economic clock above, still driven by
   GAME_DAY_SECONDS/settings.speed and every payroll/hosting/tax/loan formula
   that already keys off it).
   Why two separate day counters instead of just shrinking GAME_DAY_SECONDS
   to make the economic day itself 1 second long: dozens of formulas across
   the game (payroll/hosting periods, audit thresholds, loan terms, training
   durations, mail expiry...) are tuned as fixed *counts* of economic days,
   not as a fraction of a day — so if the economic day itself sped up ~720x,
   every one of those bills would also fire ~720x more often in real time
   with no matching change in income, which would break the game (near-
   instant bankruptcy) and would need a full Python-simulated economy
   rebalance to fix safely. Layering a fast cosmetic calendar on top gets the
   "watch years fly by" feel that was asked for, plus a real calendar window
   with actual due dates (converted from the unchanged economic countdown via
   econDaysToCalendarDays below), with zero risk to the tuned economy. */
const CALENDAR_DAYS_PER_MONTH = 30;
const CALENDAR_MONTHS_PER_YEAR = 12;
const CALENDAR_DAYS_PER_YEAR = CALENDAR_DAYS_PER_MONTH * CALENDAR_MONTHS_PER_YEAR;
const CALENDAR_MONTHS = [
  {name:'Январь',nameEn:'January'},{name:'Февраль',nameEn:'February'},{name:'Март',nameEn:'March'},
  {name:'Апрель',nameEn:'April'},{name:'Май',nameEn:'May'},{name:'Июнь',nameEn:'June'},
  {name:'Июль',nameEn:'July'},{name:'Август',nameEn:'August'},{name:'Сентябрь',nameEn:'September'},
  {name:'Октябрь',nameEn:'October'},{name:'Ноябрь',nameEn:'November'},{name:'Декабрь',nameEn:'December'}
];
function calendarPartsFromDay(calDay){
  const idx = Math.max(0, Math.floor(calDay)-1);
  const year = Math.floor(idx/CALENDAR_DAYS_PER_YEAR)+1;
  const monthIdx = Math.floor((idx%CALENDAR_DAYS_PER_YEAR)/CALENDAR_DAYS_PER_MONTH);
  const day = (idx%CALENDAR_DAYS_PER_MONTH)+1;
  return {year, monthIdx, day};
}
function formatCalendarDate(calDay){
  const p = calendarPartsFromDay(calDay);
  const m = CALENDAR_MONTHS[p.monthIdx];
  return isEN() ? `${L(m,'name')} ${p.day}, Year ${p.year}` : `${p.day} ${L(m,'name')} ${p.year} года`;
}
function formatCalendarShort(calDay){
  const p = calendarPartsFromDay(calDay);
  const abbr = L(CALENDAR_MONTHS[p.monthIdx],'name').slice(0,3);
  return `${p.day} ${abbr} · ${tr('Год','Y')} ${p.year}`;
}
// Converts a delta expressed in *economic* in-game days (state.day units,
// still GAME_DAY_SECONDS/settings.speed real seconds each) into the
// equivalent number of fast calendar days ahead (1 calendar day = 1 real
// second), so due-date countdowns shown in the calendar stay truthful.
function econDaysToCalendarDays(econDays){
  return Math.max(0, econDays) * (GAME_DAY_SECONDS/(state.settings.speed||1));
}

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
  games:    {icon:'🎮', name:'Игры',                desc:'Мобильные игры и игровые студии', nameEn:'Games', descEn:'Mobile games and game studios'},
  crypto:   {icon:'🪙', name:'Crypto Empire',       desc:'Стейкинг, майнинг, свой токен, NFT', nameEn:'Crypto Empire', descEn:'Staking, mining, your own token, NFTs'},
  industry: {icon:'🏭', name:'Промышленная империя', desc:'Нефть, газ, сталь, машины — тяжёлая промышленность', nameEn:'Industrial Empire', descEn:'Oil, gas, steel, cars — heavy industry'},
  hybrid:   {icon:'🧬', name:'Гибриды',            desc:'Уникальные бизнесы, созданные слиянием двух категорий', nameEn:'Hybrids', descEn:'Unique businesses created by merging two categories'},
};
const CATEGORY_ORDER = ['content','commerce','software','social','fintech','offline','ai','games','crypto','industry'];
// Taxes apply to every category that can generate income, including hybrids —
// unlike CATEGORY_ORDER (used for the shop screen and the Collector
// achievement), hybrids shouldn't get a free pass just because they aren't
// directly purchasable.
const TAX_CATEGORY_ORDER = [...CATEGORY_ORDER, 'hybrid'];


/* ============================================================
   UNIFIED CATALOG (merge of Sites + Apps + Neural). 10 economic
   tiers × 3 verticals = 30 buyable businesses, sharing cost/income/
   unlock but with per-vertical name/icon. Everything downstream
   (buySite, upgrade, render, achievements) still looks types up by
   flat `id` via ALL_BUSINESS_TYPES.find(t=>t.id===...), so none of
   that logic needs to change. */
const VERTICALS = ['sites', 'apps', 'neural'];
const VERTICAL_META = {
  sites:  { name: 'Сайты',      nameEn: 'Websites',        icon: '🌐' },
  apps:   { name: 'Приложения', nameEn: 'Apps',            icon: '📱' },
  neural: { name: 'Нейросети',  nameEn: 'Neural Networks', icon: '🧠' },
};
const BUSINESS_TIERS = [
  { tierId:'blog', baseCost:220, baseIncome:1.6, unlockNetWorth:0, category:'content',
    labels:{ sites:{name:'Блог',nameEn:'Blog',icon:'✍️'}, apps:{name:'Заметки',nameEn:'Notes app',icon:'📝'}, neural:{name:'Чат-бот поддержки',nameEn:'Support chatbot',icon:'💬'} }},
  { tierId:'shop', baseCost:1650, baseIncome:10, unlockNetWorth:1600, category:'commerce',
    labels:{ sites:{name:'Интернет-магазин',nameEn:'Online store',icon:'🛍️'}, apps:{name:'Шоппинг-приложение',nameEn:'Shopping app',icon:'🛍️'}, neural:{name:'Рекомендательная нейросеть',nameEn:'Recommendation engine AI',icon:'🛍️'} }},
  { tierId:'saas', baseCost:12000, baseIncome:58, unlockNetWorth:33000, category:'software',
    labels:{ sites:{name:'SaaS-сервис',nameEn:'SaaS service',icon:'🔧'}, apps:{name:'SaaS-приложение',nameEn:'SaaS app',icon:'⚙️'}, neural:{name:'NLP API-сервис',nameEn:'NLP API service',icon:'⚙️'} }},
  { tierId:'app', baseCost:22500, baseIncome:95, unlockNetWorth:59000, category:'software',
    labels:{ sites:{name:'Мобильное приложение',nameEn:'Mobile app',icon:'📲'}, apps:{name:'Органайзер-продуктивность',nameEn:'Productivity app',icon:'🗂️'}, neural:{name:'AI-ассистент продуктивности',nameEn:'Productivity AI copilot',icon:'🗂️'} }},
  { tierId:'social', baseCost:90000, baseIncome:340, unlockNetWorth:234000, category:'social',
    labels:{ sites:{name:'Соцсеть',nameEn:'Social network',icon:'🌐'}, apps:{name:'Приложение-соцсеть',nameEn:'Social app',icon:'💬'}, neural:{name:'AI-компаньон',nameEn:'AI companion',icon:'🫂'} }},
  { tierId:'crypto_exchange', baseCost:330000, baseIncome:1050, unlockNetWorth:845000, category:'fintech',
    labels:{ sites:{name:'Криптобиржа',nameEn:'Crypto exchange',icon:'🪙'}, apps:{name:'Крипто-кошелёк',nameEn:'Crypto wallet app',icon:'🪙'}, neural:{name:'Нейросеть-трейдер',nameEn:'AI trading bot',icon:'🪙'} }},
  { tierId:'ai', baseCost:600000, baseIncome:1900, unlockNetWorth:1300000, category:'ai',
    labels:{ sites:{name:'AI-платформа',nameEn:'AI platform',icon:'🧠'}, apps:{name:'AI-ассистент',nameEn:'AI assistant app',icon:'🤖'}, neural:{name:'Персональный AI-ассистент',nameEn:'Personal AI assistant',icon:'🤖'} }},
  { tierId:'logistics', baseCost:18000, baseIncome:78, unlockNetWorth:42000, category:'offline',
    labels:{ sites:{name:'Логистическая компания',nameEn:'Logistics company',icon:'🚚'}, apps:{name:'Доставка дронами',nameEn:'Drone delivery',icon:'🚁'}, neural:{name:'AI-оптимизация дрон-логистики',nameEn:'AI drone logistics',icon:'🚁'} }},
  { tierId:'restaurant', baseCost:39000, baseIncome:150, unlockNetWorth:91000, category:'offline',
    labels:{ sites:{name:'Служба доставки еды',nameEn:'Food delivery service',icon:'🍔'}, apps:{name:'Курьерская служба приложения',nameEn:'App courier service',icon:'🛵'}, neural:{name:'AI-диспетчер курьеров',nameEn:'AI courier dispatch',icon:'🛵'} }},
  { tierId:'bank', baseCost:210000, baseIncome:700, unlockNetWorth:546000, category:'offline',
    labels:{ sites:{name:'Цифровой банк',nameEn:'Digital bank',icon:'💳'}, apps:{name:'Необанк в приложении',nameEn:'Neobank app',icon:'🏦'}, neural:{name:'AI-скоринг для необанка',nameEn:'Neobank AI credit scoring',icon:'🏦'} }},
];
const BUYABLE_TYPES = BUSINESS_TIERS.flatMap(tier => VERTICALS.map(v => ({
  id: `${tier.tierId}_${v}`, tierId: tier.tierId, vertical: v,
  name: tier.labels[v].name, nameEn: tier.labels[v].nameEn, icon: tier.labels[v].icon,
  baseCost: tier.baseCost, baseIncome: tier.baseIncome, unlockNetWorth: tier.unlockNetWorth, category: tier.category,
})));

/* ---------- HYBRID RECIPES — cross-category merges into a unique business ----------
   Not directly buyable (category 'hybrid' is excluded from CATEGORY_ORDER so it
   never appears in the shop list). Created via craftHybrid() once both parent
   sites are owned (SAME vertical) and their tracks are deep enough
   (see requiredTrackLevel). 5 recipes × 3 verticals = 15. */
const HYBRID_TIERS = [
  { tierId:'hybrid_fulfillment', aTier:'shop', bTier:'logistics', baseIncome:900, baseCost:180000, requiredTrackLevel:8, bonusValue:0.20,
    labels:{ sites:{name:'Fulfillment-империя',nameEn:'Fulfillment Empire',icon:'📦',desc:'commerce + offline → ускоряет доставку, +20% к общему доходу',descEn:'commerce + offline → speeds up delivery, +20% total income'}, apps:{name:'Fulfillment-империя',nameEn:'Fulfillment Empire',icon:'📦',desc:'commerce + offline → ускоряет доставку, +20% к общему доходу',descEn:'commerce + offline → speeds up delivery, +20% total income'}, neural:{name:'AI Fulfillment-империя',nameEn:'AI Fulfillment Empire',icon:'📦',desc:'commerce + offline → ускоряет доставку, +20% к общему доходу',descEn:'commerce + offline → speeds up delivery, +20% total income'} }},
  { tierId:'hybrid_media', aTier:'blog', bTier:'social', baseIncome:1400, baseCost:260000, requiredTrackLevel:8, bonusValue:0.20,
    labels:{ sites:{name:'Медиа-холдинг',nameEn:'Media Holding',icon:'📢',desc:'content + social → буст трафика всем сайтам, +20% к общему доходу',descEn:'content + social → traffic boost for all sites, +20% total income'}, apps:{name:'Медиа-холдинг',nameEn:'Media Holding',icon:'📢',desc:'content + social → буст загрузок всем приложениям, +20% к общему доходу',descEn:'content + social → download boost for all apps, +20% total income'}, neural:{name:'AI Медиа-холдинг',nameEn:'AI Media Holding',icon:'📢',desc:'content + social → буст обучения всем нейросетям, +20% к общему доходу',descEn:'content + social → training boost for all AI models, +20% total income'} }},
  { tierId:'hybrid_ai_saas', aTier:'ai', bTier:'saas', baseIncome:5200, baseCost:900000, requiredTrackLevel:8, bonusValue:0.30,
    labels:{ sites:{name:'AI-SaaS Unicorn',nameEn:'AI-SaaS Unicorn',icon:'🧬',desc:'ai + software → удваивает эффект AI Lab, +30% к общему доходу',descEn:'ai + software → doubles the AI Lab effect, +30% total income'}, apps:{name:'AI-SaaS Unicorn',nameEn:'AI-SaaS Unicorn',icon:'🧬',desc:'ai + software → удваивает эффект AI Lab, +30% к общему доходу',descEn:'ai + software → doubles the AI Lab effect, +30% total income'}, neural:{name:'AI-SaaS Unicorn',nameEn:'AI-SaaS Unicorn',icon:'🧬',desc:'ai + software → удваивает эффект AI Lab, +30% к общему доходу',descEn:'ai + software → doubles the AI Lab effect, +30% total income'} }},
  { tierId:'hybrid_fintech', aTier:'crypto_exchange', bTier:'bank', baseIncome:3800, baseCost:700000, requiredTrackLevel:8, bonusValue:0.25,
    labels:{ sites:{name:'Финтех-империя',nameEn:'Fintech Empire',icon:'🏛️',desc:'fintech + offline → снижает волатильность портфеля, +25% к общему доходу',descEn:'fintech + offline → reduces portfolio volatility, +25% total income'}, apps:{name:'Финтех-империя',nameEn:'Fintech Empire',icon:'🏛️',desc:'fintech + offline → снижает волатильность портфеля, +25% к общему доходу',descEn:'fintech + offline → reduces portfolio volatility, +25% total income'}, neural:{name:'AI Финтех-империя',nameEn:'AI Fintech Empire',icon:'🏛️',desc:'fintech + offline → снижает волатильность портфеля, +25% к общему доходу',descEn:'fintech + offline → reduces portfolio volatility, +25% total income'} }},
  { tierId:'hybrid_superapp', aTier:'restaurant', bTier:'app', baseIncome:1600, baseCost:340000, requiredTrackLevel:8, bonusValue:0.20,
    labels:{ sites:{name:'Суперапп',nameEn:'Super App',icon:'🍔',desc:'offline + software → офлайн-доход получает software-множитель, +20% к общему доходу',descEn:'offline + software → offline income gets the software multiplier, +20% total income'}, apps:{name:'Суперапп',nameEn:'Super App',icon:'🍔',desc:'offline + software → офлайн-доход получает software-множитель, +20% к общему доходу',descEn:'offline + software → offline income gets the software multiplier, +20% total income'}, neural:{name:'AI Суперапп',nameEn:'AI Super App',icon:'🍔',desc:'offline + software → офлайн-доход получает software-множитель, +20% к общему доходу',descEn:'offline + software → offline income gets the software multiplier, +20% total income'} }},
];
const MAX_HYBRIDS = 3; // общий лимит на игрока, не x3 за вертикаль
const HYBRID_RECIPES = HYBRID_TIERS.flatMap(tier => VERTICALS.map(v => ({
  id: `${tier.tierId}_${v}`, tierId: tier.tierId, aId: `${tier.aTier}_${v}`, bId: `${tier.bTier}_${v}`,
  name: tier.labels[v].name, nameEn: tier.labels[v].nameEn, icon: tier.labels[v].icon,
  baseIncome: tier.baseIncome, baseCost: tier.baseCost, requiredTrackLevel: tier.requiredTrackLevel,
  bonus: { value: tier.bonusValue }, desc: tier.labels[v].desc, descEn: tier.labels[v].descEn,
})));
const HYBRID_TYPES = HYBRID_RECIPES.map(r=>({id:r.id, tierId:r.tierId, name:r.name, nameEn:r.nameEn, icon:r.icon, baseCost:r.baseCost, baseIncome:r.baseIncome, unlockNetWorth:Infinity, category:'hybrid'}));

/* ---------- GAMES — apps-only category, kept vertical-neutral on purpose:
   tripling it would push the shop from ~30 to ~45 buyable businesses.
   Revisit if a themed split (arcade/game-app/AI-gamedev) is wanted later. */
const GAME_TYPES = [
  { id:'arcade',         name:'Аркадная игра',     nameEn:'Arcade game',        icon:'🎮', baseCost:1400,   baseIncome:7.5,  unlockNetWorth:2800,    category:'games' },
  { id:'puzzle',         name:'Головоломка',       nameEn:'Puzzle game',        icon:'🧩', baseCost:6000,   baseIncome:29,   unlockNetWorth:15000,   category:'games' },
  { id:'rpg',            name:'Мобильная RPG',     nameEn:'Mobile RPG',         icon:'🗡️', baseCost:45000,  baseIncome:190,  unlockNetWorth:118000,  category:'games' },
  { id:'battle_royale',  name:'Battle Royale',     nameEn:'Battle royale game', icon:'🏆', baseCost:150000, baseIncome:560,  unlockNetWorth:390000,  category:'games' },
  { id:'ai_game_studio', name:'AI-игровая студия', nameEn:'AI game studio',     icon:'🎮', baseCost:900000, baseIncome:2900, unlockNetWorth:2100000, category:'games' },
];

/* ---------- CRYPTO EMPIRE — новая вертикаль бизнесов (Раздел 2.1 плана).
   Отдельная от существующего трейдинга акций/крипты (state.stocks) — здесь
   крипто-бизнесы работают как обычные сайты: свои треки, сотрудники,
   события, апгрейды. Ставки/токен/NFT из плана переданы через описания и
   более высокую волатильность/доходность тира, без отдельного экрана —
   так это безопасно ложится поверх существующего generic-движка. */
const CRYPTO_TYPES = [
  { id:'crypto_wallet',   name:'Крипто-кошелёк',        nameEn:'Crypto wallet',        icon:'👛', baseCost:8000,    baseIncome:34,   unlockNetWorth:19000,    category:'crypto', desc:'Некастодиальный кошелёк с комиссией за своп', descEn:'Non-custodial wallet earning swap fees' },
  { id:'staking_pool',    name:'Стейкинг-пул',          nameEn:'Staking pool',         icon:'🔒', baseCost:26000,   baseIncome:105,  unlockNetWorth:62000,    category:'crypto', desc:'Блокировка монет инвесторов за долю доходности', descEn:'Locks investor coins for a cut of the yield' },
  { id:'mining_farm',     name:'Майнинг-ферма',         nameEn:'Mining farm',          icon:'⛏️', baseCost:95000,   baseIncome:360,  unlockNetWorth:230000,   category:'crypto', desc:'Фермы ASIC/GPU, доход зависит от сложности сети', descEn:'ASIC/GPU rigs, income tracks network difficulty' },
  { id:'token_launchpad',  name:'Лаунчпад токенов',      nameEn:'Token launchpad',      icon:'🚀', baseCost:340000,  baseIncome:1250, unlockNetWorth:860000,   category:'crypto', desc:'Выпускает собственные токены проектов за комиссию', descEn:'Issues project tokens for a listing fee' },
  { id:'nft_marketplace',  name:'NFT-маркетплейс',       nameEn:'NFT marketplace',      icon:'🖼️', baseCost:1100000, baseIncome:3900, unlockNetWorth:2600000,  category:'crypto', desc:'Комиссия с каждой сделки редкими коллекциями', descEn:'Takes a cut of every rare-collection trade' },
];

/* ---------- INDUSTRY EMPIRE — тяжёлая промышленность (заменяет старую Media Empire) ----------
   Нефть, газ, металлургия, автопром и прочие капиталоёмкие производства — новая
   вертикально-нейтральная категория (как GAME_TYPES/CRYPTO_TYPES выше): 28 бизнесов
   от дешёвой нефтяной скважины за $150 до орбитальной верфи на вершине, разбитых
   на 4 раздела (sub): energy/mining/manufacturing/heavy — см. INDUSTRY_SUB_META. */
const INDUSTRY_SUB_META = {
  energy:        { icon:'⚡', name:'Энергетика',              nameEn:'Energy',        desc:'Нефть, газ и электрогенерация', descEn:'Oil, gas and power generation' },
  mining:        { icon:'⛏️', name:'Добыча',                  nameEn:'Mining',        desc:'Карьеры, шахты и рудники', descEn:'Quarries, mines and ore extraction' },
  manufacturing: { icon:'🏗️', name:'Производство',            nameEn:'Manufacturing', desc:'Фабрики и заводы товаров', descEn:'Factories producing goods' },
  heavy:         { icon:'🏭', name:'Тяжёлая промышленность',  nameEn:'Heavy industry', desc:'Металлургия, транспорт и мегапроекты', descEn:'Steel, transport and megaprojects' },
};
const INDUSTRY_SUB_ORDER = ['energy','mining','manufacturing','heavy'];
const INDUSTRY_TYPES = [
  // --- Энергетика ---
  { id:'oil_rig', name:'Нефтяная скважина', nameEn:'Oil Well', icon:'🛢️', baseCost:150, baseIncome:1.07, unlockNetWorth:0, category:'industry', sub:'energy', desc:'Качает нефть из земли — цена барреля решает всё', descEn:'Pumps crude out of the ground — the price per barrel decides everything' },
  { id:'gas_station_chain', name:'Сеть АЗС', nameEn:'Gas Station Chain', icon:'⛽', baseCost:2100, baseIncome:14.0, unlockNetWorth:5000, category:'industry', sub:'energy', desc:'Заправки у дорог — топливо, кофе и мойка в одном месте', descEn:'Roadside stations — fuel, coffee and a car wash in one stop' },
  { id:'gas_field', name:'Газовое месторождение', nameEn:'Gas Field', icon:'🔥', baseCost:546000, baseIncome:2184.0, unlockNetWorth:1300000, category:'industry', sub:'energy', desc:'Добыча природного газа для экспорта и энергетики', descEn:'Extracts natural gas for export and power generation' },
  { id:'oil_refinery', name:'Нефтеперерабатывающий завод', nameEn:'Oil Refinery', icon:'⚗️', baseCost:756000, baseIncome:2907.69, unlockNetWorth:1800000, category:'industry', sub:'energy', desc:'Переработка сырой нефти в бензин, дизель и мазут', descEn:'Refines crude oil into gasoline, diesel and fuel oil' },
  { id:'power_plant', name:'Электростанция', nameEn:'Power Plant', icon:'⚡', baseCost:2016000, baseIncome:6720.0, unlockNetWorth:4800000, category:'industry', sub:'energy', desc:'Генерация электроэнергии для городов и заводов', descEn:'Generates electricity for cities and factories' },
  { id:'nuclear_power_plant', name:'Атомная электростанция', nameEn:'Nuclear Power Plant', icon:'⚛️', baseCost:4300000, baseIncome:12647.06, unlockNetWorth:10300000, category:'industry', sub:'energy', desc:'Реактор большой мощности — самая дешёвая энергия в пересчёте на киловатт', descEn:'High-output reactor — the cheapest energy per kilowatt' },
  { id:'lng_plant', name:'Завод СПГ', nameEn:'LNG Plant', icon:'🧊', baseCost:8500000, baseIncome:22368.42, unlockNetWorth:20500000, category:'industry', sub:'energy', desc:'Сжижает газ для экспорта танкерами по всему миру', descEn:'Liquefies gas for tanker export around the world' },
  // --- Добыча ---
  { id:'coal_mine', name:'Угольная шахта', nameEn:'Coal Mine', icon:'⛏️', baseCost:5000, baseIncome:31.25, unlockNetWorth:12000, category:'industry', sub:'mining', desc:'Добыча угля для металлургии и энергетики', descEn:'Mines coal for steelmaking and power generation' },
  { id:'quarry', name:'Каменный карьер', nameEn:'Stone Quarry', icon:'🪨', baseCost:10500, baseIncome:61.76, unlockNetWorth:25000, category:'industry', sub:'mining', desc:'Добыча щебня и камня для стройки и дорог', descEn:'Quarries gravel and stone for construction and roads' },
  { id:'mining_corp', name:'Горнодобывающая корпорация', nameEn:'Mining Corporation', icon:'⛰️', baseCost:2436000, baseIncome:7858.06, unlockNetWorth:5800000, category:'industry', sub:'mining', desc:'Добыча руды и редких металлов по всему миру', descEn:'Extracts ore and rare metals across multiple countries' },
  { id:'uranium_mine', name:'Урановый рудник', nameEn:'Uranium Mine', icon:'☢️', baseCost:5150000, baseIncome:14714.29, unlockNetWorth:12400000, category:'industry', sub:'mining', desc:'Добыча урановой руды для атомной энергетики', descEn:'Mines uranium ore for the nuclear power industry' },
  { id:'lithium_mine', name:'Литиевый рудник', nameEn:'Lithium Mine', icon:'🧂', baseCost:10000000, baseIncome:25641.03, unlockNetWorth:24100000, category:'industry', sub:'mining', desc:'Добыча лития из рассолов — сырьё для батарей будущего', descEn:'Extracts lithium from brine — feedstock for tomorrow\'s batteries' },
  // --- Производство ---
  { id:'textile_factory', name:'Текстильная фабрика', nameEn:'Textile Factory', icon:'🧵', baseCost:18900, baseIncome:105.0, unlockNetWorth:45000, category:'industry', sub:'manufacturing', desc:'Ткани и одежда крупными партиями для ритейла', descEn:'Fabric and clothing at scale for retail chains' },
  { id:'furniture_factory', name:'Мебельная фабрика', nameEn:'Furniture Factory', icon:'🪑', baseCost:33600, baseIncome:176.84, unlockNetWorth:80000, category:'industry', sub:'manufacturing', desc:'Мебель для дома и офиса — от эскиза до сборки', descEn:'Home and office furniture — from sketch to assembly' },
  { id:'food_processing_plant', name:'Пищевой комбинат', nameEn:'Food Processing Plant', icon:'🥫', baseCost:58800, baseIncome:294.0, unlockNetWorth:140000, category:'industry', sub:'manufacturing', desc:'Переработка сырья в готовые продукты для сетей', descEn:'Turns raw produce into packaged goods for retail chains' },
  { id:'cement_factory', name:'Цементный завод', nameEn:'Cement Factory', icon:'🧱', baseCost:96600, baseIncome:460.0, unlockNetWorth:230000, category:'industry', sub:'manufacturing', desc:'Цемент и бетон для строительной отрасли', descEn:'Cement and concrete feeding the construction industry' },
  { id:'electronics_factory', name:'Завод электроники', nameEn:'Electronics Factory', icon:'🔌', baseCost:159600, baseIncome:725.45, unlockNetWorth:380000, category:'industry', sub:'manufacturing', desc:'Сборка бытовой техники и электронных компонентов', descEn:'Assembles consumer electronics and components' },
  { id:'chemical_plant', name:'Химический завод', nameEn:'Chemical Plant', icon:'🧪', baseCost:252000, baseIncome:1095.65, unlockNetWorth:600000, category:'industry', sub:'manufacturing', desc:'Промышленная химия: удобрения, полимеры, реагенты', descEn:'Industrial chemistry: fertilizer, polymers, reagents' },
  { id:'pharma_plant', name:'Фармацевтический завод', nameEn:'Pharmaceutical Plant', icon:'💊', baseCost:378000, baseIncome:1575.0, unlockNetWorth:900000, category:'industry', sub:'manufacturing', desc:'Производство лекарств и медицинских препаратов', descEn:'Manufactures medicines and pharmaceutical products' },
  { id:'glass_factory', name:'Стекольный завод', nameEn:'Glass Factory', icon:'🪟', baseCost:6100000, baseIncome:16944.44, unlockNetWorth:14700000, category:'industry', sub:'manufacturing', desc:'Листовое и техническое стекло для стройки и электроники', descEn:'Flat and technical glass for construction and electronics' },
  { id:'battery_gigafactory', name:'Завод аккумуляторов', nameEn:'Battery Gigafactory', icon:'🔋', baseCost:11800000, baseIncome:29500.0, unlockNetWorth:28400000, category:'industry', sub:'manufacturing', desc:'Гигафабрика литиевых батарей для авто и хранения энергии', descEn:'Gigafactory producing lithium batteries for EVs and energy storage' },
  // --- Тяжёлая промышленность ---
  { id:'steel_mill', name:'Металлургический комбинат', nameEn:'Steel Mill', icon:'🏭', baseCost:1008000, baseIncome:3733.33, unlockNetWorth:2400000, category:'industry', sub:'heavy', desc:'Выплавка стали для машиностроения и строительства', descEn:'Smelts steel for manufacturing and construction' },
  { id:'car_manufacturer', name:'Автомобильный завод', nameEn:'Car Manufacturer', icon:'🚗', baseCost:1302000, baseIncome:4650.0, unlockNetWorth:3100000, category:'industry', sub:'heavy', desc:'Сборочный конвейер легковых и грузовых машин', descEn:'Assembly line for passenger and commercial vehicles' },
  { id:'shipyard', name:'Судостроительная верфь', nameEn:'Shipyard', icon:'🛳️', baseCost:1638000, baseIncome:5648.28, unlockNetWorth:3900000, category:'industry', sub:'heavy', desc:'Строительство сухогрузов, танкеров и контейнеровозов', descEn:'Builds cargo ships, tankers and container vessels' },
  { id:'aircraft_manufacturer', name:'Авиастроительный завод', nameEn:'Aircraft Manufacturer', icon:'✈️', baseCost:2940000, baseIncome:9187.5, unlockNetWorth:7000000, category:'industry', sub:'heavy', desc:'Сборка пассажирских и грузовых самолётов', descEn:'Assembles passenger and cargo aircraft' },
  { id:'industrial_conglomerate', name:'Промышленный конгломерат', nameEn:'Industrial Conglomerate', icon:'🌐', baseCost:3570000, baseIncome:10818.18, unlockNetWorth:8500000, category:'industry', sub:'heavy', desc:'Вершина индустрии — десятки заводов под одним холдингом', descEn:'The top of heavy industry — dozens of plants under one holding' },
  { id:'semiconductor_fab', name:'Завод полупроводников', nameEn:'Semiconductor Fab', icon:'💠', baseCost:7200000, baseIncome:19459.46, unlockNetWorth:17300000, category:'industry', sub:'heavy', desc:'Кремниевые пластины и чипы — основа всей современной техники', descEn:'Silicon wafers and chips — the backbone of modern technology' },
  { id:'orbital_shipyard', name:'Орбитальная верфь', nameEn:'Orbital Shipyard', icon:'🛰️', baseCost:13900000, baseIncome:33902.44, unlockNetWorth:33500000, category:'industry', sub:'heavy', desc:'Сборка спутников и ракет-носителей — вершина промышленной цепочки', descEn:'Assembles satellites and launch vehicles — the top of the industrial chain' },
];
const ALL_BUSINESS_TYPES = [...BUYABLE_TYPES, ...GAME_TYPES, ...CRYPTO_TYPES, ...INDUSTRY_TYPES, ...HYBRID_TYPES];

/* ---------- TECHNOLOGY TREE (Раздел 3.2 плана) ----------
   Глобальная ветка исследований, отдельная от per-site треков: покупается
   один раз за кэш и навсегда даёт множитель дохода конкретным категориям
   бизнеса (или всем сразу). 3 уровня, каждый следующий требует владения
   двумя технологиями предыдущего уровня — простое дерево без отдельного
   экрана прогресса за игровые дни (в отличие от плана), чтобы не
   плодить ещё одну параллельную систему таймеров поверх уже существующих
   событий/треков/перерождения. */
// PRODUCT (4.4): tech tree, regions, currency corridors, and short-selling
// used to all be visible and usable from the very first session — four
// full systems dumped on a player who's still figuring out their first
// business. Rather than adding yet another parallel day-timer system (see
// the note above — that was a deliberate earlier call), this reuses the
// game's own existing idiom for staged reveals: unlockNetWorth, already on
// every business type. Thresholds are staggered well below the $80M
// rebirth threshold so they surface gradually over natural early/mid-game
// progress instead of all at session start.
const DEPTH_UNLOCK_NW = {tech:5000, regions:15000, currency:25000, shorts:50000};
function depthFeatureUnlocked(key){ return netWorth() >= (DEPTH_UNLOCK_NW[key]||0); }
const TECH_TREE = [
  { id:'webdev',        tier:1, icon:'💻', name:'Веб-разработка',        nameEn:'Web development',    cost:50000,   requires:[], categories:'all', mult:0.10,
    desc:'+10% к доходу всех бизнесов', descEn:'+10% income for every business' },
  { id:'mobiledev',     tier:1, icon:'📱', name:'Мобильная разработка',  nameEn:'Mobile development',  cost:80000,   requires:[], categories:['software','games'], mult:0.20,
    desc:'+20% к доходу софта и игр', descEn:'+20% income for software & games' },
  { id:'cloud',         tier:1, icon:'☁️', name:'Облачные технологии',   nameEn:'Cloud technologies',  cost:65000,   requires:[], categories:['software','ai','fintech'], mult:0.15,
    desc:'+15% к доходу софта, AI и финтеха', descEn:'+15% income for software, AI & fintech' },
  { id:'basicsecurity', tier:1, icon:'🛡️', name:'Базовая безопасность',  nameEn:'Basic security',      cost:70000,   requires:[], categories:['fintech','crypto'], mult:0.15,
    desc:'+15% к доходу финтеха и крипто', descEn:'+15% income for fintech & crypto' },
  { id:'automation',    tier:1, icon:'🦾', name:'Автоматизация производства', nameEn:'Industrial automation', cost:75000, requires:[], categories:['industry','offline'], mult:0.20,
    desc:'+20% к доходу промышленности и офлайн-бизнеса', descEn:'+20% income for industry & offline business' },
  { id:'ai_tech',   tier:2, icon:'🧠', name:'Искусственный интеллект', nameEn:'Artificial intelligence', cost:400000,  requires:['cloud','mobiledev'],     categories:['ai'], mult:0.50,
    desc:'+50% к доходу AI-бизнесов', descEn:'+50% income for AI businesses' },
  { id:'bigdata',   tier:2, icon:'📊', name:'Большие данные',          nameEn:'Big data',                cost:350000,  requires:['webdev','cloud'],        categories:['content','social'], mult:0.30,
    desc:'+30% к доходу контента и соцсетей', descEn:'+30% income for content & social' },
  { id:'blockchain', tier:2, icon:'⛓️', name:'Блокчейн',                nameEn:'Blockchain',              cost:450000,  requires:['basicsecurity','cloud'], categories:['crypto','fintech'], mult:0.40,
    desc:'+40% к доходу крипто и финтеха', descEn:'+40% income for crypto & fintech' },
  { id:'agi',         tier:3, icon:'🤖', name:'AGI (Общий ИИ)',       nameEn:'AGI (General AI)',     cost:2500000, requires:['ai_tech','bigdata'],    categories:['ai'], mult:1.00,
    desc:'+100% к доходу AI-бизнесов', descEn:'+100% income for AI businesses' },
  { id:'quantum_net', tier:3, icon:'🌌', name:'Квантовый интернет',     nameEn:'Quantum internet',     cost:3000000, requires:['bigdata','blockchain'], categories:'all', mult:0.40,
    desc:'+40% к доходу всех бизнесов', descEn:'+40% income for every business' },
];
function techOwned(id){ return !!(state.techs && state.techs[id]); }
function techLocked(tech){ return tech.requires.some(id=>!techOwned(id)); }
function techApplies(tech, category){ return tech.categories==='all' || tech.categories.includes(category); }
// Множитель дохода конкретной категории бизнеса от всех изученных технологий.
function techCategoryMult(category){
  let mult = 1;
  TECH_TREE.forEach(t=>{ if(techOwned(t.id) && techApplies(t, category)) mult *= (1+t.mult); });
  return mult;
}
function buyTech(id){
  if(!depthFeatureUnlocked('tech')) return;
  const tech = TECH_TREE.find(t=>t.id===id);
  if(!tech || techOwned(id) || techLocked(tech)) return;
  if(state.cash < tech.cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= tech.cost;
  state.techs[id] = true;
  log(`💡 ${tr('Технология изучена','Technology researched')}: ${tech.icon} ${L(tech,'name')}`);
  toast(`💡 ${L(tech,'name')} — ${tr('изучено!','researched!')}`);
  playSound('achievement'); vibrateFeedback(15);
  renderAll(); save();
  openTechTreeModal();
}
function openTechTreeModal(){
  if(!depthFeatureUnlocked('tech')){
    toast(`🔒 ${tr('Технологии откроются при активах','Tech unlocks at net worth')} ${fmt(DEPTH_UNLOCK_NW.tech)}`);
    return;
  }
  const rows = [1,2,3].map(tier=>{
    const items = TECH_TREE.filter(t=>t.tier===tier).map(t=>{
      const owned = techOwned(t.id);
      const locked = !owned && techLocked(t);
      const afford = state.cash>=t.cost;
      const reqLabel = t.requires.length ? `${tr('Нужно','Needs')}: ${t.requires.map(rid=>{const rt=TECH_TREE.find(x=>x.id===rid); return rt?L(rt,'name'):rid;}).join(', ')}` : '';
      const btn = owned ? `<span class="pill pill-owned">✅ ${tr('изучено','researched')}</span>`
        : `<button class="btn ${afford&&!locked?'btn-cyan':'btn-outline'}" ${locked?'disabled':''} onclick="buyTech('${t.id}')">${fmt(t.cost)}</button>`;
      return `<div class="card glass" style="opacity:${locked?0.55:1};margin-bottom:8px;">
        <div class="card-row">
          <div class="card-icon">${t.icon}</div>
          <div style="flex:1">
            <div class="card-title">${L(t,'name')} ${owned?'✅':(locked?'🔒':'')}</div>
            <div class="card-sub">${L(t,'desc')}</div>
            ${reqLabel?`<div class="card-sub" style="opacity:.7;">${reqLabel}</div>`:''}
          </div>
        </div>
        <div class="btn-row" style="margin-top:6px;">${btn}</div>
      </div>`;
    }).join('');
    return `<div class="section-title">${tr('Уровень','Tier')} ${tier}</div>${items}`;
  }).join('');
  openModal(`<h3>💡 ${tr('Технологическое дерево','Technology tree')}</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${tr('Постоянные множители дохода по категориям бизнеса. Технологии следующего уровня требуют изучения технологий предыдущего.','Permanent per-category income multipliers. Next-tier techs require researching prior-tier techs.')}</p>
    ${rows}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Закрыть','Close')}</button></div>`);
}

/* ---------- GEOGRAPHIC EXPANSION (Раздел 3.3 плана) ----------
   Упрощённая версия: регион не привязывается к конкретному сайту (это
   потребовало бы отдельного поля на каждом сайте, миграции старых сейвов
   и отдельного UI выбора региона при покупке) — вместо этого открытие
   региона один раз даёт постоянный глобальный бонус к доходу ВСЕХ
   бизнесов, отражая выход компании на этот рынок в целом. */
const REGIONS = [
  { id:'home',    icon:'🏠', name:'Домашний рынок',    nameEn:'Home market',    cost:0,      mult:0,    desc:'Стартовый рынок — уже открыт', descEn:'Your starting market — already open' },
  { id:'latam',   icon:'🌎', name:'Лат. Америка',      nameEn:'Latin America',  cost:40000,  mult:0.06, desc:'+6% к общему доходу — дешёвый и быстрый выход', descEn:'+6% total income — a cheap, fast entry' },
  { id:'africa',  icon:'🌍', name:'Африка',            nameEn:'Africa',         cost:20000,  mult:0.04, desc:'+4% к общему доходу — самый доступный рынок', descEn:'+4% total income — the most affordable market' },
  { id:'europe',  icon:'🇪🇺', name:'Европа',            nameEn:'Europe',         cost:80000,  mult:0.10, desc:'+10% к общему доходу', descEn:'+10% total income' },
  { id:'asia',    icon:'🌏', name:'Азия',              nameEn:'Asia',           cost:150000, mult:0.15, desc:'+15% к общему доходу — крупнейший рынок трафика', descEn:'+15% total income — the largest traffic market' },
  { id:'mideast', icon:'🇦🇪', name:'Ближний Восток',    nameEn:'Middle East',    cost:250000, mult:0.20, desc:'+20% к общему доходу — премиальный рынок', descEn:'+20% total income — a premium market' },
];
function regionOwned(id){ return !!(state.regions && state.regions[id]); }
// Суммарный (не перемножаемый — иначе поздние регионы обесценивались бы
// друг другом) бонус ко всему доходу от всех открытых регионов.
function regionGlobalMult(){
  let bonus = 0;
  REGIONS.forEach(r=>{ if(regionOwned(r.id)) bonus += r.mult; });
  return 1 + bonus;
}
function buyRegion(id){
  if(!depthFeatureUnlocked('regions')) return;
  const region = REGIONS.find(r=>r.id===id);
  if(!region || regionOwned(id)) return;
  if(state.cash < region.cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= region.cost;
  state.regions[id] = true;
  log(`${region.icon} ${tr('Открыт новый рынок','New market opened')}: ${L(region,'name')} (+${Math.round(region.mult*100)}% ${tr('к доходу','income')})`);
  toast(`${region.icon} ${L(region,'name')} — ${tr('рынок открыт!','market opened!')}`);
  playSound('achievement'); vibrateFeedback(15);
  renderAll(); save();
  openRegionsModal();
  fxId('modal','fx-roll-in');
}
function openRegionsModal(){
  if(!depthFeatureUnlocked('regions')){
    toast(`🔒 ${tr('Регионы откроются при активах','Regions unlock at net worth')} ${fmt(DEPTH_UNLOCK_NW.regions)}`);
    return;
  }
  const rows = REGIONS.map(r=>{
    const owned = regionOwned(r.id);
    const afford = state.cash>=r.cost;
    const btn = owned ? `<span class="pill pill-owned">✅ ${tr('открыт','open')}</span>`
      : `<button class="btn ${afford?'btn-cyan':'btn-outline'}" onclick="buyRegion('${r.id}')">${fmt(r.cost)}</button>`;
    return `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row">
        <div class="card-icon">${r.icon}</div>
        <div style="flex:1">
          <div class="card-title">${L(r,'name')} ${owned?'✅':''}</div>
          <div class="card-sub">${L(r,'desc')}</div>
        </div>
      </div>
      <div class="btn-row" style="margin-top:6px;">${btn}</div>
    </div>`;
  }).join('');
  openModal(`<h3>🌍 ${tr('Географическая экспансия','Geographic expansion')}</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${tr('Текущий суммарный бонус','Current total bonus')}: <b>+${Math.round((regionGlobalMult()-1)*100)}%</b> ${tr('к общему доходу','to total income')}</p>
    ${rows}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Закрыть','Close')}</button></div>`);
}

/* ---------- CURRENCY CORRIDORS (Раздел 4.3 плана) ----------
   Простой валютный контур EUR/USD поверх кэша: курс дрейфует раз в
   игровой день (±до 4%, изредка — резкий валютный кризис до ±12%), можно
   конвертировать доллары в евро и обратно, зарабатывая на разнице курсов
   (классический арбитраж «купи дёшево — продай дорого»). История курса
   хранится в оперативной памяти (не в сейве) только для спарклайна —
   как priceHistory для акций/крипты, но не персистентная. */
const EUR_RATE_MIN = 0.85, EUR_RATE_MAX = 1.35;
let eurRateHistory = [1.08];
function driftEurRate(){
  const crisis = Math.random() < 0.05; // ~5% шанс "валютного кризиса" в день
  const swing = crisis ? (0.06 + Math.random()*0.06) : (Math.random()*0.04);
  const dir = Math.random()<0.5 ? -1 : 1;
  let rate = state.eur.rate * (1 + dir*swing);
  rate = Math.max(EUR_RATE_MIN, Math.min(EUR_RATE_MAX, rate));
  state.eur.rate = rate;
  eurRateHistory.push(rate);
  if(eurRateHistory.length>60) eurRateHistory.shift();
  if(crisis){
    log(`💱 ${tr('Валютный кризис','Currency crisis')}: ${tr('курс EUR/USD','the EUR/USD rate')} ${dir>0?'↑':'↓'} ${Math.round(swing*100)}% (${rate.toFixed(3)})`);
    if(activeScreen==='dash') toast(`💱 ${tr('Валютный кризис — курс EUR резко изменился','Currency crisis — the EUR rate moved sharply')}`);
  }
}
function convertUsdToEur(amount){
  if(!depthFeatureUnlocked('currency')) return;
  amount = Math.min(amount, state.cash);
  if(amount<=0) return;
  state.cash -= amount;
  state.eur.balance += amount/state.eur.rate;
  log(`💱 ${fmt(amount)} → €${(amount/state.eur.rate).toFixed(2)} (${tr('курс','rate')} ${state.eur.rate.toFixed(3)})`);
  playSound('buy'); renderAll(); save(); openCurrencyModal();
}
function convertEurToUsd(amountEur){
  if(!depthFeatureUnlocked('currency')) return;
  amountEur = Math.min(amountEur, state.eur.balance);
  if(amountEur<=0) return;
  state.eur.balance -= amountEur;
  state.cash += amountEur*state.eur.rate;
  log(`💱 €${amountEur.toFixed(2)} → ${fmt(amountEur*state.eur.rate)} (${tr('курс','rate')} ${state.eur.rate.toFixed(3)})`);
  playSound('buy'); renderAll(); save(); openCurrencyModal();
}
function openCurrencyModal(){
  if(!depthFeatureUnlocked('currency')){
    toast(`🔒 ${tr('Валютные коридоры откроются при активах','Currency corridors unlock at net worth')} ${fmt(DEPTH_UNLOCK_NW.currency)}`);
    return;
  }
  const rate = state.eur.rate;
  const path = sparklinePath(eurRateHistory,260,50);
  const prev = eurRateHistory.length>1 ? eurRateHistory[0] : rate;
  const up = rate>=prev;
  const eurUsdValue = state.eur.balance*rate;
  openModal(`<h3>💱 ${tr('Валютные коридоры','Currency corridors')}</h3>
    <div class="card glass" style="margin-bottom:12px;">
      <div class="card-row">
        <div class="card-icon">🇪🇺</div>
        <div style="flex:1">
          <div class="card-title">EUR/USD — <span class="${up?'c-green':'c-red'}">${rate.toFixed(3)}</span></div>
          <div class="card-sub">${tr('Курс меняется раз в игровой день','Rate updates once per game day')}</div>
        </div>
      </div>
      <svg viewBox="0 0 260 50" preserveAspectRatio="none" style="width:100%;height:50px;margin-top:6px;"><path d="${path}" fill="none" stroke="${up?'#30d158':'#ff453a'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="card glass" style="margin-bottom:12px;">
      <div class="card-title">${tr('Ваши балансы','Your balances')}</div>
      <div class="card-sub">💵 ${fmt(state.cash)} · 🇪🇺 €${state.eur.balance.toFixed(2)} (≈${fmt(eurUsdValue)})</div>
    </div>
    <div class="section-title">${tr('Купить евро','Buy euros')}</div>
    <div class="btn-row" style="gap:8px;margin-bottom:12px;">
      <button class="btn btn-outline" style="flex:1;" onclick="convertUsdToEur(Math.round(state.cash*0.25))">25%</button>
      <button class="btn btn-outline" style="flex:1;" onclick="convertUsdToEur(Math.round(state.cash*0.5))">50%</button>
      <button class="btn btn-cyan" style="flex:1;" onclick="convertUsdToEur(state.cash)">${tr('Всё','All')}</button>
    </div>
    <div class="section-title">${tr('Продать евро','Sell euros')}</div>
    <div class="btn-row" style="gap:8px;">
      <button class="btn btn-outline" style="flex:1;" onclick="convertEurToUsd(state.eur.balance*0.25)">25%</button>
      <button class="btn btn-outline" style="flex:1;" onclick="convertEurToUsd(state.eur.balance*0.5)">50%</button>
      <button class="btn btn-amber" style="flex:1;" onclick="convertEurToUsd(state.eur.balance)">${tr('Всё','All')}</button>
    </div>
    <div class="btn-row" style="margin-top:14px;"><button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Закрыть','Close')}</button></div>`);
}

/* ---------- GLOBAL EVENTS (Раздел 3.1 плана) ----------
   Multi-day macro-events layered over the whole economy (or one slice of
   it), distinct from the short real-time per-site events above. At most
   one active at a time, tracked by game DAY (not real ms) and advanced
   inside tick()'s once-per-day rollover, right next to driftEurRate().
   Three-stage lifecycle: first day = harbinger (half strength), middle
   days = full strength, last day = fade (half strength again) — a light
   stand-in for the plan's separate "predvestnik/main/fade" timers
   without adding yet another ms-based timer system on top of the
   existing site-event one. */
const GLOBAL_EVENTS = [
  { id:'epidemic',   icon:'🦠', name:'Эпидемия',   nameEn:'Epidemic',  days:7,  categories:['offline'],           mult:-0.30, desc:'Офлайн-бизнесы: доход −30%',            descEn:'Offline businesses: −30% income' },
  { id:'techboom',   icon:'💻', name:'Технобум',   nameEn:'Tech boom', days:5,  categories:['software','ai'],     mult:0.50,  desc:'AI и софт: доход +50%',                  descEn:'AI & software: +50% income' },
  { id:'crisis',     icon:'📉', name:'Кризис',     nameEn:'Crisis',    days:10, categories:'all',                 mult:-0.20, desc:'Все бизнесы: доход −20%',               descEn:'All businesses: −20% income' },
  { id:'boom',       icon:'📈', name:'Бум',        nameEn:'Boom',      days:7,  categories:'all',                 mult:0.30,  desc:'Все бизнесы: доход +30%',               descEn:'All businesses: +30% income' },
  { id:'regulation', icon:'📜', name:'Регуляция',  nameEn:'Regulation',days:6,  categories:['fintech','crypto'],  mult:-0.15, desc:'Финтех и крипто: доход −15% (можно лоббировать)', descEn:'Fintech & crypto: −15% income (can be lobbied away)' },
];
const GLOBAL_EVENT_DAILY_CHANCE = 0.05; // ~5% chance per game day while none is active
const GLOBAL_EVENT_LOBBY_COST = 200000;
function currentGlobalEventDef(){ return state.globalEvent ? GLOBAL_EVENTS.find(d=>d.id===state.globalEvent.id) : null; }
function globalEventStage(){
  if(!state.globalEvent) return null;
  const def = currentGlobalEventDef();
  if(!def) return null;
  if(state.day <= state.globalEvent.startDay) return 'harbinger';
  if(state.day >= state.globalEvent.endDay) return 'fade';
  return 'main';
}
function globalEventCategoryMult(category){
  const def = currentGlobalEventDef();
  if(!def) return 1;
  const applies = def.categories==='all' || def.categories.includes(category);
  if(!applies) return 1;
  const stage = globalEventStage();
  const factor = stage==='main' ? 1 : 0.5;
  return 1 + def.mult*factor;
}
// Called once per game day (from tick()'s day-rollover block).
function maybeTriggerGlobalEvent(){
  if(state.globalEvent) return;
  if(Math.random() >= GLOBAL_EVENT_DAILY_CHANCE) return;
  const def = GLOBAL_EVENTS[Math.floor(Math.random()*GLOBAL_EVENTS.length)];
  state.globalEvent = { id:def.id, startDay:state.day, endDay:state.day+def.days };
  state.lifetimeStats.globalEventsSeen = (state.lifetimeStats.globalEventsSeen||0) + 1;
  log(`${def.icon} ${tr('Глобальное событие','Global event')}: ${L(def,'name')} — ${L(def,'desc')} (${def.days} ${tr('дн.','days')})`);
  toast(`${def.icon} ${tr('Глобальное событие','Global event')}: ${L(def,'name')}!`);
  playSound('event'); vibrateFeedback(20);
  // CLEANUP (3): wires fx-market-crash-shake — named explicitly in the
  // plan — for negative-mult events (crisis/epidemic/regulation); positive
  // events (boom/techboom) get fx-halo instead.
  fxId('dash-global-event', def.mult<0 ? 'fx-market-crash-shake' : 'fx-halo');
}
function advanceGlobalEvent(){
  if(state.globalEvent && state.day > state.globalEvent.endDay) state.globalEvent = null;
}
function lobbyAgainstGlobalEvent(){
  if(!state.globalEvent) return;
  const def = currentGlobalEventDef();
  if(!def || def.mult>=0){ toast(tr('Это событие нельзя лоббировать','This event cannot be lobbied away')); return; }
  const cost = Math.round(GLOBAL_EVENT_LOBBY_COST * difficultyCostMult());
  if(state.cash<cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  log(`📜 ${tr('Лоббирование сработало','Lobbying paid off')} — ${tr('событие','the event')} «${L(def,'name')}» ${tr('снято','was lifted')}`);
  toast(`📜 ${tr('Событие снято','Event lifted')}`);
  state.globalEvent = null;
  playSound('buy'); renderAll(); save(); closeModal();
}
function buildGlobalEventBannerHtml(){
  const def = currentGlobalEventDef();
  if(!def) return '';
  const daysLeft = Math.max(0, state.globalEvent.endDay - state.day);
  const positive = def.mult>=0;
  return `<div class="card glass" style="margin-bottom:14px;cursor:pointer;border:1px solid ${positive?'rgba(48,209,88,.35)':'rgba(255,69,58,.3)'};" onclick="openGlobalEventModal()">
    <div class="card-row"><div class="card-icon" style="background:${positive?'rgba(48,209,88,.16)':'rgba(255,69,58,.14)'};">${def.icon}</div>
    <div style="flex:1"><div class="card-title">${L(def,'name')}</div><div class="card-sub">${L(def,'desc')} · ${tr('осталось','left')} ${daysLeft} ${tr('дн.','d')}</div></div></div>
  </div>`;
}
function openGlobalEventModal(){
  const def = currentGlobalEventDef();
  if(!def){ return; }
  const daysLeft = Math.max(0, state.globalEvent.endDay - state.day);
  const lobbyBtn = def.mult<0 ? `<button class="btn btn-amber btn-block" onclick="lobbyAgainstGlobalEvent()">📜 ${tr('Лоббировать снятие','Lobby to lift')} (${fmt(Math.round(GLOBAL_EVENT_LOBBY_COST*difficultyCostMult()))})</button>` : '';
  openModal(`<h3>${def.icon} ${L(def,'name')}</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${L(def,'desc')} · ${tr('осталось','left')} ${daysLeft} ${tr('игровых дней','in-game days')}. ${tr('Затрагивает','Affects')}: ${def.categories==='all'?tr('все категории','all categories'):def.categories.map(c=>CATEGORY_META[c]?L(CATEGORY_META[c],'name'):c).join(', ')}.</p>
    <div class="btn-row" style="flex-direction:column;gap:8px;">${lobbyBtn}<button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Закрыть','Close')}</button></div>`);
}

/* ---------- MONETIZATION MODEL (Phase 2 of the economy overhaul) ----------
   Chosen once, mandatorily, right before a site is created (see
   openMonetizationModal()/buySite()). Not cosmetic — how well the model
   fits the site's category (see MONETIZATION_FIT) directly scales its
   income via monetizationIncomeMult(). Sites created before this system
   existed have no site.monetization and keep a neutral x1 multiplier
   (see monetizationIncomeMult) so old saves aren't retroactively punished. */
const MONETIZATION_MODELS = [
  {id:'ads',       name:'Реклама',            nameEn:'Advertising',   icon:'📢', desc:'Доход от показов и кликов по рекламе — чем больше трафика, тем больше денег',                       descEn:'Revenue from ad impressions and clicks — the more traffic, the more money'},
  {id:'paid',      name:'Платные функции',    nameEn:'Paid features', icon:'💎', desc:'Подписки и платные возможности — стабильный доход с вовлечённой аудитории',                        descEn:'Subscriptions and paid features — steady revenue from an engaged audience'},
  {id:'donations', name:'Пожертвования',      nameEn:'Donations',     icon:'🎁', desc:'Добровольные взносы посетителей — не давит на аудиторию, но и заработок скромнее',                 descEn:'Voluntary visitor contributions — gentle on the audience, but modest earnings'},
];
// How well each monetization model fits each business category. >1 = boosts
// income, <1 = hurts it. Deliberately not flat: picking a mismatched model
// (donations on a crypto exchange, ads on a bank) should visibly hurt.
const MONETIZATION_FIT = {
  content:  {ads:1.25, paid:1.00, donations:0.90},
  commerce: {ads:0.85, paid:1.25, donations:0.65},
  software: {ads:0.80, paid:1.30, donations:0.70},
  social:   {ads:1.20, paid:0.85, donations:1.10},
  fintech:  {ads:0.70, paid:1.30, donations:0.55},
  ai:       {ads:0.80, paid:1.30, donations:0.65},
  offline:  {ads:1.05, paid:1.10, donations:0.70},
  games:    {ads:1.05, paid:0.85, donations:0.55},
  crypto:   {ads:0.70, paid:1.30, donations:0.60},
  industry: {ads:0.75, paid:1.30, donations:0.50},
  hybrid:   {ads:1.00, paid:1.00, donations:1.00},
};
function monetizationFitMult(type, modelId){
  const table = MONETIZATION_FIT[type && type.category] || MONETIZATION_FIT.hybrid;
  return (table && table[modelId]!=null) ? table[modelId] : 1;
}
/* ---------- PRIORITY TRACK (Phase 5) ----------
   Which of the three upgrade tracks matters most for a given business
   category. Per the roadmap's clarification, this is shown to the player
   UP FRONT (a badge in the site view, next to the tracks) rather than
   used as a silent after-the-fact penalty — though neglecting it badly
   does drag down the Analyst's success-probability estimate. */
const PRIORITY_TRACK = {
  content:  'traffic',  // media lives and dies by audience size
  commerce: 'design',   // storefront/UX drives conversion
  software: 'infra',    // SaaS lives or dies on reliability & performance
  social:   'traffic',  // network effects — growth is everything
  fintech:  'infra',    // security & uptime are non-negotiable for finance
  ai:       'infra',    // compute/serving infrastructure is the bottleneck
  offline:  'design',   // physical presentation & service quality
  games:    'design',   // core gameplay/production quality drives retention
  crypto:   'security', // exchanges/wallets live or die on trust and safety
  industry: 'infra',   // heavy industry lives and dies by equipment/production infrastructure
  hybrid:   'traffic',
};
function priorityTrackId(type){ return PRIORITY_TRACK[type && type.category] || 'traffic'; }
function priorityTrackLabel(type){
  const id = priorityTrackId(type);
  const meta = TRACK_META[id];
  return `${meta.icon} ${L(meta,'name')}`;
}
function monetizationFitLabel(fit){
  if(fit>=1.15) return {icon:'🔥', text: tr('отлично подходит','great fit')};
  if(fit>=0.95) return {icon:'👍', text: tr('нормально подходит','decent fit')};
  return {icon:'📉', text: tr('плохо подходит','poor fit')};
}
// Legacy sites (created before this system) have no .monetization — keep them
// neutral instead of retroactively penalizing/boosting pre-existing saves.
function monetizationIncomeMult(site, type){
  if(!site.monetization) return 1;
  return monetizationFitMult(type, site.monetization);
}

/* how many total site slots you have, based on net worth — starts at 1! */
const SLOT_MILESTONES = [0, 6500, 26000, 78000, 195000, 520000, 1560000, 5200000, 15600000, 52000000];
function maxSiteSlots(nw){ return SLOT_MILESTONES.filter(t=>nw>=t).length + (typeof hasSkill==='function' && hasSkill('extra_slot') ? 1 : 0) + (typeof hasSkill==='function' && hasSkill('elite_expansion') ? 1 : 0) + (typeof state!=='undefined' && state && state.boosty && state.boosty.unlocked ? 1 : 0); }

/* ---------- UPGRADE TRACKS — you choose exactly what to improve ---------- */
const TRACK_META = {
  design:       {name:'Дизайн',          nameEn:'Design',          icon:'🎨', color:'var(--purple)', textOn:'#fff',    costMult:0.32, incomeGrowth:0.12,  desc:'Внешний вид и впечатление посетителей', descEn:'Look and feel, visitor impressions'},
  traffic:      {name:'Трафик',          nameEn:'Traffic',         icon:'📈', color:'var(--teal)',   textOn:'#04170a', costMult:0.42, incomeGrowth:0.20,  desc:'Приток новых посетителей', descEn:'Inflow of new visitors'},
  infra:        {name:'Инфраструктура',  nameEn:'Infrastructure',  icon:'⚙️', color:'var(--blue)',   textOn:'#fff',    costMult:0.24, incomeGrowth:0.09,  desc:'Стабильность, скорость, штат', descEn:'Stability, speed, staff'},
  marketing:    {name:'Маркетинг',       nameEn:'Marketing',       icon:'📣', color:'var(--pink)',   textOn:'#fff',    costMult:0.36, incomeGrowth:0.15,  desc:'Узнаваемость бренда и рекламные кампании', descEn:'Brand awareness and ad campaigns'},
  security:     {name:'Безопасность',    nameEn:'Security',        icon:'🛡️', color:'var(--green)',  textOn:'#04170a', costMult:0.34, incomeGrowth:0.14,  desc:'Защита данных и доверие пользователей', descEn:'Data protection and user trust'},
};
const TRACK_ORDER = ['design','traffic','infra','marketing','security'];
const TRACK_GROWTH_RATE = 1.36;

/* ---------- SPECIALIZATION TREE (Phase: employee-driven upgrades) ----------
   Point 10 of the redesign brief: employees stop being just a flat income
   multiplier and instead passively earn "spec points" (specPoints) on the
   site they work at. Those points are spent here, on a per-site branching
   tree, instead of cash — cash still only buys new hires/upgrades to tracks
   elsewhere. Every business tracks its own progress through this tree
   independently (site.specNodes/specLockedGroups), even though the node
   definitions below are a shared template reused by every business type —
   handwriting a fully bespoke 20+ node tree per business (there are 100+
   business types) wasn't feasible, so uniqueness lives in each site's own
   path through the same tree, not in the node text.
   Structure: 5 tiers × 5 categories (reusing TRACK_META's 5 tracks as the
   thematic categories) = 25 nodes total, well above the "at least 20" ask.
   Tier 3 is a hard fork per category: a "risky" node (big instant income
   jump, but a scheduled permanent penalty lands later) vs a "safe" node
   (smaller, no downside). Picking one locks the other out for that site,
   forever — exactly the "half the branches turn out to be a bad call"
   mechanic requested. Tier 4 requires whichever tier-3 fork was taken. */
const SPEC_TREE_RISKY_DELAY_MS = 90*1000; // 90s after purchase, the consequence lands
// [Точка 10] Дерево прокачки полностью заменяет собой старые треки за
// деньги: узлы покупаются за очки специализации (их зарабатывают сами
// сотрудники) и НАПРЯМУЮ поднимают уровень соответствующего трека
// (site.tracks[cat]) — это тот же самый показатель, что раньше растился
// кнопками "×1/×5/×10/МАКС" за кэш, просто теперь его можно расти только
// через дерево. 4 фиксированных узла на категорию (тир 1-2-3-4) + один
// повторяемый "дальше" узел после капстоуна, чтобы прокачка не упиралась в
// потолок, когда престиж/обновление сайта поднимают cap выше того, что
// дают фиксированные узлы. Тир 3 — развилка (рискованный путь сразу даёт
// больше уровней, но через 90с прилетает постоянный штраф к доходу;
// взвешенный путь скромнее, но без последствий) — второй выбор для этой
// категории навсегда закрывается.
const SPEC_TREE_NODES = [];
(function buildSpecTree(){
  const T1_COST=15, T2_COST=30, T3_COST=55, T4_COST=90;
  TRACK_ORDER.forEach(cat=>{
    const meta = TRACK_META[cat];
    SPEC_TREE_NODES.push({id:`${cat}_t1`, tier:1, category:cat, group:null, requires:[], cost:T1_COST, levels:2,
      icon:meta.icon, name:`${meta.name}: азы`, nameEn:`${meta.nameEn}: basics`,
      desc:'Первые шаги — сотрудники нарабатывают базовые процессы', descEn:'First steps — staff build out basic processes'});
    SPEC_TREE_NODES.push({id:`${cat}_t2`, tier:2, category:cat, group:null, requires:[`${cat}_t1`], cost:T2_COST, levels:2,
      icon:meta.icon, name:`${meta.name}: система`, nameEn:`${meta.nameEn}: systemized`,
      desc:'Процессы поставлены на рельсы', descEn:'Processes are running on rails'});
    SPEC_TREE_NODES.push({id:`${cat}_t3_risky`, tier:3, category:cat, group:cat, requires:[`${cat}_t2`], cost:T3_COST, levels:3, risky:true,
      icon:meta.icon, name:`${meta.name}: агрессивная ставка`, nameEn:`${meta.nameEn}: aggressive bet`,
      desc:'Резкий рывок уровня сразу — но решение спорное, последствия придут позже', descEn:'A sharp level jump right away — but it is a gamble, the consequences arrive later',
      penalty:0.18, delayMs:SPEC_TREE_RISKY_DELAY_MS});
    SPEC_TREE_NODES.push({id:`${cat}_t3_safe`, tier:3, category:cat, group:cat, requires:[`${cat}_t2`], cost:T3_COST, levels:2, risky:false,
      icon:meta.icon, name:`${meta.name}: взвешенный путь`, nameEn:`${meta.nameEn}: measured path`,
      desc:'Скромнее, зато без последствий', descEn:'More modest, but no downside'});
    SPEC_TREE_NODES.push({id:`${cat}_t4`, tier:4, category:cat, group:null, requires:[`${cat}_t3_risky`,`${cat}_t3_safe`], cost:T4_COST, levels:3,
      icon:meta.icon, name:`${meta.name}: вершина мастерства`, nameEn:`${meta.nameEn}: mastery`,
      desc:'Капстоун ветки — требует выбранного на тир 3 пути', descEn:'Branch capstone — needs whichever tier-3 path you picked'});
  });
})();
// Повторяемый узел "дальше" — открывается после капстоуна (t4), не
// исчезает после покупки: каждый раз даёт +1 уровень трека и дорожает.
function specTreeRepeatCost(site, cat){
  const n = (site.specExtra && site.specExtra[cat]) || 0;
  return SPEC_TREE_REPEAT_BASE_COST + SPEC_TREE_REPEAT_COST_STEP*n;
}
const SPEC_TREE_REPEAT_BASE_COST = 120, SPEC_TREE_REPEAT_COST_STEP = 45, SPEC_TREE_REPEAT_LEVELS = 1;
function specTreeRepeatUnlocked(site, cat){ return specNodeOwned(site, `${cat}_t4`); }
function specTreeNode(id){ return SPEC_TREE_NODES.find(n=>n.id===id); }
/* ---------- PER-BUSINESS SPEC-TREE FLAVOR ----------
   SPEC_TREE_NODES above is one shared 5-category/4-tier template reused by
   every business type (100+ of them — see the comment above SPEC_TREE_NODES
   for why a fully bespoke tree per type isn't realistic to hand-write). What
   CAN scale per type without redoing the whole system: the label, icon and
   description shown for each category/node, so the tree reads like it
   belongs to that specific business instead of a generic one. This is keyed
   by tierId (shared across the sites/apps/neural vertical of the same
   business). [Точка 10, доработка] Изначально было заполнено только для
   blog (пилот); теперь дерево прокачки прописано отдельно для всех 10
   базовых бизнесов (blog/shop/saas/app/social/crypto_exchange/ai/logistics/
   restaurant/bank) и всех 5 гибридов (hybrid_fulfillment/hybrid_media/
   hybrid_ai_saas/hybrid_fintech/hybrid_superapp) — у гибридов раньше не
   было и не могло быть уникального текста, потому что их объекты типа не
   несли tierId вовсе (см. фикс в HYBRID_RECIPES/HYBRID_TYPES выше), из-за
   чего specCatDisplay()/specNodeDisplay() ниже всегда откатывались на
   общий текст. Бизнесы из GAME_TYPES/CRYPTO_TYPES/INDUSTRY_TYPES (аркады,
   крипто-биржа акций/токенов из отдельной вертикали, тяжёлая
   промышленность — ещё ~38 типов) пока используют только общий шаблон;
   чтобы добавить любому из них свою ветку, скопируйте форму одного из
   существующих ключей ниже под новым tierId. */
const TYPE_SPEC_FLAVOR = {
  blog: {
    design: { icon:'🖋️', name:'Стиль постов', nameEn:'Post style',
      t1:{name:'Первые черновики',nameEn:'First drafts', desc:'Форматирование, заголовки, обложки — база оформления постов', descEn:'Formatting, headlines, cover images — the basics of post layout'},
      t2:{name:'Фирменный шаблон',nameEn:'Signature template', desc:'Единый визуальный шаблон для всех статей', descEn:'A consistent visual template across every article'},
      t3_risky:{name:'Смелый редизайн',nameEn:'Bold redesign', desc:'Резкая смена стиля блога ради охватов — часть старых читателей может не принять новый вид', descEn:'A sudden style overhaul chasing reach — some longtime readers may not take to the new look'},
      t3_safe:{name:'Постепенный ребрендинг',nameEn:'Gradual rebrand', desc:'Обновляете оформление аккуратными шагами, без риска для аудитории', descEn:'You refresh the look in careful steps, no risk to the audience'},
      t4:{name:'Авторский почерк',nameEn:'Signature voice', desc:'У блога узнаваемый, законченный визуальный стиль', descEn:'The blog now has a recognizable, polished visual identity'} },
    traffic: { icon:'📖', name:'Аудитория блога', nameEn:'Readership',
      t1:{name:'Первые читатели',nameEn:'First readers', desc:'Блог начинают находить через поиск и репосты', descEn:'People start finding the blog via search and shares'},
      t2:{name:'SEO-оптимизация',nameEn:'SEO tuning', desc:'Статьи поднимаются в выдаче поисковиков', descEn:'Articles climb the search rankings'},
      t3_risky:{name:'Кликбейт-волна',nameEn:'Clickbait wave', desc:'Провокационные заголовки резко разгоняют трафик — доверие читателей может позже просесть', descEn:'Provocative headlines spike traffic fast — reader trust may slip later'},
      t3_safe:{name:'Органический рост',nameEn:'Organic growth', desc:'Медленный, но устойчивый прирост постоянных читателей', descEn:'Slower but steady growth of loyal readers'},
      t4:{name:'Постоянная аудитория',nameEn:'Loyal readership', desc:'Ядро читателей возвращается за каждым новым постом', descEn:'A core readership returns for every new post'} },
    infra: { icon:'🗂️', name:'Публикация', nameEn:'Publishing pipeline',
      t1:{name:'Простой хостинг',nameEn:'Basic hosting', desc:'Блог держится стабильно при обычной нагрузке', descEn:'The blog stays stable under normal load'},
      t2:{name:'Удобная CMS',nameEn:'A proper CMS', desc:'Публикация и редактирование постов идут быстрее', descEn:'Publishing and editing posts gets noticeably faster'},
      t3_risky:{name:'Автопубликация без вычитки',nameEn:'Auto-publish, no review', desc:'Посты выходят мгновенно — но опечатки и ошибки долетают до читателей чаще', descEn:'Posts go live instantly — but typos and mistakes reach readers more often'},
      t3_safe:{name:'Редакторский конвейер',nameEn:'Editorial pipeline', desc:'Каждый пост проходит вычитку перед публикацией', descEn:'Every post gets reviewed before it goes live'},
      t4:{name:'Отлаженная публикация',nameEn:'A well-oiled pipeline', desc:'От черновика до публикации — быстро и без сбоев', descEn:'From draft to publish — fast and reliable'} },
    marketing: { icon:'📣', name:'Промо блога', nameEn:'Blog promotion',
      t1:{name:'Соцсети блога',nameEn:'Blog\'s social pages', desc:'Анонсы новых постов в соцсетях', descEn:'New posts get announced on social media'},
      t2:{name:'Email-рассылка',nameEn:'Email newsletter', desc:'Подписчики получают дайджест новых статей', descEn:'Subscribers get a digest of new articles'},
      t3_risky:{name:'Массовая закупка рекламы',nameEn:'Bulk ad buy', desc:'Резкий приток новой аудитории — но часть окажется случайной и быстро отпишется', descEn:'A sharp influx of new readers — but some are random and will unsubscribe fast'},
      t3_safe:{name:'Коллаборации с блогерами',nameEn:'Blogger collabs', desc:'Точечные партнёрства с близкой по теме аудиторией', descEn:'Targeted partnerships with a like-minded audience'},
      t4:{name:'Медиа-присутствие',nameEn:'Media presence', desc:'О блоге узнают и за пределами своей ниши', descEn:'The blog is known even outside its original niche'} },
    security: { icon:'🛡️', name:'Модерация', nameEn:'Moderation',
      t1:{name:'Фильтр спама',nameEn:'Spam filter', desc:'Комментарии-спам отсеиваются автоматически', descEn:'Spam comments get filtered automatically'},
      t2:{name:'Модерация комментариев',nameEn:'Comment moderation', desc:'Токсичные комментарии убираются вручную', descEn:'Toxic comments get removed by hand'},
      t3_risky:{name:'Открытые комментарии',nameEn:'Open comments', desc:'Никакой премодерации — обсуждения живее, но растёт риск скандала', descEn:'No pre-moderation — discussions feel livelier, but the risk of a blowup grows'},
      t3_safe:{name:'Строгая премодерация',nameEn:'Strict pre-moderation', desc:'Каждый комментарий проверяется перед публикацией', descEn:'Every comment is checked before it goes live'},
      t4:{name:'Доверие читателей',nameEn:'Reader trust', desc:'Комьюнити блога считается безопасным и модерируемым', descEn:'The blog\'s community is seen as safe and well-moderated'} },
  },
  shop: {
    design: { icon:'🛍️', name:'Витрина', nameEn:'Storefront',
      t1:{name:'Простые карточки товаров',nameEn:'Basic product cards', desc:'Фото и цена — минимум для первых продаж', descEn:'Photos and price — the bare minimum to start selling'},
      t2:{name:'Единый стиль каталога',nameEn:'Consistent catalog style', desc:'Все карточки товаров оформлены одинаково', descEn:'Every product card follows the same look'},
      t3_risky:{name:'Погоня за витринными трендами',nameEn:'Chasing storefront trends', desc:'Резкий редизайн под модные темы — конверсия подскакивает, но старые покупатели теряются в новом интерфейсе', descEn:'A sudden redesign chasing what\'s trendy — conversion jumps, but returning shoppers get lost in the new layout'},
      t3_safe:{name:'Плавный ребрендинг витрины',nameEn:'Gradual storefront rebrand', desc:'Обновляете оформление аккуратно, шаг за шагом', descEn:'You refresh the look carefully, step by step'},
      t4:{name:'Узнаваемый бренд магазина',nameEn:'Recognizable store identity', desc:'Витрину магазина узнают с первого взгляда', descEn:'Shoppers recognize the store\'s look at a glance'},
    },
    traffic: { icon:'🧾', name:'Покупатели', nameEn:'Shoppers',
      t1:{name:'Первые заказы',nameEn:'First orders', desc:'Магазин начинают находить через поиск и рекомендации', descEn:'People start finding the store via search and recommendations'},
      t2:{name:'SEO карточек товаров',nameEn:'Product SEO', desc:'Товары поднимаются в поисковой выдаче', descEn:'Products climb the search rankings'},
      t3_risky:{name:'Массовая закупка трафика',nameEn:'Bulk traffic buy', desc:'Дешёвый трафик резко разгоняет посещаемость — но конверсия позже проседает из-за случайных, незаинтересованных визитов', descEn:'Cheap traffic spikes visits fast — but conversion slips later from random, low-intent visitors'},
      t3_safe:{name:'Возврат клиентов через рассылки',nameEn:'Repeat customers via retargeting', desc:'Медленный, но стабильный рост постоянных покупателей', descEn:'Slower but steady growth of returning shoppers'},
      t4:{name:'Лояльная база покупателей',nameEn:'A loyal customer base', desc:'Ядро клиентов возвращается за новыми покупками', descEn:'A core of shoppers keeps coming back for more'},
    },
    infra: { icon:'📦', name:'Склад и доставка', nameEn:'Warehouse & fulfillment',
      t1:{name:'Ручная обработка заказов',nameEn:'Manual order processing', desc:'Заказы собираются и отправляются вручную', descEn:'Orders are picked and shipped by hand'},
      t2:{name:'Автоматизация склада',nameEn:'Warehouse automation', desc:'Сборка заказов идёт заметно быстрее', descEn:'Order picking gets noticeably faster'},
      t3_risky:{name:'Экономия на упаковке и проверке',nameEn:'Cutting corners on packing & QA', desc:'Отгрузка ускоряется — но со временем растёт число повреждённых и неверно собранных заказов', descEn:'Shipping speeds up — but damaged and mispacked orders creep up over time'},
      t3_safe:{name:'Контроль качества перед отправкой',nameEn:'QA before every shipment', desc:'Каждый заказ проверяется перед отправкой', descEn:'Every order gets checked before it ships'},
      t4:{name:'Отлаженная логистика',nameEn:'A well-oiled fulfillment line', desc:'От заказа до доставки — быстро и без сбоев', descEn:'From order to delivery — fast and reliable'},
    },
    marketing: { icon:'📣', name:'Продвижение магазина', nameEn:'Store promotion',
      t1:{name:'Соцсети магазина',nameEn:'Store\'s social pages', desc:'Анонсы новых товаров в соцсетях', descEn:'New arrivals get announced on social media'},
      t2:{name:'Email со скидками',nameEn:'Discount newsletter', desc:'Подписчики получают персональные предложения', descEn:'Subscribers get personalized offers'},
      t3_risky:{name:'Тотальные распродажи',nameEn:'Blanket discount wars', desc:'Резкий всплеск продаж — но маржа проседает, а бренд обесценивается в глазах покупателей', descEn:'Sales spike sharply — but margins erode and the brand loses perceived value'},
      t3_safe:{name:'Коллаборации с обзорщиками',nameEn:'Reviewer collaborations', desc:'Точечные партнёрства с блогерами по теме', descEn:'Targeted partnerships with relevant reviewers'},
      t4:{name:'Магазин с именем',nameEn:'A store with a name', desc:'О магазине узнают и за пределами ниши', descEn:'The store is known even outside its niche'},
    },
    security: { icon:'🔒', name:'Защита платежей', nameEn:'Payment security',
      t1:{name:'Базовая проверка платежей',nameEn:'Basic payment checks', desc:'Оплата проходит без явных сбоев', descEn:'Payments go through without obvious hiccups'},
      t2:{name:'Защита от мошенников',nameEn:'Fraud protection', desc:'Подозрительные транзакции отслеживаются', descEn:'Suspicious transactions get flagged'},
      t3_risky:{name:'Упрощённый чекаут ради скорости',nameEn:'Simplified checkout for speed', desc:'Меньше отказов при оформлении — но потери от мошенничества со временем растут', descEn:'Fewer checkout drop-offs — but fraud losses creep up over time'},
      t3_safe:{name:'Строгая антифрод-система',nameEn:'Strict anti-fraud system', desc:'Каждая подозрительная операция проверяется вручную', descEn:'Every suspicious transaction gets a manual review'},
      t4:{name:'Доверие к оплате',nameEn:'Checkout buyers trust', desc:'Покупатели уверены, что их деньги защищены', descEn:'Shoppers trust their money is safe here'},
    },
  },
  saas: {
    design: { icon:'🖥️', name:'Интерфейс сервиса', nameEn:'Product UI',
      t1:{name:'Рабочий, но грубый интерфейс',nameEn:'A working but rough UI', desc:'Функции есть, но пользоваться неудобно', descEn:'The features work, but it\'s clunky to use'},
      t2:{name:'Единая дизайн-система',nameEn:'A proper design system', desc:'Интерфейс становится последовательным', descEn:'The interface starts to feel consistent'},
      t3_risky:{name:'Смелый редизайн интерфейса',nameEn:'A bold UI overhaul', desc:'Резкая смена интерфейса ради вау-эффекта — часть старых клиентов не успевает переучиться и уходит', descEn:'A sudden interface overhaul for the wow factor — some longtime users can\'t keep up and churn'},
      t3_safe:{name:'Постепенные UX-улучшения',nameEn:'Incremental UX polish', desc:'Интерфейс улучшается небольшими, безопасными шагами', descEn:'The UI improves in small, safe steps'},
      t4:{name:'Продукт, которым приятно пользоваться',nameEn:'A product people enjoy using', desc:'Интерфейс сервиса стал одним из его преимуществ', descEn:'The UI has become one of the product\'s selling points'},
    },
    traffic: { icon:'📊', name:'Привлечение клиентов', nameEn:'Customer acquisition',
      t1:{name:'Первые регистрации',nameEn:'First signups', desc:'Люди узнают о сервисе через сарафанное радио', descEn:'People hear about the service by word of mouth'},
      t2:{name:'Контент-воронка и SEO',nameEn:'Content funnel & SEO', desc:'Статьи и гайды приводят целевых пользователей', descEn:'Guides and articles bring in targeted users'},
      t3_risky:{name:'Агрессивная закупка лидов',nameEn:'Aggressive lead buying', desc:'Резкий рост регистраций — но часть лидов холодные и не доходят до оплаты', descEn:'Signups spike fast — but many leads are cold and never convert to paying'},
      t3_safe:{name:'Реферальная программа',nameEn:'Referral program', desc:'Существующие клиенты приводят новых, стабильно', descEn:'Existing customers bring in new ones, steadily'},
      t4:{name:'Устойчивый поток клиентов',nameEn:'A steady acquisition engine', desc:'Новые клиенты приходят предсказуемо, месяц за месяцем', descEn:'New customers arrive predictably, month after month'},
    },
    infra: { icon:'⚙️', name:'Надёжность сервиса', nameEn:'Service reliability',
      t1:{name:'Сервис держится на одном сервере',nameEn:'Running on a single server', desc:'Работает, пока нагрузка небольшая', descEn:'It works fine as long as load stays light'},
      t2:{name:'Масштабируемая инфраструктура',nameEn:'Scalable infrastructure', desc:'Сервис справляется с ростом нагрузки', descEn:'The service handles growing load'},
      t3_risky:{name:'Быстрые релизы без полного тестирования',nameEn:'Fast releases, skipping full QA', desc:'Новые функции выходят быстрее — но со временем растёт число падений и багов у клиентов', descEn:'New features ship faster — but outages and client-facing bugs creep up over time'},
      t3_safe:{name:'Полноценное тестирование релизов',nameEn:'Proper release testing', desc:'Каждое обновление проверяется перед выкаткой', descEn:'Every update gets checked before rollout'},
      t4:{name:'Сервис, которому доверяют бизнесы',nameEn:'A service businesses trust', desc:'Аптайм и стабильность стали конкурентным преимуществом', descEn:'Uptime and stability have become a selling point'},
    },
    marketing: { icon:'📣', name:'B2B-продвижение', nameEn:'B2B marketing',
      t1:{name:'Первые кейсы клиентов',nameEn:'First customer case studies', desc:'Успехи первых клиентов используются как доказательство', descEn:'Early wins become proof points for new prospects'},
      t2:{name:'Вебинары и демо',nameEn:'Webinars and demos', desc:'Потенциальные клиенты видят продукт в деле', descEn:'Prospects see the product in action'},
      t3_risky:{name:'Громкие, но пустые обещания в рекламе',nameEn:'Big but empty ad promises', desc:'Реклама резко поднимает интерес — но завышенные обещания позже подрывают доверие клиентов', descEn:'Ads spike interest fast — but the inflated promises later damage customer trust'},
      t3_safe:{name:'Честный контент-маркетинг',nameEn:'Honest content marketing', desc:'Рост через полезные материалы и реальные отзывы', descEn:'Growth through genuinely useful content and real testimonials'},
      t4:{name:'Признанный игрок рынка',nameEn:'A recognized market player', desc:'О сервисе говорят как о стандарте в нише', descEn:'The service is talked about as the standard in its niche'},
    },
    security: { icon:'🛡️', name:'Безопасность данных', nameEn:'Data security',
      t1:{name:'Базовое шифрование',nameEn:'Basic encryption', desc:'Данные клиентов защищены минимально необходимым способом', descEn:'Customer data gets the bare minimum protection'},
      t2:{name:'Регулярные аудиты безопасности',nameEn:'Regular security audits', desc:'Уязвимости находят и закрывают до инцидентов', descEn:'Vulnerabilities get found and patched before incidents happen'},
      t3_risky:{name:'Ускоренный выпуск фич в обход проверок',nameEn:'Rushing features past security review', desc:'Функции выходят быстрее — но растёт риск утечки данных клиентов', descEn:'Features ship faster — but the risk of a client data leak grows'},
      t3_safe:{name:'Строгий процесс проверки безопасности',nameEn:'A strict security review process', desc:'Каждая новая функция проходит проверку на уязвимости', descEn:'Every new feature gets checked for vulnerabilities'},
      t4:{name:'Сертифицированная защита данных',nameEn:'Certified-grade data protection', desc:'Клиенты доверяют сервису хранение чувствительных данных', descEn:'Clients trust the service with their sensitive data'},
    },
  },
  app: {
    design: { icon:'📲', name:'UI приложения', nameEn:'App design',
      t1:{name:'Простые экраны',nameEn:'Bare-bones screens', desc:'Приложение работает, но выглядит сыро', descEn:'The app works, but looks unpolished'},
      t2:{name:'Фирменный визуальный стиль',nameEn:'A signature visual style', desc:'Экраны приложения выглядят последовательно', descEn:'Screens feel consistent across the app'},
      t3_risky:{name:'Резкий редизайн под свежий тренд',nameEn:'A sudden trend-chasing redesign', desc:'Новый вид приносит всплеск скачиваний — но часть старых пользователей не может привыкнуть и удаляет приложение', descEn:'The new look spikes downloads — but some longtime users can\'t adjust and uninstall'},
      t3_safe:{name:'Постепенное обновление интерфейса',nameEn:'A gradual interface refresh', desc:'Изменения вносятся аккуратно, без риска для аудитории', descEn:'Changes roll out carefully, with no risk to the user base'},
      t4:{name:'Узнаваемый и удобный интерфейс',nameEn:'A polished, recognizable UI', desc:'Приложением приятно пользоваться и его узнают по стилю', descEn:'The app is a pleasure to use and instantly recognizable'},
    },
    traffic: { icon:'⬇️', name:'Загрузки', nameEn:'Downloads',
      t1:{name:'Первые установки',nameEn:'First installs', desc:'Приложение находят в сторе по прямым запросам', descEn:'People find the app in the store via direct search'},
      t2:{name:'ASO-оптимизация',nameEn:'App store optimization', desc:'Приложение поднимается в поиске стора', descEn:'The app climbs the store\'s search rankings'},
      t3_risky:{name:'Закупка установок через боты и мотивированный трафик',nameEn:'Buying installs via incentivized/bot traffic', desc:'Резкий скачок установок — но удержание падает, ведь пользователи не заинтересованы в продукте', descEn:'Installs spike fast — but retention tanks since these users were never really interested'},
      t3_safe:{name:'Органический рост через отзывы',nameEn:'Organic growth via reviews', desc:'Медленный, но качественный прирост заинтересованных пользователей', descEn:'Slower but higher-quality growth of genuinely interested users'},
      t4:{name:'Стабильный поток новых пользователей',nameEn:'A steady stream of new users', desc:'Приложение регулярно находят новые люди', descEn:'New people keep discovering the app, week after week'},
    },
    infra: { icon:'⚙️', name:'Стабильность приложения', nameEn:'App stability',
      t1:{name:'Редкие вылеты приложения',nameEn:'Occasional crashes', desc:'Приложение работает, но иногда падает', descEn:'The app works, but crashes now and then'},
      t2:{name:'Оптимизация производительности',nameEn:'Performance optimization', desc:'Приложение стало быстрее и стабильнее', descEn:'The app got noticeably faster and more stable'},
      t3_risky:{name:'Быстрые релизы без полного тестирования',nameEn:'Fast releases, skipping full QA', desc:'Обновления выходят чаще — но со временем растёт число багов и вылетов у пользователей', descEn:'Updates ship more often — but bugs and crashes creep up over time'},
      t3_safe:{name:'Тестирование перед каждым релизом',nameEn:'QA before every release', desc:'Каждое обновление проверяется на разных устройствах', descEn:'Every update gets tested across devices before release'},
      t4:{name:'Приложение, которое не подводит',nameEn:'An app that just works', desc:'Пользователи забыли, что такое вылет приложения', descEn:'Users have forgotten what a crash even looks like'},
    },
    marketing: { icon:'📣', name:'Продвижение приложения', nameEn:'App promotion',
      t1:{name:'Посты в соцсетях',nameEn:'Social media posts', desc:'Первые пользователи приходят через анонсы', descEn:'Early users come in through announcements'},
      t2:{name:'Инфлюенсер-обзоры',nameEn:'Influencer reviews', desc:'Обзорщики рассказывают о приложении своей аудитории', descEn:'Reviewers show the app off to their audience'},
      t3_risky:{name:'Массовая закупка рекламы',nameEn:'A bulk ad buy', desc:'Резкий приток новых пользователей — но часть случайна и быстро удаляет приложение', descEn:'A sharp influx of new users — but many are random and uninstall quickly'},
      t3_safe:{name:'Точечные партнёрства',nameEn:'Targeted partnerships', desc:'Реклама у аудитории, которой продукт реально нужен', descEn:'Ads reach an audience that genuinely needs the product'},
      t4:{name:'Приложение с узнаваемым именем',nameEn:'An app with real name recognition', desc:'О приложении узнают и за пределами первой аудитории', descEn:'The app is known even beyond its original audience'},
    },
    security: { icon:'🔐', name:'Защита данных пользователей', nameEn:'User data protection',
      t1:{name:'Базовая защита аккаунтов',nameEn:'Basic account protection', desc:'Логин и пароль защищены минимально необходимым способом', descEn:'Login and password get the bare minimum protection'},
      t2:{name:'Двухфакторная аутентификация',nameEn:'Two-factor authentication', desc:'Аккаунты пользователей защищены надёжнее', descEn:'User accounts are protected more reliably'},
      t3_risky:{name:'Упрощённый вход ради удобства',nameEn:'Simplified login for convenience', desc:'Вход в приложение становится быстрее — но со временем растёт число взломанных аккаунтов', descEn:'Logging in gets faster — but account breaches creep up over time'},
      t3_safe:{name:'Строгая проверка подозрительных входов',nameEn:'Strict suspicious-login checks', desc:'Каждый нетипичный вход проверяется дополнительно', descEn:'Every unusual login gets an extra check'},
      t4:{name:'Приложение, которому доверяют данные',nameEn:'An app people trust with their data', desc:'Пользователи уверены в сохранности своих данных', descEn:'Users feel confident their data is safe here'},
    },
  },
  social: {
    design: { icon:'💬', name:'Оформление ленты', nameEn:'Feed design',
      t1:{name:'Простая лента постов',nameEn:'A bare-bones feed', desc:'Публикации отображаются, но без изысков', descEn:'Posts show up, but nothing fancy'},
      t2:{name:'Продуманный визуальный стиль',nameEn:'A thoughtful visual style', desc:'Лента и профили выглядят целостно', descEn:'Feed and profiles feel cohesive'},
      t3_risky:{name:'Резкий редизайн ленты',nameEn:'A sudden feed overhaul', desc:'Новый вид вызывает всплеск обсуждений — но часть давних пользователей не принимает изменения и уходит', descEn:'The new look sparks a wave of buzz — but some longtime users reject the change and leave'},
      t3_safe:{name:'Постепенные визуальные обновления',nameEn:'Gradual visual updates', desc:'Изменения вносятся плавно, тестируясь на части аудитории', descEn:'Changes roll out gently, tested on part of the audience first'},
      t4:{name:'Узнаваемая эстетика платформы',nameEn:'A recognizable platform aesthetic', desc:'Стиль ленты стал частью идентичности платформы', descEn:'The feed\'s look has become part of the platform\'s identity'},
    },
    traffic: { icon:'📈', name:'Рост аудитории', nameEn:'Audience growth',
      t1:{name:'Первые пользователи',nameEn:'First users', desc:'Друзья приглашают друзей', descEn:'Friends invite friends'},
      t2:{name:'Вирусные механики шеринга',nameEn:'Viral sharing mechanics', desc:'Контент легко расходится за пределы платформы', descEn:'Content spreads easily outside the platform'},
      t3_risky:{name:'Ставка на провокационный контент',nameEn:'Betting on provocative content', desc:'Резкий рост вовлечённости и охватов — но часть аудитории и рекламодателей отталкивает такой контент', descEn:'Engagement and reach spike fast — but some of the audience and advertisers get turned off by it'},
      t3_safe:{name:'Органическое сарафанное радио',nameEn:'Organic word of mouth', desc:'Медленный, но устойчивый прирост активных пользователей', descEn:'Slower but steady growth of genuinely active users'},
      t4:{name:'Самоподдерживающийся рост',nameEn:'Self-sustaining growth', desc:'Платформа растёт за счёт собственной активности пользователей', descEn:'The platform grows on the strength of its own users\' activity'},
    },
    infra: { icon:'🖥️', name:'Нагрузка серверов', nameEn:'Server load',
      t1:{name:'Сервис держится на честном слове',nameEn:'Held together with duct tape', desc:'Работает, пока пользователей немного', descEn:'It holds up as long as the user count stays small'},
      t2:{name:'Масштабируемая архитектура',nameEn:'Scalable architecture', desc:'Платформа выдерживает всплески активности', descEn:'The platform can absorb spikes in activity'},
      t3_risky:{name:'Экономия на модерации нагрузки',nameEn:'Skimping on load moderation', desc:'Расходы на инфраструктуру снижаются — но случаются перебои в пиковые моменты', descEn:'Infrastructure costs drop — but outages hit during peak moments'},
      t3_safe:{name:'Резервные мощности на пики',nameEn:'Reserved capacity for peak load', desc:'Платформа заранее готова к всплескам трафика', descEn:'The platform is prepared for traffic spikes in advance'},
      t4:{name:'Платформа держит любую нагрузку',nameEn:'A platform that handles anything', desc:'Пользователи не замечают технических проблем, даже в пиковые дни', descEn:'Users never notice technical hiccups, even on the busiest days'},
    },
    marketing: { icon:'📣', name:'Продвижение платформы', nameEn:'Platform promotion',
      t1:{name:'Первые амбассадоры',nameEn:'First ambassadors', desc:'Небольшая группа активных пользователей продвигает платформу', descEn:'A small group of active users spreads the word'},
      t2:{name:'Партнёрства с блогерами',nameEn:'Creator partnerships', desc:'Известные авторы приводят свою аудиторию', descEn:'Established creators bring their audience along'},
      t3_risky:{name:'Скупка знаменитостей за большие деньги',nameEn:'Buying celebrity endorsements at a steep price', desc:'Резкий всплеск узнаваемости — но расходы огромны, а часть новой аудитории быстро уходит', descEn:'Recognition spikes fast — but the cost is huge, and much of the new audience leaves quickly'},
      t3_safe:{name:'Органическое комьюнити-продвижение',nameEn:'Organic community promotion', desc:'Рост через реальную активность пользователей, без больших вливаний', descEn:'Growth through genuine user activity, without big spending'},
      t4:{name:'Платформа с культурным весом',nameEn:'A platform with cultural weight', desc:'О платформе говорят как о значимом явлении', descEn:'The platform is talked about as a cultural force'},
    },
    security: { icon:'🛡️', name:'Модерация платформы', nameEn:'Platform moderation',
      t1:{name:'Ручная модерация жалоб',nameEn:'Manual complaint handling', desc:'Жалобы разбираются вручную, с задержкой', descEn:'Reports get handled by hand, with delays'},
      t2:{name:'Автоматические фильтры контента',nameEn:'Automated content filters', desc:'Явно вредный контент отсеивается быстрее', descEn:'Clearly harmful content gets filtered out faster'},
      t3_risky:{name:'Минимум модерации ради свободы самовыражения',nameEn:'Minimal moderation for free expression', desc:'Активность и вовлечённость растут — но растёт и риск громких скандалов', descEn:'Activity and engagement grow — but so does the risk of a major blowup'},
      t3_safe:{name:'Строгие и прозрачные правила',nameEn:'Strict, transparent rules', desc:'Платформа воспринимается как безопасное пространство', descEn:'The platform is seen as a genuinely safe space'},
      t4:{name:'Доверие пользователей и рекламодателей',nameEn:'Trust from users and advertisers', desc:'Платформу считают образцово модерируемой', descEn:'The platform is seen as a model of good moderation'},
    },
  },
  crypto_exchange: {
    design: { icon:'🪙', name:'Интерфейс биржи', nameEn:'Exchange UI',
      t1:{name:'Базовый торговый экран',nameEn:'A bare-bones trading screen', desc:'Купить/продать работает, но выглядит сыро', descEn:'Buy/sell works, but the look is rough'},
      t2:{name:'Продуманные графики и терминал',nameEn:'Polished charts and terminal', desc:'Трейдеры получают удобные инструменты анализа', descEn:'Traders get proper analysis tools'},
      t3_risky:{name:'Резкий редизайн терминала',nameEn:'A sudden terminal overhaul', desc:'Новый интерфейс впечатляет новичков — но опытные трейдеры теряются в непривычной раскладке и уходят к конкурентам', descEn:'The new UI wows newcomers — but seasoned traders get lost in the unfamiliar layout and leave for a competitor'},
      t3_safe:{name:'Постепенное улучшение терминала',nameEn:'Incremental terminal polish', desc:'Интерфейс улучшается без потери привычной раскладки', descEn:'The UI improves without breaking the layout traders are used to'},
      t4:{name:'Терминал уровня профи',nameEn:'A pro-grade trading terminal', desc:'Биржей пользуются и новички, и профессиональные трейдеры', descEn:'Both beginners and professional traders feel at home here'},
    },
    traffic: { icon:'📊', name:'Приток трейдеров', nameEn:'Trader acquisition',
      t1:{name:'Первые пользователи',nameEn:'First traders', desc:'О бирже узнают через крипто-сообщества', descEn:'People hear about the exchange through crypto communities'},
      t2:{name:'Листинг новых монет',nameEn:'New coin listings', desc:'Новые токены привлекают новую аудиторию', descEn:'New tokens draw in a new audience'},
      t3_risky:{name:'Листинг сомнительных токенов ради объёма',nameEn:'Listing dubious tokens for volume', desc:'Объём торгов резко растёт — но скандалы с обвалом токенов позже бьют по репутации биржи', descEn:'Trading volume spikes fast — but token-collapse scandals later hit the exchange\'s reputation'},
      t3_safe:{name:'Строгий отбор проверенных проектов',nameEn:'Careful vetting of listed projects', desc:'Растёт медленнее, зато доверие трейдеров крепче', descEn:'Growth is slower, but trader trust runs deeper'},
      t4:{name:'Биржа с репутацией надёжной площадки',nameEn:'An exchange known for reliability', desc:'Трейдеры выбирают биржу именно из-за доверия к ней', descEn:'Traders choose the exchange specifically because they trust it'},
    },
    infra: { icon:'⚙️', name:'Устойчивость платформы', nameEn:'Platform stability',
      t1:{name:'Биржа держится на минимальных мощностях',nameEn:'Running on minimal capacity', desc:'Работает нормально, пока рынок спокоен', descEn:'It runs fine as long as the market stays calm'},
      t2:{name:'Масштабируемые сервера',nameEn:'Scalable servers', desc:'Платформа выдерживает всплески активности при волатильности', descEn:'The platform can handle activity spikes during volatile swings'},
      t3_risky:{name:'Экономия на резервных мощностях',nameEn:'Cutting back on backup capacity', desc:'Расходы на инфраструктуру ниже — но в пик волатильности случаются сбои и недовольство трейдеров', descEn:'Infrastructure costs drop — but outages and trader complaints hit during peak volatility'},
      t3_safe:{name:'Резервные мощности на пиковую волатильность',nameEn:'Reserved capacity for peak volatility', desc:'Платформа держится стабильно даже в дни резких скачков рынка', descEn:'The platform stays stable even on the market\'s wildest days'},
      t4:{name:'Биржа, которая не падает никогда',nameEn:'An exchange that never goes down', desc:'Даже в дни рекордной волатильности платформа работает без сбоев', descEn:'Even on record-volatility days, the platform runs without a hitch'},
    },
    marketing: { icon:'📣', name:'Продвижение биржи', nameEn:'Exchange promotion',
      t1:{name:'Присутствие в крипто-сообществах',nameEn:'A presence in crypto communities', desc:'Биржу обсуждают на форумах и в чатах', descEn:'The exchange gets talked about on forums and in chats'},
      t2:{name:'Реферальная программа для трейдеров',nameEn:'A trader referral program', desc:'Существующие трейдеры приводят новых за бонусы', descEn:'Existing traders bring in new ones for referral rewards'},
      t3_risky:{name:'Агрессивные бонусы за объём торгов',nameEn:'Aggressive volume-based bonuses', desc:'Резкий рост торгового объёма — но часть трейдеров гонится только за бонусом и уходит сразу после', descEn:'Trading volume spikes fast — but some traders are only there for the bonus and leave right after'},
      t3_safe:{name:'Образовательный контент для новичков',nameEn:'Educational content for beginners', desc:'Новые трейдеры приходят осознанно и остаются надолго', descEn:'New traders arrive with real intent and stick around'},
      t4:{name:'Биржа №1 в отрасли по узнаваемости',nameEn:'The most recognized exchange in the space', desc:'О бирже знают даже те, кто не торгует криптой', descEn:'Even people who don\'t trade crypto know the name'},
    },
    security: { icon:'🛡️', name:'Защита активов', nameEn:'Asset security',
      t1:{name:'Базовое хранение средств',nameEn:'Basic fund storage', desc:'Средства клиентов хранятся минимально надёжным способом', descEn:'Client funds get the bare minimum secure storage'},
      t2:{name:'Холодное хранение и аудит',nameEn:'Cold storage and audits', desc:'Большая часть средств вынесена в защищённое офлайн-хранилище', descEn:'Most funds are moved to secure offline cold storage'},
      t3_risky:{name:'Больше средств в горячем кошельке ради скорости вывода',nameEn:'More funds in the hot wallet for faster withdrawals', desc:'Вывод средств становится мгновенным — но растёт риск крупного взлома', descEn:'Withdrawals become instant — but the risk of a major hack grows'},
      t3_safe:{name:'Максимум средств в холодном хранении',nameEn:'Maximum funds in cold storage', desc:'Вывод чуть медленнее, зато средства клиентов защищены надёжно', descEn:'Withdrawals are a bit slower, but client funds are properly secured'},
      t4:{name:'Биржа с репутацией неприступной',nameEn:'An exchange known as impenetrable', desc:'Трейдеры уверены, что их активы в полной безопасности', descEn:'Traders are confident their assets are completely safe here'},
    },
  },
  ai: {
    design: { icon:'🧠', name:'Интерфейс AI-платформы', nameEn:'AI platform UI',
      t1:{name:'Простой чат-интерфейс',nameEn:'A bare-bones chat interface', desc:'Модель отвечает, но интерфейс минималистичный до скучного', descEn:'The model responds, but the interface is bare to the point of dull'},
      t2:{name:'Продуманный интерфейс работы с моделью',nameEn:'A thoughtfully designed model UI', desc:'Пользователям удобно настраивать и использовать модель', descEn:'Users find it easy to configure and use the model'},
      t3_risky:{name:'Резкий редизайн под хайповый визуал',nameEn:'A sudden hype-driven redesign', desc:'Эффектный новый вид собирает внимание в соцсетях — но часть постоянных пользователей теряет привычные функции и уходит', descEn:'The flashy new look grabs social buzz — but some regular users lose familiar features and leave'},
      t3_safe:{name:'Постепенное улучшение UX',nameEn:'Gradual UX polish', desc:'Интерфейс становится удобнее без резких перемен', descEn:'The interface gets more usable without a jarring shift'},
      t4:{name:'Интерфейс уровня лучших AI-продуктов',nameEn:'Best-in-class AI product UI', desc:'Работой с моделью восхищаются даже конкуренты', descEn:'Even competitors admire how the model is presented'},
    },
    traffic: { icon:'📈', name:'Рост пользователей', nameEn:'User growth',
      t1:{name:'Первые энтузиасты',nameEn:'First enthusiasts', desc:'О модели узнают через технические сообщества', descEn:'People hear about the model through tech communities'},
      t2:{name:'Публикации и бенчмарки',nameEn:'Papers and benchmarks', desc:'Хорошие результаты в тестах привлекают внимание отрасли', descEn:'Strong benchmark results catch the industry\'s attention'},
      t3_risky:{name:'Громкие маркетинговые заявления о возможностях',nameEn:'Bold marketing claims about capabilities', desc:'Резкий всплеск интереса — но завышенные ожидания позже оборачиваются разочарованием пользователей', descEn:'Interest spikes fast — but the inflated expectations later turn into user disappointment'},
      t3_safe:{name:'Честная демонстрация реальных возможностей',nameEn:'Honest demos of real capabilities', desc:'Рост медленнее, но ожидания пользователей совпадают с реальностью', descEn:'Growth is slower, but user expectations match reality'},
      t4:{name:'Модель, которой доверяет индустрия',nameEn:'A model the industry trusts', desc:'О продукте говорят как о серьёзном игроке рынка AI', descEn:'The product is talked about as a serious player in the AI space'},
    },
    infra: { icon:'⚙️', name:'Вычислительные мощности', nameEn:'Compute infrastructure',
      t1:{name:'Минимальные вычислительные мощности',nameEn:'Minimal compute capacity', desc:'Модель отвечает, но медленно в часы пик', descEn:'The model responds, but slowly during peak hours'},
      t2:{name:'Расширенный вычислительный кластер',nameEn:'An expanded compute cluster', desc:'Модель отвечает быстрее и выдерживает больше запросов', descEn:'The model responds faster and handles more requests'},
      t3_risky:{name:'Экономия на резервных мощностях',nameEn:'Skimping on backup compute', desc:'Расходы на инфраструктуру ниже — но в пиковые часы случаются перебои и очереди запросов', descEn:'Infrastructure costs drop — but outages and request queues hit during peak hours'},
      t3_safe:{name:'Резервные мощности на пиковую нагрузку',nameEn:'Reserved capacity for peak load', desc:'Модель отвечает стабильно даже при резком росте спроса', descEn:'The model responds reliably even when demand spikes'},
      t4:{name:'Инфраструктура, готовая к любому спросу',nameEn:'Infrastructure ready for any demand', desc:'Модель держит нагрузку без сбоев в любой момент', descEn:'The model handles load without a hitch, any time'},
    },
    marketing: { icon:'📣', name:'Продвижение AI-продукта', nameEn:'AI product promotion',
      t1:{name:'Первые публикации в соцсетях',nameEn:'First social media posts', desc:'Демонстрации возможностей модели вызывают интерес', descEn:'Capability demos start drawing interest'},
      t2:{name:'Партнёрства с техноблогерами',nameEn:'Tech influencer partnerships', desc:'Обзорщики показывают модель своей аудитории', descEn:'Reviewers show the model off to their audience'},
      t3_risky:{name:'Вирусные, но преувеличенные демо',nameEn:'Viral but exaggerated demos', desc:'Ролики набирают миллионы просмотров — но несоответствие ожиданиям позже вредит репутации', descEn:'The demos rack up millions of views — but the gap with reality later hurts the reputation'},
      t3_safe:{name:'Партнёрства с реальными бизнес-кейсами',nameEn:'Partnerships built on real business cases', desc:'Рост через доказанную пользу для конкретных задач', descEn:'Growth through proven value on real-world use cases'},
      t4:{name:'AI-продукт, о котором говорит индустрия',nameEn:'An AI product the industry talks about', desc:'Продукт упоминают как ориентир в своей категории', descEn:'The product gets cited as a benchmark in its category'},
    },
    security: { icon:'🛡️', name:'Безопасность модели', nameEn:'Model safety & security',
      t1:{name:'Базовые ограничения модели',nameEn:'Basic model guardrails', desc:'Модель избегает самых очевидных проблем', descEn:'The model avoids the most obvious pitfalls'},
      t2:{name:'Регулярное тестирование на уязвимости',nameEn:'Regular red-teaming', desc:'Проблемные ответы находят и исправляют заранее', descEn:'Problematic outputs get found and fixed ahead of time'},
      t3_risky:{name:'Меньше ограничений ради более смелых ответов',nameEn:'Fewer guardrails for bolder answers', desc:'Модель выглядит более полезной и гибкой — но растёт риск громкого скандала из-за неудачного ответа', descEn:'The model feels more capable and flexible — but the risk of a bad-response scandal grows'},
      t3_safe:{name:'Строгая проверка перед каждым релизом',nameEn:'Strict pre-release review', desc:'Каждое обновление модели проверяется на безопасность', descEn:'Every model update gets checked for safety before release'},
      t4:{name:'Модель с репутацией надёжной и безопасной',nameEn:'A model known for being safe and reliable', desc:'Бизнесы доверяют модели без опасений', descEn:'Businesses trust the model without hesitation'},
    },
  },
  logistics: {
    design: { icon:'🚚', name:'Клиентский сервис', nameEn:'Customer-facing service',
      t1:{name:'Простое отслеживание доставки',nameEn:'Basic delivery tracking', desc:'Клиент видит только статус «в пути»', descEn:'Customers just see an \'in transit\' status'},
      t2:{name:'Понятный трекинг в реальном времени',nameEn:'Clear real-time tracking', desc:'Клиенты видят точный маршрут и время доставки', descEn:'Customers see the exact route and delivery time'},
      t3_risky:{name:'Резкое упрощение интерфейса трекинга',nameEn:'A sudden tracking-UI simplification', desc:'Приложение выглядит проще и современнее — но часть клиентов теряет привычные детали и жалуется', descEn:'The app looks simpler and more modern — but some customers lose familiar details and complain'},
      t3_safe:{name:'Постепенное улучшение трекинга',nameEn:'Gradual tracking improvements', desc:'Интерфейс становится удобнее без потери функций', descEn:'The interface gets more usable without losing features'},
      t4:{name:'Сервис отслеживания, который хвалят клиенты',nameEn:'A tracking experience customers praise', desc:'Клиенты выбирают компанию именно за удобство отслеживания', descEn:'Customers choose the company specifically for the tracking experience'},
    },
    traffic: { icon:'📦', name:'Приток заказов', nameEn:'Order volume',
      t1:{name:'Первые контракты',nameEn:'First contracts', desc:'Компанию находят по рекомендациям других бизнесов', descEn:'The company gets found through referrals from other businesses'},
      t2:{name:'Партнёрства с интернет-магазинами',nameEn:'Partnerships with online stores', desc:'Постоянный поток заказов от партнёров', descEn:'A steady stream of orders from partner stores'},
      t3_risky:{name:'Демпинг цен ради объёма',nameEn:'Undercutting prices for volume', desc:'Заказов резко становится больше — но маржа падает и часть клиентов уходит при первом же повышении цен', descEn:'Orders spike fast — but margins shrink and clients bail at the first price increase'},
      t3_safe:{name:'Долгосрочные контракты с ключевыми клиентами',nameEn:'Long-term contracts with key clients', desc:'Рост стабильнее, отношения с клиентами крепче', descEn:'Growth is steadier and client relationships run deeper'},
      t4:{name:'Логистический партнёр номер один',nameEn:'The go-to logistics partner', desc:'Крупные клиенты выбирают компанию в первую очередь', descEn:'Major clients pick the company first, every time'},
    },
    infra: { icon:'🚛', name:'Парк и склады', nameEn:'Fleet & warehouses',
      t1:{name:'Минимальный парк техники',nameEn:'A minimal fleet', desc:'Доставка справляется, пока заказов немного', descEn:'Deliveries hold up as long as order volume stays low'},
      t2:{name:'Расширенный автопарк и склады',nameEn:'An expanded fleet and warehouses', desc:'Компания выдерживает рост числа заказов', descEn:'The company can handle growing order volume'},
      t3_risky:{name:'Экономия на обслуживании техники',nameEn:'Skimping on fleet maintenance', desc:'Расходы на технику ниже — но со временем растёт число поломок и задержек доставки', descEn:'Fleet costs drop — but breakdowns and delivery delays creep up over time'},
      t3_safe:{name:'Регулярное техобслуживание парка',nameEn:'Regular fleet maintenance', desc:'Поломки случаются реже, доставка идёт по графику', descEn:'Breakdowns happen less often, deliveries stay on schedule'},
      t4:{name:'Парк техники мирового уровня',nameEn:'A world-class fleet', desc:'Компания доставляет вовремя даже в самый напряжённый сезон', descEn:'The company delivers on time even during the busiest season'},
    },
    marketing: { icon:'📣', name:'Продвижение компании', nameEn:'Company promotion',
      t1:{name:'Первые отзывы клиентов',nameEn:'First client testimonials', desc:'Первые довольные клиенты рекомендуют компанию дальше', descEn:'Early satisfied clients start recommending the company'},
      t2:{name:'Участие в отраслевых мероприятиях',nameEn:'Attending industry events', desc:'Компания знакомится с потенциальными крупными клиентами', descEn:'The company gets in front of potential major clients'},
      t3_risky:{name:'Громкие обещания сроков доставки',nameEn:'Bold delivery-time promises in ads', desc:'Реклама резко привлекает новых клиентов — но невыполненные обещания позже подрывают репутацию', descEn:'Ads pull in new clients fast — but broken promises later damage the reputation'},
      t3_safe:{name:'Продвижение через реальные кейсы',nameEn:'Promotion through real case studies', desc:'Рост через честные примеры успешных доставок', descEn:'Growth through honest examples of successful deliveries'},
      t4:{name:'Компания с безупречной репутацией',nameEn:'A company with a spotless reputation', desc:'О надёжности компании знают во всей отрасли', descEn:'The whole industry knows this company for its reliability'},
    },
    security: { icon:'🛡️', name:'Сохранность грузов', nameEn:'Cargo safety',
      t1:{name:'Базовая упаковка грузов',nameEn:'Basic cargo packaging', desc:'Грузы доезжают, но иногда с повреждениями', descEn:'Cargo arrives, but sometimes damaged'},
      t2:{name:'Стандарты упаковки и страхование',nameEn:'Packaging standards and insurance', desc:'Повреждения и потери случаются заметно реже', descEn:'Damage and losses drop noticeably'},
      t3_risky:{name:'Упрощённая упаковка ради скорости отгрузки',nameEn:'Simplified packaging for faster shipping', desc:'Отгрузка ускоряется — но со временем растёт число претензий за повреждённые грузы', descEn:'Shipping speeds up — but damage claims creep up over time'},
      t3_safe:{name:'Усиленный контроль качества упаковки',nameEn:'Reinforced packaging QA', desc:'Каждый груз проверяется перед отправкой', descEn:'Every shipment gets checked before it goes out'},
      t4:{name:'Компания с репутацией нулевых потерь',nameEn:'A company known for zero losses', desc:'Клиенты доверяют компании самые ценные грузы', descEn:'Clients trust the company with their most valuable cargo'},
    },
  },
  restaurant: {
    design: { icon:'🍔', name:'Оформление меню', nameEn:'Menu presentation',
      t1:{name:'Простой список блюд',nameEn:'A bare-bones dish list', desc:'Меню читаемо, но без изысков', descEn:'The menu is readable, but nothing special'},
      t2:{name:'Фотографии блюд и стильное меню',nameEn:'Dish photos and a polished menu', desc:'Меню выглядит аппетитно и профессионально', descEn:'The menu looks appetizing and professional'},
      t3_risky:{name:'Резкое обновление меню под тренды',nameEn:'A sudden trend-driven menu overhaul', desc:'Новое меню привлекает внимание — но часть постоянных гостей не находит любимые блюда и уходит', descEn:'The new menu grabs attention — but some regulars can\'t find their favorite dishes and leave'},
      t3_safe:{name:'Постепенное обновление меню',nameEn:'A gradual menu refresh', desc:'Новые блюда добавляются аккуратно, старые любимые остаются', descEn:'New dishes get added carefully, old favorites stay'},
      t4:{name:'Меню, которое хочется фотографировать',nameEn:'A menu people want to photograph', desc:'Оформление блюд стало частью впечатления от заказа', descEn:'The presentation has become part of the whole experience'},
    },
    traffic: { icon:'🛵', name:'Поток заказов', nameEn:'Order flow',
      t1:{name:'Первые заказы по соседству',nameEn:'First orders from the neighborhood', desc:'О службе доставки узнают локально', descEn:'People discover the delivery service locally'},
      t2:{name:'Присутствие на агрегаторах доставки',nameEn:'Presence on delivery aggregators', desc:'Заказы приходят из приложений доставки еды', descEn:'Orders start coming in through food delivery apps'},
      t3_risky:{name:'Массовая закупка промо-показов в агрегаторах',nameEn:'Bulk promo placement on aggregators', desc:'Резкий рост заказов — но много разовых клиентов, которые не возвращаются', descEn:'Orders spike fast — but many are one-time customers who never come back'},
      t3_safe:{name:'Программа лояльности для постоянных клиентов',nameEn:'A loyalty program for regulars', desc:'Медленный, но устойчивый рост повторных заказов', descEn:'Slower but steady growth of repeat orders'},
      t4:{name:'Заведение с постоянным потоком гостей',nameEn:'A place with a steady stream of regulars', desc:'Заказы идут стабильно, без сезонных провалов', descEn:'Orders stay steady, no seasonal dips'},
    },
    infra: { icon:'👨‍🍳', name:'Кухня и доставка', nameEn:'Kitchen & delivery ops',
      t1:{name:'Минимальная кухня',nameEn:'A bare-bones kitchen', desc:'Заказы готовятся, но медленно в часы пик', descEn:'Orders get made, but slowly during rush hours'},
      t2:{name:'Расширенная кухня и курьерская сеть',nameEn:'An expanded kitchen and courier network', desc:'Заказы готовятся и доставляются быстрее', descEn:'Orders get cooked and delivered faster'},
      t3_risky:{name:'Экономия на качестве ингредиентов',nameEn:'Cutting corners on ingredient quality', desc:'Затраты снижаются — но со временем растут жалобы на качество блюд', descEn:'Costs drop — but complaints about food quality creep up over time'},
      t3_safe:{name:'Контроль качества ингредиентов',nameEn:'Ingredient quality control', desc:'Затраты чуть выше, зато блюда стабильно хороши', descEn:'Costs run a bit higher, but the food stays consistently good'},
      t4:{name:'Кухня, которая не подводит в час пик',nameEn:'A kitchen that never buckles under rush', desc:'Заказы готовятся быстро и качественно даже в перегруженные вечера', descEn:'Orders come out fast and good even on the busiest nights'},
    },
    marketing: { icon:'📣', name:'Продвижение заведения', nameEn:'Promotion',
      t1:{name:'Отзывы первых гостей',nameEn:'Reviews from first guests', desc:'Довольные гости оставляют первые отзывы', descEn:'Happy guests start leaving the first reviews'},
      t2:{name:'Фотографии блюд в соцсетях',nameEn:'Food photos on social media', desc:'Аппетитные фото привлекают новых гостей', descEn:'Appetizing photos draw in new guests'},
      t3_risky:{name:'Громкая рекламная кампания со скидками',nameEn:'A loud discount-driven ad campaign', desc:'Резкий приток новых заказов — но маржа проседает, а часть новых клиентов уходит после окончания скидок', descEn:'New orders spike fast — but margins shrink and many new customers vanish once the discounts end'},
      t3_safe:{name:'Коллаборации с локальными фуд-блогерами',nameEn:'Collabs with local food bloggers', desc:'Точечный, но качественный приток заинтересованных гостей', descEn:'A smaller but higher-quality influx of genuinely interested guests'},
      t4:{name:'Заведение, о котором говорят в городе',nameEn:'A place the whole city talks about', desc:'О заведении узнают даже за пределами района', descEn:'The place is known even outside its own neighborhood'},
    },
    security: { icon:'🛡️', name:'Контроль качества и безопасности', nameEn:'Quality & safety control',
      t1:{name:'Базовые санитарные нормы',nameEn:'Basic sanitary standards', desc:'Кухня соответствует минимальным требованиям', descEn:'The kitchen meets the bare minimum requirements'},
      t2:{name:'Регулярные проверки качества',nameEn:'Regular quality checks', desc:'Проблемы с качеством находят и устраняют быстрее', descEn:'Quality issues get caught and fixed faster'},
      t3_risky:{name:'Упрощённый контроль ради скорости готовки',nameEn:'Cutting quality checks for cooking speed', desc:'Заказы готовятся быстрее — но со временем растёт риск жалоб на качество и безопасность еды', descEn:'Orders come out faster — but the risk of quality and food-safety complaints grows over time'},
      t3_safe:{name:'Строгий санитарный контроль',nameEn:'Strict sanitary control', desc:'Каждая партия блюд проверяется по стандартам', descEn:'Every batch gets checked against the standards'},
      t4:{name:'Заведение с безупречной репутацией качества',nameEn:'A place known for spotless quality', desc:'Гости уверены в качестве и безопасности еды', descEn:'Guests trust the food\'s quality and safety without a second thought'},
    },
  },
  bank: {
    design: { icon:'💳', name:'Интерфейс банка', nameEn:'Banking UI',
      t1:{name:'Базовый личный кабинет',nameEn:'A bare-bones account dashboard', desc:'Основные операции доступны, но выглядят сухо', descEn:'Basic operations work, but the look is dry'},
      t2:{name:'Продуманный дизайн приложения',nameEn:'A thoughtfully designed app', desc:'Клиентам удобно управлять финансами', descEn:'Clients find it easy to manage their finances'},
      t3_risky:{name:'Резкий редизайн под модный минимализм',nameEn:'A sudden trendy-minimalist redesign', desc:'Новый вид впечатляет — но часть клиентов теряет привычные функции и звонит в поддержку с жалобами', descEn:'The new look impresses — but some clients lose familiar features and flood support with complaints'},
      t3_safe:{name:'Постепенное обновление интерфейса',nameEn:'A gradual interface refresh', desc:'Изменения вносятся аккуратно, с тестами на части клиентов', descEn:'Changes roll out carefully, tested on part of the client base first'},
      t4:{name:'Банк с удобством финтех-стартапа',nameEn:'A bank with fintech-startup-level UX', desc:'Клиенты хвалят удобство приложения так же, как у финтех-стартапов', descEn:'Clients praise the app\'s usability the way they would a fintech startup'},
    },
    traffic: { icon:'📈', name:'Приток клиентов', nameEn:'Client acquisition',
      t1:{name:'Первые клиенты',nameEn:'First clients', desc:'О банке узнают через рекомендации знакомых', descEn:'People hear about the bank through friends\' recommendations'},
      t2:{name:'Выгодные условия для новых счетов',nameEn:'Attractive terms for new accounts', desc:'Условия привлекают клиентов от конкурентов', descEn:'The terms pull clients over from competitors'},
      t3_risky:{name:'Агрессивные бонусы за открытие счёта',nameEn:'Aggressive account-opening bonuses', desc:'Резкий приток новых клиентов — но часть закрывает счёт сразу после получения бонуса', descEn:'New clients spike fast — but some close the account right after claiming the bonus'},
      t3_safe:{name:'Реферальная программа для клиентов',nameEn:'A client referral program', desc:'Существующие клиенты приводят новых, стабильно', descEn:'Existing clients steadily bring in new ones'},
      t4:{name:'Банк с растущей базой лояльных клиентов',nameEn:'A bank with a growing base of loyal clients', desc:'Новые клиенты приходят предсказуемо, месяц за месяцем', descEn:'New clients arrive predictably, month after month'},
    },
    infra: { icon:'⚙️', name:'Надёжность банковских систем', nameEn:'Banking system reliability',
      t1:{name:'Минимальные банковские мощности',nameEn:'Minimal banking infrastructure', desc:'Операции проходят, но с задержками в пиковые часы', descEn:'Transactions go through, but with delays during peak hours'},
      t2:{name:'Масштабируемая банковская платформа',nameEn:'A scalable banking platform', desc:'Операции клиентов обрабатываются быстрее', descEn:'Client transactions get processed faster'},
      t3_risky:{name:'Экономия на резервных системах',nameEn:'Cutting back on backup systems', desc:'Расходы на инфраструктуру ниже — но случаются перебои в проведении платежей', descEn:'Infrastructure costs drop — but payment processing outages happen'},
      t3_safe:{name:'Резервные системы на случай сбоев',nameEn:'Backup systems for failover', desc:'Платежи проходят стабильно даже при технических проблемах', descEn:'Payments go through reliably even when technical issues hit'},
      t4:{name:'Банк, платежи которого не задерживаются никогда',nameEn:'A bank whose payments never lag', desc:'Клиенты не помнят, когда в последний раз был технический сбой', descEn:'Clients can\'t remember the last time there was a technical hiccup'},
    },
    marketing: { icon:'📣', name:'Продвижение банка', nameEn:'Bank promotion',
      t1:{name:'Первые рекламные объявления',nameEn:'First ad placements', desc:'О банке узнают из простой рекламы', descEn:'People learn about the bank from basic ads'},
      t2:{name:'Партнёрства с финансовыми блогерами',nameEn:'Partnerships with finance bloggers', desc:'Обзорщики рассказывают о выгодных условиях банка', descEn:'Reviewers highlight the bank\'s attractive terms'},
      t3_risky:{name:'Громкие обещания доходности вкладов',nameEn:'Bold promises about deposit returns', desc:'Реклама резко привлекает вкладчиков — но невыполненные обещания позже подрывают доверие', descEn:'Ads pull in depositors fast — but broken promises later damage trust'},
      t3_safe:{name:'Честная и прозрачная реклама условий',nameEn:'Honest, transparent terms in ads', desc:'Рост медленнее, но клиенты доверяют банку долгосрочно', descEn:'Growth is slower, but clients trust the bank for the long haul'},
      t4:{name:'Банк с репутацией надёжного партнёра',nameEn:'A bank known as a reliable partner', desc:'О банке говорят как о одном из самых надёжных на рынке', descEn:'The bank is talked about as one of the most trustworthy in the market'},
    },
    security: { icon:'🛡️', name:'Защита средств клиентов', nameEn:'Client fund protection',
      t1:{name:'Базовая защита счетов',nameEn:'Basic account protection', desc:'Средства клиентов защищены минимально необходимым способом', descEn:'Client funds get the bare minimum protection'},
      t2:{name:'Многоуровневая защита счетов',nameEn:'Multi-layered account protection', desc:'Аккаунты клиентов защищены заметно надёжнее', descEn:'Client accounts are protected noticeably better'},
      t3_risky:{name:'Упрощённые проверки ради скорости переводов',nameEn:'Simplified checks for faster transfers', desc:'Переводы проходят мгновенно — но со временем растёт число случаев мошенничества', descEn:'Transfers go through instantly — but fraud cases creep up over time'},
      t3_safe:{name:'Строгая проверка подозрительных операций',nameEn:'Strict suspicious-transaction checks', desc:'Каждая нетипичная операция проверяется дополнительно', descEn:'Every unusual transaction gets an extra check'},
      t4:{name:'Банк с репутацией максимально надёжного',nameEn:'A bank known as the safest around', desc:'Клиенты уверены, что их деньги под полной защитой', descEn:'Clients are confident their money is fully protected'},
    },
  },
  hybrid_fulfillment: {
    design: { icon:'📦', name:'Единая витрина и трекинг', nameEn:'Unified storefront & tracking',
      t1:{name:'Базовая интеграция магазина и доставки',nameEn:'Basic store-and-delivery integration', desc:'Покупка и доставка видны в одном месте', descEn:'Purchase and delivery show up in one place'},
      t2:{name:'Сквозной опыт от заказа до доставки',nameEn:'A seamless order-to-delivery experience', desc:'Клиент видит весь путь заказа без переключений', descEn:'Clients see the whole order journey without switching apps'},
      t3_risky:{name:'Резкое упрощение объединённого интерфейса',nameEn:'A sudden simplification of the combined UI', desc:'Интерфейс становится проще для новых клиентов — но постоянные покупатели теряют привычные детали и жалуются', descEn:'The UI gets simpler for new clients — but regulars lose familiar details and complain'},
      t3_safe:{name:'Постепенная доработка объединённого опыта',nameEn:'Gradual refinement of the combined experience', desc:'Улучшения вносятся аккуратно, без потери привычных функций', descEn:'Improvements roll out carefully without losing familiar features'},
      t4:{name:'Витрина и доставка как единый бесшовный сервис',nameEn:'Storefront and delivery as one seamless service', desc:'Клиенты не замечают, что это две разные системы', descEn:'Clients don\'t even notice these are two separate systems'},
    },
    traffic: { icon:'🧾', name:'Клиенты объединённой сети', nameEn:'Combined-network clients',
      t1:{name:'Первые кросс-заказы',nameEn:'First cross-service orders', desc:'Клиенты магазина начинают пользоваться и доставкой', descEn:'Store customers start using the delivery arm too'},
      t2:{name:'Единая программа лояльности',nameEn:'A unified loyalty program', desc:'Бонусы работают и на покупках, и на доставке', descEn:'Rewards apply across both purchases and deliveries'},
      t3_risky:{name:'Массовая перекрёстная реклама между сервисами',nameEn:'Aggressive cross-service ad pushes', desc:'Резкий рост клиентской базы — но часть пользователей раздражена навязчивыми предложениями', descEn:'The client base spikes fast — but some users get annoyed by the pushy cross-promotion'},
      t3_safe:{name:'Точечные персональные предложения',nameEn:'Targeted, personalized offers', desc:'Рост медленнее, но клиенты довольны релевантностью предложений', descEn:'Growth is slower, but clients appreciate how relevant the offers feel'},
      t4:{name:'Клиенты, которые не уходят к конкурентам',nameEn:'Clients who never leave for a competitor', desc:'Покупка и доставка от одной компании стали привычкой', descEn:'Buying and delivery from one company has become a habit'},
    },
    infra: { icon:'🚚', name:'Единая цепочка поставок', nameEn:'Unified supply chain',
      t1:{name:'Базовая связка склада и курьеров',nameEn:'A basic warehouse-courier link', desc:'Заказы доезжают, но координация ещё неидеальна', descEn:'Orders arrive, but coordination isn\'t quite smooth yet'},
      t2:{name:'Синхронизированная логистика',nameEn:'Synchronized logistics', desc:'Склад и доставка работают по единому графику', descEn:'Warehouse and delivery run on a single synced schedule'},
      t3_risky:{name:'Экономия на резервных мощностях цепочки',nameEn:'Cutting back on supply-chain redundancy', desc:'Расходы ниже — но при всплеске заказов случаются задержки по всей цепочке', descEn:'Costs drop — but delays ripple through the whole chain during order spikes'},
      t3_safe:{name:'Резервные мощности на случай пиков',nameEn:'Reserved capacity for peak demand', desc:'Цепочка держится стабильно даже при резком росте заказов', descEn:'The chain stays stable even when orders spike sharply'},
      t4:{name:'Цепочка поставок без единого слабого звена',nameEn:'A supply chain with no weak link', desc:'От заказа до двери клиента всё работает как часы', descEn:'From order to doorstep, everything runs like clockwork'},
    },
    marketing: { icon:'📣', name:'Продвижение объединённого бренда', nameEn:'Combined-brand promotion',
      t1:{name:'Первые совместные акции',nameEn:'First joint promotions', desc:'Магазин и доставка продвигаются вместе впервые', descEn:'Store and delivery get promoted together for the first time'},
      t2:{name:'Единая рекламная кампания',nameEn:'A unified ad campaign', desc:'Бренд воспринимается как одно целое', descEn:'The brand starts feeling like one cohesive thing'},
      t3_risky:{name:'Громкие обещания сроков доставки в рекламе',nameEn:'Bold delivery-speed promises in ads', desc:'Реклама резко привлекает внимание — но невыполненные обещания подрывают доверие ко всему бренду', descEn:'Ads grab attention fast — but broken promises damage trust in the whole brand'},
      t3_safe:{name:'Честная реклама реальных преимуществ',nameEn:'Honest ads about real advantages', desc:'Рост медленнее, но доверие к объединённому бренду крепче', descEn:'Growth is slower, but trust in the combined brand runs deeper'},
      t4:{name:'Бренд, синоним удобной доставки',nameEn:'A brand synonymous with easy delivery', desc:'О компании говорят как об эталоне быстрой и удобной покупки', descEn:'The company is talked about as the standard for fast, easy shopping'},
    },
    security: { icon:'🔒', name:'Защита заказа целиком', nameEn:'End-to-end order protection',
      t1:{name:'Базовая защита оплаты и груза',nameEn:'Basic protection for payment and cargo', desc:'Заказ и оплата защищены минимально необходимым способом', descEn:'The order and payment get the bare minimum protection'},
      t2:{name:'Комплексная защита от заказа до доставки',nameEn:'End-to-end protection from order to delivery', desc:'Каждый этап заказа проверяется на риски', descEn:'Every stage of the order gets checked for risk'},
      t3_risky:{name:'Упрощённые проверки ради скорости всей цепочки',nameEn:'Simplified checks for a faster end-to-end chain', desc:'Заказ проходит быстрее — но со временем растёт число проблем с оплатой и потерянными посылками', descEn:'Orders move faster — but payment issues and lost packages creep up over time'},
      t3_safe:{name:'Строгий контроль на каждом этапе',nameEn:'Strict control at every stage', desc:'Каждый заказ проверяется от оплаты до вручения', descEn:'Every order gets checked from payment to hand-off'},
      t4:{name:'Компания, которой доверяют весь путь заказа',nameEn:'A company trusted with the whole order journey', desc:'Клиенты уверены в безопасности на каждом шаге', descEn:'Clients feel safe at every step of the process'},
    },
  },
  hybrid_media: {
    design: { icon:'📢', name:'Единый медиа-стиль', nameEn:'Unified media style',
      t1:{name:'Базовая связка блога и соцсети',nameEn:'A basic blog-and-social link', desc:'Контент публикуется в обоих местах, но выглядит по-разному', descEn:'Content posts to both places, but looks inconsistent'},
      t2:{name:'Единый визуальный стиль медиа-холдинга',nameEn:'A unified visual style across the holding', desc:'Блог и соцсеть выглядят как одна медиа-марка', descEn:'The blog and social feed look like one media brand'},
      t3_risky:{name:'Резкий редизайн всего медиа-бренда',nameEn:'A sudden overhaul of the whole media brand', desc:'Новый стиль собирает внимание — но давняя аудитория обеих платформ не узнаёт бренд и часть уходит', descEn:'The new style draws attention — but longtime audiences on both platforms don\'t recognize the brand and some leave'},
      t3_safe:{name:'Постепенное сведение стилей',nameEn:'A gradual style unification', desc:'Блог и соцсеть аккуратно приводятся к общему виду', descEn:'The blog and social feed get aligned carefully, step by step'},
      t4:{name:'Узнаваемый медиа-бренд во всех каналах',nameEn:'A recognizable media brand across every channel', desc:'Аудитория узнаёт бренд, где бы она его ни встретила', descEn:'The audience recognizes the brand wherever they encounter it'},
    },
    traffic: { icon:'📖', name:'Кросс-аудитория', nameEn:'Cross-platform audience',
      t1:{name:'Первые перетоки аудитории',nameEn:'First cross-audience flow', desc:'Читатели блога начинают заходить и в соцсеть', descEn:'Blog readers start showing up on the social feed too'},
      t2:{name:'Синхронизация публикаций',nameEn:'Synchronized publishing', desc:'Каждый пост в блоге анонсируется в соцсети и наоборот', descEn:'Every blog post gets cross-posted to social, and vice versa'},
      t3_risky:{name:'Агрессивный кросс-постинг во всех каналах',nameEn:'Aggressive cross-posting everywhere', desc:'Охваты резко растут — но часть аудитории считает это спамом и отписывается', descEn:'Reach spikes fast — but part of the audience finds it spammy and unfollows'},
      t3_safe:{name:'Продуманная адаптация контента под каждый канал',nameEn:'Thoughtful content adaptation per channel', desc:'Рост медленнее, но аудитория ценит уместность контента', descEn:'Growth is slower, but the audience appreciates content that fits each channel'},
      t4:{name:'Единая, вовлечённая аудитория во всех каналах',nameEn:'One engaged audience across every channel', desc:'Читатели и подписчики воспринимают холдинг как единое целое', descEn:'Readers and followers see the holding as one cohesive thing'},
    },
    infra: { icon:'🗂️', name:'Единая издательская платформа', nameEn:'Unified publishing pipeline',
      t1:{name:'Раздельные системы публикации',nameEn:'Separate publishing systems', desc:'Контент готовится отдельно для блога и для соцсети', descEn:'Content gets prepared separately for the blog and for social'},
      t2:{name:'Единый конвейер публикации контента',nameEn:'A unified content pipeline', desc:'Один материал быстро адаптируется под оба канала', descEn:'One piece of content quickly adapts to both channels'},
      t3_risky:{name:'Автопубликация во все каналы без вычитки',nameEn:'Auto-publishing everywhere without review', desc:'Контент выходит мгновенно везде — но ошибки и нестыковки долетают до всей аудитории сразу', descEn:'Content goes live everywhere instantly — but mistakes and inconsistencies reach the whole audience at once'},
      t3_safe:{name:'Редакторский контроль перед мультипубликацией',nameEn:'Editorial review before multi-channel publishing', desc:'Каждый материал проверяется перед выходом во все каналы', descEn:'Every piece gets reviewed before going out across channels'},
      t4:{name:'Издательский конвейер без сбоев',nameEn:'A flawless publishing pipeline', desc:'От идеи до публикации во всех каналах — быстро и слаженно', descEn:'From idea to publication everywhere — fast and coordinated'},
    },
    marketing: { icon:'📣', name:'Продвижение медиа-холдинга', nameEn:'Media holding promotion',
      t1:{name:'Первые совместные анонсы',nameEn:'First joint announcements', desc:'Блог и соцсеть впервые продвигаются как один проект', descEn:'The blog and social feed get promoted as one project for the first time'},
      t2:{name:'Коллаборации между каналами холдинга',nameEn:'Cross-channel collaborations', desc:'Материалы из блога усиливают соцсеть и наоборот', descEn:'Blog content boosts the social feed and vice versa'},
      t3_risky:{name:'Массовая закупка рекламы across всех каналов',nameEn:'A bulk ad buy across every channel', desc:'Резкий приток новой аудитории сразу везде — но часть случайна и быстро отписывается', descEn:'A sharp influx of new audience everywhere at once — but many are random and unfollow fast'},
      t3_safe:{name:'Точечные партнёрства по каждому каналу',nameEn:'Targeted partnerships per channel', desc:'Рост медленнее, но аудитория в каждом канале действительно заинтересована', descEn:'Growth is slower, but the audience on each channel is genuinely interested'},
      t4:{name:'Медиа-холдинг с узнаваемым присутствием везде',nameEn:'A media holding with a recognizable presence everywhere', desc:'О холдинге знают вне зависимости от того, каким каналом пользуется человек', descEn:'People know the holding regardless of which channel they use'},
    },
    security: { icon:'🛡️', name:'Модерация всего холдинга', nameEn:'Holding-wide moderation',
      t1:{name:'Раздельная модерация каналов',nameEn:'Separate moderation per channel', desc:'Блог и соцсеть модерируются независимо друг от друга', descEn:'The blog and social feed get moderated independently'},
      t2:{name:'Единые правила модерации',nameEn:'Unified moderation rules', desc:'Одни и те же стандарты применяются во всех каналах', descEn:'The same standards apply across every channel'},
      t3_risky:{name:'Минимум модерации ради вовлечённости',nameEn:'Minimal moderation for engagement', desc:'Активность растёт во всех каналах — но растёт и риск громкого скандала, который ударит по всему холдингу', descEn:'Activity grows across every channel — but so does the risk of a scandal that hits the whole holding'},
      t3_safe:{name:'Строгая, согласованная модерация',nameEn:'Strict, consistent moderation', desc:'Холдинг воспринимается как безопасное пространство везде', descEn:'The holding is seen as a safe space, wherever you encounter it'},
      t4:{name:'Холдинг с доверием аудитории во всех каналах',nameEn:'A holding trusted by its audience everywhere', desc:'Аудитория доверяет модерации в каждом канале одинаково', descEn:'The audience trusts the moderation equally across every channel'},
    },
  },
  hybrid_ai_saas: {
    design: { icon:'🧬', name:'Интерфейс AI-платформы для бизнеса', nameEn:'Business AI platform UI',
      t1:{name:'Базовая интеграция AI и SaaS-панели',nameEn:'A basic AI-and-SaaS dashboard integration', desc:'Функции модели доступны, но разбросаны по интерфейсу', descEn:'Model features are available, but scattered across the UI'},
      t2:{name:'Единая панель управления AI-функциями',nameEn:'A unified AI feature dashboard', desc:'Клиенты управляют моделью прямо из привычного интерфейса сервиса', descEn:'Clients manage the model right from the service\'s familiar interface'},
      t3_risky:{name:'Резкий редизайн под AI-хайп',nameEn:'A sudden AI-hype-driven redesign', desc:'Эффектный интерфейс собирает внимание — но часть бизнес-клиентов теряет привычные рабочие процессы', descEn:'The flashy interface draws attention — but some business clients lose their familiar workflows'},
      t3_safe:{name:'Постепенная интеграция AI-функций в привычный UI',nameEn:'Gradual integration of AI into the familiar UI', desc:'Новые функции добавляются без нарушения привычной работы', descEn:'New features get added without disrupting how clients already work'},
      t4:{name:'Платформа, где AI ощущается органичной частью продукта',nameEn:'A platform where AI feels like a natural part of the product', desc:'Клиенты не видят разницы между «обычным» софтом и AI-функциями', descEn:'Clients see no difference between the \'regular\' software and the AI features'},
    },
    traffic: { icon:'📊', name:'Привлечение бизнес-клиентов', nameEn:'Business client acquisition',
      t1:{name:'Первые пилотные клиенты',nameEn:'First pilot clients', desc:'Компании пробуют AI-функции в тестовом режиме', descEn:'Companies try the AI features in a trial mode'},
      t2:{name:'Кейсы внедрения AI в реальный бизнес',nameEn:'Real-world AI implementation case studies', desc:'Успешные внедрения привлекают похожие компании', descEn:'Successful rollouts attract similar companies'},
      t3_risky:{name:'Громкие обещания «AI решит всё»',nameEn:'Bold \'AI will solve everything\' claims', desc:'Резкий рост интереса — но завышенные ожидания разочаровывают клиентов после внедрения', descEn:'Interest spikes fast — but inflated expectations disappoint clients after rollout'},
      t3_safe:{name:'Честная демонстрация реальной пользы AI',nameEn:'Honest demos of real AI value', desc:'Рост медленнее, но клиенты видят реальную отдачу и остаются', descEn:'Growth is slower, but clients see real returns and stick around'},
      t4:{name:'Платформа — эталон применения AI в бизнесе',nameEn:'The platform seen as the benchmark for AI in business', desc:'О платформе говорят как о примере того, как AI должен работать в софте', descEn:'The platform is cited as an example of how AI should work in software'},
    },
    infra: { icon:'⚙️', name:'Вычислительная и сервисная инфраструктура', nameEn:'Compute & service infrastructure',
      t1:{name:'Минимальные мощности для AI-функций',nameEn:'Minimal capacity for AI features', desc:'AI-функции работают, но медленно при высокой нагрузке', descEn:'AI features work, but slowly under heavy load'},
      t2:{name:'Расширенный вычислительный кластер для клиентов',nameEn:'An expanded compute cluster for clients', desc:'AI-функции отвечают быстрее даже при росте числа клиентов', descEn:'AI features respond faster even as the client base grows'},
      t3_risky:{name:'Экономия на резервных AI-мощностях',nameEn:'Cutting back on backup AI compute', desc:'Расходы ниже — но в пиковые часы AI-функции у клиентов начинают тормозить или отказывать', descEn:'Costs drop — but AI features start lagging or failing for clients during peak hours'},
      t3_safe:{name:'Резервные AI-мощности на пиковый спрос',nameEn:'Reserved AI compute for peak demand', desc:'AI-функции остаются стабильными даже при резком росте использования', descEn:'AI features stay stable even when usage spikes sharply'},
      t4:{name:'Инфраструктура, которая держит AI под любой нагрузкой',nameEn:'Infrastructure that keeps AI running under any load', desc:'Клиенты не замечают разницы в скорости даже в самые загруженные дни', descEn:'Clients notice no speed difference even on the busiest days'},
    },
    marketing: { icon:'📣', name:'Продвижение AI+SaaS продукта', nameEn:'AI+SaaS product promotion',
      t1:{name:'Первые демонстрации на конференциях',nameEn:'First conference demos', desc:'Компанию замечают на отраслевых мероприятиях', descEn:'The company gets noticed at industry events'},
      t2:{name:'Партнёрства с бизнес-изданиями',nameEn:'Partnerships with business media', desc:'О продукте пишут в профильных изданиях', descEn:'The product gets written up in trade publications'},
      t3_risky:{name:'Агрессивный маркетинг с преувеличением возможностей AI',nameEn:'Aggressive marketing overselling AI capabilities', desc:'Резкий рост узнаваемости — но разрыв между рекламой и реальностью бьёт по репутации', descEn:'Awareness spikes fast — but the gap between marketing and reality hurts the reputation'},
      t3_safe:{name:'Продвижение через доказанную бизнес-ценность',nameEn:'Promotion through proven business value', desc:'Рост медленнее, но клиенты доверяют заявлениям компании', descEn:'Growth is slower, but clients trust what the company says'},
      t4:{name:'Продукт — ориентир на рынке AI для бизнеса',nameEn:'A product seen as the benchmark in business AI', desc:'О продукте говорят как о стандарте отрасли', descEn:'The product is talked about as an industry standard'},
    },
    security: { icon:'🛡️', name:'Безопасность данных и модели', nameEn:'Data & model security',
      t1:{name:'Базовая защита данных клиентов',nameEn:'Basic client data protection', desc:'Данные защищены минимально необходимым способом', descEn:'Client data gets the bare minimum protection'},
      t2:{name:'Комплексная защита данных и модели',nameEn:'Comprehensive data and model protection', desc:'Данные клиентов и работа модели защищены на разных уровнях', descEn:'Client data and the model\'s operation are protected at multiple levels'},
      t3_risky:{name:'Меньше ограничений модели ради гибкости для клиентов',nameEn:'Fewer model restrictions for client flexibility', desc:'Клиенты получают больше гибкости — но растёт риск утечки данных или некорректного ответа модели', descEn:'Clients get more flexibility — but the risk of a data leak or a bad model response grows'},
      t3_safe:{name:'Строгий контроль безопасности на каждом уровне',nameEn:'Strict security control at every level', desc:'Каждое обновление проверяется и на данные, и на поведение модели', descEn:'Every update gets checked for both data handling and model behavior'},
      t4:{name:'Платформа с сертифицированной защитой данных и AI',nameEn:'A platform with certified-grade data and AI protection', desc:'Крупный бизнес доверяет платформе самые чувствительные процессы', descEn:'Major businesses trust the platform with their most sensitive processes'},
    },
  },
  hybrid_fintech: {
    design: { icon:'🏛️', name:'Единый финансовый интерфейс', nameEn:'Unified financial interface',
      t1:{name:'Базовая связка биржи и банковских услуг',nameEn:'A basic exchange-and-banking link', desc:'Крипто и обычные финансы видны в разных разделах', descEn:'Crypto and regular finances live in separate sections'},
      t2:{name:'Единая панель управления активами',nameEn:'A unified asset dashboard', desc:'Клиент видит и крипто, и обычные счета в одном месте', descEn:'Clients see both crypto and regular accounts in one place'},
      t3_risky:{name:'Резкий редизайн объединённого интерфейса',nameEn:'A sudden overhaul of the combined interface', desc:'Новый вид впечатляет — но часть консервативных банковских клиентов теряется в непривычном интерфейсе', descEn:'The new look impresses — but some conservative banking clients get lost in the unfamiliar layout'},
      t3_safe:{name:'Постепенное сведение интерфейсов',nameEn:'A gradual interface unification', desc:'Изменения вносятся аккуратно, с учётом привычек обеих аудиторий', descEn:'Changes roll out carefully, respecting both audiences\' habits'},
      t4:{name:'Финансовая платформа без границ между крипто и банком',nameEn:'A financial platform with no line between crypto and banking', desc:'Клиенты не думают о разнице — просто управляют деньгами', descEn:'Clients don\'t think about the difference — they just manage their money'},
    },
    traffic: { icon:'📊', name:'Приток финансовых клиентов', nameEn:'Financial client acquisition',
      t1:{name:'Первые клиенты из обеих аудиторий',nameEn:'First clients from both audiences', desc:'Трейдеры и банковские клиенты начинают пересекаться', descEn:'Traders and banking clients start to overlap'},
      t2:{name:'Кросс-продукты для обеих аудиторий',nameEn:'Cross-products for both audiences', desc:'Банковские клиенты пробуют крипто-услуги и наоборот', descEn:'Banking clients try crypto services, and vice versa'},
      t3_risky:{name:'Агрессивные бонусы за перенос активов',nameEn:'Aggressive bonuses for moving assets over', desc:'Резкий приток новых клиентов — но часть уходит сразу после получения бонуса', descEn:'New clients spike fast — but some leave right after claiming the bonus'},
      t3_safe:{name:'Постепенное укрепление доверия между аудиториями',nameEn:'Gradually building trust between the audiences', desc:'Рост медленнее, но клиенты остаются надолго', descEn:'Growth is slower, but clients stick around long-term'},
      t4:{name:'Платформа, объединяющая крипто- и банковских клиентов',nameEn:'A platform that unites crypto and banking clients', desc:'Обе аудитории видят в платформе своего надёжного финансового партнёра', descEn:'Both audiences see the platform as their trusted financial partner'},
    },
    infra: { icon:'⚙️', name:'Устойчивость объединённой платформы', nameEn:'Combined-platform stability',
      t1:{name:'Раздельные системы биржи и банка',nameEn:'Separate exchange and banking systems', desc:'Обе системы работают, но не всегда синхронно', descEn:'Both systems work, but not always in sync'},
      t2:{name:'Синхронизированная финансовая инфраструктура',nameEn:'Synchronized financial infrastructure', desc:'Крипто- и банковские операции обрабатываются согласованно', descEn:'Crypto and banking transactions get processed in sync'},
      t3_risky:{name:'Экономия на резервных системах объединённой платформы',nameEn:'Cutting back on combined-platform redundancy', desc:'Расходы ниже — но при резкой волатильности рынка случаются сбои сразу в обеих системах', descEn:'Costs drop — but sharp market volatility causes outages in both systems at once'},
      t3_safe:{name:'Резервные мощности на случай рыночных шоков',nameEn:'Reserved capacity for market shocks', desc:'Платформа держится стабильно даже в дни резких скачков рынка', descEn:'The platform stays stable even on the market\'s wildest days'},
      t4:{name:'Финансовая платформа, устойчивая к любой волатильности',nameEn:'A financial platform resilient to any volatility', desc:'Ни крипто-, ни банковская часть не дают сбоев даже в кризис', descEn:'Neither the crypto nor the banking side breaks, even in a crisis'},
    },
    marketing: { icon:'📣', name:'Продвижение финтех-империи', nameEn:'Fintech empire promotion',
      t1:{name:'Первые совместные предложения',nameEn:'First joint offers', desc:'Крипто- и банковские услуги впервые продвигаются вместе', descEn:'Crypto and banking services get promoted together for the first time'},
      t2:{name:'Единая финансовая программа лояльности',nameEn:'A unified financial loyalty program', desc:'Бонусы работают одинаково для обеих частей платформы', descEn:'Rewards apply the same way across both sides of the platform'},
      t3_risky:{name:'Громкие обещания доходности по всем продуктам',nameEn:'Bold return promises across every product', desc:'Реклама резко привлекает клиентов — но невыполненные обещания подрывают доверие ко всей платформе', descEn:'Ads pull in clients fast — but broken promises damage trust in the whole platform'},
      t3_safe:{name:'Честная реклама реальных преимуществ объединения',nameEn:'Honest ads about the real benefits of combining services', desc:'Рост медленнее, но доверие к объединённому бренду крепче', descEn:'Growth is slower, but trust in the combined brand runs deeper'},
      t4:{name:'Финтех-империя с репутацией самой надёжной',nameEn:'A fintech empire known as the most trustworthy', desc:'О платформе говорят как об эталоне надёжности в финансах', descEn:'The platform is talked about as the benchmark for financial reliability'},
    },
    security: { icon:'🛡️', name:'Защита всех активов', nameEn:'Protection of all assets',
      t1:{name:'Базовая защита крипто- и банковских активов',nameEn:'Basic protection for crypto and banking assets', desc:'Средства защищены минимально необходимым способом на обеих сторонах', descEn:'Funds get the bare minimum protection on both sides'},
      t2:{name:'Единые стандарты защиты активов',nameEn:'Unified asset-protection standards', desc:'Одни и те же высокие стандарты применяются к крипто и банковским средствам', descEn:'The same high standards apply to both crypto and banking funds'},
      t3_risky:{name:'Упрощённые проверки ради удобства переводов между системами',nameEn:'Simplified checks for easier cross-system transfers', desc:'Переводы между крипто и банком становятся мгновенными — но растёт риск мошенничества', descEn:'Transfers between crypto and banking become instant — but fraud risk grows'},
      t3_safe:{name:'Строгий контроль на стыке двух систем',nameEn:'Strict control at the junction of both systems', desc:'Каждый перевод между крипто и банком проверяется дополнительно', descEn:'Every transfer between crypto and banking gets an extra check'},
      t4:{name:'Платформа с репутацией максимально надёжной в обеих сферах',nameEn:'A platform seen as the safest in both worlds', desc:'Клиенты уверены в защите активов, в какой бы части платформы они ни были', descEn:'Clients trust their assets are protected no matter which side of the platform they\'re on'},
    },
  },
  hybrid_superapp: {
    design: { icon:'🍔', name:'Единый суперапп-интерфейс', nameEn:'Unified super-app interface',
      t1:{name:'Базовая связка доставки еды и приложения',nameEn:'A basic food-delivery-and-app link', desc:'Заказ еды и другие функции приложения работают раздельно', descEn:'Ordering food and the app\'s other features work separately'},
      t2:{name:'Единый интерфейс суперприложения',nameEn:'A unified super-app interface', desc:'Все функции доступны из одного удобного меню', descEn:'Every feature is reachable from one convenient menu'},
      t3_risky:{name:'Резкий редизайн под супераппы-конкуренты',nameEn:'A sudden redesign to match competing super-apps', desc:'Интерфейс становится эффектнее — но постоянные пользователи теряют привычные ярлыки и жалуются', descEn:'The interface gets flashier — but regular users lose familiar shortcuts and complain'},
      t3_safe:{name:'Постепенное объединение функций в одном приложении',nameEn:'A gradual merging of features into one app', desc:'Функции сводятся воедино аккуратно, без потери привычного', descEn:'Features get merged carefully, without losing what users are used to'},
      t4:{name:'Суперапп, где всё под рукой',nameEn:'A super-app where everything is within reach', desc:'Пользователи решают все свои задачи, не выходя из одного приложения', descEn:'Users handle everything they need without ever leaving the app'},
    },
    traffic: { icon:'📈', name:'Рост аудитории суперприложения', nameEn:'Super-app audience growth',
      t1:{name:'Первые пользователи из обеих аудиторий',nameEn:'First users from both audiences', desc:'Любители доставки еды и пользователи приложения начинают пересекаться', descEn:'Food-delivery fans and app users start to overlap'},
      t2:{name:'Кросс-функции внутри одного приложения',nameEn:'Cross-features within one app', desc:'Пользователи одной функции пробуют и другие', descEn:'Users of one feature start trying the others'},
      t3_risky:{name:'Массовая закупка установок ради роста суперприложения',nameEn:'A bulk install buy to grow the super-app fast', desc:'Резкий рост числа пользователей — но многие удаляют приложение, так и не попробовав вторую функцию', descEn:'The user count spikes fast — but many uninstall without ever trying the second feature'},
      t3_safe:{name:'Постепенное знакомство пользователей со всеми функциями',nameEn:'Gradually introducing users to every feature', desc:'Рост медленнее, но пользователи закрепляются во всех функциях приложения', descEn:'Growth is slower, but users stick with every feature of the app'},
      t4:{name:'Суперапп с активной аудиторией во всех разделах',nameEn:'A super-app with an active audience across every section', desc:'Пользователи одинаково активно пользуются и доставкой еды, и остальными функциями', descEn:'Users are just as active with food delivery as with the app\'s other features'},
    },
    infra: { icon:'⚙️', name:'Единая техническая платформа', nameEn:'Unified technical platform',
      t1:{name:'Раздельные системы доставки и приложения',nameEn:'Separate delivery and app systems', desc:'Обе части работают, но не всегда согласованно', descEn:'Both parts work, but not always in sync'},
      t2:{name:'Синхронизированная платформа суперприложения',nameEn:'A synchronized super-app platform', desc:'Доставка еды и остальные функции работают на единой основе', descEn:'Food delivery and the other features run on one shared foundation'},
      t3_risky:{name:'Экономия на резервных мощностях объединённой платформы',nameEn:'Cutting back on combined-platform redundancy', desc:'Расходы ниже — но при всплеске активности случаются сбои сразу во всём приложении', descEn:'Costs drop — but activity spikes cause outages across the whole app'},
      t3_safe:{name:'Резервные мощности на случай пиковой нагрузки',nameEn:'Reserved capacity for peak load', desc:'Приложение держится стабильно даже при резком росте активности', descEn:'The app stays stable even when activity spikes sharply'},
      t4:{name:'Суперапп, который не подводит ни в одной из функций',nameEn:'A super-app that never fails in any of its features', desc:'Все функции приложения работают стабильно, даже в самые загруженные моменты', descEn:'Every feature runs reliably, even at the busiest moments'},
    },
    marketing: { icon:'📣', name:'Продвижение суперприложения', nameEn:'Super-app promotion',
      t1:{name:'Первые совместные акции по функциям',nameEn:'First joint feature promotions', desc:'Доставка еды и остальные функции впервые продвигаются вместе', descEn:'Food delivery and the other features get promoted together for the first time'},
      t2:{name:'Единая рекламная кампания суперприложения',nameEn:'A unified super-app ad campaign', desc:'Приложение продвигается как единый удобный сервис на все случаи', descEn:'The app gets promoted as one convenient service for everything'},
      t3_risky:{name:'Громкие обещания «одно приложение на всё» без покрытия функциями',nameEn:'Bold \'one app for everything\' claims that outpace real features', desc:'Реклама резко привлекает внимание — но пользователи разочаровываются, не найдя обещанных возможностей', descEn:'Ads grab attention fast — but users get disappointed when the promised features aren\'t really there'},
      t3_safe:{name:'Честная демонстрация реальных возможностей приложения',nameEn:'Honest demos of the app\'s real capabilities', desc:'Рост медленнее, но ожидания пользователей совпадают с реальностью', descEn:'Growth is slower, but user expectations match reality'},
      t4:{name:'Суперапп с репутацией удобного универсального сервиса',nameEn:'A super-app known for being genuinely all-in-one', desc:'О приложении говорят как о примере удачного суперприложения', descEn:'The app is talked about as an example of a super-app done right'},
    },
    security: { icon:'🛡️', name:'Защита данных и заказов суперприложения', nameEn:'Super-app data & order protection',
      t1:{name:'Базовая защита данных и оплаты',nameEn:'Basic data and payment protection', desc:'Данные и оплата защищены минимально необходимым способом', descEn:'Data and payments get the bare minimum protection'},
      t2:{name:'Единые стандарты защиты для всех функций',nameEn:'Unified protection standards across every feature', desc:'Все функции приложения защищены по одним и тем же высоким стандартам', descEn:'Every feature is protected to the same high standard'},
      t3_risky:{name:'Упрощённые проверки ради скорости во всех функциях',nameEn:'Simplified checks for speed across every feature', desc:'Все действия в приложении становятся быстрее — но со временем растёт риск мошенничества и утечек', descEn:'Every action in the app gets faster — but fraud and leak risk creeps up over time'},
      t3_safe:{name:'Строгий контроль безопасности во всех функциях',nameEn:'Strict security control across every feature', desc:'Каждая функция приложения проверяется по единым строгим стандартам', descEn:'Every feature gets checked against the same strict standards'},
      t4:{name:'Суперапп с репутацией максимально безопасного',nameEn:'A super-app known as the safest all-in-one option', desc:'Пользователи доверяют приложению любые данные и платежи', descEn:'Users trust the app with any data or payment'},
    },
  },
};
/* ---------- GROUP-LEVEL SPEC-TREE FLAVOR ----------
   [Точка 10, доработка 2] TYPE_SPEC_FLAVOR above is precise per-tierId
   (one entry per exact business), but doesn't cover GAME_TYPES/CRYPTO_TYPES/
   INDUSTRY_TYPES (~38 businesses without a tierId at all). Rather than leave
   those on the fully generic template, this gives them a shared tree per
   thematic group (games / crypto / each industry sub-sector) — still 25
   distinct nodes with their own names, descriptions and risky/safe forks,
   just shared across the businesses in that group instead of unique to each
   individual business (see specFlavorGroup() below for the grouping rule). */
const TYPE_SPEC_FLAVOR_GROUP = {
  games: {
    design: { icon:'🎮', name:'Геймдизайн', nameEn:'Game design',
      t1:{name:'Первый прототип',nameEn:'First prototype', desc:'Простой игровой цикл — играть уже можно, но небогато', descEn:'A simple game loop — playable but bare-bones'},
      t2:{name:'Полировка механик',nameEn:'Mechanics polish', desc:'Управление и баланс становятся приятнее', descEn:'Controls and balance start feeling good'},
      t3_risky:{name:'Погоня за трендовым жанром',nameEn:'Chasing a trending genre', desc:'Резкая смена стиля под хайповый жанр — часть старых игроков не примет новую механику', descEn:'A sudden pivot to a hyped genre — some longtime players won\'t take to the new mechanics'},
      t3_safe:{name:'Постепенное развитие своей механики',nameEn:'Gradually refining your own mechanic', desc:'Медленнее, но без риска растерять фанатов', descEn:'Slower, but no risk of losing fans'},
      t4:{name:'Узнаваемый игровой стиль',nameEn:'A signature game feel', desc:'У игры есть свой узнаваемый почерк', descEn:'The game has its own recognizable identity'} },
    traffic: { icon:'👥', name:'Игроки', nameEn:'Players',
      t1:{name:'Первые загрузки',nameEn:'First downloads', desc:'Игру начинают находить в сторе и по рекомендациям', descEn:'People start finding the game in the store and via recommendations'},
      t2:{name:'ASO-оптимизация',nameEn:'ASO tuning', desc:'Игра поднимается в поисковой выдаче магазина приложений', descEn:'The game climbs the app store search rankings'},
      t3_risky:{name:'Закупка ботоустановок',nameEn:'Buying bot installs', desc:'Число загрузок резко растёт — но реальный retention позже проседает', descEn:'Install counts spike fast — but real retention drops later'},
      t3_safe:{name:'Виральные механики внутри игры',nameEn:'In-game viral mechanics', desc:'Игроки сами приводят друзей — медленно, но честно', descEn:'Players bring friends themselves — slower, but honest'},
      t4:{name:'Активное игровое комьюнити',nameEn:'An active player community', desc:'Вокруг игры сложилось постоянное сообщество', descEn:'A loyal community has formed around the game'} },
    infra: { icon:'🖥️', name:'Серверы и стабильность', nameEn:'Servers & stability',
      t1:{name:'Базовый бэкенд',nameEn:'Basic backend', desc:'Игра держит обычную нагрузку без падений', descEn:'The game handles normal load without crashing'},
      t2:{name:'Оптимизация под нагрузку',nameEn:'Load optimization', desc:'Меньше лагов и вылетов при пиках онлайна', descEn:'Fewer lags and crashes during online peaks'},
      t3_risky:{name:'Экономия на серверных мощностях',nameEn:'Cutting back on server capacity', desc:'Расходы ниже — но при всплесках онлайна сервера начинают падать', descEn:'Costs drop — but servers start buckling during online spikes'},
      t3_safe:{name:'Запас мощности на пиковые нагрузки',nameEn:'Capacity headroom for peak load', desc:'Игра остаётся стабильной даже в самые загруженные часы', descEn:'The game stays stable even at the busiest hours'},
      t4:{name:'Игра, которая не падает',nameEn:'A game that never goes down', desc:'Стабильность на уровне топовых тайтлов', descEn:'Stability on par with top-tier titles'} },
    marketing: { icon:'📣', name:'Продвижение игры', nameEn:'Game marketing',
      t1:{name:'Странички в сторах',nameEn:'Store listing pages', desc:'Первые скриншоты, трейлер и описание игры', descEn:'First screenshots, a trailer and a game description'},
      t2:{name:'Инфлюенсер-показы',nameEn:'Influencer playthroughs', desc:'О игре начинают рассказывать стримеры и блогеры', descEn:'Streamers and creators start covering the game'},
      t3_risky:{name:'Массированная закупка рекламы',nameEn:'A massive ad buy', desc:'Резкий приток игроков — но много случайных, которые быстро уходят', descEn:'A sharp influx of players — but many are random and churn fast'},
      t3_safe:{name:'Точечные коллаборации по жанру',nameEn:'Targeted genre collabs', desc:'Партнёрства с близкой по духу аудиторией', descEn:'Partnerships with a like-minded audience'},
      t4:{name:'Игра на слуху у жанровой аудитории',nameEn:'A name known within its genre', desc:'О игре знают даже те, кто в неё не играл', descEn:'Even non-players have heard of it'} },
    security: { icon:'🛡️', name:'Античит и модерация', nameEn:'Anti-cheat & moderation',
      t1:{name:'Базовая защита от читов',nameEn:'Basic anti-cheat', desc:'Отсекаются самые грубые способы взлома', descEn:'The crudest hacks get blocked'},
      t2:{name:'Модерация чатов и лобби',nameEn:'Chat & lobby moderation', desc:'Токсичное поведение вычищается регулярнее', descEn:'Toxic behavior gets cleaned up more consistently'},
      t3_risky:{name:'Упрощённые проверки ради скорости матчмейкинга',nameEn:'Simplified checks for faster matchmaking', desc:'Матчи находятся быстрее — но со временем читеров становится больше', descEn:'Matches start faster — but cheaters creep back in over time'},
      t3_safe:{name:'Строгая система анти-чит проверок',nameEn:'A strict anti-cheat pipeline', desc:'Медленнее матчмейкинг, зато честная игра', descEn:'Slower matchmaking, but a fair game'},
      t4:{name:'Игра с репутацией честной площадки',nameEn:'A game known for fair play', desc:'Игроки доверяют матчмейкингу и рейтингу', descEn:'Players trust the matchmaking and rankings'} },
  },
  crypto: {
    design: { icon:'💠', name:'Интерфейс продукта', nameEn:'Product interface',
      t1:{name:'Минимальный кошелёк-интерфейс',nameEn:'Minimal wallet UI', desc:'Базовые операции — отправить, получить, посмотреть баланс', descEn:'The basics — send, receive, check balance'},
      t2:{name:'Понятный UX для новичков',nameEn:'Beginner-friendly UX', desc:'Сложные операции объясняются простым языком', descEn:'Complex operations get explained in plain language'},
      t3_risky:{name:'Погоня за трендами DeFi-дизайна',nameEn:'Chasing DeFi design trends', desc:'Интерфейс выглядит модно — но часть пользователей путается в новых элементах', descEn:'The interface looks trendy — but some users get lost in the new layout'},
      t3_safe:{name:'Постепенные улучшения интерфейса',nameEn:'Gradual interface refinements', desc:'Обновления выходят аккуратно, без ломки привычек', descEn:'Updates roll out carefully, without breaking habits'},
      t4:{name:'Интерфейс, которому доверяют',nameEn:'An interface people trust', desc:'Даже сложные операции выглядят понятно и безопасно', descEn:'Even complex operations feel clear and safe'} },
    traffic: { icon:'📈', name:'Пользователи', nameEn:'Users',
      t1:{name:'Первые кошельки',nameEn:'First wallets', desc:'Пользователи узнают о продукте через крипто-комьюнити', descEn:'Users hear about the product through crypto communities'},
      t2:{name:'Реферальная программа',nameEn:'Referral program', desc:'Существующие пользователи приводят новых за бонус', descEn:'Existing users bring new ones in for a bonus'},
      t3_risky:{name:'Аирдроп ради хайпа',nameEn:'An airdrop for hype', desc:'Резкий приток новых кошельков — но большинство уходит сразу после раздачи', descEn:'A sharp influx of new wallets — but most leave right after claiming'},
      t3_safe:{name:'Органический рост через комьюнити',nameEn:'Organic community growth', desc:'Медленнее, но пользователи остаются надолго', descEn:'Slower, but users stick around'},
      t4:{name:'Активное сообщество холдеров',nameEn:'An active holder community', desc:'Пользователи сами продвигают продукт в своих кругах', descEn:'Users promote the product within their own circles'} },
    infra: { icon:'⛓️', name:'Блокчейн-инфраструктура', nameEn:'Blockchain infrastructure',
      t1:{name:'Базовые ноды',nameEn:'Basic nodes', desc:'Продукт держит обычную нагрузку сети', descEn:'The product handles normal network load'},
      t2:{name:'Резервные ноды',nameEn:'Redundant nodes', desc:'Меньше простоев при перегрузке сети', descEn:'Fewer outages during network congestion'},
      t3_risky:{name:'Экономия на аудитах смарт-контрактов',nameEn:'Cutting corners on smart-contract audits', desc:'Запуск обновлений ускоряется — но растёт риск уязвимости и эксплойта', descEn:'Updates ship faster — but the risk of a vulnerability or exploit grows'},
      t3_safe:{name:'Полный аудит перед каждым релизом',nameEn:'A full audit before every release', desc:'Медленнее, зато без сюрпризов в коде', descEn:'Slower, but no surprises in the code'},
      t4:{name:'Инфраструктура, проверенная временем',nameEn:'Battle-tested infrastructure', desc:'Продукт держит нагрузку даже в дни ажиотажа', descEn:'The product holds up even on the busiest days'} },
    marketing: { icon:'📣', name:'Продвижение', nameEn:'Promotion',
      t1:{name:'Присутствие в крипто-соцсетях',nameEn:'Presence on crypto social media', desc:'Первые посты и анонсы для комьюнити', descEn:'First posts and announcements for the community'},
      t2:{name:'Партнёрства с другими проектами',nameEn:'Partnerships with other projects', desc:'Кросс-промо с близкими по духу продуктами', descEn:'Cross-promotion with like-minded products'},
      t3_risky:{name:'Громкие обещания доходности',nameEn:'Bold yield promises', desc:'Резкий приток интереса — но при первой просадке доверие быстро падает', descEn:'A sharp spike in interest — but trust craters fast at the first dip'},
      t3_safe:{name:'Честная коммуникация рисков',nameEn:'Honest risk communication', desc:'Рост медленнее, зато без разочарованных пользователей', descEn:'Growth is slower, but no disappointed users'},
      t4:{name:'Репутация надёжного проекта',nameEn:'A reputation for reliability', desc:'О продукте говорят как о примере серьёзного подхода', descEn:'The product is cited as an example of doing things right'} },
    security: { icon:'🔐', name:'Защита от эксплойтов', nameEn:'Exploit protection',
      t1:{name:'Базовая защита кошельков',nameEn:'Basic wallet protection', desc:'Стандартные меры от самых частых атак', descEn:'Standard measures against the most common attacks'},
      t2:{name:'Мультиподпись и лимиты',nameEn:'Multisig & limits', desc:'Крупные операции требуют дополнительного подтверждения', descEn:'Large operations require extra confirmation'},
      t3_risky:{name:'Упрощённые проверки транзакций ради скорости',nameEn:'Simplified transaction checks for speed', desc:'Операции проходят быстрее — но со временем растёт число мошеннических списаний', descEn:'Transactions clear faster — but fraudulent withdrawals creep up over time'},
      t3_safe:{name:'Многоуровневая проверка транзакций',nameEn:'Multi-layer transaction checks', desc:'Медленнее, зато средства пользователей под надёжной защитой', descEn:'Slower, but user funds stay well protected'},
      t4:{name:'Продукт с репутацией самого безопасного',nameEn:'A product known as the safest option', desc:'Пользователи доверяют продукту крупные суммы', descEn:'Users trust the product with large sums'} },
  },
  industry_energy: {
    design: { icon:'🏗️', name:'Инженерия объекта', nameEn:'Facility engineering',
      t1:{name:'Базовое оборудование',nameEn:'Basic equipment', desc:'Объект работает на минимально необходимой технике', descEn:'The facility runs on the bare minimum of equipment'},
      t2:{name:'Модернизация оборудования',nameEn:'Equipment upgrade', desc:'Новая техника поднимает эффективность объекта', descEn:'New equipment raises the facility\'s efficiency'},
      t3_risky:{name:'Ускоренный запуск без полной обкатки',nameEn:'A rushed launch without full testing', desc:'Объект выходит на мощность быстрее — но растёт риск аварий и простоев', descEn:'The facility ramps up faster — but the risk of accidents and downtime grows'},
      t3_safe:{name:'Поэтапный ввод в эксплуатацию',nameEn:'A phased commissioning', desc:'Медленнее, зато без сюрпризов при запуске', descEn:'Slower, but no surprises at launch'},
      t4:{name:'Объект мирового уровня',nameEn:'A world-class facility', desc:'Эффективность и надёжность на уровне лучших в отрасли', descEn:'Efficiency and reliability on par with the best in the industry'} },
    traffic: { icon:'🚛', name:'Сбыт', nameEn:'Distribution',
      t1:{name:'Первые контракты на поставку',nameEn:'First supply contracts', desc:'Продукцию начинают закупать локальные покупатели', descEn:'Local buyers start purchasing the output'},
      t2:{name:'Расширение каналов сбыта',nameEn:'Expanding sales channels', desc:'Появляются новые постоянные покупатели', descEn:'New recurring buyers come on board'},
      t3_risky:{name:'Демпинг ради доли рынка',nameEn:'Dumping prices for market share', desc:'Объёмы продаж резко растут — но маржа проседает на фоне ценовой войны', descEn:'Sales volumes spike — but margins suffer amid a price war'},
      t3_safe:{name:'Долгосрочные контракты по справедливой цене',nameEn:'Long-term contracts at fair prices', desc:'Рост медленнее, зато отношения с покупателями стабильные', descEn:'Growth is slower, but buyer relationships stay stable'},
      t4:{name:'Надёжный поставщик отрасли',nameEn:'A trusted industry supplier', desc:'Крупные заказчики выбирают именно этот объект', descEn:'Major buyers choose this facility by name'} },
    infra: { icon:'⚙️', name:'Оборудование', nameEn:'Equipment',
      t1:{name:'Плановое обслуживание',nameEn:'Scheduled maintenance', desc:'Оборудование обслуживается по базовому графику', descEn:'Equipment gets serviced on a basic schedule'},
      t2:{name:'Предиктивная диагностика',nameEn:'Predictive diagnostics', desc:'Поломки выявляются до того, как остановят работу', descEn:'Failures get caught before they halt operations'},
      t3_risky:{name:'Экономия на техобслуживании',nameEn:'Cutting back on maintenance', desc:'Расходы ниже прямо сейчас — но растёт риск серьёзной поломки позже', descEn:'Costs drop right now — but the risk of a major breakdown grows later'},
      t3_safe:{name:'Полное соблюдение регламентов обслуживания',nameEn:'Full maintenance compliance', desc:'Дороже, зато оборудование служит дольше без сбоев', descEn:'Costlier, but equipment runs longer without failures'},
      t4:{name:'Оборудование без единого простоя',nameEn:'Equipment with zero downtime', desc:'Объект работает на полную мощность круглый год', descEn:'The facility runs at full capacity year-round'} },
    marketing: { icon:'📄', name:'Контракты', nameEn:'Contracts',
      t1:{name:'Первые тендеры',nameEn:'First tenders', desc:'Объект начинает участвовать в закупочных конкурсах', descEn:'The facility starts bidding on procurement tenders'},
      t2:{name:'Репутация надёжного подрядчика',nameEn:'A reputation for reliability', desc:'Заказчики чаще выбирают объект среди конкурентов', descEn:'Buyers pick the facility over competitors more often'},
      t3_risky:{name:'Агрессивные заявки на крупные тендеры',nameEn:'Aggressive bids on major tenders', desc:'Заказы резко растут — но часть обязательств выполнить сложно, что бьёт по репутации', descEn:'Orders spike fast — but some commitments prove hard to meet, hurting reputation'},
      t3_safe:{name:'Взвешенное участие в тендерах по силам',nameEn:'Measured bidding within capacity', desc:'Рост скромнее, зато все обязательства выполняются', descEn:'Growth is modest, but every commitment gets met'},
      t4:{name:'Постоянный партнёр крупных заказчиков',nameEn:'A steady partner to major buyers', desc:'Объект получает контракты без долгих торгов', descEn:'The facility lands contracts without lengthy bidding wars'} },
    security: { icon:'🦺', name:'Промбезопасность', nameEn:'Industrial safety',
      t1:{name:'Базовые нормы безопасности',nameEn:'Baseline safety rules', desc:'Соблюдается минимально необходимый регламент', descEn:'The bare minimum safety regulations are followed'},
      t2:{name:'Регулярные проверки безопасности',nameEn:'Regular safety inspections', desc:'Риски выявляются и устраняются заранее', descEn:'Risks get spotted and fixed ahead of time'},
      t3_risky:{name:'Ускорение работ в обход части процедур',nameEn:'Speeding up work by skipping some procedures', desc:'Темп производства выше — но растёт риск аварий и штрафов', descEn:'Production pace increases — but the risk of accidents and fines grows'},
      t3_safe:{name:'Строгое соблюдение всех процедур безопасности',nameEn:'Strict adherence to every safety procedure', desc:'Медленнее, зато без происшествий', descEn:'Slower, but no incidents'},
      t4:{name:'Объект с нулевым травматизмом',nameEn:'A zero-incident facility', desc:'Безопасность объекта — образец для отрасли', descEn:'The facility\'s safety record is an industry benchmark'} },
  },
  industry_mining: {
    design: { icon:'⛏️', name:'Горные работы', nameEn:'Mining operations',
      t1:{name:'Базовая техника добычи',nameEn:'Basic extraction equipment', desc:'Добыча ведётся стандартными методами', descEn:'Extraction runs on standard methods'},
      t2:{name:'Модернизация техники добычи',nameEn:'Extraction equipment upgrade', desc:'Новая техника поднимает объёмы добычи', descEn:'New equipment raises extraction volumes'},
      t3_risky:{name:'Ускоренная разработка месторождения',nameEn:'Accelerated deposit development', desc:'Добыча растёт быстро — но истощение месторождения и риски обвалов увеличиваются', descEn:'Extraction ramps up fast — but deposit depletion and collapse risk increase'},
      t3_safe:{name:'Планомерная разработка по графику',nameEn:'Planned development on schedule', desc:'Медленнее, зато месторождение служит дольше', descEn:'Slower, but the deposit lasts longer'},
      t4:{name:'Передовой горнодобывающий комплекс',nameEn:'A leading-edge mining complex', desc:'Добыча ведётся на уровне лучших в отрасли', descEn:'Extraction runs on par with the best in the industry'} },
    traffic: { icon:'🚚', name:'Сбыт сырья', nameEn:'Raw material sales',
      t1:{name:'Первые покупатели сырья',nameEn:'First raw material buyers', desc:'Сырьё начинают закупать местные переработчики', descEn:'Local processors start buying the raw material'},
      t2:{name:'Долгосрочные поставки переработчикам',nameEn:'Long-term supply to processors', desc:'Появляются постоянные крупные покупатели', descEn:'Large recurring buyers come on board'},
      t3_risky:{name:'Продажа сырья по демпинговым ценам',nameEn:'Selling raw material at dumped prices', desc:'Объёмы продаж растут резко — но маржа страдает от низких цен', descEn:'Sales volumes spike — but margins suffer from low prices'},
      t3_safe:{name:'Стабильные контракты по рыночной цене',nameEn:'Stable contracts at market price', desc:'Рост медленнее, зато цены не проседают', descEn:'Growth is slower, but prices don\'t erode'},
      t4:{name:'Ключевой поставщик сырья в регионе',nameEn:'A key regional raw material supplier', desc:'Крупнейшие переработчики закупают именно здесь', descEn:'The largest processors buy here first'} },
    infra: { icon:'🚜', name:'Техника и логистика', nameEn:'Equipment & logistics',
      t1:{name:'Базовый парк техники',nameEn:'A basic equipment fleet', desc:'Техника справляется с текущими объёмами', descEn:'The fleet handles current volumes'},
      t2:{name:'Расширение парка техники',nameEn:'Fleet expansion', desc:'Больше техники — выше объёмы вывоза сырья', descEn:'More equipment means higher output'},
      t3_risky:{name:'Экономия на обслуживании техники',nameEn:'Cutting back on fleet maintenance', desc:'Расходы ниже сейчас — но растёт риск поломок и простоев', descEn:'Costs drop now — but the risk of breakdowns and downtime grows'},
      t3_safe:{name:'Плановое обслуживание всей техники',nameEn:'Scheduled fleet maintenance', desc:'Дороже, зато техника реже выходит из строя', descEn:'Costlier, but the fleet breaks down less often'},
      t4:{name:'Техника без простоев',nameEn:'A fleet with zero downtime', desc:'Добыча и вывоз идут без задержек', descEn:'Extraction and hauling run without delays'} },
    marketing: { icon:'📄', name:'Контракты на поставку', nameEn:'Supply contracts',
      t1:{name:'Первые заявки на закупку',nameEn:'First purchase requests', desc:'О месторождении узнают ближайшие переработчики', descEn:'Nearby processors learn about the deposit'},
      t2:{name:'Репутация надёжного поставщика сырья',nameEn:'A reputation as a reliable supplier', desc:'Заказчики возвращаются за новыми партиями', descEn:'Buyers come back for new shipments'},
      t3_risky:{name:'Агрессивные заявки на крупные контракты',nameEn:'Aggressive bids for large contracts', desc:'Объёмы заказов растут резко — но выполнить все обязательства становится сложно', descEn:'Order volumes spike — but meeting every commitment gets harder'},
      t3_safe:{name:'Взвешенные обязательства по объёмам',nameEn:'Measured volume commitments', desc:'Рост скромнее, зато все поставки идут в срок', descEn:'Growth is modest, but every shipment is on time'},
      t4:{name:'Постоянный поставщик крупным заводам',nameEn:'A steady supplier to major plants', desc:'Контракты заключаются без долгих переговоров', descEn:'Contracts get signed without lengthy negotiations'} },
    security: { icon:'🦺', name:'Безопасность горных работ', nameEn:'Mining safety',
      t1:{name:'Базовые нормы безопасности',nameEn:'Baseline safety rules', desc:'Соблюдается минимально необходимый регламент', descEn:'The bare minimum safety regulations are followed'},
      t2:{name:'Регулярный контроль устойчивости выработок',nameEn:'Regular stability inspections', desc:'Риски обвалов выявляются заранее', descEn:'Collapse risks get spotted ahead of time'},
      t3_risky:{name:'Ускорение выработки в обход части норм',nameEn:'Speeding extraction by skipping some norms', desc:'Темп добычи выше — но растёт риск обвалов и травматизма', descEn:'Extraction pace increases — but the risk of collapses and injuries grows'},
      t3_safe:{name:'Строгое соблюдение норм безопасности',nameEn:'Strict safety compliance', desc:'Медленнее, зато без происшествий', descEn:'Slower, but no incidents'},
      t4:{name:'Выработка с нулевым травматизмом',nameEn:'A zero-incident operation', desc:'Безопасность — образец для отрасли', descEn:'Safety record is an industry benchmark'} },
  },
  industry_manufacturing: {
    design: { icon:'🏗️', name:'Производственная линия', nameEn:'Production line',
      t1:{name:'Базовая линия сборки',nameEn:'A basic assembly line', desc:'Продукция выпускается стандартным способом', descEn:'Output ships via a standard process'},
      t2:{name:'Модернизация линии',nameEn:'Line upgrade', desc:'Новое оборудование поднимает объёмы выпуска', descEn:'New equipment raises output volumes'},
      t3_risky:{name:'Ускорение конвейера в ущерб контролю качества',nameEn:'Speeding up the line at the expense of QA', desc:'Выпуск растёт резко — но со временем растёт число бракованной продукции', descEn:'Output spikes fast — but defect rates creep up over time'},
      t3_safe:{name:'Поэтапная модернизация с контролем качества',nameEn:'A phased upgrade with QA intact', desc:'Медленнее, зато без роста брака', descEn:'Slower, but no rise in defects'},
      t4:{name:'Производство мирового уровня',nameEn:'World-class production', desc:'Линия работает на уровне лучших заводов отрасли', descEn:'The line runs on par with the best plants in the industry'} },
    traffic: { icon:'🧾', name:'Заказчики', nameEn:'Buyers',
      t1:{name:'Первые оптовые заказы',nameEn:'First wholesale orders', desc:'Продукцию начинают закупать локальные ритейлеры', descEn:'Local retailers start ordering the output'},
      t2:{name:'Расширение сети сбыта',nameEn:'Expanding the distribution network', desc:'Появляются новые постоянные заказчики', descEn:'New recurring buyers come on board'},
      t3_risky:{name:'Демпинг ради новых контрактов',nameEn:'Dumping prices for new contracts', desc:'Заказы резко растут — но маржа проседает из-за низких цен', descEn:'Orders spike — but margins suffer from low prices'},
      t3_safe:{name:'Долгосрочные контракты по справедливой цене',nameEn:'Long-term contracts at fair prices', desc:'Рост медленнее, зато отношения с заказчиками стабильные', descEn:'Growth is slower, but buyer relationships stay stable'},
      t4:{name:'Надёжный поставщик для крупных сетей',nameEn:'A trusted supplier to major chains', desc:'Крупные заказчики выбирают именно этот завод', descEn:'Major buyers choose this plant by name'} },
    infra: { icon:'⚙️', name:'Оборудование цеха', nameEn:'Shop-floor equipment',
      t1:{name:'Плановое обслуживание оборудования',nameEn:'Scheduled equipment maintenance', desc:'Станки обслуживаются по базовому графику', descEn:'Machines get serviced on a basic schedule'},
      t2:{name:'Автоматизация части процессов',nameEn:'Partial process automation', desc:'Часть операций выполняется без ручного труда', descEn:'Some operations run without manual labor'},
      t3_risky:{name:'Экономия на обслуживании станков',nameEn:'Cutting back on machine maintenance', desc:'Расходы ниже сейчас — но растёт риск серьёзных поломок', descEn:'Costs drop now — but the risk of major breakdowns grows'},
      t3_safe:{name:'Полное соблюдение регламента обслуживания',nameEn:'Full maintenance compliance', desc:'Дороже, зато оборудование служит дольше', descEn:'Costlier, but equipment lasts longer'},
      t4:{name:'Цех без единого простоя',nameEn:'A shop floor with zero downtime', desc:'Линия работает на полную мощность стабильно', descEn:'The line runs at full capacity reliably'} },
    marketing: { icon:'📣', name:'Продвижение продукции', nameEn:'Product promotion',
      t1:{name:'Участие в отраслевых выставках',nameEn:'Industry trade shows', desc:'Продукцию начинают замечать закупщики', descEn:'Buyers start noticing the product'},
      t2:{name:'B2B-каталог и прайс-листы',nameEn:'A B2B catalog and price lists', desc:'Заказчикам проще находить и заказывать продукцию', descEn:'Buyers can find and order more easily'},
      t3_risky:{name:'Агрессивная реклама с завышенными обещаниями',nameEn:'Aggressive ads with overstated claims', desc:'Заказов резко больше — но заказчики разочаровываются, столкнувшись с реальностью', descEn:'Orders spike — but buyers get disappointed when reality doesn\'t match'},
      t3_safe:{name:'Честные демонстрации возможностей завода',nameEn:'Honest demos of plant capabilities', desc:'Рост медленнее, зато ожидания заказчиков совпадают с реальностью', descEn:'Growth is slower, but buyer expectations match reality'},
      t4:{name:'Завод с репутацией надёжного поставщика',nameEn:'A plant known for reliability', desc:'О заводе знают и рекомендуют в отрасли', descEn:'The plant is known and recommended across the industry'} },
    security: { icon:'🦺', name:'Контроль качества и безопасность', nameEn:'QA & safety',
      t1:{name:'Базовый контроль качества',nameEn:'Basic quality control', desc:'Продукция проверяется по минимальным стандартам', descEn:'Output gets checked against minimum standards'},
      t2:{name:'Регулярные проверки на всех этапах',nameEn:'Regular checks at every stage', desc:'Брак выявляется раньше, до отгрузки заказчику', descEn:'Defects get caught earlier, before shipping to buyers'},
      t3_risky:{name:'Упрощённый контроль ради скорости отгрузки',nameEn:'Simplified QA for faster shipping', desc:'Отгрузка быстрее — но со временем растёт число рекламаций', descEn:'Shipping speeds up — but complaints creep up over time'},
      t3_safe:{name:'Строгий контроль качества на каждом этапе',nameEn:'Strict QA at every stage', desc:'Медленнее, зато без рекламаций', descEn:'Slower, but no complaints'},
      t4:{name:'Завод с репутацией безупречного качества',nameEn:'A plant known for flawless quality', desc:'Заказчики доверяют продукции без лишних проверок', descEn:'Buyers trust the output without extra checks'} },
  },
  industry_heavy: {
    design: { icon:'🏭', name:'Инженерные проекты', nameEn:'Engineering projects',
      t1:{name:'Базовые проектные решения',nameEn:'Basic engineering solutions', desc:'Проекты реализуются стандартными методами', descEn:'Projects get built using standard methods'},
      t2:{name:'Современные инженерные решения',nameEn:'Modern engineering solutions', desc:'Новые технологии поднимают качество и скорость сборки', descEn:'New technology raises build quality and speed'},
      t3_risky:{name:'Ускоренная сборка в обход части этапов проверки',nameEn:'A rushed build skipping some review stages', desc:'Проекты сдаются быстрее — но растёт риск серьёзных дефектов', descEn:'Projects ship faster — but the risk of serious defects grows'},
      t3_safe:{name:'Полный цикл инженерных проверок',nameEn:'A full engineering review cycle', desc:'Медленнее, зато без дефектов на выходе', descEn:'Slower, but no defects at the end'},
      t4:{name:'Инженерия мирового уровня',nameEn:'World-class engineering', desc:'Проекты по качеству на уровне лучших верфей и заводов', descEn:'Projects match the quality of the best yards and plants worldwide'} },
    traffic: { icon:'🧾', name:'Заказчики проектов', nameEn:'Project clients',
      t1:{name:'Первые крупные заказы',nameEn:'First major orders', desc:'О заводе узнают первые крупные заказчики', descEn:'The first big buyers learn about the plant'},
      t2:{name:'Портфолио завершённых проектов',nameEn:'A portfolio of completed projects', desc:'Успешные кейсы привлекают новых заказчиков', descEn:'Successful case studies attract new buyers'},
      t3_risky:{name:'Одновременный набор слишком многих контрактов',nameEn:'Taking on too many contracts at once', desc:'Портфель заказов резко растёт — но выполнить все в срок становится сложно', descEn:'The order book spikes — but meeting every deadline gets hard'},
      t3_safe:{name:'Взвешенный набор заказов по мощностям',nameEn:'Measured order intake within capacity', desc:'Рост скромнее, зато все проекты сдаются вовремя', descEn:'Growth is modest, but every project ships on time'},
      t4:{name:'Завод — первый выбор для мегапроектов',nameEn:'The go-to plant for megaprojects', desc:'Крупнейшие заказчики обращаются в первую очередь сюда', descEn:'The biggest clients come here first'} },
    infra: { icon:'⚙️', name:'Производственные мощности', nameEn:'Production capacity',
      t1:{name:'Базовые производственные мощности',nameEn:'Basic production capacity', desc:'Завод справляется с текущим портфелем заказов', descEn:'The plant handles the current order book'},
      t2:{name:'Расширение производственных мощностей',nameEn:'Expanding production capacity', desc:'Завод может брать больше крупных заказов одновременно', descEn:'The plant can take on more large orders at once'},
      t3_risky:{name:'Экономия на резервных мощностях',nameEn:'Cutting back on capacity reserves', desc:'Расходы ниже сейчас — но при перегрузке начинаются срывы сроков', descEn:'Costs drop now — but deadlines start slipping under heavy load'},
      t3_safe:{name:'Резерв мощностей на случай перегрузки',nameEn:'Capacity reserves for overload', desc:'Дороже, зато сроки не срываются даже при полной загрузке', descEn:'Costlier, but deadlines hold even at full load'},
      t4:{name:'Мощности без единого срыва сроков',nameEn:'Capacity with zero missed deadlines', desc:'Завод сдаёт даже мегапроекты точно в срок', descEn:'The plant delivers even megaprojects exactly on time'} },
    marketing: { icon:'📣', name:'Репутация подрядчика', nameEn:'Contractor reputation',
      t1:{name:'Первые публикации о заводе',nameEn:'First press coverage', desc:'О заводе узнают через отраслевые СМИ', descEn:'The plant gets noticed through industry media'},
      t2:{name:'Участие в тендерах на мегапроекты',nameEn:'Bidding on megaproject tenders', desc:'Завод регулярно попадает в шорт-листы крупных заказчиков', descEn:'The plant regularly makes the shortlist for major buyers'},
      t3_risky:{name:'Громкие заявления о сроках без запаса',nameEn:'Bold deadline claims with no buffer', desc:'Заводу чаще достаются контракты — но срывы сроков позже бьют по репутации', descEn:'The plant wins more contracts — but slipped deadlines later hurt its name'},
      t3_safe:{name:'Реалистичные сроки и честные заявки',nameEn:'Realistic timelines and honest bids', desc:'Контрактов меньше, зато репутация надёжного подрядчика растёт', descEn:'Fewer contracts, but a reputation for reliability builds steadily'},
      t4:{name:'Подрядчик, которому доверяют мегапроекты',nameEn:'The contractor trusted with megaprojects', desc:'Заказчики выбирают завод, не рассматривая альтернатив', descEn:'Buyers pick the plant without even considering alternatives'} },
    security: { icon:'🦺', name:'Промышленная безопасность', nameEn:'Industrial safety',
      t1:{name:'Базовые нормы безопасности',nameEn:'Baseline safety rules', desc:'Соблюдается минимально необходимый регламент', descEn:'The bare minimum safety regulations are followed'},
      t2:{name:'Регулярные проверки безопасности',nameEn:'Regular safety inspections', desc:'Риски выявляются и устраняются заранее', descEn:'Risks get spotted and fixed ahead of time'},
      t3_risky:{name:'Ускорение сборки в обход части процедур безопасности',nameEn:'Speeding up assembly by skipping safety procedures', desc:'Темп выше — но растёт риск серьёзных аварий на площадке', descEn:'Pace increases — but the risk of serious on-site accidents grows'},
      t3_safe:{name:'Строгое соблюдение всех процедур безопасности',nameEn:'Strict adherence to every safety procedure', desc:'Медленнее, зато без происшествий', descEn:'Slower, but no incidents'},
      t4:{name:'Завод с нулевым травматизмом',nameEn:'A zero-incident plant', desc:'Безопасность площадки — образец для отрасли', descEn:'The site\'s safety record is an industry benchmark'} },
  },
};
function specFlavorGroup(type){
  if(!type) return null;
  if(type.category==='games') return 'games';
  if(type.category==='crypto') return 'crypto';
  if(type.category==='industry' && type.sub) return `industry_${type.sub}`;
  return null;
}
/* ---------- PER-BUSINESS SPEC-TREE FLAVOR: GAMES / CRYPTO / INDUSTRY ----------
   [Точка 10, доработка 3] До этого момента все 5 GAME_TYPES делили один
   текст дерева на всех, все 5 CRYPTO_TYPES — тоже один на всех, и все 28
   INDUSTRY_TYPES — один текст на весь под-раздел (см. TYPE_SPEC_FLAVOR_GROUP
   выше). Пользователь попросил довести это до конца: у каждого бизнеса —
   своя ветка. Ниже — 6 шаблон-функций (games/crypto/industry_energy/
   industry_mining/industry_manufacturing/industry_heavy), каждая
   параметризована именем конкретного бизнеса: имя подставляется в заголовок
   каждой из 5 категорий и в узлы t1/t2/t3/t4 каждой ветки, так что дерево
   "Аркадной игры" и дерево "AI-игровой студии" читаются как принадлежащие
   именно этому бизнесу, а не общий текст на весь жанр. Ниже эти функции
   применяются к каждому из ~38 бизнесов через generic-цикл (не переписывать
   вручную 38 копий одного и того же дерева), и результат кладётся в
   TYPE_SPEC_FLAVOR по business.id — это имеет приоритет над
   TYPE_SPEC_FLAVOR_GROUP (см. specTypeFlavor ниже), которая остаётся как
   аварийный fallback на случай, если в будущем добавится бизнес без
   собственной записи. */
function gamesTreeFlavor(name, nameEn){
  return {
    design: { icon:'🎮', name:`Геймдизайн: ${name}`, nameEn:`${nameEn}: game design`,
      t1:{name:`Первый прототип «${name}»`, nameEn:`${nameEn}'s first prototype`, desc:`Простой игровой цикл — в «${name}» уже можно играть, но небогато`, descEn:`A simple game loop — ${nameEn} is playable already, but bare-bones`},
      t2:{name:'Полировка механик', nameEn:'Mechanics polish', desc:`Управление и баланс в «${name}» становятся приятнее`, descEn:`Controls and balance in ${nameEn} start feeling good`},
      t3_risky:{name:'Погоня за трендовым жанром', nameEn:'Chasing a trending genre', desc:`Резкая смена стиля «${name}» под хайповый жанр — часть старых игроков не примет новую механику`, descEn:`A sudden pivot of ${nameEn} to a hyped genre — some longtime players won't take to it`},
      t3_safe:{name:'Постепенное развитие своей механики', nameEn:'Gradually refining your own mechanic', desc:'Медленнее, но без риска растерять фанатов', descEn:'Slower, but no risk of losing fans'},
      t4:{name:`Узнаваемый стиль «${name}»`, nameEn:`${nameEn}'s signature feel`, desc:'У игры есть свой узнаваемый почерк', descEn:'The game has its own recognizable identity'} },
    traffic: { icon:'👥', name:`Игроки «${name}»`, nameEn:`${nameEn} players`,
      t1:{name:'Первые загрузки', nameEn:'First downloads', desc:`«${name}» начинают находить в сторе и по рекомендациям`, descEn:`People start finding ${nameEn} in the store and via recommendations`},
      t2:{name:'ASO-оптимизация', nameEn:'ASO tuning', desc:`«${name}» поднимается в поисковой выдаче магазина`, descEn:`${nameEn} climbs the app store search rankings`},
      t3_risky:{name:'Закупка ботоустановок', nameEn:'Buying bot installs', desc:'Число загрузок резко растёт — но реальный retention позже проседает', descEn:'Install counts spike fast — but real retention drops later'},
      t3_safe:{name:'Виральные механики внутри игры', nameEn:'In-game viral mechanics', desc:'Игроки сами приводят друзей — медленно, но честно', descEn:'Players bring friends themselves — slower, but honest'},
      t4:{name:`Комьюнити «${name}»`, nameEn:`${nameEn}'s community`, desc:'Вокруг игры сложилось постоянное сообщество', descEn:'A loyal community has formed around the game'} },
    infra: { icon:'🖥️', name:'Серверы и стабильность', nameEn:'Servers & stability',
      t1:{name:'Базовый бэкенд', nameEn:'Basic backend', desc:`«${name}» держит обычную нагрузку без падений`, descEn:`${nameEn} handles normal load without crashing`},
      t2:{name:'Оптимизация под нагрузку', nameEn:'Load optimization', desc:'Меньше лагов и вылетов при пиках онлайна', descEn:'Fewer lags and crashes during online peaks'},
      t3_risky:{name:'Экономия на серверных мощностях', nameEn:'Cutting back on server capacity', desc:'Расходы ниже — но при всплесках онлайна сервера начинают падать', descEn:'Costs drop — but servers start buckling during spikes'},
      t3_safe:{name:'Запас мощности на пиковые нагрузки', nameEn:'Capacity headroom for peak load', desc:`«${name}» остаётся стабильной даже в самые загруженные часы`, descEn:`${nameEn} stays stable even at the busiest hours`},
      t4:{name:'Игра, которая не падает', nameEn:'A game that never goes down', desc:'Стабильность на уровне топовых тайтлов', descEn:'Stability on par with top-tier titles'} },
    marketing: { icon:'📣', name:`Продвижение «${name}»`, nameEn:`${nameEn} marketing`,
      t1:{name:'Странички в сторах', nameEn:'Store listing pages', desc:`Первые скриншоты, трейлер и описание «${name}»`, descEn:`First screenshots, a trailer and a description of ${nameEn}`},
      t2:{name:'Инфлюенсер-показы', nameEn:'Influencer playthroughs', desc:`О «${name}» начинают рассказывать стримеры и блогеры`, descEn:`Streamers and creators start covering ${nameEn}`},
      t3_risky:{name:'Массированная закупка рекламы', nameEn:'A massive ad buy', desc:'Резкий приток игроков — но много случайных, которые быстро уходят', descEn:'A sharp influx of players — but many churn fast'},
      t3_safe:{name:'Точечные коллаборации по жанру', nameEn:'Targeted genre collabs', desc:'Партнёрства с близкой по духу аудиторией', descEn:'Partnerships with a like-minded audience'},
      t4:{name:`«${name}» на слуху у жанра`, nameEn:`${nameEn} is a name known in its genre`, desc:'О игре знают даже те, кто в неё не играл', descEn:'Even non-players have heard of it'} },
    security: { icon:'🛡️', name:'Античит и модерация', nameEn:'Anti-cheat & moderation',
      t1:{name:'Базовая защита от читов', nameEn:'Basic anti-cheat', desc:'Отсекаются самые грубые способы взлома', descEn:'The crudest hacks get blocked'},
      t2:{name:'Модерация чатов и лобби', nameEn:'Chat & lobby moderation', desc:'Токсичное поведение вычищается регулярнее', descEn:'Toxic behavior gets cleaned up more consistently'},
      t3_risky:{name:'Упрощённые проверки ради скорости матчмейкинга', nameEn:'Simplified checks for faster matchmaking', desc:'Матчи находятся быстрее — но со временем читеров становится больше', descEn:'Matches start faster — but cheaters creep back in over time'},
      t3_safe:{name:'Строгая система анти-чит проверок', nameEn:'A strict anti-cheat pipeline', desc:'Медленнее матчмейкинг, зато честная игра', descEn:'Slower matchmaking, but a fair game'},
      t4:{name:`«${name}» — репутация честной площадки`, nameEn:`${nameEn} is known for fair play`, desc:'Игроки доверяют матчмейкингу и рейтингу', descEn:'Players trust the matchmaking and rankings'} },
  };
}
function cryptoTreeFlavor(name, nameEn){
  return {
    design: { icon:'💠', name:`Интерфейс: ${name}`, nameEn:`${nameEn}: product interface`,
      t1:{name:`Минимальный интерфейс «${name}»`, nameEn:`${nameEn}'s minimal UI`, desc:'Базовые операции — отправить, получить, посмотреть баланс', descEn:'The basics — send, receive, check balance'},
      t2:{name:'Понятный UX для новичков', nameEn:'Beginner-friendly UX', desc:`Сложные операции в «${name}» объясняются простым языком`, descEn:`Complex operations in ${nameEn} get explained in plain language`},
      t3_risky:{name:'Погоня за трендами DeFi-дизайна', nameEn:'Chasing DeFi design trends', desc:`Интерфейс «${name}» выглядит модно — но часть пользователей путается в новых элементах`, descEn:`${nameEn}'s interface looks trendy — but some users get lost in the new layout`},
      t3_safe:{name:'Постепенные улучшения интерфейса', nameEn:'Gradual interface refinements', desc:'Обновления выходят аккуратно, без ломки привычек', descEn:'Updates roll out carefully, without breaking habits'},
      t4:{name:`Интерфейс «${name}», которому доверяют`, nameEn:`${nameEn}'s interface, trusted by users`, desc:'Даже сложные операции выглядят понятно и безопасно', descEn:'Even complex operations feel clear and safe'} },
    traffic: { icon:'📈', name:`Пользователи «${name}»`, nameEn:`${nameEn} users`,
      t1:{name:'Первые кошельки', nameEn:'First wallets', desc:`О «${name}» узнают через крипто-комьюнити`, descEn:`Users hear about ${nameEn} through crypto communities`},
      t2:{name:'Реферальная программа', nameEn:'Referral program', desc:'Существующие пользователи приводят новых за бонус', descEn:'Existing users bring new ones in for a bonus'},
      t3_risky:{name:'Аирдроп ради хайпа', nameEn:'An airdrop for hype', desc:`Резкий приток новых пользователей «${name}» — но большинство уходит сразу после раздачи`, descEn:`A sharp influx of new users for ${nameEn} — but most leave right after claiming`},
      t3_safe:{name:'Органический рост через комьюнити', nameEn:'Organic community growth', desc:'Медленнее, но пользователи остаются надолго', descEn:'Slower, but users stick around'},
      t4:{name:`Комьюнити холдеров «${name}»`, nameEn:`${nameEn}'s holder community`, desc:'Пользователи сами продвигают продукт в своих кругах', descEn:'Users promote the product within their own circles'} },
    infra: { icon:'⛓️', name:'Блокчейн-инфраструктура', nameEn:'Blockchain infrastructure',
      t1:{name:'Базовые ноды', nameEn:'Basic nodes', desc:`«${name}» держит обычную нагрузку сети`, descEn:`${nameEn} handles normal network load`},
      t2:{name:'Резервные ноды', nameEn:'Redundant nodes', desc:'Меньше простоев при перегрузке сети', descEn:'Fewer outages during network congestion'},
      t3_risky:{name:'Экономия на аудитах смарт-контрактов', nameEn:'Cutting corners on smart-contract audits', desc:'Обновления выходят быстрее — но растёт риск уязвимости и эксплойта', descEn:'Updates ship faster — but the risk of a vulnerability grows'},
      t3_safe:{name:'Полный аудит перед каждым релизом', nameEn:'A full audit before every release', desc:'Медленнее, зато без сюрпризов в коде', descEn:'Slower, but no surprises in the code'},
      t4:{name:`Инфраструктура «${name}», проверенная временем`, nameEn:`${nameEn}'s battle-tested infrastructure`, desc:'Продукт держит нагрузку даже в дни ажиотажа', descEn:'The product holds up even on the busiest days'} },
    marketing: { icon:'📣', name:`Продвижение «${name}»`, nameEn:`${nameEn} promotion`,
      t1:{name:'Присутствие в крипто-соцсетях', nameEn:'Presence on crypto social media', desc:`Первые посты и анонсы «${name}» для комьюнити`, descEn:`First posts and announcements about ${nameEn} for the community`},
      t2:{name:'Партнёрства с другими проектами', nameEn:'Partnerships with other projects', desc:'Кросс-промо с близкими по духу продуктами', descEn:'Cross-promotion with like-minded products'},
      t3_risky:{name:'Громкие обещания доходности', nameEn:'Bold yield promises', desc:`Резкий приток интереса к «${name}» — но при первой просадке доверие быстро падает`, descEn:`A sharp spike in interest in ${nameEn} — but trust craters at the first dip`},
      t3_safe:{name:'Честная коммуникация рисков', nameEn:'Honest risk communication', desc:'Рост медленнее, зато без разочарованных пользователей', descEn:'Growth is slower, but no disappointed users'},
      t4:{name:`Репутация «${name}» как надёжного проекта`, nameEn:`${nameEn}'s reputation for reliability`, desc:'О продукте говорят как о примере серьёзного подхода', descEn:'The product is cited as an example of doing things right'} },
    security: { icon:'🔐', name:'Защита от эксплойтов', nameEn:'Exploit protection',
      t1:{name:'Базовая защита кошельков', nameEn:'Basic wallet protection', desc:'Стандартные меры от самых частых атак', descEn:'Standard measures against the most common attacks'},
      t2:{name:'Мультиподпись и лимиты', nameEn:'Multisig & limits', desc:'Крупные операции требуют дополнительного подтверждения', descEn:'Large operations require extra confirmation'},
      t3_risky:{name:'Упрощённые проверки транзакций ради скорости', nameEn:'Simplified transaction checks for speed', desc:'Операции проходят быстрее — но со временем растёт число мошеннических списаний', descEn:'Transactions clear faster — but fraudulent withdrawals creep up over time'},
      t3_safe:{name:'Многоуровневая проверка транзакций', nameEn:'Multi-layer transaction checks', desc:'Медленнее, зато средства пользователей под надёжной защитой', descEn:'Slower, but user funds stay well protected'},
      t4:{name:`«${name}» — репутация самого безопасного`, nameEn:`${nameEn} known as the safest option`, desc:'Пользователи доверяют продукту крупные суммы', descEn:'Users trust the product with large sums'} },
  };
}
function industryEnergyTreeFlavor(name, nameEn){
  return {
    design: { icon:'🏗️', name:`Инженерия: ${name}`, nameEn:`${nameEn}: facility engineering`,
      t1:{name:`Базовое оборудование «${name}»`, nameEn:`${nameEn}'s basic equipment`, desc:'Объект работает на минимально необходимой технике', descEn:'The facility runs on the bare minimum of equipment'},
      t2:{name:'Модернизация оборудования', nameEn:'Equipment upgrade', desc:`Новая техника поднимает эффективность «${name}»`, descEn:`New equipment raises ${nameEn}'s efficiency`},
      t3_risky:{name:'Ускоренный запуск без полной обкатки', nameEn:'A rushed launch without full testing', desc:`«${name}» выходит на мощность быстрее — но растёт риск аварий и простоев`, descEn:`${nameEn} ramps up faster — but the risk of accidents and downtime grows`},
      t3_safe:{name:'Поэтапный ввод в эксплуатацию', nameEn:'A phased commissioning', desc:'Медленнее, зато без сюрпризов при запуске', descEn:'Slower, but no surprises at launch'},
      t4:{name:`«${name}» мирового уровня`, nameEn:`A world-class ${nameEn}`, desc:'Эффективность и надёжность на уровне лучших в отрасли', descEn:'Efficiency and reliability on par with the best in the industry'} },
    traffic: { icon:'🚛', name:'Сбыт', nameEn:'Distribution',
      t1:{name:'Первые контракты на поставку', nameEn:'First supply contracts', desc:`Продукцию «${name}» начинают закупать локальные покупатели`, descEn:`Local buyers start purchasing ${nameEn}'s output`},
      t2:{name:'Расширение каналов сбыта', nameEn:'Expanding sales channels', desc:'Появляются новые постоянные покупатели', descEn:'New recurring buyers come on board'},
      t3_risky:{name:'Демпинг ради доли рынка', nameEn:'Dumping prices for market share', desc:'Объёмы продаж резко растут — но маржа проседает на фоне ценовой войны', descEn:'Sales volumes spike — but margins suffer amid a price war'},
      t3_safe:{name:'Долгосрочные контракты по справедливой цене', nameEn:'Long-term contracts at fair prices', desc:'Рост медленнее, зато отношения с покупателями стабильные', descEn:'Growth is slower, but buyer relationships stay stable'},
      t4:{name:`«${name}» — надёжный поставщик отрасли`, nameEn:`${nameEn}, a trusted industry supplier`, desc:'Крупные заказчики выбирают именно этот объект', descEn:'Major buyers choose this facility by name'} },
    infra: { icon:'⚙️', name:'Оборудование', nameEn:'Equipment',
      t1:{name:'Плановое обслуживание', nameEn:'Scheduled maintenance', desc:'Оборудование обслуживается по базовому графику', descEn:'Equipment gets serviced on a basic schedule'},
      t2:{name:'Предиктивная диагностика', nameEn:'Predictive diagnostics', desc:'Поломки выявляются до того, как остановят работу', descEn:'Failures get caught before they halt operations'},
      t3_risky:{name:'Экономия на техобслуживании', nameEn:'Cutting back on maintenance', desc:'Расходы ниже прямо сейчас — но растёт риск серьёзной поломки позже', descEn:'Costs drop right now — but the risk of a major breakdown grows later'},
      t3_safe:{name:'Полное соблюдение регламентов обслуживания', nameEn:'Full maintenance compliance', desc:'Дороже, зато оборудование служит дольше без сбоев', descEn:'Costlier, but equipment runs longer without failures'},
      t4:{name:`«${name}» без единого простоя`, nameEn:`${nameEn} with zero downtime`, desc:'Объект работает на полную мощность круглый год', descEn:'The facility runs at full capacity year-round'} },
    marketing: { icon:'📄', name:'Контракты', nameEn:'Contracts',
      t1:{name:'Первые тендеры', nameEn:'First tenders', desc:`«${name}» начинает участвовать в закупочных конкурсах`, descEn:`${nameEn} starts bidding on procurement tenders`},
      t2:{name:'Репутация надёжного подрядчика', nameEn:'A reputation for reliability', desc:'Заказчики чаще выбирают объект среди конкурентов', descEn:'Buyers pick the facility over competitors more often'},
      t3_risky:{name:'Агрессивные заявки на крупные тендеры', nameEn:'Aggressive bids on major tenders', desc:'Заказы резко растут — но часть обязательств выполнить сложно, что бьёт по репутации', descEn:'Orders spike fast — but some commitments prove hard to meet, hurting reputation'},
      t3_safe:{name:'Взвешенное участие в тендерах по силам', nameEn:'Measured bidding within capacity', desc:'Рост скромнее, зато все обязательства выполняются', descEn:'Growth is modest, but every commitment gets met'},
      t4:{name:`«${name}» — постоянный партнёр крупных заказчиков`, nameEn:`${nameEn}, a steady partner to major buyers`, desc:'Объект получает контракты без долгих торгов', descEn:'The facility lands contracts without lengthy bidding wars'} },
    security: { icon:'🦺', name:'Промбезопасность', nameEn:'Industrial safety',
      t1:{name:'Базовые нормы безопасности', nameEn:'Baseline safety rules', desc:'Соблюдается минимально необходимый регламент', descEn:'The bare minimum safety regulations are followed'},
      t2:{name:'Регулярные проверки безопасности', nameEn:'Regular safety inspections', desc:'Риски выявляются и устраняются заранее', descEn:'Risks get spotted and fixed ahead of time'},
      t3_risky:{name:'Ускорение работ в обход части процедур', nameEn:'Speeding up work by skipping some procedures', desc:'Темп производства выше — но растёт риск аварий и штрафов', descEn:'Production pace increases — but the risk of accidents and fines grows'},
      t3_safe:{name:'Строгое соблюдение всех процедур безопасности', nameEn:'Strict adherence to every safety procedure', desc:'Медленнее, зато без происшествий', descEn:'Slower, but no incidents'},
      t4:{name:`«${name}» с нулевым травматизмом`, nameEn:`${nameEn}, a zero-incident facility`, desc:'Безопасность объекта — образец для отрасли', descEn:"The facility's safety record is an industry benchmark"} },
  };
}
function industryMiningTreeFlavor(name, nameEn){
  return {
    design: { icon:'⛏️', name:`Горные работы: ${name}`, nameEn:`${nameEn}: mining operations`,
      t1:{name:`Базовая техника «${name}»`, nameEn:`${nameEn}'s basic extraction equipment`, desc:'Добыча ведётся стандартными методами', descEn:'Extraction runs on standard methods'},
      t2:{name:'Модернизация техники добычи', nameEn:'Extraction equipment upgrade', desc:`Новая техника поднимает объёмы добычи на «${name}»`, descEn:`New equipment raises ${nameEn}'s output volumes`},
      t3_risky:{name:'Ускоренная разработка месторождения', nameEn:'Accelerated deposit development', desc:'Добыча растёт быстро — но истощение месторождения и риски обвалов увеличиваются', descEn:'Extraction ramps up fast — but deposit depletion and collapse risk increase'},
      t3_safe:{name:'Планомерная разработка по графику', nameEn:'Planned development on schedule', desc:'Медленнее, зато месторождение служит дольше', descEn:'Slower, but the deposit lasts longer'},
      t4:{name:`«${name}» — передовой комплекс`, nameEn:`${nameEn}, a leading-edge complex`, desc:'Добыча ведётся на уровне лучших в отрасли', descEn:'Extraction runs on par with the best in the industry'} },
    traffic: { icon:'🚚', name:'Сбыт сырья', nameEn:'Raw material sales',
      t1:{name:'Первые покупатели сырья', nameEn:'First raw material buyers', desc:`Сырьё «${name}» начинают закупать местные переработчики`, descEn:`Local processors start buying ${nameEn}'s raw material`},
      t2:{name:'Долгосрочные поставки переработчикам', nameEn:'Long-term supply to processors', desc:'Появляются постоянные крупные покупатели', descEn:'Large recurring buyers come on board'},
      t3_risky:{name:'Продажа сырья по демпинговым ценам', nameEn:'Selling raw material at dumped prices', desc:'Объёмы продаж растут резко — но маржа страдает от низких цен', descEn:'Sales volumes spike — but margins suffer from low prices'},
      t3_safe:{name:'Стабильные контракты по рыночной цене', nameEn:'Stable contracts at market price', desc:'Рост медленнее, зато цены не проседают', descEn:"Growth is slower, but prices don't erode"},
      t4:{name:`«${name}» — ключевой поставщик региона`, nameEn:`${nameEn}, a key regional supplier`, desc:'Крупнейшие переработчики закупают именно здесь', descEn:'The largest processors buy here first'} },
    infra: { icon:'🚜', name:'Техника и логистика', nameEn:'Equipment & logistics',
      t1:{name:'Базовый парк техники', nameEn:'A basic equipment fleet', desc:'Техника справляется с текущими объёмами', descEn:'The fleet handles current volumes'},
      t2:{name:'Расширение парка техники', nameEn:'Fleet expansion', desc:'Больше техники — выше объёмы вывоза сырья', descEn:'More equipment means higher output'},
      t3_risky:{name:'Экономия на обслуживании техники', nameEn:'Cutting back on fleet maintenance', desc:'Расходы ниже сейчас — но растёт риск поломок и простоев', descEn:'Costs drop now — but the risk of breakdowns and downtime grows'},
      t3_safe:{name:'Плановое обслуживание всей техники', nameEn:'Scheduled fleet maintenance', desc:'Дороже, зато техника реже выходит из строя', descEn:'Costlier, but the fleet breaks down less often'},
      t4:{name:`«${name}» без простоев`, nameEn:`${nameEn} with zero fleet downtime`, desc:'Добыча и вывоз идут без задержек', descEn:'Extraction and hauling run without delays'} },
    marketing: { icon:'📄', name:'Контракты на поставку', nameEn:'Supply contracts',
      t1:{name:'Первые заявки на закупку', nameEn:'First purchase requests', desc:`О «${name}» узнают ближайшие переработчики`, descEn:`Nearby processors learn about ${nameEn}`},
      t2:{name:'Репутация надёжного поставщика сырья', nameEn:'A reputation as a reliable supplier', desc:'Заказчики возвращаются за новыми партиями', descEn:'Buyers come back for new shipments'},
      t3_risky:{name:'Агрессивные заявки на крупные контракты', nameEn:'Aggressive bids for large contracts', desc:'Объёмы заказов растут резко — но выполнить все обязательства становится сложно', descEn:'Order volumes spike — but meeting every commitment gets harder'},
      t3_safe:{name:'Взвешенные обязательства по объёмам', nameEn:'Measured volume commitments', desc:'Рост скромнее, зато все поставки идут в срок', descEn:'Growth is modest, but every shipment is on time'},
      t4:{name:`«${name}» — постоянный поставщик крупным заводам`, nameEn:`${nameEn}, a steady supplier to major plants`, desc:'Контракты заключаются без долгих переговоров', descEn:'Contracts get signed without lengthy negotiations'} },
    security: { icon:'🦺', name:'Безопасность горных работ', nameEn:'Mining safety',
      t1:{name:'Базовые нормы безопасности', nameEn:'Baseline safety rules', desc:'Соблюдается минимально необходимый регламент', descEn:'The bare minimum safety regulations are followed'},
      t2:{name:'Регулярный контроль устойчивости выработок', nameEn:'Regular stability inspections', desc:'Риски обвалов выявляются заранее', descEn:'Collapse risks get spotted ahead of time'},
      t3_risky:{name:'Ускорение выработки в обход части норм', nameEn:'Speeding extraction by skipping some norms', desc:'Темп добычи выше — но растёт риск обвалов и травматизма', descEn:'Extraction pace increases — but the risk of collapses and injuries grows'},
      t3_safe:{name:'Строгое соблюдение норм безопасности', nameEn:'Strict safety compliance', desc:'Медленнее, зато без происшествий', descEn:'Slower, but no incidents'},
      t4:{name:`«${name}» с нулевым травматизмом`, nameEn:`${nameEn}, a zero-incident operation`, desc:'Безопасность — образец для отрасли', descEn:'Safety record is an industry benchmark'} },
  };
}
function industryManufacturingTreeFlavor(name, nameEn){
  return {
    design: { icon:'🏗️', name:`Производственная линия: ${name}`, nameEn:`${nameEn}: production line`,
      t1:{name:`Базовая линия «${name}»`, nameEn:`${nameEn}'s basic assembly line`, desc:'Продукция выпускается стандартным способом', descEn:'Output ships via a standard process'},
      t2:{name:'Модернизация линии', nameEn:'Line upgrade', desc:`Новое оборудование поднимает объёмы выпуска «${name}»`, descEn:`New equipment raises ${nameEn}'s output volumes`},
      t3_risky:{name:'Ускорение конвейера в ущерб контролю качества', nameEn:'Speeding up the line at the expense of QA', desc:'Выпуск растёт резко — но со временем растёт число бракованной продукции', descEn:'Output spikes fast — but defect rates creep up over time'},
      t3_safe:{name:'Поэтапная модернизация с контролем качества', nameEn:'A phased upgrade with QA intact', desc:'Медленнее, зато без роста брака', descEn:'Slower, but no rise in defects'},
      t4:{name:`«${name}» мирового уровня`, nameEn:`World-class ${nameEn}`, desc:'Линия работает на уровне лучших заводов отрасли', descEn:'The line runs on par with the best plants in the industry'} },
    traffic: { icon:'🧾', name:'Заказчики', nameEn:'Buyers',
      t1:{name:'Первые оптовые заказы', nameEn:'First wholesale orders', desc:`Продукцию «${name}» начинают закупать локальные ритейлеры`, descEn:`Local retailers start ordering ${nameEn}'s output`},
      t2:{name:'Расширение сети сбыта', nameEn:'Expanding the distribution network', desc:'Появляются новые постоянные заказчики', descEn:'New recurring buyers come on board'},
      t3_risky:{name:'Демпинг ради новых контрактов', nameEn:'Dumping prices for new contracts', desc:'Заказы резко растут — но маржа проседает из-за низких цен', descEn:'Orders spike — but margins suffer from low prices'},
      t3_safe:{name:'Долгосрочные контракты по справедливой цене', nameEn:'Long-term contracts at fair prices', desc:'Рост медленнее, зато отношения с заказчиками стабильные', descEn:'Growth is slower, but buyer relationships stay stable'},
      t4:{name:`«${name}» — надёжный поставщик для крупных сетей`, nameEn:`${nameEn}, a trusted supplier to major chains`, desc:'Крупные заказчики выбирают именно этот завод', descEn:'Major buyers choose this plant by name'} },
    infra: { icon:'⚙️', name:'Оборудование цеха', nameEn:'Shop-floor equipment',
      t1:{name:'Плановое обслуживание оборудования', nameEn:'Scheduled equipment maintenance', desc:'Станки обслуживаются по базовому графику', descEn:'Machines get serviced on a basic schedule'},
      t2:{name:'Автоматизация части процессов', nameEn:'Partial process automation', desc:'Часть операций выполняется без ручного труда', descEn:'Some operations run without manual labor'},
      t3_risky:{name:'Экономия на обслуживании станков', nameEn:'Cutting back on machine maintenance', desc:'Расходы ниже сейчас — но растёт риск серьёзных поломок', descEn:'Costs drop now — but the risk of major breakdowns grows'},
      t3_safe:{name:'Полное соблюдение регламента обслуживания', nameEn:'Full maintenance compliance', desc:'Дороже, зато оборудование служит дольше', descEn:'Costlier, but equipment lasts longer'},
      t4:{name:`«${name}» без единого простоя`, nameEn:`${nameEn} with zero downtime`, desc:'Линия работает на полную мощность стабильно', descEn:'The line runs at full capacity reliably'} },
    marketing: { icon:'📣', name:'Продвижение продукции', nameEn:'Product promotion',
      t1:{name:'Участие в отраслевых выставках', nameEn:'Industry trade shows', desc:`Продукцию «${name}» начинают замечать закупщики`, descEn:`Buyers start noticing ${nameEn}'s output`},
      t2:{name:'B2B-каталог и прайс-листы', nameEn:'A B2B catalog and price lists', desc:'Заказчикам проще находить и заказывать продукцию', descEn:'Buyers can find and order more easily'},
      t3_risky:{name:'Агрессивная реклама с завышенными обещаниями', nameEn:'Aggressive ads with overstated claims', desc:'Заказов резко больше — но заказчики разочаровываются, столкнувшись с реальностью', descEn:"Orders spike — but buyers get disappointed when reality doesn't match"},
      t3_safe:{name:'Честные демонстрации возможностей завода', nameEn:'Honest demos of plant capabilities', desc:'Рост медленнее, зато ожидания заказчиков совпадают с реальностью', descEn:'Growth is slower, but buyer expectations match reality'},
      t4:{name:`«${name}» с репутацией надёжного поставщика`, nameEn:`${nameEn} known for reliability`, desc:'О заводе знают и рекомендуют в отрасли', descEn:'The plant is known and recommended across the industry'} },
    security: { icon:'🦺', name:'Контроль качества и безопасность', nameEn:'QA & safety',
      t1:{name:'Базовый контроль качества', nameEn:'Basic quality control', desc:'Продукция проверяется по минимальным стандартам', descEn:'Output gets checked against minimum standards'},
      t2:{name:'Регулярные проверки на всех этапах', nameEn:'Regular checks at every stage', desc:'Брак выявляется раньше, до отгрузки заказчику', descEn:'Defects get caught earlier, before shipping to buyers'},
      t3_risky:{name:'Упрощённый контроль ради скорости отгрузки', nameEn:'Simplified QA for faster shipping', desc:'Отгрузка быстрее — но со временем растёт число рекламаций', descEn:'Shipping speeds up — but complaints creep up over time'},
      t3_safe:{name:'Строгий контроль качества на каждом этапе', nameEn:'Strict QA at every stage', desc:'Медленнее, зато без рекламаций', descEn:'Slower, but no complaints'},
      t4:{name:`«${name}» с репутацией безупречного качества`, nameEn:`${nameEn} known for flawless quality`, desc:'Заказчики доверяют продукции без лишних проверок', descEn:'Buyers trust the output without extra checks'} },
  };
}
function industryHeavyTreeFlavor(name, nameEn){
  return {
    design: { icon:'🏭', name:`Инженерные проекты: ${name}`, nameEn:`${nameEn}: engineering projects`,
      t1:{name:`Базовые проектные решения «${name}»`, nameEn:`${nameEn}'s basic engineering solutions`, desc:'Проекты реализуются стандартными методами', descEn:'Projects get built using standard methods'},
      t2:{name:'Современные инженерные решения', nameEn:'Modern engineering solutions', desc:'Новые технологии поднимают качество и скорость сборки', descEn:'New technology raises build quality and speed'},
      t3_risky:{name:'Ускоренная сборка в обход части этапов проверки', nameEn:'A rushed build skipping some review stages', desc:'Проекты сдаются быстрее — но растёт риск серьёзных дефектов', descEn:'Projects ship faster — but the risk of serious defects grows'},
      t3_safe:{name:'Полный цикл инженерных проверок', nameEn:'A full engineering review cycle', desc:'Медленнее, зато без дефектов на выходе', descEn:'Slower, but no defects at the end'},
      t4:{name:`«${name}» — инженерия мирового уровня`, nameEn:`${nameEn}, world-class engineering`, desc:'Проекты по качеству на уровне лучших верфей и заводов', descEn:'Projects match the quality of the best yards and plants worldwide'} },
    traffic: { icon:'🧾', name:'Заказчики проектов', nameEn:'Project clients',
      t1:{name:'Первые крупные заказы', nameEn:'First major orders', desc:`О «${name}» узнают первые крупные заказчики`, descEn:`The first big buyers learn about ${nameEn}`},
      t2:{name:'Портфолио завершённых проектов', nameEn:'A portfolio of completed projects', desc:'Успешные кейсы привлекают новых заказчиков', descEn:'Successful case studies attract new buyers'},
      t3_risky:{name:'Одновременный набор слишком многих контрактов', nameEn:'Taking on too many contracts at once', desc:'Портфель заказов резко растёт — но выполнить все в срок становится сложно', descEn:'The order book spikes — but meeting every deadline gets hard'},
      t3_safe:{name:'Взвешенный набор заказов по мощностям', nameEn:'Measured order intake within capacity', desc:'Рост скромнее, зато все проекты сдаются вовремя', descEn:'Growth is modest, but every project ships on time'},
      t4:{name:`«${name}» — первый выбор для мегапроектов`, nameEn:`${nameEn}, the go-to plant for megaprojects`, desc:'Крупнейшие заказчики обращаются в первую очередь сюда', descEn:'The biggest clients come here first'} },
    infra: { icon:'⚙️', name:'Производственные мощности', nameEn:'Production capacity',
      t1:{name:'Базовые производственные мощности', nameEn:'Basic production capacity', desc:`«${name}» справляется с текущим портфелем заказов`, descEn:`${nameEn} handles the current order book`},
      t2:{name:'Расширение производственных мощностей', nameEn:'Expanding production capacity', desc:'Завод может брать больше крупных заказов одновременно', descEn:'The plant can take on more large orders at once'},
      t3_risky:{name:'Экономия на резервных мощностях', nameEn:'Cutting back on capacity reserves', desc:'Расходы ниже сейчас — но при перегрузке начинаются срывы сроков', descEn:'Costs drop now — but deadlines start slipping under heavy load'},
      t3_safe:{name:'Резерв мощностей на случай перегрузки', nameEn:'Capacity reserves for overload', desc:'Дороже, зато сроки не срываются даже при полной загрузке', descEn:'Costlier, but deadlines hold even at full load'},
      t4:{name:`«${name}» без единого срыва сроков`, nameEn:`${nameEn} with zero missed deadlines`, desc:'Завод сдаёт даже мегапроекты точно в срок', descEn:'The plant delivers even megaprojects exactly on time'} },
    marketing: { icon:'📣', name:'Репутация подрядчика', nameEn:'Contractor reputation',
      t1:{name:'Первые публикации о заводе', nameEn:'First press coverage', desc:`О «${name}» узнают через отраслевые СМИ`, descEn:`${nameEn} gets noticed through industry media`},
      t2:{name:'Участие в тендерах на мегапроекты', nameEn:'Bidding on megaproject tenders', desc:'Завод регулярно попадает в шорт-листы крупных заказчиков', descEn:'The plant regularly makes the shortlist for major buyers'},
      t3_risky:{name:'Громкие заявления о сроках без запаса', nameEn:'Bold deadline claims with no buffer', desc:'Заводу чаще достаются контракты — но срывы сроков позже бьют по репутации', descEn:"The plant wins more contracts — but slipped deadlines later hurt its name"},
      t3_safe:{name:'Реалистичные сроки и честные заявки', nameEn:'Realistic timelines and honest bids', desc:'Контрактов меньше, зато репутация надёжного подрядчика растёт', descEn:'Fewer contracts, but a reputation for reliability builds steadily'},
      t4:{name:`«${name}» — подрядчик, которому доверяют мегапроекты`, nameEn:`${nameEn}, the contractor trusted with megaprojects`, desc:'Заказчики выбирают завод, не рассматривая альтернатив', descEn:'Buyers pick the plant without even considering alternatives'} },
    security: { icon:'🦺', name:'Промышленная безопасность', nameEn:'Industrial safety',
      t1:{name:'Базовые нормы безопасности', nameEn:'Baseline safety rules', desc:'Соблюдается минимально необходимый регламент', descEn:'The bare minimum safety regulations are followed'},
      t2:{name:'Регулярные проверки безопасности', nameEn:'Regular safety inspections', desc:'Риски выявляются и устраняются заранее', descEn:'Risks get spotted and fixed ahead of time'},
      t3_risky:{name:'Ускорение сборки в обход части процедур безопасности', nameEn:'Speeding up assembly by skipping safety procedures', desc:'Темп выше — но растёт риск серьёзных аварий на площадке', descEn:'Pace increases — but the risk of serious on-site accidents grows'},
      t3_safe:{name:'Строгое соблюдение всех процедур безопасности', nameEn:'Strict adherence to every safety procedure', desc:'Медленнее, зато без происшествий', descEn:'Slower, but no incidents'},
      t4:{name:`«${name}» с нулевым травматизмом`, nameEn:`${nameEn}, a zero-incident plant`, desc:'Безопасность площадки — образец для отрасли', descEn:"The site's safety record is an industry benchmark"} },
  };
}
// Применяем шаблоны выше к каждому конкретному бизнесу games/crypto/industry —
// без этого цикла пришлось бы вручную вписывать 38 одинаковых по структуре
// объектов; так каждый получает TYPE_SPEC_FLAVOR[id] со своим именем внутри.
(function buildIndividualGroupFlavors(){
  GAME_TYPES.forEach(t=>{ TYPE_SPEC_FLAVOR[t.id] = gamesTreeFlavor(t.name, t.nameEn); });
  CRYPTO_TYPES.forEach(t=>{ TYPE_SPEC_FLAVOR[t.id] = cryptoTreeFlavor(t.name, t.nameEn); });
  const INDUSTRY_SUB_FN = {
    energy: industryEnergyTreeFlavor, mining: industryMiningTreeFlavor,
    manufacturing: industryManufacturingTreeFlavor, heavy: industryHeavyTreeFlavor,
  };
  INDUSTRY_TYPES.forEach(t=>{
    const fn = INDUSTRY_SUB_FN[t.sub];
    if(fn) TYPE_SPEC_FLAVOR[t.id] = fn(t.name, t.nameEn);
  });
})();
function specTypeFlavor(type){
  if(!type) return null;
  return TYPE_SPEC_FLAVOR[type.tierId] || TYPE_SPEC_FLAVOR[type.id] || TYPE_SPEC_FLAVOR_GROUP[specFlavorGroup(type)] || null;
}
function specCatDisplay(cat, type){
  const fl = specTypeFlavor(type);
  const ov = fl && fl[cat];
  return { icon: (ov && ov.icon) || TRACK_META[cat].icon, name: ov ? L(ov,'name') : L(TRACK_META[cat],'name') };
}
function specNodeDisplay(node, type){
  const fl = specTypeFlavor(type);
  const catFl = fl && fl[node.category];
  const tierKey = node.id.slice(node.category.length+1); // "<cat>_t1" -> "t1", "<cat>_t3_risky" -> "t3_risky"
  const ov = catFl && catFl[tierKey];
  return {
    icon: (catFl && catFl.icon) || node.icon,
    name: ov ? L(ov,'name') : L(node,'name'),
    desc: ov ? L(ov,'desc') : L(node,'desc'),
  };
}
function specNodeOwned(site, id){ return !!(site.specNodes && site.specNodes.includes(id)); }
// "requires" is an OR-list: node unlocks once the player owns ANY one of
// the listed prereqs (this is how tier 4 accepts either tier-3 fork).
function specNodeUnlocked(site, node){
  if(!node.requires || !node.requires.length) return true;
  return node.requires.some(r=>specNodeOwned(site, r));
}
function specNodeAvailable(site, node){
  if(specNodeOwned(site, node.id)) return false;
  if(!specNodeUnlocked(site, node)) return false;
  if(node.group && site.specLockedGroups && site.specLockedGroups[node.group] && site.specLockedGroups[node.group]!==node.id) return false; // other fork already taken
  return true;
}
// Passive point income: scales with headcount and their level (mirrors the
// staffStatBonus curve elsewhere), completely independent of cash.
const SPEC_POINTS_PER_SEC_PER_LEVEL1_EMPLOYEE = 0.08;
function specPointsPerSec(site){
  if(!site.employees) return 0;
  ensureStaffLevels(site);
  let sum = 0;
  for(let i=0;i<site.employees;i++) sum += empLevelMeta(site.staffLevels[i]||1).statMult;
  return sum * SPEC_POINTS_PER_SEC_PER_LEVEL1_EMPLOYEE;
}
// Node bonuses now materialize as real track levels (applied in buySpecNode
// below), which already flow through trackIncomeMultiplier() — so this only
// carries the *penalty* side of risky forks: a product of every already-
// landed penalty. Pending (not-yet-landed) risky penalties do NOT apply
// yet — that's the whole point of the "strong plus now, consequence later"
// mechanic.
function specTreeIncomeMult(site){
  if(!site.specAppliedPenalties || !site.specAppliedPenalties.length) return 1;
  let mult = 1;
  site.specAppliedPenalties.forEach(p=>{ mult *= (1-p.penalty); });
  return mult;
}
function buySpecNode(idx, nodeId){
  const site = state.sites[idx];
  const node = specTreeNode(nodeId);
  if(!site || !node) return;
  if(!specNodeAvailable(site, node)){ toast(tr('Недоступно','Not available')); playSound('error'); return; }
  if((site.specPoints||0) < node.cost){ toast(tr('Не хватает очков специализации','Not enough specialization points')); playSound('error'); return; }
  site.specPoints -= node.cost;
  site.specNodes.push(node.id);
  if(node.group) site.specLockedGroups[node.group] = node.id;
  const cap = trackMaxLevel(site);
  const before = site.tracks[node.category]||1;
  const after = Math.min(cap, before + node.levels);
  site.tracks[node.category] = after;
  maybeAnnounceTrackSynergy(site);
  if(node.risky){
    site.specPendingPenalties.push({nodeId:node.id, applyAt:Date.now()+node.delayMs, penalty:node.penalty});
    toast(`⚠️ ${tr('Рискованное решение принято — последствия придут позже','Risky call made — consequences will land later')}`);
  } else {
    toast(`🌳 ${tr('Улучшение куплено','Upgrade purchased')}: ${L(node,'name')} (+${node.levels} ${tr('ур.','lvl')})`);
  }
  log(`🌳 ${esc(site.name)}: ${tr('прокачка специализации','specialization upgrade')} — ${L(node,'name')} (${TRACK_META[node.category].icon} +${node.levels})`);
  playSound('buy'); vibrateFeedback(10);
  afterTrackLevelChange(idx, site, node.category, before, after);
  save(); renderAll();
  refreshSpecTreeModal();
}
// Repeatable post-capstone purchase: keeps a category climbing past its
// fixed 4 nodes whenever prestige/renovation pushes the cap higher.
function buySpecRepeat(idx, cat){
  const site = state.sites[idx];
  if(!site || !specTreeRepeatUnlocked(site, cat)) return;
  const cap = trackMaxLevel(site);
  if((site.tracks[cat]||1) >= cap){ toast(tr('Уже на потолке для этого сайта','Already at this site\'s cap')); playSound('error'); return; }
  const cost = specTreeRepeatCost(site, cat);
  if((site.specPoints||0) < cost){ toast(tr('Не хватает очков специализации','Not enough specialization points')); playSound('error'); return; }
  site.specPoints -= cost;
  if(!site.specExtra) site.specExtra = {};
  site.specExtra[cat] = (site.specExtra[cat]||0) + 1;
  const before = site.tracks[cat]||1;
  const after = Math.min(cap, before + SPEC_TREE_REPEAT_LEVELS);
  site.tracks[cat] = after;
  maybeAnnounceTrackSynergy(site);
  toast(`🌳 ${TRACK_META[cat].icon} +${SPEC_TREE_REPEAT_LEVELS} ${tr('ур.','lvl')}`);
  log(`🌳 ${esc(site.name)}: ${tr('дополнительная прокачка','extra upgrade')} — ${TRACK_META[cat].icon} → ур. ${site.tracks[cat]}`);
  playSound('buy'); vibrateFeedback(10);
  afterTrackLevelChange(idx, site, cat, before, after);
  save(); renderAll();
  refreshSpecTreeModal();
}
// Called once per tick for every site: accrues points, and matures any
// pending risky-node penalties whose delay has elapsed.
function tickSpecTree(site){
  site.specPoints = (site.specPoints||0) + specPointsPerSec(site);
  if(site.specPendingPenalties && site.specPendingPenalties.length){
    const now = Date.now();
    const due = site.specPendingPenalties.filter(p=>now>=p.applyAt);
    if(due.length){
      site.specPendingPenalties = site.specPendingPenalties.filter(p=>now<p.applyAt);
      due.forEach(p=>{
        site.specAppliedPenalties.push({nodeId:p.nodeId, penalty:p.penalty});
        const n = specTreeNode(p.nodeId);
        toast(`💥 ${tr('Последствия решения','The decision catches up')}: «${esc(site.name)}» ${n?'— '+L(n,'name'):''} (−${Math.round(p.penalty*100)}% ${tr('доход','income')})`);
        log(`💥 ${esc(site.name)}: ${tr('последствия рискованной ставки','risky-bet consequences')} — ${n?L(n,'name'):p.nodeId} (−${Math.round(p.penalty*100)}%)`);
      });
    }
  }
}
/* ---------- TECH-TREE VISUAL (Точка 10) ----------
   Node-graph rendering of the specialization tree: tier columns left→right,
   one horizontal branch per track category, with a visual fork/merge
   diamond at tier 3 (own glass-panel style — colored glow nodes + SVG
   connector lines — not a literal copy of any reference screenshot, just
   the same "boxes joined by lines across tiers" shape). Clicking a node
   selects it; the detail/buy panel below the canvas shows the full
   description and purchase button, since the boxes themselves stay small. */
const TT_NODE_W=76, TT_NODE_H=60, TT_COL_GAP=44, TT_ROW_H=74, TT_CAT_GAP=16, TT_PAD=24;
function ttColX(c){ return TT_PAD + c*(TT_NODE_W+TT_COL_GAP) + TT_NODE_W/2; }
function ttCatTop(ci){ return TT_PAD + ci*(2*TT_ROW_H+TT_CAT_GAP); }
function ttMidY(ci){ return ttCatTop(ci) + TT_ROW_H; }
function ttTopY(ci){ return ttCatTop(ci) + TT_ROW_H/2; }
function ttBotY(ci){ return ttCatTop(ci) + TT_ROW_H*1.5; }
function specTreeSelectedNode(idx){
  const site = state.sites[idx];
  const cur = specTreeSelected[idx];
  if(cur) return cur;
  // default to the first available (or first) node of the priority category
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const prio = priorityTrackId(type);
  const firstAvail = SPEC_TREE_NODES.find(n=>n.category===prio && specNodeAvailable(site,n));
  return (firstAvail || SPEC_TREE_NODES.find(n=>n.category===prio) || SPEC_TREE_NODES[0]).id;
}
function selectSpecNode(idx, nodeId){
  specTreeSelected[idx] = nodeId;
  refreshSpecTreeModal();
}
function ttNodeStatus(site, node){
  const owned = specNodeOwned(site, node.id);
  const lockedOut = node.group && site.specLockedGroups[node.group] && site.specLockedGroups[node.group]!==node.id;
  const available = specNodeAvailable(site, node);
  const pending = (site.specPendingPenalties||[]).find(p=>p.nodeId===node.id);
  const applied = (site.specAppliedPenalties||[]).find(p=>p.nodeId===node.id);
  return {owned, lockedOut, available, pending, applied};
}
function ttNodeBoxHtml(idx, site, node, x, y, selectedId){
  const st = ttNodeStatus(site, node);
  const meta = TRACK_META[node.category];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const disp = specNodeDisplay(node, type);
  let cls = 'tt-node';
  if(st.owned) cls += ' tt-owned';
  else if(st.lockedOut) cls += ' tt-locked-out';
  else if(st.available) cls += ' tt-available';
  else cls += ' tt-locked';
  if(node.risky) cls += ' tt-risky';
  if(node.id===selectedId) cls += ' tt-selected';
  let badge = '';
  if(st.pending) badge = '⏳';
  else if(st.applied) badge = '💥';
  else if(st.owned) badge = '✓';
  else if(st.lockedOut) badge = '🔒';
  return `<div class="${cls}" style="left:${x}px;top:${y}px;--cat-color:${meta.color};" onclick="selectSpecNode(${idx},'${node.id}')" title="${esc(disp.name)}">
    <div class="tt-icon">${disp.icon}</div>
    ${badge?`<div class="tt-badge">${badge}</div>`:''}
  </div>`;
}
function ttRepeatBoxHtml(idx, site, cat, x, y, selectedId){
  const unlocked = specTreeRepeatUnlocked(site, cat);
  const cap = trackMaxLevel(site);
  const atCap = (site.tracks[cat]||1) >= cap;
  const meta = TRACK_META[cat];
  const id = `${cat}__repeat`;
  let cls = 'tt-node tt-repeat';
  if(!unlocked) cls += ' tt-locked';
  else if(atCap) cls += ' tt-owned';
  else cls += ' tt-available';
  if(id===selectedId) cls += ' tt-selected';
  return `<div class="${cls}" style="left:${x}px;top:${y}px;--cat-color:${meta.color};" onclick="selectSpecNode(${idx},'${id}')">
    <div class="tt-icon">♾️</div>
    ${atCap?'<div class="tt-badge">🔝</div>':''}
  </div>`;
}
function buildSpecTreeCanvasHtml(idx, site, selectedId){
  const totalW = ttColX(4) + TT_NODE_W/2 + TT_PAD;
  const totalH = ttCatTop(TRACK_ORDER.length-1) + 2*TT_ROW_H + TT_PAD - TT_CAT_GAP;
  const edges = [];
  TRACK_ORDER.forEach(cat=>{
    edges.push([`${cat}_t1`, `${cat}_t2`]);
    edges.push([`${cat}_t2`, `${cat}_t3_risky`]);
    edges.push([`${cat}_t2`, `${cat}_t3_safe`]);
    edges.push([`${cat}_t3_risky`, `${cat}_t4`]);
    edges.push([`${cat}_t3_safe`, `${cat}_t4`]);
    edges.push([`${cat}_t4`, `${cat}__repeat`]);
  });
  const posOf = {};
  TRACK_ORDER.forEach((cat,ci)=>{
    posOf[`${cat}_t1`] = [ttColX(0), ttMidY(ci)];
    posOf[`${cat}_t2`] = [ttColX(1), ttMidY(ci)];
    posOf[`${cat}_t3_risky`] = [ttColX(2), ttTopY(ci)];
    posOf[`${cat}_t3_safe`] = [ttColX(2), ttBotY(ci)];
    posOf[`${cat}_t4`] = [ttColX(3), ttMidY(ci)];
    posOf[`${cat}__repeat`] = [ttColX(4), ttMidY(ci)];
  });
  const lines = edges.map(([a,b])=>{
    const [x1,y1] = posOf[a], [x2,y2] = posOf[b];
    const cat = a.split('_')[0];
    const meta = TRACK_META[cat];
    const bIsRepeat = b.endsWith('__repeat');
    const aOwned = specNodeOwned(site, a);
    const bOwned = bIsRepeat ? aOwned : specNodeOwned(site, b);
    const bNode = bIsRepeat ? null : specTreeNode(b);
    const bLockedOut = bNode && bNode.group && site.specLockedGroups[bNode.group] && site.specLockedGroups[bNode.group]!==bNode.id;
    let stroke = 'rgba(255,255,255,.12)', width = 2, dash = '5,5', opacity = 1;
    if(bOwned){ stroke = meta.color; width = 3; dash = 'none'; }
    else if(aOwned && !bLockedOut){ stroke = meta.color; width = 2; dash = 'none'; opacity = 0.45; }
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-dasharray="${dash}" opacity="${opacity}" stroke-linecap="round"/>`;
  }).join('');
  const treeType = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const nodes = TRACK_ORDER.map((cat,ci)=>{
    const [x1,] = [ttColX(0)-TT_NODE_W/2-14, ttMidY(ci)];
    const label = `<div class="tt-row-label" style="top:${ttMidY(ci)}px;" title="${esc(specCatDisplay(cat,treeType).name)}">${specCatDisplay(cat,treeType).icon}</div>`;
    const catNodes = SPEC_TREE_NODES.filter(n=>n.category===cat).map(n=>{
      const [x,y] = posOf[n.id];
      return ttNodeBoxHtml(idx, site, n, x, y, selectedId);
    }).join('');
    const [rx,ry] = posOf[`${cat}__repeat`];
    return label + catNodes + ttRepeatBoxHtml(idx, site, cat, rx, ry, selectedId);
  }).join('');
  return `<div class="tt-wrap"><div class="tt-canvas" style="width:${totalW}px;height:${totalH}px;">
    <svg class="tt-svg" width="${totalW}" height="${totalH}">${lines}</svg>
    ${nodes}
  </div></div>`;
}
function buildSpecTreeDetailHtml(idx, site, selectedId){
  const pts = Math.floor(site.specPoints||0);
  if(selectedId && selectedId.endsWith('__repeat')){
    const cat = selectedId.split('__')[0];
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    const catDisp = specCatDisplay(cat, type);
    const unlocked = specTreeRepeatUnlocked(site, cat);
    const cap = trackMaxLevel(site);
    const atCap = (site.tracks[cat]||1) >= cap;
    const cost = specTreeRepeatCost(site, cat);
    return `<div class="card glass tt-detail">
      <div class="card-row"><div class="card-icon">♾️</div><div style="flex:1">
        <div class="card-title">${catDisp.icon} ${catDisp.name}: ${tr('дальнейший рост','further growth')}</div>
        <div class="card-sub">${tr('Повторяемое улучшение — доступно после вершины мастерства этой категории, поднимает потолок трека вместе с престижем/обновлениями сайта','Repeatable upgrade — unlocked once you own that category\'s mastery node, keeps pace with the level cap as prestige/renovations raise it')}</div>
      </div></div>
      ${!unlocked
        ? `<div class="tt-hint">🔒 ${tr('Сначала пройдите вершину мастерства этой категории','Reach that category\'s mastery node first')}</div>`
        : atCap
          ? `<div class="tt-hint">🔝 ${tr('Уже на текущем потолке уровня — растёт дальше через престиж/обновление сайта','Already at the current level cap — raise it further via prestige/site renovation')}</div>`
          : `<div class="btn-row"><button class="btn btn-cyan btn-block" ${pts<cost?'disabled':''} onclick="buySpecRepeat(${idx},'${cat}')">${tr('Купить за','Buy for')} ${cost} 🔷 (+${SPEC_TREE_REPEAT_LEVELS} ${tr('ур.','lvl')})</button></div>`}
    </div>`;
  }
  const node = specTreeNode(selectedId);
  if(!node) return '';
  const nodeType = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const disp = specNodeDisplay(node, nodeType);
  const st = ttNodeStatus(site, node);
  let statusTag = '';
  if(st.pending) statusTag = `<span class="pill" style="background:rgba(255,159,10,.18);color:#ff9f0a;">⏳ ${tr('ждём последствий','consequence pending')}</span>`;
  else if(st.applied) statusTag = `<span class="pill" style="background:rgba(255,69,58,.18);color:#ff453a;">💥 −${Math.round(st.applied.penalty*100)}%</span>`;
  else if(st.owned) statusTag = `<span class="pill pill-owned">✓ ${tr('куплено','owned')}</span>`;
  else if(st.lockedOut) statusTag = `<span class="pill" style="background:rgba(255,255,255,.08);color:var(--dim);">🔒 ${tr('другой путь выбран','other fork taken')}</span>`;
  return `<div class="card glass tt-detail" style="${node.risky?'border-color:rgba(255,159,10,.35);':''}">
    <div class="card-row"><div class="card-icon">${disp.icon}</div><div style="flex:1">
      <div class="card-title">${disp.name} ${statusTag}</div>
      <div class="card-sub">${disp.desc} · +${node.levels} ${tr('ур.','lvl')} ${specCatDisplay(node.category,nodeType).icon}${node.risky?' · ⚠️ '+tr('через 90с −'+Math.round(node.penalty*100)+'% дохода навсегда','after 90s −'+Math.round(node.penalty*100)+'% income forever'):''}</div>
    </div></div>
    ${(!st.owned && !st.lockedOut) ? `<div class="btn-row"><button class="btn ${node.risky?'btn-amber':'btn-cyan'} btn-block" ${(!st.available||pts<node.cost)?'disabled':''} onclick="buySpecNode(${idx},'${node.id}')">${tr('Купить за','Buy for')} ${node.cost} 🔷</button></div>` : ''}
  </div>`;
}
function buildSpecTreeHtml(idx){
  const site = state.sites[idx];
  if(!site) return '';
  const pts = Math.floor(site.specPoints||0);
  const selectedId = specTreeSelectedNode(idx);
  return `
    <div class="stat-strip" style="grid-template-columns:1fr 1fr;margin-bottom:10px;">
      <div class="stat-box glass"><div class="lbl">${tr('Очки специализации','Specialization points')}</div><div class="val num c-blue">🔷 <span id="tt-pts">${pts}</span></div></div>
      <div class="stat-box glass"><div class="lbl">${tr('Прирост','Rate')}</div><div class="val num c-cyan">+<span id="tt-rate">${specPointsPerSec(site).toFixed(2)}</span>/${tr('с','s')}</div></div>
    </div>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:10px;">${tr('Сотрудники сами зарабатывают очки — тратьте их на узлы ниже. Каждый узел поднимает уровень своей ветки; на развилках можно выбрать только один путь навсегда.','Your staff earn these points on their own — spend them on the nodes below. Every node raises that branch\'s level; forks let you pick only one path, forever.')}</p>
    ${buildSpecTreeCanvasHtml(idx, site, selectedId)}
    ${buildSpecTreeDetailHtml(idx, site, selectedId)}`;
}
function openSpecTreeModal(idx){
  openModal(`<h3>🌳 ${tr('Ветка прокачки','Upgrade tree')}</h3><div id="spec-tree-body">${buildSpecTreeHtml(idx)}</div>`);
}
function refreshSpecTreeModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('spec-tree-body');
  if(bg && bg.classList.contains('show') && body && openSiteIdx!==null) body.innerHTML = buildSpecTreeHtml(openSiteIdx);
}


/* ---------- SITE SLOTS: ADS + PRODUCTS ---------- monetization is no
   longer a passive track — instead you actively decide what to put in each
   of the site's content slots (more slots unlock as you renovate):
     · an AD  — instant lump-sum cash payout, but depresses that site's
       income for a while as it runs
     · a PRODUCT — you pay upfront to stock it, and it adds an ongoing
       passive income bonus for as long as it's on the shelf (then needs
       restocking) — no income penalty, but real cash up front
   Both scale off the site's income *right now*, so a more developed site
   makes ads/products correspondingly pricier and more lucrative. */
const AD_TYPES = [
  {id:'banner', category:'ad', icon:'🖼️', name:'Баннер',           nameEn:'Banner',        payoutSeconds:60,  penalty:0.04, durationMs:180000, minTraffic:1},
  {id:'popup',  category:'ad', icon:'🔔', name:'Попап',             nameEn:'Popup',         payoutSeconds:150, penalty:0.09, durationMs:180000, minTraffic:1},
  {id:'video',  category:'ad', icon:'🎬', name:'Видеореклама',      nameEn:'Video ad',      payoutSeconds:300, penalty:0.16, durationMs:240000, minTraffic:1},
  {id:'native', category:'ad', icon:'🤝', name:'Нативная реклама',  nameEn:'Native ad',     payoutSeconds:210, penalty:0.06, durationMs:300000, minTraffic:5},
];
const PRODUCT_TYPES = [
  {id:'prod_basic',     category:'product', icon:'📦', name:'Дешёвые товары',      nameEn:'Cheap goods',      costSeconds:25,  incomeBonus:0.05, durationMs:240000, minTraffic:1},
  {id:'prod_standard',  category:'product', icon:'🎁', name:'Стандартные товары',  nameEn:'Standard goods',   costSeconds:80,  incomeBonus:0.13, durationMs:300000, minTraffic:1},
  {id:'prod_premium',   category:'product', icon:'💎', name:'Премиальные товары',  nameEn:'Premium goods',    costSeconds:220, incomeBonus:0.28, durationMs:360000, minTraffic:4},
  {id:'prod_exclusive', category:'product', icon:'👑', name:'Эксклюзивные товары', nameEn:'Exclusive goods',  costSeconds:600, incomeBonus:0.55, durationMs:420000, minTraffic:7},
];
const SLOT_TYPES = [...AD_TYPES, ...PRODUCT_TYPES];
function findSlotType(id){ return SLOT_TYPES.find(x=>x.id===id); }
function adSlotsForSite(site){ return Math.min(4, 1 + (site.renovationStage||0)); }
function cleanupSiteAds(site){
  if(!Array.isArray(site.ads)) site.ads = [];
  const now = Date.now();
  site.ads = site.ads.filter(a=>a.expiresAt>now);
}
// Multiplicative income hit from every ad currently live on the site.
function adPenaltyMultiplier(site){
  if(!Array.isArray(site.ads) || !site.ads.length) return 1;
  const now = Date.now();
  return site.ads.reduce((m,a)=>{
    if(a.expiresAt<=now) return m;
    const meta = findSlotType(a.typeId);
    if(!meta || meta.category!=='ad') return m;
    return m * (1-meta.penalty);
  }, 1);
}
// Additive passive-income bonus from every product currently stocked.
function productBonusMultiplier(site){
  if(!Array.isArray(site.ads) || !site.ads.length) return 1;
  const now = Date.now();
  let bonus = 0;
  site.ads.forEach(a=>{
    if(a.expiresAt<=now) return;
    const meta = findSlotType(a.typeId);
    if(!meta || meta.category!=='product') return;
    bonus += meta.incomeBonus;
  });
  return 1+bonus;
}
function placeSlotItem(idx, typeId){
  const site = state.sites[idx];
  if(!site) return;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const slotType = findSlotType(typeId);
  if(!slotType) return;
  cleanupSiteAds(site);
  const slots = adSlotsForSite(site);
  if(site.ads.length >= slots){ toast(tr('Нет свободных слотов','No free slots')); playSound('error'); return; }
  if(site.tracks.traffic < slotType.minTraffic){ toast(tr('Нужен более высокий уровень трафика','Needs a higher traffic level')); playSound('error'); return; }
  const income = siteIncome(type, site, {stableOnly:true});
  if(slotType.category==='ad'){
    const payout = Math.round(Math.max(20, income * slotType.payoutSeconds));
    state.cash += payout;
    log(`${slotType.icon} ${esc(site.name)}: ${tr('размещена реклама','ad placed')} «${L(slotType,'name')}» (+${fmt(payout)}, ${tr('доход','income')} −${Math.round(slotType.penalty*100)}% ${tr('на','for')} ${Math.round(slotType.durationMs/60000)} ${tr('мин','min')})`);
    toast(`${slotType.icon} +${fmt(payout)}`);
    playSound('buy');
  } else {
    const cost = Math.round(Math.max(20, income * slotType.costSeconds));
    if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
    state.cash -= cost;
    log(`${slotType.icon} ${esc(site.name)}: ${tr('закуплены и выставлены','stocked')} «${L(slotType,'name')}» (−${fmt(cost)}, ${tr('доход','income')} +${Math.round(slotType.incomeBonus*100)}% ${tr('на','for')} ${Math.round(slotType.durationMs/60000)} ${tr('мин','min')})`);
    toast(`${slotType.icon} −${fmt(cost)}, +${Math.round(slotType.incomeBonus*100)}% ${tr('к доходу','to income')}`);
    playSound('upgrade');
  }
  site.ads.push({id:genUid(), typeId:slotType.id, placedAt:Date.now(), expiresAt:Date.now()+slotType.durationMs});
  vibrateFeedback(10);
  closeModal();
  refreshSiteViewSections(idx, ['ads','page']);
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function openAdPickerModal(idx){
  const site = state.sites[idx];
  if(!site) return;
  cleanupSiteAds(site);
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const income = siteIncome(type, site, {stableOnly:true});
  const rowFor = (a)=>{
    const locked = site.tracks.traffic < a.minTraffic;
    const isAd = a.category==='ad';
    const amount = isAd ? Math.round(Math.max(20, income*a.payoutSeconds)) : Math.round(Math.max(20, income*a.costSeconds));
    const effectTxt = isAd
      ? `+${fmt(amount)} ${tr('сразу','instantly')} · ${tr('доход','income')} −${Math.round(a.penalty*100)}% ${tr('на','for')} ${Math.round(a.durationMs/60000)} ${tr('мин','min')}`
      : `−${fmt(amount)} ${tr('сейчас','upfront')} · ${tr('доход','income')} +${Math.round(a.incomeBonus*100)}% ${tr('на','for')} ${Math.round(a.durationMs/60000)} ${tr('мин','min')}`;
    const affordBlock = !isAd && state.cash<amount;
    return `<div class="card glass" style="margin-bottom:10px;${(locked||affordBlock)?'opacity:.5;':''}">
      <div class="card-row">
        <div class="card-icon">${a.icon}</div>
        <div style="flex:1">
          <div class="card-title">${L(a,'name')}</div>
          <div class="card-sub">${locked?`${tr('нужен трафик','needs traffic')} ${a.minTraffic}+`:effectTxt}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn ${isAd?'btn-cyan':'btn-violet'} btn-block" ${(locked||affordBlock)?'disabled':''} onclick="placeSlotItem(${idx},'${a.id}')">${locked?tr('Недоступно','Unavailable'):(isAd?tr('Разместить','Place'):tr('Закупить','Stock it'))}</button></div>
    </div>`;
  };
  openModal(`<h3>📢 ${tr('Что разместить в слоте?','What to put in the slot?')}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:10px;">${tr('Реклама — деньги сразу, но доход просядет. Товары — платишь вперёд, но доход растёт, пока они на витрине.','Ads pay out instantly but dip income. Products cost upfront but boost income while stocked.')}</p>
    <div class="section-title" style="margin-top:0;">📢 ${tr('Реклама','Ads')}</div>
    ${AD_TYPES.map(rowFor).join('')}
    <div class="section-title">📦 ${tr('Товары','Products')}</div>
    ${PRODUCT_TYPES.map(rowFor).join('')}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Отмена','Cancel')}</button></div>`);
}

/* ---------- TRACK LEVEL CAP ----------
   Levels used to grow forever, which made late-game upgrades feel linear
   and pointless. Now each track has a soft cap that only grows via
   prestige (future feature — state.prestige.count) or merging two sites
   of the same type (site.trackCapBonus, see mergeSites()). */
const TRACK_MAX_LEVEL = 10;
function trackMaxLevel(site){
  return TRACK_MAX_LEVEL + (state.prestige.count*5) + (site.trackCapBonus||0);
}

/* ---------- TRACK SYNERGY ----------
   Reaching a high level in several tracks at once represents a business
   that isn't just good at one thing (e.g. all traffic, no infra to serve
   it) — it's firing on all cylinders. Hit the threshold level in enough
   tracks simultaneously and the whole site gets a flat income bonus on
   top of the normal per-track multipliers, plus a visual callout. */
const TRACK_SYNERGY_LEVEL = 8;       // level each qualifying track must reach
const TRACK_SYNERGY_MIN_TRACKS = 3;  // how many tracks must be at/above that level
const TRACK_SYNERGY_INCOME_MULT = 1.25; // +25% income while active
function trackSynergyCount(site){
  return TRACK_ORDER.filter(k=>site.tracks[k] >= TRACK_SYNERGY_LEVEL).length;
}
function trackSynergyActive(site){
  return trackSynergyCount(site) >= TRACK_SYNERGY_MIN_TRACKS;
}
function trackSynergyIncomeMult(site){
  return trackSynergyActive(site) ? TRACK_SYNERGY_INCOME_MULT : 1;
}
// Called right after any direct change to site.tracks (upgrade, merge) to
// surface a one-time toast/log the moment synergy first switches on for
// that site — cond checks alone (in ACHIEVEMENTS) run silently every tick.
function maybeAnnounceTrackSynergy(site){
  if(trackSynergyActive(site)){
    if(!site.trackSynergyNotified){
      site.trackSynergyNotified = true;
      toast(`⚡ ${tr('Режим синергии активирован','Synergy mode activated')}: «${esc(site.name)}» (+${Math.round((TRACK_SYNERGY_INCOME_MULT-1)*100)}% ${tr('к доходу','income')})`);
      log(`⚡ ${tr('Синергия треков','Track synergy')}: «${esc(site.name)}» ${tr('достиг','reached')} ${TRACK_SYNERGY_MIN_TRACKS}+ ${tr('треков на уровне','tracks at level')} ${TRACK_SYNERGY_LEVEL}+ — ${tr('доход','income')} +${Math.round((TRACK_SYNERGY_INCOME_MULT-1)*100)}%`);
      playSound('achievement');
      vibrateFeedback(15);
    }
  } else {
    site.trackSynergyNotified = false; // dropped below threshold — allow re-announce if re-earned
  }
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
// BUGFIX (1.2): allOwnedSitesFullyRenovated() required ALL 5 tracks maxed
// out AND all 5 renovation stages cleared (staff 3→15) on every owned site
// before a second site could be bought — even though the second site SLOT
// unlocks at a much lower net worth ($6,500), and rebirth requires owning
// 5+ sites simultaneously. Net effect: the game dangled a second-slot UI
// and a 5-site rebirth goal that were both unreachable for most of a
// playthrough. Expansion should be gated on "you've shown some commitment
// to your current site(s)", not "you've 100%'d them". The new gate only
// requires each owned site to have gotten at least one track to level 3+
// (a few minutes of normal play), regardless of renovation stage.
// ITEM 13: opening a new business used to just need ONE track at level 3 on
// each existing site — a few clicks. Per the request to make expansion a
// real "long road" with the business you already have, this now needs
// EVERY track raised (not just one) plus having gone through the site's
// first renovation stage (which itself already requires being fully
// upgraded and adequately staffed — see canRenovateSite()/renovationStage()).
const EXPANSION_GATE_TRACK_LEVEL = 6;
const EXPANSION_GATE_RENOVATION_STAGE = 1;
function sitesReadyForExpansion(){
  return state.sites.every(s =>
    TRACK_ORDER.every(k => (s.tracks[k]||0) >= EXPANSION_GATE_TRACK_LEVEL) &&
    (s.renovationStage||0) >= EXPANSION_GATE_RENOVATION_STAGE
  );
}
const SITE_COUNT_COST_GROWTH = 1.35; // extra global cost multiplier per site already owned, on top of the per-type multiplier
function renovationStage(site){ return site.renovationStage||0; }
function renovationRequiredStaff(site){ return RENOVATION_BASE_STAFF + renovationStage(site)*RENOVATION_STAFF_STEP; }
// [Item 4] Site renovation ("обновление сайта") now costs specialization
// points instead of cash — flat-ish growth per stage, independent of the
// business's baseCost (which varies by orders of magnitude across types),
// so it stays in the same range as other spec-point purchases.
function renovationCost(site, type){ return Math.round(150 + renovationStage(site)*90); }
function canRenovateSite(site){ return !!site && renovationStage(site) < RENOVATION_MAX_STAGE && siteFullyUpgraded(site) && site.employees >= renovationRequiredStaff(site); }
function renovateSite(idx){
  const site = state.sites[idx];
  if(!site) return;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  // CLEANUP (3): renovateSite() used to re-derive this same gate condition
  // inline, one `if` per clause, duplicating canRenovateSite() (which was
  // defined but never called). canRenovateSite() is now the single source
  // of truth for "is this allowed" — the clauses below only run when it
  // says no, purely to pick which toast explains why.
  if(!canRenovateSite(site)){
    if(renovationStage(site) >= RENOVATION_MAX_STAGE){ toast(tr('Достигнут максимум обновлений для этого сайта','This site has reached its max renovations')); }
    else if(!siteFullyUpgraded(site)){ toast(tr('Сначала прокачайте все ветки до максимума','Max out all tracks first')); }
    else if(site.employees < renovationRequiredStaff(site)){ toast(tr('Нужно больше сотрудников для обновления','You need more staff for the update')); }
    playSound('error');
    fxId('sv-renovation','fx-flash-red');
    return;
  }
  const cost = renovationCost(site, type);
  if((site.specPoints||0) < cost){ toast(tr('Не хватает очков специализации','Not enough specialization points')); playSound('error'); return; }
  site.specPoints -= cost;
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
  // Item 7 fix: renovation also spends specPoints — keep the tree/content/
  // platforms panels' point display in sync too, same reasoning as above.
  refreshSiteViewSections(idx, ['tracks','renovation','employees','stagepill','content','platforms']);
  fxId('sv-renovation','fx-flash-green');
}

/* ---------- AI LAB — build your own model, or license one ---------- */
const AI_LAB = {
  own:      {label:'Собственная нейросеть', labelEn:'In-house neural network', icon:'🧬', costMult:5.5, bonusPerLevel:0.35, maxLevel:5,
             desc:'Обучаете модель под свой продукт с нуля. Дороже и требует апгрейдов, но бонус к доходу растёт с каждым уровнем и не имеет потолка комиссии.',
             descEn:'You train a model for your product from scratch. More expensive and needs upgrades, but the income bonus grows with every level and has no commission ceiling.'},
  licensed: {label:'Лицензия у партнёра',   labelEn:'Partner license',           icon:'💳', costMult:1.8, bonus:0.45, dailyFeeMult:0.012,
             desc:'Готовое решение стороннего вендора. Быстро и заметно дешевле собственной разработки, но бонус фиксирован — партнёр забирает часть прибыли, и придётся платить за обслуживание, пока вы им пользуетесь.',
             descEn:'A ready-made solution from a third-party vendor. Fast and noticeably cheaper than in-house development, but the bonus is fixed — the partner takes a cut of the profit, and you pay ongoing service fees for as long as you use it.'},
};
function aiModelCost(type, kind, ownLevel){
  if(kind==='licensed') return Math.round(type.baseCost * AI_LAB.licensed.costMult);
  return Math.round(type.baseCost * AI_LAB.own.costMult * Math.pow(1.6, ownLevel));
}
// Было Neural Empire-only: доступ у чужой лицензии стоит ежедневного
// обслуживания, и если долг копится AI_MAINT_AUDIT_DAYS+ дней, партнёр
// урезает бонус вдвое (см. assessAiMaintenance()/payAiMaintenance() ниже).
function licensedDailyFee(type){ return Math.round(type.baseCost * AI_LAB.licensed.costMult * AI_LAB.licensed.dailyFeeMult); }
function aiMaintPenaltyMultiplier(){ return (state.aiMaint && state.aiMaint.audited) ? 0.5 : 1; }
function aiIncomeMult(site){
  if(!site.aiModel || !site.aiModel.kind) return 1;
  if(site.aiModel.kind==='licensed') return 1+AI_LAB.licensed.bonus*aiMaintPenaltyMultiplier();
  return 1+AI_LAB.own.bonusPerLevel*site.aiModel.ownLevel;
}
// Обслуживание нейросетей и заказы на обучение раньше показывались на
// дашборде с самого начала игры (с текстом "Загрузка..." до первого тика),
// хотя обе механики имеют смысл только после того, как у игрока появилась
// собственная (in-house) нейросеть хотя бы на одном сайте/приложении.
function hasOwnNeuralNetwork(){
  return state.sites.some(s=>s.aiModel && s.aiModel.kind==='own');
}
/* ---------- MY NEURAL NETWORKS — central list of every in-house model ----------
   developOwnAI(idx) already lets the player level up a specific site's model,
   but that button only lives inside that site's own detail view. This gives
   a single screen listing every site running an in-house model side by side,
   so choosing which one to invest in next doesn't require opening each site. */
function buildNeuralLabHtml(){
  const rows = state.sites
    .map(function(s,idx){ return {s,idx}; })
    .filter(function(o){ return o.s.aiModel && o.s.aiModel.kind==='own'; })
    .map(function(o){
      const site = o.s;
      const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
      const lvl = site.aiModel.ownLevel;
      const maxed = lvl>=AI_LAB.own.maxLevel;
      const nextCost = aiModelCost(type,'own',lvl);
      const bonus = Math.round(AI_LAB.own.bonusPerLevel*lvl*100);
      return `<div class="card glass ai-option" style="margin-bottom:10px;">
        <div class="card-row">
          <div class="card-icon">${type?type.icon:'🧬'}</div>
          <div style="flex:1">
            <div class="card-title">${esc(site.name)}</div>
            <div class="card-sub">${tr('Уровень','Level')} ${lvl}/${AI_LAB.own.maxLevel} · +${bonus}% ${tr('к доходу','to income')}</div>
          </div>
        </div>
        ${maxed
          ? `<div class="card-sub" style="margin-top:8px;">${tr('Обучена до максимума 🎉','Fully trained 🎉')}</div>`
          : `<div class="btn-row" style="margin-top:8px;"><button class="btn btn-violet btn-block aff-btn" data-aff-cost="${nextCost}" ${state.cash<nextCost?'disabled':''} onclick="developOwnAI(${o.idx})">${tr('Прокачать до ур.','Upgrade to lvl')} ${lvl+1} ${tr('за','for')} ${fmt(nextCost)}</button></div>`}
      </div>`;
    }).join('');
  return rows || `<p style="color:var(--dim);">${tr('Пока нет собственных нейросетей','No in-house neural networks yet')}</p>`;
}
function openNeuralLabModal(){
  openModal(`<h3>🧬 ${tr('AI Lab','AI Lab')}</h3>` +
    `<div class="section-title">${tr('Мои нейросети','My neural networks')}</div>` +
    `<div id="neurallab-modal-body">${buildNeuralLabHtml()}</div>` +
    `<div class="section-title" style="margin-top:14px;">🎓 ${tr('Заказы на обучение ИИ','AI training jobs')}</div>` +
    `<div id="training-modal-body">${buildTrainingHtml()}</div>`);
}
function refreshNeuralLabModal(){
  const bg = document.getElementById('modal-bg');
  if(!bg || !bg.classList.contains('show')) return;
  const body = document.getElementById('neurallab-modal-body');
  if(body) body.innerHTML = buildNeuralLabHtml();
  const trainingBody = document.getElementById('training-modal-body');
  if(trainingBody) trainingBody.innerHTML = buildTrainingHtml();
}
function renderNeuralLabCard(){
  const card = document.getElementById('neurallab-card');
  const sub = document.getElementById('neurallab-card-sub');
  if(!card || !sub) return;
  const owned = state.sites.filter(s=>s.aiModel && s.aiModel.kind==='own');
  card.classList.toggle('hidden', owned.length===0);
  if(owned.length===0) return;
  const maxed = owned.filter(s=>s.aiModel.ownLevel>=AI_LAB.own.maxLevel).length;
  let subTxt = `${owned.length} ${tr('шт.','models')} · ${tr('готово к прокачке','ready to upgrade')}: ${owned.length-maxed}`;
  if(state.training){
    const ready = state.training.active.filter(a=>state.day>=a.doneDay).length;
    subTxt += ready>0 ? ` · 🎓 ${tr('заказ готов','job ready')}: ${ready}` : ` · 🎓 ${tr('заказы','jobs')}: ${state.training.active.length}/${maxActiveTrainingContracts()}`;
  }
  sub.textContent = subTxt;
}

/* ---------- AI MAINTENANCE (было Neural Empire-only, теперь общая механика) ----------
   Every site running on a partner-licensed model (any vertical) owes a daily
   service fee. Left unpaid AI_MAINT_AUDIT_DAYS+ days, the vendor halves the
   licensed bonus (see aiMaintPenaltyMultiplier() above) until cleared. */
const AI_MAINT_AUDIT_DAYS = 5;
function totalAiMaintDaily(){
  let sum = 0;
  state.sites.forEach(function(site){
    if(site.aiModel && site.aiModel.kind==='licensed'){
      const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
      sum += licensedDailyFee(type);
    }
  });
  return sum;
}
function assessAiMaintenance(){
  if(!state.aiMaint) return;
  const due = totalAiMaintDaily();
  if(due<=0){ state.aiMaint.overdueDays = 0; return; }
  state.aiMaint.owed += due;
  state.aiMaint.overdueDays++;
  if(state.aiMaint.overdueDays >= AI_MAINT_AUDIT_DAYS && !state.aiMaint.audited){
    state.aiMaint.audited = true;
    toast(`🧠 ${tr('Партнёр урезал доступ к лицензии — бонус нейросети снижен, пока долг не погашен','The vendor throttled access — the neural network bonus is reduced until the debt is cleared')}`);
    log(`🧠 ${tr('Обслуживание лицензии не оплачивается слишком долго — бонус снижен','License service fee unpaid too long — bonus reduced')}`);
    renderEvents();
  }
}
function payAiMaintenance(){
  if(!state.aiMaint) return;
  const owed = Math.round(state.aiMaint.owed);
  if(owed<=0) return;
  if(state.cash < owed){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= owed;
  state.aiMaint.owed = 0;
  state.aiMaint.overdueDays = 0;
  state.aiMaint.audited = false;
  log(`🧠 ${tr('Обслуживание лицензий оплачено','License service fees paid')} — ${fmt(owed)}`);
  toast(`🧠 ${tr('Оплачено','Paid')}: ${fmt(owed)}`);
  playSound('sell');
  save(); renderAll(); refreshAiMaintModal();
}
function buildAiMaintHtml(){
  const owed = Math.round(state.aiMaint.owed||0);
  const daily = totalAiMaintDaily();
  const overdue = state.aiMaint.overdueDays||0;
  const audited = !!state.aiMaint.audited;
  const licensedCount = state.sites.filter(s=>s.aiModel && s.aiModel.kind==='licensed').length;
  return `<p style="color:var(--dim);font-size:12.5px;margin-bottom:12px;">${tr(`Каждая нейросеть на партнёрской лицензии (сейчас ${licensedCount}) обходится в ежедневную плату за обслуживание — хостинг, поддержку и дообучение на ваших данных. Не платите ${AI_MAINT_AUDIT_DAYS}+ дней — партнёр урезает бонус вдвое, пока долг не закрыт.`,`Every site on a partner license (currently ${licensedCount}) costs a daily service fee — hosting, support and continued fine-tuning on your data. Leave it unpaid ${AI_MAINT_AUDIT_DAYS}+ days and the vendor halves the bonus until it's cleared.`)}</p>
    <div class="card glass" style="margin-bottom:10px;${audited?'border-color:rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
      <div class="card-row">
        <div class="card-icon">🧠</div>
        <div style="flex:1">
          <div class="card-title">${tr('Обслуживание лицензий','License service fees')}</div>
          <div class="card-sub">${owed>0?`${tr('Долг','Owed')}: ${fmt(owed)}${overdue>0?' · '+overdue+' '+tr('дн.','d'):''}`:tr('Долгов нет','No debt')}${audited?' · 🧠 '+tr('бонус −50%','bonus −50%'):''}</div>
          <div class="card-sub">${tr('В день','Per day')}: ${fmt(daily)}</div>
        </div>
      </div>
      ${owed>0?`<div class="btn-row"><button class="btn btn-red btn-block" ${state.cash<owed?'disabled':''} onclick="payAiMaintenance()">${tr('Оплатить','Pay')} ${fmt(owed)}</button></div>`:''}
    </div>`;
}
function openAiMaintModal(){ openModal(`<h3>🧠 ${tr('Обслуживание нейросетей','Neural network upkeep')}</h3><div id="aimaint-modal-body">${buildAiMaintHtml()}</div>`); }
function refreshAiMaintModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('aimaint-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildAiMaintHtml();
}
function renderAiMaintCard(){
  const card = document.getElementById('aimaint-card');
  const sub = document.getElementById('aimaint-card-sub');
  if(!card || !sub || !state.aiMaint) return;
  card.classList.toggle('hidden', !hasOwnNeuralNetwork());
  const owed = Math.round(state.aiMaint.owed||0);
  if(owed<=0) sub.textContent = tr('Долгов нет — всё оплачено','No debt — all paid up');
  else sub.textContent = `${tr('К уплате','Owed')}: ${fmt(owed)}${state.aiMaint.audited?' · 🧠 '+tr('бонус −50%','bonus −50%'):''}`;
}
// BUGFIX (5): this function didn't exist — #training-card-sub had no
// render function wired up at all, so it just sat on its static HTML
// text forever (previously "Загрузка...", see the RULE comment near
// dash.loading — that placeholder text is exactly the tell for "this
// card's render function is missing", which is exactly what happened
// here). Gated the same way as renderAiMaintCard() right above, per the
// comment on hasOwnNeuralNetwork(): both cards only make sense once the
// player has an in-house AI model on at least one site.
function renderTrainingCard(){
  const card = document.getElementById('training-card');
  const sub = document.getElementById('training-card-sub');
  if(!card || !sub || !state.training) return;
  card.classList.toggle('hidden', !hasOwnNeuralNetwork());
  const ready = state.training.active.filter(a=>state.day>=a.doneDay).length;
  const cap = maxActiveTrainingContracts();
  sub.textContent = ready>0
    ? `🎓 ${tr('Заказ готов к сдаче','A job is ready to hand in')}: ${ready}`
    : `${tr('Активных заказов','Active jobs')}: ${state.training.active.length}/${cap} · ${tr('доступно предложений','offers available')}: ${state.training.offers.length}`;
}

/* ---------- TRAINING CONTRACTS MARKETPLACE (было Neural Empire-only) ----------
   A rotating board of NPC-client jobs: train *their* model for a flat cash
   reward. Accept an offer, wait out its duration in in-game days, then
   collect. Concurrent capacity is limited (maxActiveTrainingContracts()) and
   scales with how much AI infrastructure you actually own, so it rewards
   investing in your own AI Lab rather than being a free side income. */
const TRAINING_CLIENTS = ['Vertex Retail','Solara Health','Quanto Bank','Nimbus Logistics','Arcadia Media','Pixelforge Studio','Orbita Telecom','Meridian Insurance','Fabrik Robotics','Northline Airlines','Cobalt Analytics','Havenwood Realty'];
const TRAINING_TIERS = [
  {id:'small',  label:'Мелкий заказ',   labelEn:'Small job',  icon:'📄', durationDays:2, rewardMult:1.0,  weight:5},
  {id:'medium', label:'Средний заказ',  labelEn:'Medium job',  icon:'📦', durationDays:4, rewardMult:2.6,  weight:3},
  {id:'large',  label:'Крупный заказ',  labelEn:'Large job',   icon:'🏆', durationDays:7, rewardMult:5.5,  weight:1},
];
const TRAINING_OFFER_SLOTS = 3;
const TRAINING_OFFER_LIFETIME_DAYS = 6; // an unaccepted offer expires and is replaced
function maxActiveTrainingContracts(){
  const aiSites = state.sites.filter(s=>s.aiModel && s.aiModel.kind).length;
  return Math.min(5, 1 + aiSites);
}
function pickTrainingTier(){
  const total = TRAINING_TIERS.reduce((s,t)=>s+t.weight,0);
  let r = Math.random()*total;
  for(const t of TRAINING_TIERS){ if(r<t.weight) return t; r -= t.weight; }
  return TRAINING_TIERS[0];
}
function genTrainingOffer(){
  const tier = pickTrainingTier();
  const client = TRAINING_CLIENTS[Math.floor(Math.random()*TRAINING_CLIENTS.length)];
  const dailyBase = Math.max(400, totalIncomePerSec()*GAME_DAY_SECONDS*0.55);
  const reward = Math.round(dailyBase * tier.rewardMult * (0.85+Math.random()*0.3));
  return {id:genUid(), client, tierId:tier.id, icon:tier.icon, reward, durationDays:tier.durationDays, expiresDay: state.day+TRAINING_OFFER_LIFETIME_DAYS};
}
function refreshTrainingOffers(){
  if(!state.training) return;
  state.training.offers = state.training.offers.filter(o=>o.expiresDay>state.day);
  while(state.training.offers.length < TRAINING_OFFER_SLOTS){
    state.training.offers.push(genTrainingOffer());
  }
  state.training.lastRefreshDay = state.day;
}
function acceptTrainingContract(offerId){
  const idx = state.training.offers.findIndex(o=>o.id===offerId);
  if(idx<0) return;
  if(state.training.active.length >= maxActiveTrainingContracts()){
    toast(tr('Нет свободных мощностей — прокачайте AI Lab или дождитесь сдачи заказа','No free capacity — upgrade your AI Lab or wait for a job to finish'));
    return;
  }
  const offer = state.training.offers.splice(idx,1)[0];
  state.training.active.push({id:offer.id, client:offer.client, tierId:offer.tierId, icon:offer.icon, reward:offer.reward, durationDays:offer.durationDays, startedDay:state.day, doneDay:state.day+offer.durationDays});
  log(`🎓 ${tr('Принят заказ на обучение','Training job accepted')}: «${esc(offer.client)}» (${fmt(offer.reward)}, ${offer.durationDays} ${tr('дн.','d')})`);
  toast(`🎓 ${tr('Заказ принят','Job accepted')}: ${esc(offer.client)}`);
  playSound('buy');
  save(); renderAll(); refreshTrainingModal();
}
function collectTrainingContract(activeId){
  const idx = state.training.active.findIndex(a=>a.id===activeId);
  if(idx<0) return;
  const job = state.training.active[idx];
  if(state.day < job.doneDay) return;
  state.training.active.splice(idx,1);
  state.cash += job.reward;
  state.lifetimeStats.totalEarned += job.reward;
  log(`🎓 ${tr('Заказ на обучение сдан','Training job delivered')}: «${esc(job.client)}» — +${fmt(job.reward)}`);
  toast(`🎓 +${fmt(job.reward)} — ${esc(job.client)}`);
  playSound('sell');
  vibrateFeedback(20);
  save(); renderAll(); refreshTrainingModal();
}
function buildTrainingHtml(){
  refreshTrainingOffers();
  const cap = maxActiveTrainingContracts();
  const offersHtml = state.training.offers.map(function(o){
    const tier = TRAINING_TIERS.find(t=>t.id===o.tierId);
    const full = state.training.active.length >= cap;
    return `<div class="card glass" style="margin-bottom:10px;">
      <div class="card-row">
        <div class="card-icon">${o.icon}</div>
        <div style="flex:1">
          <div class="card-title">${esc(o.client)} <span style="opacity:.55;font-weight:400;">· ${L(tier,'label')}</span></div>
          <div class="card-sub">${tr('Награда','Reward')}: ${fmt(o.reward)} · ${o.durationDays} ${tr('дн.','d')}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn btn-violet btn-block" ${full?'disabled':''} onclick="acceptTrainingContract('${o.id}')">${full?tr('Нет мощностей','No capacity'):tr('Взять заказ','Accept job')}</button></div>
    </div>`;
  }).join('');
  const activeHtml = state.training.active.map(function(a){
    const tier = TRAINING_TIERS.find(t=>t.id===a.tierId);
    const ready = state.day >= a.doneDay;
    const pct = ready?100:Math.round(((state.day-a.startedDay)/(a.doneDay-a.startedDay))*100);
    return `<div class="card glass" style="margin-bottom:10px;">
      <div class="card-row">
        <div class="card-icon">${a.icon}</div>
        <div style="flex:1">
          <div class="card-title">${esc(a.client)} <span style="opacity:.55;font-weight:400;">· ${L(tier,'label')}</span></div>
          <div class="card-sub">${ready?tr('Готово к сдаче','Ready to deliver'):`${tr('Осталось','Left')}: ${a.doneDay-state.day} ${tr('дн.','d')}`}</div>
          <div class="progress-bar" style="margin-top:6px;"><div style="width:${pct}%"></div></div>
        </div>
      </div>
      ${ready?`<div class="btn-row"><button class="btn btn-green btn-block" onclick="collectTrainingContract('${a.id}')">${tr('Сдать за','Deliver for')} ${fmt(a.reward)}</button></div>`:''}
    </div>`;
  }).join('');
  return `<p style="color:var(--dim);font-size:12.5px;margin-bottom:12px;">${tr(`Обучайте нейросети сторонним клиентам за вознаграждение. Свободные мощности: ${state.training.active.length}/${cap} — растут вместе с числом собственных нейросетей в AI Lab.`,`Train models for outside clients for a cash reward. Free capacity: ${state.training.active.length}/${cap} — grows with how many AI Lab models you own.`)}</p>
    ${activeHtml?`<div class="section-title">${tr('В работе','In progress')}</div>${activeHtml}`:''}
    <div class="section-title">${tr('Доступные заказы','Available jobs')}</div>
    ${offersHtml || `<p style="color:var(--dim);">${tr('Пока нет заказов','No jobs right now')}</p>`}`;
}
function openTrainingModal(){ openModal(`<h3>🎓 ${tr('Заказы на обучение ИИ','AI training jobs')}</h3><div id="training-modal-body">${buildTrainingHtml()}</div>`); }
function refreshTrainingModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('training-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildTrainingHtml();
}


/* ---------- DIFFICULTY (chosen once, at new-game setup) ---------- */
const DIFFICULTY_META = {
  normal:   {label:'Обычный', labelEn:'Normal',   icon:'🙂', startCash:450, costMult:1,    desc:'Стандартный баланс — привычный темп роста.', descEn:'Standard balance — a familiar pace of growth.'},
  hardcore: {label:'Хардкор', labelEn:'Hardcore', icon:'🔥', startCash:225, costMult:1.25, desc:'Вдвое меньше стартового капитала, все траты на 25% дороже. Для тех, кто хочет вызов.', descEn:'Half the starting capital, every expense costs 25% more. For those who want a challenge.'},
};
function difficultyCostMult(){ return (DIFFICULTY_META[state.difficulty]||DIFFICULTY_META.normal).costMult * parentsPenaltyMult(); }
function parentsPenaltyMult(){ return (state.story && state.story.parentsPenalty) ? 1.25 : 1; }

/* ---------- FIRST-SESSION PACING ----------
   Deliberately front-loaded momentum so the first few minutes are all
   progress, not admin: an immediate cash bonus, a temporary income boost
   with a visible countdown, and a short grace period before the
   tax/payroll/hosting bills start being assessed. All real-time (not
   game-time) so it behaves the same regardless of difficulty. */
const WELCOME_BONUS = 250;
const STARTER_BOOST_MS = 3*60*1000;   // 3 real minutes
const STARTER_BOOST_MULT = 2.5;
const BILL_GRACE_DAYS = 1;            // +1 in-game day of grace on top of the normal first cycle
function starterBoostMultiplier(){
  return (state.starterBoostUntil && Date.now() < state.starterBoostUntil) ? STARTER_BOOST_MULT : 1;
}
function billsInGracePeriod(){ return state.day <= (state.billGraceUntilDay||0); }

/* ---------- CEO SKILL TREE — spent from prestige.skillPoints, earned on rebirth ---------- */
const CEO_SKILLS = [
  {id:'quick_start',  name:'Быстрый старт',            nameEn:'Quick Start',            icon:'⚡', cost:1, desc:'+10% к награде за ежедневные задания и стрик', descEn:'+10% reward for daily quests and streaks'},
  {id:'lucky_events', name:'Деловое чутьё',             nameEn:'Business Instinct',      icon:'🍀', cost:2, desc:'Случайные события выпадают на 15% чаще', descEn:'Random events occur 15% more often'},
  {id:'cheap_hire',   name:'Кадровое агентство',      nameEn:'HR Agency',               icon:'🧑‍💼', cost:3, desc:'Найм сотрудников дешевле на 15% навсегда', descEn:'Hiring employees is 15% cheaper forever'},
  {id:'cheap_tracks', name:'Оптимизация процессов',    nameEn:'Process Optimization',    icon:'⚙️', cost:4, desc:'Прокачка треков дешевле на 10% навсегда', descEn:'Upgrading tracks is 10% cheaper forever'},
  {id:'income_boost', name:'Деловая хватка',           nameEn:'Business Acumen',         icon:'💼', cost:5, desc:'+5% ко всем доходам навсегда', descEn:'+5% to all income forever'},
  {id:'cheap_merge',  name:'M&A отдел',                nameEn:'M&A Department',          icon:'🤝', cost:6, desc:'Слияние сайтов дешевле на 30% навсегда', descEn:'Merging sites is 30% cheaper forever'},
  {id:'extra_slot',   name:'Расширение штаб-квартиры', nameEn:'HQ Expansion',            icon:'🏢', cost:8, desc:'+1 слот под сайты навсегда', descEn:'+1 site slot forever'},
  {id:'mega_income',      name:'Глобальная экспансия',  nameEn:'Global Expansion',       icon:'🌍', cost:10, desc:'+10% ко всем доходам навсегда (суммируется с «Деловой хваткой»)', descEn:'+10% to all income forever (stacks with "Business Acumen")'},
  {id:'elite_expansion',  name:'Второй штаб',           nameEn:'Second HQ',              icon:'🏙️', cost:12, desc:'Ещё +1 слот под сайты навсегда (суммируется с «Расширением штаб-квартиры»)', descEn:'Another +1 site slot forever (stacks with "HQ Expansion")'},
  {id:'compound_growth',  name:'Сложный процент',       nameEn:'Compound Interest',      icon:'📊', cost:14, desc:'Очки наследия дают вдвое больше множителя дохода после перерождения', descEn:'Legacy points give double the income multiplier after rebirth'},
  {id:'legacy_multiplier',name:'Наследие империи',      nameEn:'Empire Legacy',          icon:'👑', cost:15, desc:'+25% очков наследия за каждое перерождение навсегда', descEn:'+25% legacy points per rebirth forever'},
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
  {id:'track_synergy',  icon:'⚡', name:'Режим синергии',      nameEn:'Synergy mode',          desc:`Прокачайте ${TRACK_SYNERGY_MIN_TRACKS} трека одного бизнеса до уровня ${TRACK_SYNERGY_LEVEL}+`, descEn:`Level ${TRACK_SYNERGY_MIN_TRACKS} tracks of one business to ${TRACK_SYNERGY_LEVEL}+`, reward:50000, cond:s=>s.sites.some(site=>trackSynergyActive(site)), skillPoints:1},
  {id:'dream_team',     icon:'👥', name:'Команда мечты',       nameEn:'Dream team',            desc:'Наймите по одному специалисту каждого профиля в один бизнес', descEn:'Hire one specialist of every profile into a single business', reward:100000, cond:s=>s.sites.some(site=>dreamTeamActive(site)), skillPoints:1},
  {id:'rep_legendary',  icon:'👑', name:'Легенда индустрии',   nameEn:'Industry legend',       desc:'Достигните статуса «Легендарный» (5000+ репутации)', descEn:'Reach "Legendary" status (5000+ reputation)', reward:1000000, cond:s=>reputationTotal()>=5000, skillPoints:2},
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
  // ---- Added to fill out the "Спринтер/Диверсификация/Сотрудники/События" gaps from spec 1.5 ----
  {id:'sprinter',       icon:'⚡', name:'Спринтер',            nameEn:'Sprinter',              desc:'Достигните $1 000 000 чистых активов за 10 игровых дней', descEn:'Reach $1,000,000 net worth within 10 in-game days', reward:60000, cond:s=>s.day<=10 && netWorth()>=1e6, skillPoints:1},
  {id:'diversified',    icon:'🎯', name:'Диверсификация',      nameEn:'Diversification',       desc:'Владейте 2+ сайтами в каждой из 4+ разных категорий', descEn:'Own 2+ sites in each of 4+ different categories', reward:35000, cond:s=>{const byCat={}; s.sites.forEach(site=>{const t=ALL_BUSINESS_TYPES.find(tt=>tt.id===site.typeId); if(t) byCat[t.category]=(byCat[t.category]||0)+1;}); return Object.values(byCat).filter(n=>n>=2).length>=4;}},
  {id:'team_of_five',   icon:'👔', name:'Команда',             nameEn:'Team',                  desc:'Наймите 5+ сотрудников суммарно по всем сайтам', descEn:'Hire 5+ employees total across all sites', reward:8000, cond:s=>s.sites.reduce((sum,site)=>sum+site.employees,0)>=5},
  {id:'staff_army',     icon:'🪖', name:'Армия',               nameEn:'Army',                  desc:'Наймите 30+ сотрудников суммарно по всем сайтам', descEn:'Hire 30+ employees total across all sites', reward:80000, cond:s=>s.sites.reduce((sum,site)=>sum+site.employees,0)>=30, skillPoints:1},
  {id:'market_veteran', icon:'🌪️', name:'Ветеран рынка',       nameEn:'Market veteran',        desc:'Переживите 20 случайных событий за игру',        descEn:'Live through 20 random events over the game', reward:20000, cond:s=>(s.lifetimeStats.eventsTriggered||0)>=20},
  {id:'global_player',  icon:'🌐', name:'Глобальный игрок',    nameEn:'Global player',         desc:'Застаньте глобальное макро-событие экономики', descEn:'Witness a global macro-economic event', reward:15000, cond:s=>(s.lifetimeStats.globalEventsSeen||0)>=1},
  {id:'founder_tier',   icon:'🏛️', name:'Основатель',          nameEn:'Founder',               desc:'Достигните уровня престижа «Основатель» (3+ перерождения)', descEn:'Reach the "Founder" prestige level (3+ rebirths)', reward:200000, cond:s=>s.prestige.count>=3, skillPoints:2},
  {id:'shareholder',    icon:'📊', name:'Акционер',            nameEn:'Shareholder',           desc:'Купите долю в бизнесе конкурента',               descEn:"Buy a stake in a competitor's business",    reward:12000,  cond:s=>!!(s.holdings && Object.keys(s.holdings).length>0)},
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
      fx(achBtn,'fx-badge-pop');
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
  fxId('quest-chip','fx-quest-complete');
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
  fxId('header-cash','fx-glow-gold');
  fxId('season-card','fx-trophy-lift');
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
  n += (state.activeEvents||[]).filter(e=>['hack','downtime','platformwar','trustcrisis','lawsuit','breakthrough','influencer','partnership','ddos'].includes(e.type)).length;
  ensureMailbox();
  n += state.mailbox.filter(m=>(m.type==='offer'&&!m.resolved)||(m.type==='bill'&&!m.paid)||(m.type==='interview'&&!m.resolved)||(m.type==='startup'&&!m.resolved)).length;
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
  const rows = state.activeEvents.map(function(e){ return buildEventRowHtml(e, 'inbox-'); }).join('');
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
    buildInboxMailHtml() +
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
  // ITEM 19 FIX: see catchUpOfflineMailOffers() below — this used to be a
  // pure cash calculation with no side effect on state.day/secondsElapsed,
  // so no day boundary (and therefore no mail-offer roll) was ever crossed
  // for time spent away, even though the offline cash above assumes a full
  // day (or several) of activity happened. Roll for offers now too, using
  // the *uncapped* elapsed time — a week-long absence should still only
  // ever get the (small, capped) roll count below, not proportionally more.
  catchUpOfflineMailOffers(elapsed);
  if(cash < 1) return null;
  state.cash += cash;
  log(`🌙 Офлайн-доход: +${fmt(cash)} за время отсутствия${boosty?' (Boosty: без потолка 50%, до 24ч на 100%)':''}`);
  return {offlineCash: cash, offlineSeconds: elapsed};
}
// ITEM 19: buyer offers for your businesses (see maybeGenerateBusinessOffer())
// only ever get rolled from inside runDayRollover(), which itself only runs
// while the tab is open and ticking every second — state.secondsElapsed has
// to actually climb to GAME_DAY_SECONDS in real time. Since most idle/mobile
// play happens with the tab closed, and offline time was otherwise handled
// purely as a cash lump sum (see computeOfflineEarnings() above) that never
// touches state.day/secondsElapsed, a day boundary was effectively never
// crossed for any time spent away — so the offer roll almost never actually
// fired, and offers could go missing for real days at a time even though the
// roll itself works fine when the tab is open. This gives the roll its shot
// for every in-game day that would have elapsed while away, capped at 8
// rolls (~77% chance of at least one offer even on a maximum-length
// absence) so a very long time away doesn't spam past the existing
// MAIL_MAX_OPEN_OFFERS cap that maybeGenerateBusinessOffer() already
// enforces on its own.
function catchUpOfflineMailOffers(offlineSeconds){
  if(!offlineSeconds || offlineSeconds<=0 || !state.sites || !state.sites.length) return;
  const gameSecondsAway = offlineSeconds * (state.settings.speed||1);
  const daysAway = Math.floor(((state.secondsElapsed||0) + gameSecondsAway) / GAME_DAY_SECONDS);
  const rolls = Math.min(daysAway, 8);
  for(let i=0;i<rolls;i++) maybeGenerateBusinessOffer();
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
function prestigeThreshold(){ return 80000000 * Math.pow(2, state.prestige.count); } // $80M, then $160M, $320M...
// Net worth alone let a player rebirth off one mega-site instead of an
// actual "empire" — so rebirth also requires a minimum number of sites
// open at once, rising with every rebirth: 5, 7, 9, 11...
function prestigeSiteRequirement(){ return 5 + state.prestige.count*2; }
function legacyPointsFor(nw){ return Math.floor(Math.sqrt(nw/1e6) * (hasSkill('legacy_multiplier')?1.25:1)); }
function prestigeMultiplier(){ return 1 + state.prestige.count*0.5 + state.prestige.points*(hasSkill('compound_growth')?0.02:0.01); }
/* ---------- PRESTIGE LEVELS (Раздел 4.1 плана) ----------
   Named tiers unlocked by total rebirth COUNT (not points), each adding
   its own permanent income multiplier on top of the existing per-point
   prestigeMultiplier() above — so finishing the game once (3 rebirths)
   is already worth something extra, and going further keeps paying off. */
const PRESTIGE_LEVELS = [
  { count:3,  icon:'🏛️', name:'Основатель', nameEn:'Founder', mult:0.10 },
  { count:10, icon:'💰', name:'Магнат',     nameEn:'Magnate', mult:0.25 },
  { count:25, icon:'⭐', name:'Легенда',    nameEn:'Legend',  mult:0.50 },
  { count:50, icon:'🏆', name:'Миф',        nameEn:'Myth',    mult:1.00 },
];
function currentPrestigeLevel(){
  let lvl = null;
  PRESTIGE_LEVELS.forEach(l=>{ if(state.prestige.count>=l.count) lvl=l; });
  return lvl;
}
function nextPrestigeLevel(){ return PRESTIGE_LEVELS.find(l=>state.prestige.count<l.count) || null; }
function prestigeLevelMult(){ const l=currentPrestigeLevel(); return l ? 1+l.mult : 1; }
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
function canRebirth(){ return netWorth() >= prestigeThreshold() && state.sites.length >= prestigeSiteRequirement(); }
function isFinalRebirth(){ return state.prestige.count === 2 && !state.prestige.endless; }
function openRebirthModal(){
  const nw = netWorth();
  const nwOk = nw >= prestigeThreshold();
  const sitesOk = state.sites.length >= prestigeSiteRequirement();
  if(!nwOk && !sitesOk){
    toast('Нужно $'+fmt(prestigeThreshold())+' чистых активов и '+prestigeSiteRequirement()+'+ сайтов, чтобы переродиться');
    return;
  }
  if(!nwOk){ toast('Нужно $'+fmt(prestigeThreshold())+' чистых активов, чтобы переродиться'); return; }
  if(!sitesOk){ toast('Нужно как минимум '+prestigeSiteRequirement()+' открытых сайтов, чтобы переродиться (сейчас '+state.sites.length+')'); return; }
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
  // BUGFIX (2): every other part of the run gets wiped below (sites, cash,
  // stocks, finance, payroll, hosting, taxes...) but the event feed never
  // did — old entries from the run that just ended stayed in state.log
  // forever, so the feed kept piling up run after run instead of starting
  // fresh like the rest of the dashboard does. Clearing it here, right
  // before this rebirth's own log() call, means the feed starts empty
  // except for the "Перерождение" entry announcing the fresh run.
  state.log = [];
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
  state.loan = {principal:0, rating:0, takenDay:null, type:null, dueDay:null, lumpTotal:0, overdueDays:0, lastRepayDay:null};
  state.shorts = {};
  state.finance = {incomeHist:[],expenseHist:[],todayIncome:0,todayExpenses:0,dailyHistory:[],lastTickCash:state.cash};
  state.payroll = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  state.hosting = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  // BUGFIX: taxes has the same owed/overdueDays/audited shape as payroll and
  // hosting right above, but was missing here — a category audited (or with
  // debt) right before rebirth stayed audited/in debt forever after, even
  // though every site that could owe that debt was just wiped along with
  // everything else in this reset.
  state.taxes = {rate:TAX_RATE, owed:{}, overdueDays:{}, audited:{}};
  state.aiMaint = {owed:0, overdueDays:0, audited:false};
  // ITEM 9 FIX: rebirth wiped sites/events/loans/etc. but never touched
  // the mailbox — leftover offers/bills/interviews/startup mail from the
  // run that just ended stayed marked unresolved forever (some even
  // pointing at a site that no longer exists), so the inbox badge kept
  // showing a count with nothing real behind it. A rebirth is a fresh
  // start; the mailbox should be too.
  state.mailbox = [];
  refreshInboxBadge();
  closeSiteView();
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
// ---- Parents-reunion branch (item 13) ----
// Accept: the parents' offer to merge is the game's actual "completed"
// ending — same shape as before (endless unlocked, stats shown), just
// reframed with the reconciliation narrative and a one-time offer to
// start a brand-new career.
function acceptParentsReunion(){
  state.prestige.endless = true;
  state.story.parentsChoice = 'joined';
  save();
  document.getElementById('ending-screen').classList.add('hidden');
  openModal(`<h3>🤝 ${tr('Великая бизнес-империя','One great business empire')}</h3>
    <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:16px;">${tr('Вы объединяетесь с родителями. Три перерождения назад они забрали у вас всё и дали лишь $450 — теперь вместе вы построили нечто большее, чем любой из вас смог бы один.','You join forces with your parents. Three rebirths ago they took everything from you and gave you just $450 — now, together, you\'ve built something bigger than either of you could have alone.')}</p>
    <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:16px;">${tr('Игра пройдена. Можно продолжить в Endless-режиме без ограничений на перерождения, или начать всё сначала.','The game is complete. You can keep playing in Endless mode with no rebirth limit, or start over from scratch.')}</p>
    <div class="btn-row">
      <button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Играть дальше','Keep playing')}</button>
      <button class="btn btn-red btn-block" onclick="closeModal();confirmReset();">${tr('Начать заново','Start over')}</button>
    </div>`);
  toast(tr('♾️ Endless-режим включён — лимит перерождений снят','♾️ Endless mode enabled — rebirth limit removed'));
}
// Decline: the game continues, but harder (upgrade/track costs +25%,
// see difficultyCostMult()/parentsPenaltyMult()) and with one explicit new
// goal — fully absorb the parents' empire. Reaching it lifts the penalty
// and plays the apology scene (see checkParentsAbsorption()).
function declineParentsReunion(){
  state.prestige.endless = true;
  state.story.parentsChoice = 'declined';
  state.story.parentsPenalty = true;
  state.story.parentsTargetValue = Math.round(Math.max(netWorth()*3, prestigeThreshold()*2));
  save();
  document.getElementById('ending-screen').classList.add('hidden');
  openModal(`<h3>💼 ${tr('Своя дорога','Your own path')}</h3>
    <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:16px;">${tr('Вы отказываетесь. Родители не привыкли уступать — с этого дня всё будет обходиться на 25% дороже, а компания отца начнёт бить по вашим сайтам DDoS-атаками.','You refuse. Your parents aren\'t used to giving in — from now on, everything costs 25% more, and your father\'s company will start hitting your sites with DDoS attacks.')}</p>
    <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:16px;">${tr('Новая цель:','New goal:')} ${tr('нарастить капитал до','grow your net worth to')} <b>${fmt(state.story.parentsTargetValue)}</b> ${tr('и полностью поглотить их бизнес-империю.','and fully absorb their business empire.')}</p>
    <div class="btn-row"><button class="btn btn-red btn-block" onclick="closeModal()">${tr('Принять вызов','Accept the challenge')}</button></div>`);
  toast(tr('💼 Цель: поглотить империю родителей — '+fmt(state.story.parentsTargetValue),'💼 Goal: absorb the parents\' empire — '+fmt(state.story.parentsTargetValue)));
}
// Checked once per in-game day (runDayRollover). Once the absorb-the-
// empire goal is met, the penalty lifts for good and the parents apologize.
function checkParentsAbsorption(){
  if(!state.story || state.story.parentsChoice !== 'declined' || state.story.parentsAbsorbed) return;
  if(netWorth() < state.story.parentsTargetValue) return;
  state.story.parentsAbsorbed = true;
  state.story.parentsPenalty = false;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.type!=='ddos'; });
  save(); renderEvents();
  log(`👨‍👩‍👦 ${tr('Империя родителей полностью поглощена — они признали вашу победу','The parents\' empire has been fully absorbed — they admit defeat')}`);
  setTimeout(()=>openModal(`<h3>👨‍👩‍👦 ${tr('Родители сдаются','The parents give in')}</h3>
    <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:16px;">${tr('«Мы были неправы, — говорят они. — Ты построил больше, чем мы когда-либо. Теперь мы работаем на тебя».','"We were wrong," they say. "You built more than we ever did. Now we work for you."')}</p>
    <p style="color:var(--dim);font-size:12.5px;">${tr('Штраф на цены снят навсегда.','The price penalty is gone for good.')}</p>
    <div class="btn-row"><button class="btn btn-violet btn-block" onclick="closeModal()">${tr('Отлично','Excellent')}</button></div>`), 400);
  toast('👨‍👩‍👦 '+tr('Родители сдаются!','The parents give in!'));
  playSound('achievement');
}

/* ---------- CEO SKILL TREE ---------- */
function buySkill(id){
  const sk = CEO_SKILLS.find(s=>s.id===id);
  if(!sk || hasSkill(id)) return;
  if((state.prestige.skillPoints||0) < sk.cost){ toast(tr('Недостаточно очков навыков','Not enough skill points')); playSound('error'); return; }
  state.prestige.skillPoints -= sk.cost;
  if(!state.prestige.skills) state.prestige.skills = {};
  state.prestige.skills[id] = true;
  log(tr(`🌟 Изучен навык CEO: ${sk.name}`,`🌟 CEO skill learned: ${sk.nameEn}`));
  toast(tr(`Навык изучен: ${sk.name}`,`Skill learned: ${sk.nameEn}`));
  playSound('achievement');
  save(); renderAll();
  openSkillTreeModal();
}
function openSkillTreeModal(){
  const pts = state.prestige.skillPoints||0;
  const rows = CEO_SKILLS.map(sk=>{
    const owned = hasSkill(sk.id);
    return `<div class="card glass" style="margin-bottom:8px;${owned?'opacity:.65;':''}">
      <div class="card-title">${sk.icon} ${tr(sk.name,sk.nameEn)} ${owned?'✅':''}</div>
      <div class="card-sub">${tr(sk.desc,sk.descEn)}</div>
      ${owned?'':`<div class="btn-row"><button class="btn btn-violet btn-block" ${pts<sk.cost?'disabled':''} onclick="buySkill('${sk.id}')">${tr(`Изучить за ${sk.cost} 🌟`,`Learn for ${sk.cost} 🌟`)}</button></div>`}
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
// Точка 10: авто-прокачка теперь тратит очки специализации на самый
// дешёвый доступный узел дерева (или повторяемый пост-капстоун узел),
// вместо кэша на треки напрямую — треки растут только так, вручную или
// автоматически.
function cheapestSpecPurchase(site){
  let best=null, bestCost=Infinity;
  SPEC_TREE_NODES.forEach(n=>{
    if(!specNodeAvailable(site,n)) return;
    if(n.cost<bestCost){ bestCost=n.cost; best={node:n}; }
  });
  const cap = trackMaxLevel(site);
  TRACK_ORDER.forEach(cat=>{
    if(!specTreeRepeatUnlocked(site,cat)) return;
    if((site.tracks[cat]||1)>=cap) return;
    const c = specTreeRepeatCost(site,cat);
    if(c<bestCost){ bestCost=c; best={repeat:true,category:cat}; }
  });
  return best ? Object.assign(best,{cost:bestCost}) : null;
}
function autoApplySpecPurchase(site, pick){
  const cap = trackMaxLevel(site);
  if(pick.repeat){
    const cat = pick.category;
    site.specPoints -= pick.cost;
    if(!site.specExtra) site.specExtra = {};
    site.specExtra[cat] = (site.specExtra[cat]||0)+1;
    const before = site.tracks[cat]||1;
    site.tracks[cat] = Math.min(cap, before+SPEC_TREE_REPEAT_LEVELS);
    maybeAnnounceTrackSynergy(site);
    return {category:cat, icon:TRACK_META[cat].icon, before, after:site.tracks[cat]};
  }
  const node = pick.node;
  site.specPoints -= pick.cost;
  site.specNodes.push(node.id);
  if(node.group) site.specLockedGroups[node.group] = node.id;
  const before = site.tracks[node.category]||1;
  site.tracks[node.category] = Math.min(cap, before+node.levels);
  maybeAnnounceTrackSynergy(site);
  if(node.risky) site.specPendingPenalties.push({nodeId:node.id, applyAt:Date.now()+node.delayMs, penalty:node.penalty});
  return {category:node.category, icon:TRACK_META[node.category].icon, before, after:site.tracks[node.category]};
}
function runAutoUpgrade(){
  if(!state.prestige.autoUpgrade) return;
  state.sites.forEach(site=>{
    const pick = cheapestSpecPurchase(site);
    if(!pick || (site.specPoints||0) < pick.cost) return;
    const r = autoApplySpecPurchase(site, pick);
    log(`🤖 Авто-прокачка: «${esc(site.name)}» ${r.icon} → ур. ${r.after}`);
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
  if(typeof idx==='number') refreshSiteViewSections(idx, ['automgr']);
  fxId('sv-automgr','fx-flip-in');
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function toggleSiteAutoManager(idx){
  const site = state.sites[idx];
  if(!site || !state.autoManagerUnlocked) return;
  site.autoManager = !site.autoManager;
  log(`🤖 Авто-менеджер «${esc(site.name)}»: ${site.autoManager?'включён':'выключен'}`);
  toast(site.autoManager ? '🤖 Авто-менеджер включён' : 'Авто-менеджер выключен');
  save();
  refreshSiteViewSections(idx, ['automgr']);
  if(site.autoManager) fxId('sv-automgr','fx-glow-blue');
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
    const pick = cheapestSpecPurchase(site);
    if(pick && (site.specPoints||0) >= pick.cost){
      const r = autoApplySpecPurchase(site, pick);
      log(`🧑‍💼 Авто-менеджер «${esc(site.name)}»: ${r.icon} → ур. ${r.after}`);
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
    if(e.type==='ddos' && e.targetUid===site.uid) mult *= (e.severity===2 ? 0.4 : 0.6);
    if(e.type==='viral' && e.category===type.category) mult *= 1.6;
    if(e.type==='blackfriday' && e.category===type.category) mult *= 1.3;
    if(e.type==='golden' && e.targetUid===site.uid) mult *= 3;
    if(e.type==='trustcrisis' && e.targetUid===site.uid) mult *= 0.6;
    if(e.type==='influencer' && e.signed && e.targetUid===site.uid) mult *= 3;
    if(e.type==='lawsuit' && e.targetUid===site.uid) mult *= 0.7;
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
  state.lifetimeStats.eventsTriggered = (state.lifetimeStats.eventsTriggered||0) + 1;
  const roll = Math.random();
  if(roll < 0.12) triggerHack();
  else if(roll < 0.22) triggerViral();
  else if(roll < 0.32) triggerBlackFriday();
  else if(roll < 0.40) triggerPoaching();
  else if(roll < 0.48) triggerMarketShock();
  else if(roll < 0.58) triggerPlatformWar();
  else if(roll < 0.66) triggerInfraDowntime();
  else if(roll < 0.74) triggerGoldenHour();
  else if(roll < 0.80) triggerTrustCrisis();
  else if(roll < 0.85) triggerBreakthrough();
  else if(roll < 0.91) triggerInfluencer();
  else if(roll < 0.96) triggerLawsuit();
  else triggerPartnership();
}
// ITEM 14: buying off an attack (hack/downtime/platform-war/DDoS/trust
// crisis/lawsuit) used to be priced purely off netWorth() — for a player
// whose wealth is mostly parked in stocks/real estate/estate rather than
// cash, that could be trivially cheap relative to what they actually had
// sitting in the bank, making "just pay it off" a non-choice. attackPayoff()
// adds a cash-relative floor on top of the existing net-worth-based one, so
// the payoff at the moment an attack lands always costs more than the cash
// on hand right then — the player has to actually let cash build up (or
// take the counter-attack/wait-it-out route) instead of paying from spare
// change every time.
function attackPayoff(floor, nwShare){
  const nwBased = Math.max(floor, netWorth()*nwShare);
  const cashFloor = (state.cash||0) * 1.15 + 1;
  return Math.round(Math.max(nwBased, cashFloor));
}
function triggerHack(){
  const candidates = state.sites.filter(function(s){ return !s.insured; });
  if(!candidates.length) return;
  const site = candidates[Math.floor(Math.random()*candidates.length)];
  if(state.activeEvents.some(function(e){ return e.type==='hack' && e.targetUid===site.uid; })) return;
  const duration = 60000 + Math.random()*60000;
  const payoff = attackPayoff(200, 0.01);
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
    const avgOther = (s.tracks.design + s.tracks.traffic) / 2;
    return s.tracks.infra < avgOther*0.5;
  });
}
function triggerInfraDowntime(){
  const candidates = infraRiskSites();
  if(!candidates.length) return;
  const site = candidates[Math.floor(Math.random()*candidates.length)];
  if(state.activeEvents.some(function(e){ return e.type==='downtime' && e.targetUid===site.uid; })) return;
  const duration = 45000 + Math.random()*45000;
  const payoff = attackPayoff(150, 0.006);
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
  const payoff = attackPayoff(250, 0.012);
  const counterCost = Math.round(payoff*0.4);
  state.activeEvents.push({id:genUid(), type:'platformwar', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, payoff:payoff, counterCost:counterCost, counterUsed:false, severity:1});
  toast('⚔️ Война платформ: конкурент атакует «'+site.name+'»!');
  log('⚔️ Конкурент развернул «войну платформ» против «'+site.name+'» — доход просел на время конфликта. Откупитесь, переждите или контратакуйте.');
  renderEvents();
}
/* ---------- FATHER'S DDoS ATTACKS (item 6) ----------
   Only fires while the player has declined the parents' reunion offer and
   is racing to absorb their empire (state.story.parentsChoice==='declined'
   && !state.story.parentsAbsorbed) — on top of the normal random-event
   pool, the father's company retaliates by DDoSing a random site. Unlike
   a regular hack it targets ANY site including insured ones (this is a
   personal vendetta, not opportunistic crime), and it offers the same
   pay-off/counter/wait choice as a platform war. */
const FATHER_DDOS_CHECK_INTERVAL_MS = 30000;
let nextFatherDdosRollAt = Date.now() + FATHER_DDOS_CHECK_INTERVAL_MS;
function fatherDdosActive(){
  return !!(state.story && state.story.parentsChoice==='declined' && !state.story.parentsAbsorbed);
}
function maybeTriggerFatherDdos(){
  if(!fatherDdosActive()) return;
  if(Date.now() < nextFatherDdosRollAt) return;
  nextFatherDdosRollAt = Date.now() + FATHER_DDOS_CHECK_INTERVAL_MS + Math.random()*FATHER_DDOS_CHECK_INTERVAL_MS;
  if(!state.sites.length || Math.random() > 0.5) return;
  triggerFatherDdos();
}
function triggerFatherDdos(){
  if(!state.sites.length) return;
  const site = state.sites[Math.floor(Math.random()*state.sites.length)];
  if(state.activeEvents.some(function(e){ return e.type==='ddos' && e.targetUid===site.uid; })) return;
  const duration = 50000 + Math.random()*40000;
  const payoff = attackPayoff(300, 0.015);
  const counterCost = Math.round(payoff*0.45);
  state.activeEvents.push({id:genUid(), type:'ddos', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, payoff:payoff, counterCost:counterCost, counterUsed:false, severity:1});
  toast(tr('💥 DDoS-атака от компании отца на «'+site.name+'»!','💥 DDoS attack from your father\'s company on "'+site.name+'"!'));
  log(tr('💥 Компания вашего отца обрушила DDoS-атаку на «'+site.name+'» — доход просел, и страховка тут не спасёт. Откупитесь, переждите или контратакуйте.','💥 Your father\'s company hit "'+site.name+'" with a DDoS attack — income is down, and insurance won\'t stop this one. Pay it off, wait it out, or counter-strike.'));
  renderEvents();
}
function payOffFatherDdos(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  if(state.cash < ev.payoff){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.payoff;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  log(tr('🛡️ DDoS-атаку на «'+ev.siteName+'» отбили за '+fmt(ev.payoff),'🛡️ DDoS attack on "'+ev.siteName+'" fended off for '+fmt(ev.payoff)));
  toast(tr('Атака отбита','Attack fended off'));
  save(); renderAll(); renderEvents();
}
function counterFatherDdos(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev || ev.counterUsed) return;
  if(state.cash < ev.counterCost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.counterCost;
  ev.counterUsed = true;
  if(Math.random() < 0.5){
    const reward = Math.round(ev.payoff*0.7);
    state.cash += reward;
    state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
    log(tr('⚔️ Ответный удар по компании отца сработал — отсужено '+fmt(reward),'⚔️ The counter-strike on your father\'s company worked — recovered '+fmt(reward)));
    toast(tr('🎉 Контратака удалась! +'+fmt(reward),'🎉 Counter-attack succeeded! +'+fmt(reward)));
    playSound('achievement');
    vibrateFeedback(15);
  } else {
    ev.severity = 2;
    ev.endsAt = Date.now() + 45000;
    log(tr('⚔️ Ответный удар провалился — отец надавил ещё жёстче','⚔️ The counter-strike failed — your father pushed even harder'));
    toast(tr('😬 Контратака провалилась...','😬 Counter-attack failed...'));
    playSound('error');
  }
  save(); renderAll(); renderEvents();
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
/* ---------- NEW EVENT CATALOG (spec 1.4) ----------
   Six additional twists on top of the original seven: two purely positive
   (golden hour, partnership), two negative (trust crisis, lawsuit), and
   two "opportunity" events that need an active decision within their
   window or the offer just lapses (breakthrough, influencer). */
function triggerGoldenHour(){
  if(!state.sites.length) return;
  const site = state.sites[Math.floor(Math.random()*state.sites.length)];
  if(state.activeEvents.some(function(e){ return e.type==='golden' && e.targetUid===site.uid; })) return;
  state.activeEvents.push({id:genUid(), type:'golden', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+30000});
  toast('🌟 Золотой час для «'+site.name+'»! Доход ×3 на 30с');
  log('🌟 Золотой час обрушился на «'+site.name+'» — доход ×3 на 30 секунд. Просто наслаждайтесь.');
  renderEvents();
}
function triggerTrustCrisis(){
  if(!state.sites.length) return;
  const site = state.sites[Math.floor(Math.random()*state.sites.length)];
  if(state.activeEvents.some(function(e){ return e.type==='trustcrisis' && e.targetUid===site.uid; })) return;
  const duration = 60000 + Math.random()*60000;
  const payoff = attackPayoff(300, 0.012);
  state.activeEvents.push({id:genUid(), type:'trustcrisis', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, payoff:payoff});
  state.reputationEventRep = (state.reputationEventRep||0) - 50;
  toast('😰 Кризис доверия у «'+site.name+'»! Доход −40%, репутация −50');
  log('😰 Кризис доверия ударил по «'+site.name+'» — доход −40% на время кризиса, репутация −50. PR-кампания снимет эффект раньше.');
  renderEvents(); renderAll();
}
function payOffTrustCrisis(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  if(state.cash < ev.payoff){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.payoff;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  log('📢 PR-кампания погасила кризис доверия у «'+ev.siteName+'» за '+fmt(ev.payoff));
  toast(tr('Кризис доверия погашен','Trust crisis resolved'));
  save(); renderAll(); renderEvents();
}
// Opportunity window: investing before it lapses permanently raises the
// site's track level cap by 1 (same field merges use), like a mini R&D win.
function triggerBreakthrough(){
  if(!state.sites.length) return;
  const site = state.sites[Math.floor(Math.random()*state.sites.length)];
  if(state.activeEvents.some(function(e){ return e.type==='breakthrough' && e.targetUid===site.uid; })) return;
  const duration = 60000 + Math.random()*30000;
  const cost = Math.round(Math.max(2000, netWorth()*0.02));
  state.activeEvents.push({id:genUid(), type:'breakthrough', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, cost:cost});
  toast('💡 Прорыв технологий на «'+site.name+'»! Можно вложиться в R&D');
  log('💡 На «'+site.name+'» открылась возможность технологического прорыва — инвестиция в R&D навсегда поднимет потолок треков на 1 уровень. Не вложитесь — окно закроется.');
  renderEvents();
}
function investBreakthrough(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  const site = state.sites.find(function(s){ return s.uid===ev.targetUid; });
  if(!site){ state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; }); renderEvents(); return; }
  if(state.cash < ev.cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.cost;
  site.trackCapBonus = (site.trackCapBonus||0) + 1;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  log('💡 Инвестиция в R&D на «'+ev.siteName+'» подняла потолок треков на 1 уровень навсегда');
  toast(tr('Технологический прорыв закреплён!','Tech breakthrough locked in!'));
  playSound('achievement'); vibrateFeedback(15);
  save(); renderAll(); renderEvents();
}
// Opportunity window: signing before it lapses buys a temporary income
// spike; ignored, the offer just moves on to someone else.
function triggerInfluencer(){
  if(!state.sites.length) return;
  const site = state.sites[Math.floor(Math.random()*state.sites.length)];
  if(state.activeEvents.some(function(e){ return e.type==='influencer' && e.targetUid===site.uid; })) return;
  const decisionWindow = 45000;
  const cost = Math.round(Math.max(1000, netWorth()*0.006));
  state.activeEvents.push({id:genUid(), type:'influencer', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+decisionWindow, cost:cost, signed:false});
  toast('📱 Инфлюенсер предлагает рекламу «'+site.name+'»!');
  log('📱 Инфлюенсер предложил разместить рекламу «'+site.name+'» — контракт за '+fmt(cost)+' даст доход ×3 на 60 секунд.');
  renderEvents();
}
function signInfluencer(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev || ev.signed) return;
  if(state.cash < ev.cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.cost;
  ev.signed = true;
  ev.endsAt = Date.now() + 60000;
  log('📱 Контракт с инфлюенсером подписан для «'+ev.siteName+'» — доход ×3 на 60с');
  toast(tr('Контракт подписан! Доход ×3 на 60с','Contract signed! Income ×3 for 60s'));
  playSound('buy');
  save(); renderAll(); renderEvents();
}
function triggerLawsuit(){
  if(!state.sites.length) return;
  const site = state.sites[Math.floor(Math.random()*state.sites.length)];
  if(state.activeEvents.some(function(e){ return e.type==='lawsuit' && e.targetUid===site.uid; })) return;
  const duration = 180000 + Math.random()*120000; // long, punishing if ignored — meant to be resolved, not waited out
  const payoff = attackPayoff(500, 0.018);
  state.activeEvents.push({id:genUid(), type:'lawsuit', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+duration, payoff:payoff});
  toast('⚖️ Судебный иск против «'+site.name+'»! Доход −30% до решения');
  log('⚖️ На «'+site.name+'» подали судебный иск — доход −30% до найма адвокатов ('+fmt(payoff)+').');
  renderEvents();
}
function payOffLawsuit(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  if(state.cash < ev.payoff){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= ev.payoff;
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  log('⚖️ Адвокаты закрыли иск против «'+ev.siteName+'» за '+fmt(ev.payoff));
  toast(tr('Иск закрыт','Lawsuit resolved'));
  save(); renderAll(); renderEvents();
}
// Opportunity window: accepting before it lapses is a free, permanent
// +50% income bonus on that one site — one per site (won't restack).
function triggerPartnership(){
  const candidates = state.sites.filter(function(s){ return !s.partnershipBonus; });
  if(!candidates.length) return;
  const site = candidates[Math.floor(Math.random()*candidates.length)];
  if(state.activeEvents.some(function(e){ return e.type==='partnership' && e.targetUid===site.uid; })) return;
  const decisionWindow = 40000;
  state.activeEvents.push({id:genUid(), type:'partnership', targetUid:site.uid, siteName:site.name, endsAt:Date.now()+decisionWindow});
  toast('🤝 Предложение о партнёрстве года для «'+site.name+'»!');
  log('🤝 «'+site.name+'» получил предложение стать «партнёром года» — примите его, чтобы навсегда поднять доход на 50%.');
  renderEvents();
}
function acceptPartnership(eventId){
  const ev = state.activeEvents.find(function(e){ return e.id===eventId; });
  if(!ev) return;
  const site = state.sites.find(function(s){ return s.uid===ev.targetUid; });
  state.activeEvents = state.activeEvents.filter(function(e){ return e.id!==eventId; });
  if(!site || site.partnershipBonus){ renderEvents(); return; }
  site.partnershipBonus = 0.5;
  log('🤝 «'+ev.siteName+'» стал партнёром года — доход +50% навсегда');
  toast(tr('Партнёрство года принято! +50% дохода навсегда','Partnership of the year accepted! +50% income forever'));
  playSound('achievement'); vibrateFeedback(20);
  save(); renderAll(); renderEvents();
}
// ITEM 16 FIX: this used to be duplicated — renderEvents() (dashboard card)
// had the full, correct per-type template for every event, but
// buildInboxActiveEventsHtml() (Inbox screen) had its own separate,
// stale copy that only knew how to render 'hack'/'downtime'/'platformwar'
// by name; everything added since (golden hour, trust crisis, breakthrough,
// influencer, lawsuit, partnership, father's DDoS) fell through to a
// generic branch that assumed a *category*-based event (viral/blackfriday)
// and read e.category — which those event types don't have — so they
// rendered with no readable label at all in the Inbox, and none of their
// pay-off/counter/accept buttons. Both places now call this one shared
// function, so a new event type only ever needs to be taught here once.
function buildEventRowHtml(e, idPrefix){
  idPrefix = idPrefix || '';
  const icons = {hack:'🦹', downtime:'⚠️', viral:'🔥', blackfriday:'🛍️', platformwar:'⚔️', golden:'🌟', trustcrisis:'😰', breakthrough:'💡', influencer:'📱', lawsuit:'⚖️', partnership:'🤝', ddos:'💥'};
  const secsLeft = Math.max(0, Math.round((e.endsAt-Date.now())/1000));
  const secsId = idPrefix+'ev-secs-'+e.id;
  if(e.type==='hack'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Атака на «'+esc(e.siteName)+'»','Attack on "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход −70%','income −70%')+'</div></div>'+
      '<button class="btn btn-red" style="flex:none;" onclick="payOffHack(\''+e.id+'\')">'+tr('Откупиться','Pay off')+' '+fmt(e.payoff)+'</button></div>';
  }
  if(e.type==='downtime'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Сбой на «'+esc(e.siteName)+'»','Outage at "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход −50%','income −50%')+'</div></div>'+
      '<button class="btn btn-red" style="flex:none;" onclick="payOffDowntime(\''+e.id+'\')">'+tr('Устранить','Fix')+' '+fmt(e.payoff)+'</button></div>';
  }
  if(e.type==='platformwar'){
    const pctLoss = e.severity===2 ? 55 : 35;
    return '<div class="card glass" style="margin-bottom:8px;border-color:rgba(255,69,58,.25);">'+
      '<div class="card-title">'+icons[e.type]+' '+tr('Война платформ: «'+esc(e.siteName)+'»','Platform war: "'+esc(e.siteName)+'"')+'</div>'+
      '<div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход −'+pctLoss+'%','income −'+pctLoss+'%')+(e.severity===2?tr(' (конкурент усилил атаку)',' (competitor escalated)'):'')+'</div>'+
      '<div class="btn-row">'+
        '<button class="btn btn-red btn-block" onclick="payOffPlatformWar(\''+e.id+'\')">'+tr('Откупиться','Pay off')+' '+fmt(e.payoff)+'</button>'+
        (e.counterUsed?'':'<button class="btn btn-amber btn-block" onclick="counterPlatformWar(\''+e.id+'\')">'+tr('Контратаковать','Counter-attack')+' '+fmt(e.counterCost)+'</button>')+
      '</div>'+
      '<div class="card-sub" style="margin-top:6px;">'+tr('Или просто переждите — конфликт сам сойдёт на нет через ~','Or just wait it out — the conflict fades on its own in ~')+'<span id="'+secsId+'-b">'+secsLeft+'</span>'+tr('с','s')+'</div>'+
      '</div>';
  }
  if(e.type==='ddos'){
    const pctLoss = e.severity===2 ? 60 : 40;
    return '<div class="card glass" style="margin-bottom:8px;border-color:rgba(255,69,58,.25);">'+
      '<div class="card-title">'+icons[e.type]+' '+tr('DDoS от компании отца: «'+esc(e.siteName)+'»','Father\'s company DDoS: "'+esc(e.siteName)+'"')+'</div>'+
      '<div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход','income')+' −'+pctLoss+'%'+(e.severity===2?tr(' (давление усилилось)',' (escalated)'):'')+'</div>'+
      '<div class="btn-row">'+
        '<button class="btn btn-red btn-block" onclick="payOffFatherDdos(\''+e.id+'\')">'+tr('Служба безопасности','Hire security')+' '+fmt(e.payoff)+'</button>'+
        (e.counterUsed?'':'<button class="btn btn-amber btn-block" onclick="counterFatherDdos(\''+e.id+'\')">'+tr('Контратаковать','Counter-strike')+' '+fmt(e.counterCost)+'</button>')+
      '</div>'+
      '<div class="card-sub" style="margin-top:6px;">'+tr('Или переждите — атака сама закончится через ~','Or wait it out — it ends on its own in ~')+'<span id="'+secsId+'-b">'+secsLeft+'</span>'+tr('с','s')+'</div>'+
      '</div>';
  }
  if(e.type==='golden'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Золотой час: «'+esc(e.siteName)+'»','Golden hour: "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход ×3, просто наслаждайтесь','income ×3, just enjoy it')+'</div></div></div>';
  }
  if(e.type==='trustcrisis'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Кризис доверия: «'+esc(e.siteName)+'»','Trust crisis: "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход −40%, репутация −50','income −40%, reputation −50')+'</div></div>'+
      '<button class="btn btn-red" style="flex:none;" onclick="payOffTrustCrisis(\''+e.id+'\')">'+tr('PR-кампания','PR campaign')+' '+fmt(e.payoff)+'</button></div>';
  }
  if(e.type==='breakthrough'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Прорыв технологий: «'+esc(e.siteName)+'»','Tech breakthrough: "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('+1 к потолку треков навсегда','+1 to track cap forever')+'</div></div>'+
      '<button class="btn btn-amber" style="flex:none;" onclick="investBreakthrough(\''+e.id+'\')">'+tr('Вложиться','Invest')+' '+fmt(e.cost)+'</button></div>';
  }
  if(e.type==='influencer'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Инфлюенсер: «'+esc(e.siteName)+'»','Influencer: "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+(e.signed?tr(' · доход ×3',' · income ×3'):tr(' · контракт даст доход ×3 на 60с',' · contract gives income ×3 for 60s'))+'</div></div>'+
      (e.signed?'':'<button class="btn btn-amber" style="flex:none;" onclick="signInfluencer(\''+e.id+'\')">'+tr('Контракт','Sign contract')+' '+fmt(e.cost)+'</button>')+'</div>';
  }
  if(e.type==='lawsuit'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Судебный иск: «'+esc(e.siteName)+'»','Lawsuit: "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход −30%','income −30%')+'</div></div>'+
      '<button class="btn btn-red" style="flex:none;" onclick="payOffLawsuit(\''+e.id+'\')">'+tr('Адвокаты','Lawyers')+' '+fmt(e.payoff)+'</button></div>';
  }
  if(e.type==='partnership'){
    return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+tr('Партнёрство года: «'+esc(e.siteName)+'»','Partnership of the year: "'+esc(e.siteName)+'"')+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('+50% дохода навсегда','+50% income forever')+'</div></div>'+
      '<button class="btn btn-amber" style="flex:none;" onclick="acceptPartnership(\''+e.id+'\')">'+tr('Принять','Accept')+'</button></div>';
  }
  const label = CATEGORY_META[e.category] ? L(CATEGORY_META[e.category],'name') : e.category;
  return '<div class="card-row" style="margin-bottom:8px;"><div style="flex:1"><div class="card-title">'+icons[e.type]+' '+label+'</div><div class="card-sub">'+tr('Осталось ~','~')+'<span id="'+secsId+'">'+secsLeft+'</span>'+tr('с','s')+' · '+tr('доход','income')+' '+(e.type==='viral'?'+60%':'+30%')+'</div></div></div>';
}
function renderEvents(){
  const card = document.getElementById('events-card');
  const section = document.getElementById('events-section');
  if(!card || !section) return;
  if(!state.activeEvents.length){ section.style.display = 'none'; card.innerHTML = ''; return; }
  section.style.display = '';
  card.innerHTML = state.activeEvents.map(function(e){ return buildEventRowHtml(e, ''); }).join('');
  fx(card,'fx-slide-down-in');
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
    // ITEM 16: patch both the dashboard card's countdowns (ev-secs-*) and
    // the Inbox screen's copy (inbox-ev-secs-*, see buildEventRowHtml's
    // idPrefix) — they're two separate DOM nodes for the same event now
    // that the Inbox shows full event detail too, not just a name.
    ['ev-secs-'+e.id, 'inbox-ev-secs-'+e.id].forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.textContent = secsLeft;
    });
    ['ev-secs-'+e.id+'-b', 'inbox-ev-secs-'+e.id+'-b'].forEach(function(id){
      const el = document.getElementById(id);
      if(el) el.textContent = secsLeft;
    });
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
  if(billsInGracePeriod()) return;
  ownedTaxCategories().forEach(function(cat){
    const due = Math.round(categoryIncomePerSec(cat) * GAME_DAY_SECONDS * state.taxes.rate);
    if(due <= 0) return;
    state.taxes.owed[cat] = (state.taxes.owed[cat]||0) + due;
    state.taxes.overdueDays[cat] = (state.taxes.overdueDays[cat]||0) + 1;
    if(state.taxes.overdueDays[cat] >= TAX_AUDIT_DAYS && !state.taxes.audited[cat]){
      state.taxes.audited[cat] = true;
      const label = CATEGORY_META[cat] ? L(CATEGORY_META[cat],'name') : cat;
      toast(`🧾 ${tr('Налоговая проверка','Tax audit')}: ${label}!`);
      log(`🧾 ${tr('Налоговая служба начала проверку категории','The tax authority opened an audit for category')} «${esc(label)}» — ${tr('доход снижен, пока долг не погашен','income is reduced until the debt is paid')}`);
      renderEvents();
      fxId('header-cash','fx-glow-red');
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
  fxId('header-cash','fx-check-draw');
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
/* ---------- ITEM 1: CALENDAR MODAL ----------
   Separate window showing the fast cosmetic date (see the CALENDAR block
   near GAME_DAY_SECONDS) plus a plain-language "when do I need to pay"
   list, built from the same underlying economic countdowns the Hosting/
   Payroll/Tax/Loan cards already track — just converted to calendar dates
   via econDaysToCalendarDays() so they read like real due dates instead of
   "in 3 game-days". */
function buildCalendarRowHtml(icon,title,sub,danger){
  return `<div class="card-row"><div style="flex:1"><div class="card-title">${icon} ${title}</div><div class="card-sub"${danger?' style="color:var(--red);"':''}>${sub}</div></div></div>`;
}
function buildCalendarHtml(){
  let rows = '';
  if(state.hosting){
    if(state.hosting.owed>0){
      rows += buildCalendarRowHtml('🌐',tr('Хостинг','Hosting'),`${tr('Долг','Overdue')}: ${fmt(state.hosting.owed)} — ${tr('оплатите в разделе «Хостинг»','pay it from the Hosting screen')}`,true);
    } else {
      const dueIn = HOSTING_PERIOD_DAYS - (state.day - state.hosting.lastAssessDay);
      const target = state.calendarDay + econDaysToCalendarDays(dueIn);
      rows += buildCalendarRowHtml('🌐',tr('Хостинг','Hosting'),`${tr('Следующий счёт','Next bill')}: ${formatCalendarDate(target)}`);
    }
  }
  if(state.payroll){
    if(state.payroll.owed>0){
      rows += buildCalendarRowHtml('💸',tr('Зарплата','Payroll'),`${tr('Долг','Overdue')}: ${fmt(state.payroll.owed)} — ${tr('оплатите в разделе «Зарплата»','pay it from the Payroll screen')}`,true);
    } else {
      const dueIn = PAYROLL_PERIOD_DAYS - (state.day - state.payroll.lastAssessDay);
      const target = state.calendarDay + econDaysToCalendarDays(dueIn);
      rows += buildCalendarRowHtml('💸',tr('Зарплата','Payroll'),`${tr('Следующее начисление','Next payroll')}: ${formatCalendarDate(target)}`);
    }
  }
  const taxOwed = totalTaxOwed();
  if(taxOwed>0){
    rows += buildCalendarRowHtml('🧾',tr('Налоги','Taxes'),`${tr('Долг','Overdue')}: ${fmt(taxOwed)} — ${tr('оплатите в разделе «Налоги»','pay it from the Taxes screen')}`,true);
  } else {
    rows += buildCalendarRowHtml('🧾',tr('Налоги','Taxes'),tr('Начисляются ежедневно, долгов нет','Accrue daily — no debt right now'));
  }
  if(state.hosting || state.payroll){
    // personal expenses have no fixed period (accrue daily like taxes) —
    // still worth a line so the window covers every recurring bill.
    if(state.personalExpenses && state.personalExpenses.owed>0){
      rows += buildCalendarRowHtml('🏠',tr('Личные расходы','Personal bills'),`${tr('Долг','Overdue')}: ${fmt(state.personalExpenses.owed)} — ${tr('оплатите в разделе «Финансы»','pay it from the Finance screen')}`,true);
    }
  }
  if(state.loan && state.loan.principal>0){
    if(state.loan.type==='lumpsum' && state.loan.dueDay!=null){
      const dueIn = state.loan.dueDay - state.day;
      const target = state.calendarDay + econDaysToCalendarDays(dueIn);
      rows += buildCalendarRowHtml('🏦',tr('Кредит','Loan'),`${tr('Погасить до','Repay by')} ${formatCalendarDate(target)} — ${fmt(state.loan.principal)}`);
    } else {
      rows += buildCalendarRowHtml('🏦',tr('Кредит','Loan'),`${tr('Проценты начисляются ежедневно','Interest accrues daily')} — ${fmt(state.loan.principal)}`);
    }
  }
  return `<div class="card glass" style="margin-bottom:12px;text-align:center;padding:16px;">
      <div style="font-size:12.5px;color:var(--dim);margin-bottom:4px;">${tr('Сегодня','Today')}</div>
      <div style="font-size:20px;font-weight:800;">📅 ${formatCalendarDate(state.calendarDay)}</div>
    </div>
    <div style="font-size:12.5px;color:var(--dim);margin:4px 2px 8px;">${tr('Когда платить','Upcoming payments')}</div>
    ${rows || `<div class="card-sub">${tr('Пока нет активных платежей','No upcoming bills yet')}</div>`}`;
}
function openCalendarModal(){ openModal(`<h3>📅 ${tr('Календарь','Calendar')}</h3><div id="calendar-modal-body">${buildCalendarHtml()}</div>`); }
function refreshCalendarModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('calendar-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildCalendarHtml();
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

/* ---------- PAYROLL (Phase 1 of the economy overhaul) ----------
   Every 30 in-game days, all hired staff (across every site) are due their
   monthly salary as a lump sum — mirrors the tax owed/overdue/audit shape
   above. Left unpaid too long, income takes a hit (same "audit" idea as
   taxes) until it's cleared. There's no forced bankruptcy yet — that's a
   later phase — so for now this is a real, felt cost without an instant
   game over. */
// [Пункт 4] Счета должны приходить чаще. Зарплата раньше приходила раз в 30
// игровых дней, теперь — раз в 10 (втрое чаще). employeeSalary() ниже сам
// вычисляет ставку через PAYROLL_PERIOD_DAYS, так что суммарная нагрузка на
// реальное время не меняется — просто дробится на более частые и мелкие счета.
const PAYROLL_PERIOD_DAYS = 10;
const PAYROLL_AUDIT_DAYS = 5; // consecutive days overdue before income starts suffering
function totalMonthlySalary(){
  return state.sites.reduce((sum,site)=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    if(!type) return sum;
    return sum + ensureStaffLevels(site).reduce((s,lv)=>s+employeeSalary(type, lv),0);
  }, 0);
}
function totalStaffCount(){ return state.sites.reduce((sum,site)=>sum+site.employees,0); }
// Called once per in-game day (from tick()'s day-rollover block), same spot assessDailyTaxes() runs from.
function assessPayroll(){
  if(!state.payroll) return;
  if(billsInGracePeriod()){ state.payroll.lastAssessDay = state.day; return; }
  const dueIn = PAYROLL_PERIOD_DAYS - (state.day - state.payroll.lastAssessDay);
  if(dueIn > 0) return;
  const due = totalMonthlySalary();
  state.payroll.lastAssessDay = state.day;
  if(due <= 0) return;
  state.payroll.owed += due;
  log(`💸 ${tr('Начислена зарплата персоналу','Staff payroll due')}: ${fmt(due)}`);
  toast(`💸 ${tr('Зарплата за месяц','Monthly payroll')}: ${fmt(due)}`);
  renderEvents();
}
// Overdue payroll accrues separately from the tax audit counter and hits
// income the same way an audited tax category does.
function assessPayrollOverdue(){
  if(!state.payroll) return;
  if(state.payroll.owed <= 0){ state.payroll.overdueDays = 0; state.payroll.audited = false; return; }
  state.payroll.overdueDays++;
  if(state.payroll.overdueDays >= PAYROLL_AUDIT_DAYS && !state.payroll.audited){
    state.payroll.audited = true;
    toast(`💸 ${tr('Персонал недоволен задержкой зарплаты!','Staff are unhappy about the pay delay!')}`);
    log(`💸 ${tr('Зарплата не выплачивается слишком долго — доход снижен, пока долг не погашен','Payroll has gone unpaid too long — income is reduced until it is cleared')}`);
    renderEvents();
  }
}
function payrollPenaltyMultiplier(){ return (state.payroll && state.payroll.audited) ? 0.75 : 1; }
function payPayroll(){
  if(!state.payroll) return;
  const owed = Math.round(state.payroll.owed);
  if(owed<=0) return;
  if(state.cash < owed){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= owed;
  state.payroll.owed = 0;
  state.payroll.overdueDays = 0;
  state.payroll.audited = false;
  log(`💸 ${tr('Зарплата выплачена','Payroll paid')} — ${fmt(owed)}`);
  toast(`💸 ${tr('Зарплата выплачена','Payroll paid')}: ${fmt(owed)}`);
  playSound('sell');
  save(); renderAll(); refreshPayrollModal();
}
function buildPayrollHtml(){
  if(!state.payroll) state.payroll = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  const monthly = totalMonthlySalary();
  const staffCount = totalStaffCount();
  const owed = Math.round(state.payroll.owed||0);
  const overdue = state.payroll.overdueDays||0;
  const audited = !!state.payroll.audited;
  const nextIn = Math.max(0, PAYROLL_PERIOD_DAYS - (state.day - state.payroll.lastAssessDay));
  return `<p style="color:var(--dim);font-size:12.5px;margin-bottom:12px;">${tr(`Раз в ${PAYROLL_PERIOD_DAYS} игровых дней весь нанятый персонал (сейчас ${staffCount} чел.) получает зарплату — сейчас это ${fmt(monthly)} за период. Если не платить ${PAYROLL_AUDIT_DAYS}+ дней подряд, доход падает на 25%, пока долг не закрыт.`,`Every ${PAYROLL_PERIOD_DAYS} in-game days, all hired staff (currently ${staffCount}) are due their salary — right now that's ${fmt(monthly)} per period. Leave it unpaid ${PAYROLL_AUDIT_DAYS}+ days in a row and income drops 25% until it's cleared.`)}</p>
    <div class="card glass" style="margin-bottom:10px;${audited?'border-color:rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
      <div class="card-row">
        <div class="card-icon">💸</div>
        <div style="flex:1">
          <div class="card-title">${tr('Фонд оплаты труда','Payroll')}</div>
          <div class="card-sub">${owed>0?`${tr('Долг','Owed')}: ${fmt(owed)}${overdue>0?' · '+overdue+' '+tr('дн.','d'):''}`:tr('Долгов нет','No debt')}${audited?' · 💸 '+tr('доход −25%','income −25%'):''}</div>
          <div class="card-sub">${tr('Следующее начисление через','Next due in')}: ${nextIn} ${tr('дн.','d')}</div>
        </div>
      </div>
      ${owed>0?`<div class="btn-row"><button class="btn btn-red btn-block" ${state.cash<owed?'disabled':''} onclick="payPayroll()">${tr('Выплатить','Pay')} ${fmt(owed)}</button></div>`:''}
    </div>`;
}
function openPayrollModal(){ openModal(`<h3>💸 ${tr('Зарплата персонала','Staff payroll')}</h3><div id="payroll-modal-body">${buildPayrollHtml()}</div>`); }
function refreshPayrollModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('payroll-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildPayrollHtml();
}
function renderPayrollCard(){
  const sub = document.getElementById('payroll-card-sub');
  if(!sub || !state.payroll) return;
  const owed = Math.round(state.payroll.owed||0);
  if(owed<=0) sub.textContent = tr('Долгов нет — всё оплачено','No debt — all paid up');
  else sub.textContent = `${tr('К уплате','Owed')}: ${fmt(owed)}${state.payroll.audited?' · 💸 '+tr('доход −25%','income −25%'):''}`;
}

/* ---------- HOSTING (Phase 2 of the economy overhaul) ----------
   Every site now costs money just to keep running — a recurring
   maintenance/hosting bill, independent of payroll. Same owed/overdue/audit
   shape as payroll and taxes above, but on its own shorter clock and with
   its own (harsher) income penalty, since an unpaid hosting bill risks the
   site itself going down, not just staff being unhappy. */
// [Пункт 4] Хостинг тоже приходит чаще: раньше раз в 10 игровых дней, теперь
// раз в 5 (вдвое чаще). В отличие от зарплаты, ставка siteHostingFee() ниже
// не выведена из HOSTING_PERIOD_DAYS сама по себе (это процент от baseCost,
// без привязки к периоду) — так что при простом уменьшении константы общая
// нагрузка на реальное время удвоилась бы незаметно для игрока. Чтобы этого
// не произошло, ставка домножена на HOSTING_PERIOD_DAYS/HOSTING_FEE_REF_DAYS:
// суммарная стоимость за то же реальное время не меняется, дробится на более
// частые и мелкие счета — как и просили.
const HOSTING_PERIOD_DAYS = 5;
const HOSTING_FEE_REF_DAYS = 10; // period the 0.025 base rate below was originally tuned for
const HOSTING_AUDIT_DAYS = 3;
function siteHostingFee(site, type){
  const infra = (site.tracks && site.tracks.infra) ? site.tracks.infra : 1;
  return Math.round(type.baseCost * 0.025 * (HOSTING_PERIOD_DAYS/HOSTING_FEE_REF_DAYS) * (1 + (infra-1)*0.05) * difficultyCostMult());
}
function totalHostingCost(){
  return state.sites.reduce(function(sum, site){
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    return sum + (type ? siteHostingFee(site, type) : 0);
  }, 0);
}
// Called once per in-game day (from tick()'s day-rollover block), same spot assessPayroll() runs from.
function assessHosting(){
  if(!state.hosting) return;
  if(billsInGracePeriod()){ state.hosting.lastAssessDay = state.day; return; }
  const dueIn = HOSTING_PERIOD_DAYS - (state.day - state.hosting.lastAssessDay);
  if(dueIn > 0) return;
  const due = totalHostingCost();
  state.hosting.lastAssessDay = state.day;
  if(due <= 0) return;
  state.hosting.owed += due;
  log(`🌐 ${tr('Начислен счёт за хостинг','Hosting bill due')}: ${fmt(due)}`);
  toast(`🌐 ${tr('Счёт за хостинг','Hosting bill')}: ${fmt(due)}`);
  renderEvents();
}
function assessHostingOverdue(){
  if(!state.hosting) return;
  if(state.hosting.owed <= 0){ state.hosting.overdueDays = 0; state.hosting.audited = false; return; }
  state.hosting.overdueDays++;
  if(state.hosting.overdueDays >= HOSTING_AUDIT_DAYS && !state.hosting.audited){
    state.hosting.audited = true;
    toast(`🌐 ${tr('Хостинг не оплачен — сайты теряют стабильность!','Hosting unpaid — sites are losing stability!')}`);
    log(`🌐 ${tr('Хостинг не оплачивается слишком долго — доход снижен, пока долг не погашен','Hosting has gone unpaid too long — income is reduced until it is cleared')}`);
    renderEvents();
  }
}
function hostingPenaltyMultiplier(){ return (state.hosting && state.hosting.audited) ? 0.7 : 1; }
function payHosting(){
  if(!state.hosting) return;
  const owed = Math.round(state.hosting.owed);
  if(owed<=0) return;
  if(state.cash < owed){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= owed;
  state.hosting.owed = 0;
  state.hosting.overdueDays = 0;
  state.hosting.audited = false;
  log(`🌐 ${tr('Хостинг оплачен','Hosting paid')} — ${fmt(owed)}`);
  toast(`🌐 ${tr('Хостинг оплачен','Hosting paid')}: ${fmt(owed)}`);
  playSound('sell');
  save(); renderAll(); refreshHostingModal();
}
function buildHostingHtml(){
  if(!state.hosting) state.hosting = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  const periodCost = totalHostingCost();
  const owed = Math.round(state.hosting.owed||0);
  const overdue = state.hosting.overdueDays||0;
  const audited = !!state.hosting.audited;
  const nextIn = Math.max(0, HOSTING_PERIOD_DAYS - (state.day - state.hosting.lastAssessDay));
  return `<p style="color:var(--dim);font-size:12.5px;margin-bottom:12px;">${tr(`Раз в ${HOSTING_PERIOD_DAYS} игровых дней приходит счёт за обслуживание и хостинг всех сайтов (сейчас ${state.sites.length}) — сейчас это ${fmt(periodCost)} за период. Если не платить ${HOSTING_AUDIT_DAYS}+ дней подряд, доход по всем сайтам падает на 30% — и это ещё и один из трёх признаков заброшенного бизнеса: вместе с непрокачанными треками и нехваткой сотрудников это может увести доход сайта в минус.`,`Every ${HOSTING_PERIOD_DAYS} in-game days a maintenance/hosting bill comes due for all your sites (currently ${state.sites.length}) — right now that's ${fmt(periodCost)} per period. Leave it unpaid ${HOSTING_AUDIT_DAYS}+ days in a row and income drops 30% across every site — and it's also one of three neglect signals: combined with under-leveled tracks and understaffing, it can push a site's income negative.`)}</p>
    <div class="card glass" style="margin-bottom:10px;${audited?'border-color:rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
      <div class="card-row">
        <div class="card-icon">🌐</div>
        <div style="flex:1">
          <div class="card-title">${tr('Хостинг и обслуживание','Hosting & maintenance')}</div>
          <div class="card-sub">${owed>0?`${tr('Долг','Owed')}: ${fmt(owed)}${overdue>0?' · '+overdue+' '+tr('дн.','d'):''}`:tr('Долгов нет','No debt')}${audited?' · 🌐 '+tr('доход −30%','income −30%'):''}</div>
          <div class="card-sub">${tr('Следующее начисление через','Next due in')}: ${nextIn} ${tr('дн.','d')}</div>
        </div>
      </div>
      ${owed>0?`<div class="btn-row"><button class="btn btn-red btn-block" ${state.cash<owed?'disabled':''} onclick="payHosting()">${tr('Оплатить','Pay')} ${fmt(owed)}</button></div>`:''}
    </div>`;
}
function openHostingModal(){ openModal(`<h3>🌐 ${tr('Хостинг','Hosting')}</h3><div id="hosting-modal-body">${buildHostingHtml()}</div>`); }
function refreshHostingModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('hosting-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildHostingHtml();
}
function renderHostingCard(){
  const sub = document.getElementById('hosting-card-sub');
  if(!sub || !state.hosting) return;
  const owed = Math.round(state.hosting.owed||0);
  if(owed<=0) sub.textContent = tr('Долгов нет — всё оплачено','No debt — all paid up');
  else sub.textContent = `${tr('К уплате','Owed')}: ${fmt(owed)}${state.hosting.audited?' · 🌐 '+tr('доход −30%','income −30%'):''}`;
  // CLEANUP (3): wires fx-wiggle as a lightweight nudge on the overdue-bill
  // amount, without the harsher tax-audit red glow (fx-glow-red) implying a
  // penalty is already active.
  const card = sub.closest('.card');
  if(card) card.classList.toggle('fx-wiggle', owed>0 && !state.hosting.audited);
}

/* ---------- PER-SITE HOSTING PLAN + UNIQUE DOMAIN ----------
   Distinct from the recurring hosting/maintenance bill above (that one is a
   flat infra upkeep cost shared across every site). This is an opt-in,
   per-site upgrade: pick a target audience size on a slider, prepay for it
   for a fixed number of in-game days, and income for that site scales with
   how many users it's actually built to serve. Buying a unique domain is a
   one-time purchase that adds a permanent slice of extra users on top.
   Tier 0 ("Shared hosting") is the free default every site starts on and
   costs nothing — so this is a pure upside layered on the existing income
   formula (see hostingCapacityMult() folded into siteIncome()), not a
   retroactive nerf to sites nobody has touched this on. */
// BUGFIX (1): hosting/domain is a "website" concept (server capacity, a
// domain name) — it doesn't make sense for the 'apps' vertical (mobile
// apps live in an app store, not on a domain) or 'neural' (a hosted model
// endpoint isn't priced like web traffic tiers), let alone games/crypto/
// industry businesses. The whole hosting section used to render for every
// business type unconditionally. HYBRID_TYPES don't carry an explicit
// .vertical field (see HYBRID_TYPES above) even though their id keeps the
// _sites/_apps/_neural suffix from HYBRID_RECIPES, so fall back to that.
function typeIsWebsite(type){
  if(!type) return false;
  if(type.vertical) return type.vertical==='sites';
  if(typeof type.id==='string' && type.id.endsWith('_sites')) return true;
  return false;
}
const HOSTING_TIERS = [
  {id:'shared',     icon:'🐌', label:'Общий хостинг',       labelEn:'Shared hosting',     maxUsers:5000,     mult:1.00},
  {id:'vps',        icon:'⚙️', label:'VPS',                 labelEn:'VPS',                 maxUsers:25000,    mult:1.12},
  {id:'cloud',      icon:'☁️', label:'Облачный хостинг',     labelEn:'Cloud hosting',      maxUsers:120000,   mult:1.28},
  {id:'dedicated',  icon:'🖥️', label:'Выделенный сервер',    labelEn:'Dedicated server',   maxUsers:500000,   mult:1.45},
  {id:'enterprise', icon:'🛰️', label:'Enterprise CDN',       labelEn:'Enterprise CDN',     maxUsers:2000000,  mult:1.65},
];
const HOSTING_PLAN_DURATIONS = [7, 30, 90]; // in-game days a prepaid plan lasts
const HOSTING_DOMAIN_USER_MULT = 1.08;      // permanent bonus once a unique domain is bought
// BUGFIX (2): cost used to be `type.baseCost * 0.006 * tierIdx`, i.e. it
// scaled LINEARLY with tier index (1,2,3,4) while the tiers' actual value
// (maxUsers, income mult) scales roughly 4-5x per step (5k → 25k → 120k →
// 500k → 2M users). The mismatch meant the top "Enterprise CDN" tier
// (2,000,000 users) cost barely more than "VPS" and was trivially
// affordable on any business, however small — reported as a $450/90-day
// price tag for 2M users. HOSTING_TIER_COST_MULT now grows steeply enough
// to roughly track the real jump in capacity between tiers, so reaching
// for the top tier is a genuine late-game spend again.
const HOSTING_TIER_COST_MULT = [0, 1, 5, 22, 90]; // index matches HOSTING_TIERS (0 unused: shared is free)
// ITEM 12: hosting/domain pricing is a flat function of (business type,
// tier) — it never drifts with state.day or with how many times a plan has
// been renewed, so it was already "one fixed price" in that sense. What
// item 12 actually asks for is raising that fixed price substantially: the
// regular tiers at least ×10, and the top "Enterprise CDN" tier specifically
// all the way to ×100 (an extra ×10 stacked on top of the general ×10,
// since it was already the most under-priced tier relative to its 2M-user
// capacity — see BUGFIX (2) above).
const HOSTING_PRICE_MULT = 10;                 // flat ×10 across every paid tier
const ENTERPRISE_TIER_IDX = 4;                 // 'enterprise' in HOSTING_TIERS
const HOSTING_ENTERPRISE_EXTRA_MULT = 10;      // stacks on HOSTING_PRICE_MULT → ×100 total for Enterprise CDN
function siteHostingPlanDailyCost(type, tierIdx){
  if(tierIdx<=0) return 0;
  const boostyDiscount = (state.boosty && state.boosty.unlocked) ? 0.8 : 1; // Boosty perk: cheaper hosting plans
  const tierCostMult = HOSTING_TIER_COST_MULT[tierIdx] || Math.pow(4.3, tierIdx);
  const enterpriseMult = tierIdx===ENTERPRISE_TIER_IDX ? HOSTING_ENTERPRISE_EXTRA_MULT : 1;
  return Math.round(type.baseCost * 0.006 * tierCostMult * HOSTING_PRICE_MULT * enterpriseMult * difficultyCostMult() * boostyDiscount);
}
// A prepaid plan lapses once its paid-through day passes — the site doesn't
// break, it just falls back to the free Shared tier until renewed.
function siteEffectiveHostingTierIdx(site){
  const t = site.hostingTier || 0;
  if(t<=0) return 0;
  if(site.hostingPaidUntilDay==null || state.day > site.hostingPaidUntilDay) return 0;
  return t;
}
// ITEM 12: domain price raised the same way — a flat, non-increasing price
// per business type, just substantially higher than before (×10).
const DOMAIN_PRICE_MULT = 10;
function siteDomainCost(type){ return Math.round(type.baseCost * 0.6 * DOMAIN_PRICE_MULT * difficultyCostMult()); }
// Folded into siteIncome()'s multiplier chain as hostingCapacityMult().
function hostingCapacityMult(site){
  const tier = HOSTING_TIERS[siteEffectiveHostingTierIdx(site)];
  const domainMult = site.domain ? HOSTING_DOMAIN_USER_MULT : 1;
  return (tier?tier.mult:1) * domainMult;
}
function buySiteHostingPlan(idx, tierIdx, days){
  const site = state.sites[idx]; if(!site) return;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId); if(!type || !typeIsWebsite(type)) return;
  tierIdx = Math.max(1, Math.min(HOSTING_TIERS.length-1, Math.round(tierIdx)));
  days = HOSTING_PLAN_DURATIONS.includes(days) ? days : HOSTING_PLAN_DURATIONS[0];
  const total = Math.round(siteHostingPlanDailyCost(type, tierIdx) * days);
  if(total>0 && state.cash<total){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= total;
  site.hostingTier = tierIdx;
  site.hostingPaidUntilDay = state.day + days;
  const tier = HOSTING_TIERS[tierIdx];
  log(`🌐 ${tr('Тариф хостинга','Hosting plan')} «${L(tier,'label')}» ${tr('для','for')} «${esc(site.name)}»: ${tr('оплачено на','paid for')} ${days} ${tr('дн.','d')} — ${fmt(total)}`);
  toast(`🌐 ${L(tier,'label')}: ${tr('оплачено','paid')} ${fmt(total)}`);
  playSound('buy');
  save(); refreshSiteViewSections(idx,['hosting']); renderAll();
}
function buySiteDomain(idx, nameInputId){
  const site = state.sites[idx]; if(!site || site.domain) return;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId); if(!type || !typeIsWebsite(type)) return;
  const cost = siteDomainCost(type);
  if(state.cash<cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  const el = document.getElementById(nameInputId);
  let raw = (el && el.value ? el.value : site.name).toLowerCase();
  raw = raw.replace(/[^a-z0-9-]+/g,'').slice(0,20);
  const VERT = SITE_VISUAL && SITE_VISUAL[tierIdOf(type.id)];
  const domainName = raw || (VERT && VERT.domainBase) || type.id;
  state.cash -= cost;
  site.domain = {name:domainName, boughtDay:state.day};
  log(`🌐 ${tr('Куплен уникальный домен','Unique domain purchased')}: ${domainName}.com (+${Math.round((HOSTING_DOMAIN_USER_MULT-1)*100)}% ${tr('пользователей','users')}) — ${fmt(cost)}`);
  toast(`🌐 ${domainName}.com — ${tr('куплено','purchased')}`);
  playSound('buy');
  save(); refreshSiteViewSections(idx,['hosting','page']); renderAll();
}
function buildHostingPlanHtml(idx){
  const site = state.sites[idx]; if(!site) return '';
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId); if(!type) return '';
  const effIdx = siteEffectiveHostingTierIdx(site);
  const effTier = HOSTING_TIERS[effIdx];
  const lapsed = (site.hostingTier||0) > 0 && effIdx === 0;
  const daysLeft = (site.hostingTier||0)>0 && site.hostingPaidUntilDay!=null ? Math.max(0, site.hostingPaidUntilDay - state.day) : 0;
  const sliderIdx = Math.max(1, site.hostingTier || 1); // slider defaults to the cheapest paid tier, not "shared"
  const previewTier = HOSTING_TIERS[sliderIdx];
  const domain = site.domain;
  return `
    <div id="sv-hosting-${idx}">
    <div class="card glass" style="margin-bottom:10px;">
      <div class="card-row">
        <div class="card-icon">${effTier.icon}</div>
        <div style="flex:1">
          <div class="card-title">${tr('Текущий тариф','Current plan')}: ${L(effTier,'label')}</div>
          <div class="card-sub">${tr('Ёмкость','Capacity')}: ${tr('до','up to')} ${effTier.maxUsers.toLocaleString('en-US')} ${tr('пользователей','users')} · ${tr('доход','income')} ×${effTier.mult.toFixed(2)}${domain?` · +${Math.round((HOSTING_DOMAIN_USER_MULT-1)*100)}% ${tr('от домена','from domain')}`:''}</div>
          ${(site.hostingTier||0)>0 ? `<div class="card-sub">${lapsed?`⚠️ ${tr('План истёк — сайт вернулся на общий хостинг','Plan lapsed — site is back on shared hosting')}`:`${tr('Оплачено ещё на','Paid for another')} ${daysLeft} ${tr('дн.','d')}`}</div>` : ''}
        </div>
      </div>
      <div style="margin:12px 2px 4px;">
        <input type="range" min="1" max="${HOSTING_TIERS.length-1}" step="1" value="${sliderIdx}" style="width:100%;"
          oninput="updateHostingSliderPreview(${idx}, this.value)" />
        <div id="sv-hosting-preview-${idx}" style="font-size:12.5px;color:var(--dim);text-align:center;">${previewTier.icon} ${L(previewTier,'label')} — ${tr('до','up to')} ${previewTier.maxUsers.toLocaleString('en-US')} ${tr('пользователей','users')}</div>
      </div>
      <div class="card-sub" style="margin-bottom:8px;">${tr('Выберите срок предоплаты','Choose a prepay term')}:</div>
      <div class="btn-row" id="sv-hosting-durbtns-${idx}">${buildHostingDurationButtonsHtml(idx, sliderIdx)}</div>
    </div>
    <div class="card glass">
      <div class="card-row">
        <div class="card-icon">🔗</div>
        <div style="flex:1">
          <div class="card-title">${tr('Уникальный домен','Unique domain')}</div>
          <div class="card-sub">${domain?`✅ ${domain.name}.com — ${tr('уже подключён','already connected')}`:tr(`Разовая покупка: постоянно +${Math.round((HOSTING_DOMAIN_USER_MULT-1)*100)}% пользователей`,`One-time purchase: a permanent +${Math.round((HOSTING_DOMAIN_USER_MULT-1)*100)}% users`)}</div>
        </div>
      </div>
      ${domain?'':`<div class="btn-row" style="margin-top:8px;align-items:center;">
        <input type="text" id="sv-domain-input-${idx}" class="set-select" style="flex:1;" placeholder="${esc(site.name.toLowerCase().replace(/[^a-z0-9]+/g,''))||'mysite'}" maxlength="20" />
        <button class="btn btn-violet" ${state.cash<siteDomainCost(type)?'disabled':''} onclick="buySiteDomain(${idx}, 'sv-domain-input-${idx}')">${tr('Купить','Buy')} — ${fmt(siteDomainCost(type))}</button>
      </div>`}
    </div>
    </div>`;
}
function buildHostingDurationButtonsHtml(idx, tierIdx){
  const site = state.sites[idx]; if(!site) return '';
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId); if(!type) return '';
  tierIdx = Math.max(1, Math.round(Number(tierIdx)||1));
  return HOSTING_PLAN_DURATIONS.map(d=>{
    const cost = Math.round(siteHostingPlanDailyCost(type, tierIdx)*d);
    return `<button class="btn btn-outline" ${state.cash<cost?'disabled':''} onclick="buySiteHostingPlan(${idx}, ${tierIdx}, ${d})">${d}${tr('дн','d')} — ${fmt(cost)}</button>`;
  }).join('');
}
function updateHostingSliderPreview(idx, tierIdx){
  const t = HOSTING_TIERS[Math.round(Number(tierIdx))];
  if(!t) return;
  const preview = document.getElementById('sv-hosting-preview-'+idx);
  if(preview) preview.textContent = `${t.icon} ${L(t,'label')} — ${tr('до','up to')} ${t.maxUsers.toLocaleString('en-US')} ${tr('пользователей','users')}`;
  const durBtns = document.getElementById('sv-hosting-durbtns-'+idx);
  if(durBtns) durBtns.innerHTML = buildHostingDurationButtonsHtml(idx, tierIdx);
}

/* ---------- MAIL (item 14) ----------
   Unified mailbox: business-purchase offers (replaces the old manual
   "sell business" button — buyers come to you instead) and recurring
   personal life bills (item 15, see PERSONAL EXPENSES below). Rendered
   inside the existing Inbox screen, see buildInboxMailHtml(). */
const MAIL_OFFER_BUYERS = ['Meridian Capital','Northgate Holdings','Orion Ventures','Silvermark Group','Atlas Partners','Blue Harbor Fund','Vantage Equity','Ironwood Partners'];
const MAIL_OFFER_CHANCE = 0.16;          // per in-game day
const MAIL_MAX_OPEN_OFFERS = 2;
const MAIL_OFFER_EXPIRE_DAYS = 3;
const MAIL_MAX_ITEMS = 40;
function ensureMailbox(){ if(!Array.isArray(state.mailbox)) state.mailbox = []; }
function genMailId(){ return 'mail'+Date.now()+Math.floor(Math.random()*10000); }
function trimMailbox(){ if(state.mailbox.length>MAIL_MAX_ITEMS) state.mailbox = state.mailbox.slice(0,MAIL_MAX_ITEMS); }
// A real buyer pays more than the old scrap-value sellSite() ever did —
// that function stays in place (siteSellValue()/sellSite()) purely as the
// pricing base for these offers now.
function maybeGenerateBusinessOffer(){
  ensureMailbox();
  if(!state.sites.length) return;
  const openOffers = state.mailbox.filter(m=>m.type==='offer' && !m.resolved);
  if(openOffers.length >= MAIL_MAX_OPEN_OFFERS) return;
  if(Math.random() > MAIL_OFFER_CHANCE) return;
  const candidates = state.sites.filter(s=>!openOffers.some(m=>m.siteUid===s.uid));
  if(!candidates.length) return;
  const site = candidates[Math.floor(Math.random()*candidates.length)];
  const idx = state.sites.indexOf(site);
  const base = siteSellValue(idx);
  const mult = 1.4 + Math.random()*1.1; // 1.4x–2.5x liquidation value
  const price = Math.max(1, Math.round(base*mult));
  state.mailbox.unshift({
    id: genMailId(), type:'offer', siteUid: site.uid, siteName: site.name,
    buyer: MAIL_OFFER_BUYERS[Math.floor(Math.random()*MAIL_OFFER_BUYERS.length)],
    price, day: state.day, expiresDay: state.day+MAIL_OFFER_EXPIRE_DAYS, resolved:false,
  });
  trimMailbox();
  refreshInboxBadge();
}
// Self-initiated sale (item 5): the player can ask around for a buyer
// instead of only waiting for one to show up on its own. Still resolved
// through the same mailbox "offer" flow — this just forces one to appear
// for a specific site, on a short per-site cooldown so it can't be spammed
// to fish for a better price every tick.
const SELF_OFFER_COOLDOWN_DAYS = 3;
function canRequestBusinessOffer(idx){
  ensureMailbox();
  const site = state.sites[idx];
  if(!site) return {ok:false, reason:tr('Бизнес не найден','Business not found')};
  const openOffers = state.mailbox.filter(m=>m.type==='offer' && !m.resolved);
  if(openOffers.some(m=>m.siteUid===site.uid)) return {ok:false, reason:tr('По этому бизнесу уже есть предложение в почте','There is already an offer for this business in your mail')};
  if(openOffers.length >= MAIL_MAX_OPEN_OFFERS) return {ok:false, reason:tr('Слишком много предложений в почте — сначала разберитесь с ними','Too many offers in your mail already — deal with those first')};
  if(typeof site.lastOfferRequestDay==='number' && state.day - site.lastOfferRequestDay < SELF_OFFER_COOLDOWN_DAYS){
    const left = SELF_OFFER_COOLDOWN_DAYS - (state.day - site.lastOfferRequestDay);
    return {ok:false, reason:tr(`Можно снова искать покупателя через ${left} игр. дн.`,`You can look for a buyer again in ${left} in-game days`)};
  }
  return {ok:true};
}
function requestBusinessOffer(idx){
  const site = state.sites[idx];
  if(!site) return;
  const check = canRequestBusinessOffer(idx);
  if(!check.ok){ toast(check.reason); playSound('error'); return; }
  const base = siteSellValue(idx);
  const mult = 1.1 + Math.random()*0.9; // 1.1x–2.0x — a bit less generous than an unsolicited offer
  const price = Math.max(1, Math.round(base*mult));
  state.mailbox.unshift({
    id: genMailId(), type:'offer', siteUid: site.uid, siteName: site.name,
    buyer: MAIL_OFFER_BUYERS[Math.floor(Math.random()*MAIL_OFFER_BUYERS.length)],
    price, day: state.day, expiresDay: state.day+MAIL_OFFER_EXPIRE_DAYS, resolved:false,
  });
  site.lastOfferRequestDay = state.day;
  trimMailbox();
  log(`📤 ${tr('Запрошено предложение о покупке','Requested a buyer offer')}: «${esc(site.name)}»`);
  toast(tr('Покупатель откликнулся — проверьте почту','A buyer responded — check your mail'));
  playSound('buy');
  refreshInboxBadge();
  refreshSiteViewSections(idx, ['investor']);
  save(); renderAll();
}
/* ---------- ITEM 6: BUYER LIST — richest & not-so-rich businesses ----------
   Besides the NPC leaderboard (competitors the player can buy from) this is
   the mirror image: a browsable list of outside businesses the player can
   approach to sell to. "Rich" buyers pay a premium but only bother replying
   once the business being sold is worth enough to interest them; "modest"
   buyers pay less but are always interested, no matter how small the
   business is. Picking one still goes through the same mailbox "offer"
   flow/cooldown as requestBusinessOffer() — this just lets the player pick
   who gets approached instead of getting a random name. */
const BUSINESS_BUYERS_RICH = [
  {name:'Meridian Capital',   icon:'🏦', mult:2.1, minValue:15000},
  {name:'Titan Industries',   icon:'🏭', mult:2.4, minValue:50000},
  {name:'Blackrose Holdings', icon:'💎', mult:2.7, minValue:150000},
  {name:'Vantage Equity',     icon:'🚀', mult:3.1, minValue:400000},
];
const BUSINESS_BUYERS_MODEST = [
  {name:'Соседский Инвест',    icon:'🏠', mult:0.75},
  {name:'СтартАп Партнёрс',    icon:'🌱', mult:0.9},
  {name:'Локальный Фонд',      icon:'🪙', mult:1.05},
  {name:'Гараж Кэпитал',       icon:'🔧', mult:1.2},
];
function buyerOfferPrice(idx, buyer){
  const base = siteSellValue(idx);
  const variance = 0.9 + Math.random()*0.2; // ±10%
  return Math.max(1, Math.round(base*buyer.mult*variance));
}
function buildBuyersListHtml(idx){
  const site = state.sites[idx];
  if(!site) return '';
  const base = siteSellValue(idx);
  const checkGeneral = canRequestBusinessOffer(idx);
  function row(b, isRich){
    const locked = isRich && base < b.minValue;
    const price = buyerOfferPrice(idx, b);
    const disabled = locked || !checkGeneral.ok;
    const lockNote = locked ? `<div class="card-sub" style="color:var(--orange);margin-top:4px;">${tr('Пока не интересуется бизнесом дешевле','Not interested in a business worth less than')} ${fmt(b.minValue)}</div>` : '';
    return `<div class="card glass" style="margin-bottom:8px;padding:10px 12px;">
      <div class="card-row">
        <div class="card-icon" style="font-size:15px;">${b.icon}</div>
        <div style="flex:1"><div class="card-title">${esc(b.name)}</div><div class="card-sub">${tr('Ориентировочно','Roughly')} ~${fmt(price)}</div></div>
      </div>${lockNote}
      <div class="btn-row" style="margin-top:8px;"><button class="btn btn-outline btn-block" ${disabled?'disabled':''} onclick="proposeToBuyer(${idx},'${esc(b.name).replace(/'/g,"\\'")}')">${tr('Предложить сделку','Propose a deal')}</button></div>
    </div>`;
  }
  const generalNote = !checkGeneral.ok ? `<p style="color:var(--orange);font-size:12px;margin-bottom:12px;">${checkGeneral.reason}</p>` : '';
  return `<h3>💰 ${tr('Богатые компании','Rich companies')}</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${tr('Платят больше, но берутся только за бизнес, который уже что-то стоит','Pay more, but only bother with a business that\u2019s already worth something')}</p>
    ${BUSINESS_BUYERS_RICH.map(b=>row(b,true)).join('')}
    <h3 style="margin-top:16px;">🪙 ${tr('Небогатые компании','Not-so-rich companies')}</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${tr('Платят меньше, но готовы купить любой бизнес прямо сейчас','Pay less, but happy to buy any business right now')}</p>
    ${BUSINESS_BUYERS_MODEST.map(b=>row(b,false)).join('')}
    ${generalNote}`;
}
function openBuyersListModal(idx){
  openModal('<div id="buyers-modal-body">'+buildBuyersListHtml(idx)+'</div>'+
    '<div class="btn-row" style="margin-top:8px;"><button class="btn btn-outline btn-block" onclick="closeModal()">'+tr('Закрыть','Close')+'</button></div>');
}
function refreshBuyersModal(idx){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('buyers-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildBuyersListHtml(idx);
}
function proposeToBuyer(idx, buyerName){
  const site = state.sites[idx];
  if(!site) return;
  const check = canRequestBusinessOffer(idx);
  if(!check.ok){ toast(check.reason); playSound('error'); return; }
  const buyer = BUSINESS_BUYERS_RICH.find(b=>b.name===buyerName) || BUSINESS_BUYERS_MODEST.find(b=>b.name===buyerName);
  if(!buyer) return;
  const base = siteSellValue(idx);
  if(BUSINESS_BUYERS_RICH.includes(buyer) && base < buyer.minValue){
    toast(tr('Эта компания пока не заинтересована','This company isn\u2019t interested yet')); playSound('error'); return;
  }
  const price = buyerOfferPrice(idx, buyer);
  state.mailbox.unshift({
    id: genMailId(), type:'offer', siteUid: site.uid, siteName: site.name,
    buyer: buyerName, price, day: state.day, expiresDay: state.day+MAIL_OFFER_EXPIRE_DAYS, resolved:false,
  });
  site.lastOfferRequestDay = state.day;
  trimMailbox();
  log(`📤 ${tr('Предложение отправлено','Deal proposed to')} ${esc(buyerName)}: «${esc(site.name)}»`);
  toast(tr('Предложение отправлено — проверьте почту','Offer sent — check your mail'));
  playSound('buy');
  refreshInboxBadge();
  closeModal();
  refreshSiteViewSections(idx, ['investor']);
  save(); renderAll();
}
function expireOldMail(){
  ensureMailbox();
  let changed = false;
  state.mailbox.forEach(m=>{
    if((m.type==='offer'||m.type==='startup') && !m.resolved && state.day>m.expiresDay){ m.resolved = true; m.expired = true; changed = true; }
  });
  if(changed) refreshInboxBadge();
}
function acceptBusinessOffer(id){
  ensureMailbox();
  const m = state.mailbox.find(x=>x.id===id);
  if(!m || m.type!=='offer' || m.resolved) return;
  const idx = state.sites.findIndex(s=>s.uid===m.siteUid);
  if(idx===-1){ m.resolved = true; m.expired = true; toast(tr('Этот бизнес уже недоступен','That business is no longer available')); save(); renderInbox(); return; }
  const site = state.sites[idx];
  state.cash += m.price;
  log(`📬 ${tr('Продан бизнес','Sold business')} «${esc(site.name)}» ${tr('покупателю','to')} ${esc(m.buyer)} ${tr('за','for')} ${fmt(m.price)}`);
  toast(`💰 +${fmt(m.price)}`);
  playSound('sell'); vibrateFeedback(20);
  state.sites.splice(idx,1);
  m.resolved = true; m.accepted = true;
  closeSiteView();
  save(); renderAll(); renderInbox();
}
function declineBusinessOffer(id){
  ensureMailbox();
  const m = state.mailbox.find(x=>x.id===id);
  if(!m) return;
  m.resolved = true; m.accepted = false;
  toast(tr('Предложение отклонено','Offer declined'));
  save(); renderInbox();
}

/* ---------- PERSONAL LIFE EXPENSES (item 15) ----------
   The player's own cost of living — separate from business taxes/payroll/
   hosting. Assessed once per in-game day as a single bundled mail bill
   (rent+food+health+personal tax). Left unpaid too long it doesn't force
   cash negative — it burns the player out (small income penalty), same
   shape as the existing hosting/payroll-overdue pattern. */
const PERSONAL_AUDIT_DAYS = 5;
function ensurePersonalExpenses(){
  if(!state.personalExpenses) state.personalExpenses = {owed:0, overdueDays:0, audited:false, lastAssessDay:state.day, history:[]};
}
function assessPersonalExpenses(){
  ensurePersonalExpenses(); ensureMailbox();
  if(state.billGraceUntilDay && state.day < state.billGraceUntilDay) return; // first-session grace period, same as taxes/payroll/hosting
  // ITEM 7: personal bills now grow together with income, not just with the
  // day counter/property index — rent/food/health each pick up a small
  // extra slice of today's income on top of their old baseline, alongside
  // the existing income-based personal tax.
  const todayIncome = state.finance ? state.finance.todayIncome : 0;
  const rent = Math.round(30 * state.propertyIndex + state.day*0.12 + todayIncome*0.01);
  const food = Math.round(12 + state.day*0.04 + todayIncome*0.005);
  const health = Math.round(8 + todayIncome*0.002 + (Math.random()<0.05 ? 35+Math.random()*110 : 0)); // occasional medical bill
  const tax = Math.round(todayIncome * 0.03);
  const amount = rent+food+health+tax;
  if(amount<=0) return;
  state.personalExpenses.owed += amount;
  state.personalExpenses.history.push({day:state.day, rent, food, health, tax, amount});
  if(state.personalExpenses.history.length>14) state.personalExpenses.history.shift();
  state.mailbox.unshift({id:genMailId(), type:'bill', day:state.day, breakdown:{rent,food,health,tax}, amount, paid:false});
  trimMailbox();
  refreshInboxBadge();
}
function assessPersonalExpensesOverdue(){
  ensurePersonalExpenses();
  if(state.personalExpenses.owed<=0){ state.personalExpenses.overdueDays = 0; state.personalExpenses.audited = false; return; }
  state.personalExpenses.overdueDays++;
  if(state.personalExpenses.overdueDays >= PERSONAL_AUDIT_DAYS && !state.personalExpenses.audited){
    state.personalExpenses.audited = true;
    toast(`🧾 ${tr('Личные счета не оплачены — выгорание снижает доход!','Personal bills unpaid — burnout is cutting into income!')}`);
    log(`🧾 ${tr('Аренда/еда/налоги копятся слишком долго — доход снижен, пока долг не погашен','Rent/food/taxes have piled up too long — income is reduced until it is cleared')}`);
  }
}
function personalExpensePenaltyMultiplier(){ return (state.personalExpenses && state.personalExpenses.audited) ? 0.9 : 1; }
function payLifeBill(id){
  ensureMailbox(); ensurePersonalExpenses();
  const m = state.mailbox.find(x=>x.id===id);
  if(!m || m.type!=='bill' || m.paid) return;
  if(state.cash < m.amount){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= m.amount;
  m.paid = true;
  state.personalExpenses.owed = Math.max(0, state.personalExpenses.owed - m.amount);
  log(`🧾 ${tr('Оплачены личные счета','Paid personal bills')}: ${fmt(m.amount)}`);
  toast(`🧾 -${fmt(m.amount)}`);
  playSound('sell');
  save(); renderAll(); renderInbox(); refreshFinanceDetailModal();
}
function payAllLifeBills(){
  ensureMailbox(); ensurePersonalExpenses();
  const owed = Math.round(state.personalExpenses.owed);
  if(owed<=0) return;
  if(state.cash < owed){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= owed;
  state.mailbox.forEach(m=>{ if(m.type==='bill' && !m.paid) m.paid = true; });
  state.personalExpenses.owed = 0;
  state.personalExpenses.overdueDays = 0;
  state.personalExpenses.audited = false;
  log(`🧾 ${tr('Оплачены все личные счета','Paid off all personal bills')}: ${fmt(owed)}`);
  toast(`🧾 -${fmt(owed)}`);
  playSound('sell');
  save(); renderAll(); renderInbox(); refreshFinanceDetailModal();
}
/* ---------- ITEM 12: business status + interviews + startup offers ----------
   A second, action-earned reputation stat (state.businessStatus, 0-100)
   separate from the luxury-collection "статус" ladder. It moves only in
   response to how you answer the provocative business-interview questions
   below — correct answers raise it, wrong ones lower it. It gates the
   NEW "startup for sale" mail type (sellers refuse to sell to you if your
   status is too low), while the existing "offer" mail type (buyers wanting
   to buy YOUR business) stays untouched. */
const BUSINESS_STATUS_START = 55;
const BUSINESS_STATUS_MAX = 100;
const BUSINESS_STATUS_MIN = 0;
const BUSINESS_STATUS_GAIN = 8;
const BUSINESS_STATUS_LOSS = 12;
function ensureBusinessStatus(){ if(typeof state.businessStatus !== 'number') state.businessStatus = BUSINESS_STATUS_START; }
const BUSINESS_STATUS_TIERS = [
  {min:0,  icon:'🌱', name:'Новичок',           nameEn:'Newcomer'},
  {min:30, icon:'🤝', name:'Обычный партнёр',   nameEn:'Average partner'},
  {min:60, icon:'💼', name:'Надёжный партнёр',  nameEn:'Trusted partner'},
  {min:85, icon:'👑', name:'Легенда переговоров',nameEn:'Negotiation legend'},
];
function businessStatusTier(status){ let t=BUSINESS_STATUS_TIERS[0]; for(const x of BUSINESS_STATUS_TIERS){ if(status>=x.min) t=x; else break; } return t; }
// Bilingual bank of provocative business-ethics/strategy questions. Each has
// exactly one "correct" (sound long-term business judgment) option — the
// others are tempting-but-shortsighted or outright unethical, which is what
// makes them "provocative" rather than trivia.
const INTERVIEW_QUESTIONS = [
  {id:'q1', q:'Конкурент обрушил цены вдвое, чтобы выдавить вас с рынка. Что делаете?', qEn:'A rival just halved prices to push you out of the market. What do you do?',
    options:[
      {t:'Тоже уйти в минус и переждать', tEn:'Match the loss and wait it out'},
      {t:'Удержать цену, но усилить сервис и удержание клиентов', tEn:'Hold price, invest in service and retention instead'},
      {t:'Сразу продать бизнес и уйти с рынка', tEn:'Sell out and leave the market immediately'}],
    correct:1},
  {id:'q2', q:'Журналист спрашивает про слухи о плохих условиях труда у вас. Ваш комментарий?', qEn:'A reporter asks about rumors of poor working conditions at your company. Your response?',
    options:[
      {t:'Просто не отвечать', tEn:'Just don\'t respond'},
      {t:'Публично всё отрицать, не проверяя', tEn:'Deny everything publicly without checking'},
      {t:'Провести проверку и дать честный комментарий', tEn:'Look into it and give an honest comment'}],
    correct:2},
  {id:'q3', q:'Инвестор даёт деньги, но требует 60% компании и место в правлении. Соглашаетесь?', qEn:'An investor offers cash but wants 60% of the company and a board seat. Do you agree?',
    options:[
      {t:'Да, деньги важнее контроля', tEn:'Yes, cash matters more than control'},
      {t:'Нет — обсудить меньшую долю или отказаться', tEn:'No — negotiate a smaller stake or walk away'},
      {t:'Взять деньги, а условия не выполнять', tEn:'Take the money and quietly ignore the terms'}],
    correct:1},
  {id:'q4', q:'Сотрудник допустил ошибку, стоившую компании денег. Как реагируете?', qEn:'An employee made a mistake that cost the company money. How do you react?',
    options:[
      {t:'Публично отчитать перед всеми', tEn:'Call them out publicly in front of everyone'},
      {t:'Разобрать ошибку лично и помочь не повторить её', tEn:'Go over it privately and help them avoid repeating it'},
      {t:'Сразу уволить', tEn:'Fire them on the spot'}],
    correct:1},
  {id:'q5', q:'Продажи упали на 20% за квартал. Первый шаг?', qEn:'Sales dropped 20% this quarter. What\'s your first move?',
    options:[
      {t:'Урезать маркетинг, чтобы сэкономить', tEn:'Cut marketing spend to save cash'},
      {t:'Разобрать данные и найти реальную причину', tEn:'Dig into the numbers and find the real cause'},
      {t:'Обвинить рынок и не менять ничего', tEn:'Blame the market and change nothing'}],
    correct:1},
  {id:'q6', q:'Чиновник намекает, что за взятку разрешение придёт быстрее. Ваш ответ?', qEn:'An official hints that a bribe would speed up your permit. Your answer?',
    options:[
      {t:'Заплатить — так делают все', tEn:'Pay up — everyone does it'},
      {t:'Отказаться и пройти официальную процедуру', tEn:'Refuse and go through the official process'},
      {t:'Заплатить, но через посредника', tEn:'Pay, but route it through a middleman'}],
    correct:1},
  {id:'q7', q:'Клиент требует возврат денег, хотя по правилам возврат не положен. Что делаете?', qEn:'A customer demands a refund that\'s against your stated policy. What do you do?',
    options:[
      {t:'Отказать без объяснений', tEn:'Refuse with no explanation'},
      {t:'Разобраться в ситуации и предложить компромисс', tEn:'Look into it and offer a reasonable compromise'},
      {t:'Нагрубить и закрыть тикет', tEn:'Get rude and close the ticket'}],
    correct:1},
  {id:'q8', q:'Инвесторы просят немного завысить прибыль в отчёте для более высокой оценки. Согласны?', qEn:'Investors ask you to slightly inflate reported profit for a higher valuation. Do you agree?',
    options:[
      {t:'Да, немного не страшно', tEn:'Yes, a little won\'t hurt'},
      {t:'Нет, отчётность должна быть честной', tEn:'No, the numbers have to be honest'},
      {t:'Да, если никто не заметит', tEn:'Yes, as long as no one notices'}],
    correct:1},
  {id:'q9', q:'Партнёр предлагает провести часть денег через оффшор, чтобы не платить налоги. Ответ?', qEn:'A partner suggests routing money offshore to dodge taxes. Your answer?',
    options:[
      {t:'Согласиться — обычная практика', tEn:'Agree — it\'s common practice'},
      {t:'Отказаться и работать по закону', tEn:'Refuse and stay within the law'},
      {t:'Согласиться, но оставить партнёра крайним', tEn:'Agree, but make the partner take the risk'}],
    correct:1},
  {id:'q10', q:'Вы узнали, что конкурент скопировал вашу бизнес-модель. Реакция?', qEn:'You find out a rival copied your business model. What\'s your reaction?',
    options:[
      {t:'Сразу судиться из принципа', tEn:'Sue immediately, just on principle'},
      {t:'Ускорить развитие и укрепить бренд', tEn:'Move faster and strengthen the brand instead'},
      {t:'Публично оскорбить конкурента в соцсетях', tEn:'Publicly trash the rival on social media'}],
    correct:1},
  {id:'q11', q:'Крупный клиент просит закрыть глаза на нарушение договора в обмен на большой заказ. Что делаете?', qEn:'A big client asks you to overlook a contract violation in exchange for a large order. What do you do?',
    options:[
      {t:'Согласиться ради выручки', tEn:'Agree for the sake of the revenue'},
      {t:'Отказаться и предложить решить вопрос по договору', tEn:'Refuse and offer to resolve it per the contract'},
      {t:'Согласиться, но задокументировать всё тайно', tEn:'Agree, but secretly document everything'}],
    correct:1},
  {id:'q12', q:'Ваш продукт имеет скрытый дефект, о котором пока никто не знает. Действия?', qEn:'Your product has a hidden defect nobody has noticed yet. What do you do?',
    options:[
      {t:'Молчать и продавать дальше', tEn:'Stay quiet and keep selling'},
      {t:'Раскрыть проблему и предложить исправление', tEn:'Disclose it and offer a fix'},
      {t:'Тихо исправить только для новых клиентов', tEn:'Quietly fix it for new customers only'}],
    correct:1},
];
function maybeGenerateInterview(){
  ensureMailbox();
  const open = state.mailbox.filter(m=>m.type==='interview' && !m.resolved);
  if(open.length >= 1) return;
  if(Math.random() > 0.22) return;
  const q = INTERVIEW_QUESTIONS[Math.floor(Math.random()*INTERVIEW_QUESTIONS.length)];
  state.mailbox.unshift({id:genMailId(), type:'interview', day:state.day, qId:q.id, resolved:false});
  trimMailbox();
  refreshInboxBadge();
}
function answerInterview(id, choiceIdx){
  ensureMailbox(); ensureBusinessStatus();
  const m = state.mailbox.find(x=>x.id===id);
  if(!m || m.type!=='interview' || m.resolved) return;
  const q = INTERVIEW_QUESTIONS.find(x=>x.id===m.qId);
  if(!q){ m.resolved = true; save(); renderInbox(); return; }
  const correct = choiceIdx===q.correct;
  m.resolved = true; m.answeredCorrect = correct; m.chosenIdx = choiceIdx;
  if(correct){
    state.businessStatus = Math.min(BUSINESS_STATUS_MAX, (state.businessStatus||0) + BUSINESS_STATUS_GAIN);
    log(`🎤 ${tr('Интервью','Interview')}: ${tr('верный ответ','correct answer')} (+${BUSINESS_STATUS_GAIN} ${tr('статуса','status')})`);
    toast(`✅ +${BUSINESS_STATUS_GAIN} ${tr('статуса','status')}`);
    playSound('buy');
  } else {
    state.businessStatus = Math.max(BUSINESS_STATUS_MIN, (state.businessStatus||0) - BUSINESS_STATUS_LOSS);
    log(`🎤 ${tr('Интервью','Interview')}: ${tr('неверный ответ','wrong answer')} (−${BUSINESS_STATUS_LOSS} ${tr('статуса','status')})`);
    toast(`❌ −${BUSINESS_STATUS_LOSS} ${tr('статуса','status')}`);
    playSound('error');
  }
  vibrateFeedback(15);
  save(); renderAll(); renderInbox();
}
// Startups for sale: same mailbox pattern as buyer offers (see
// maybeGenerateBusinessOffer()), but flowing the other way — someone is
// offering to sell YOU a going concern. Better ones require higher
// businessStatus; a low-status player simply gets refused.
const STARTUP_TIERS = [
  {id:'small', trackLevel:2, priceMult:0.7,  minStatus:0,  name:'Малый стартап',     nameEn:'Small startup'},
  {id:'mid',   trackLevel:5, priceMult:1.3,  minStatus:40, name:'Растущий бизнес',   nameEn:'Growing business'},
  {id:'big',   trackLevel:9, priceMult:2.1,  minStatus:70, name:'Крупный актив',     nameEn:'Major asset'},
];
function maybeGenerateStartupOffer(){
  ensureMailbox();
  const open = state.mailbox.filter(m=>m.type==='startup' && !m.resolved);
  if(open.length >= 2) return;
  if(Math.random() > 0.14) return;
  const type = ALL_BUSINESS_TYPES[Math.floor(Math.random()*ALL_BUSINESS_TYPES.length)];
  const model = MONETIZATION_MODELS[Math.floor(Math.random()*MONETIZATION_MODELS.length)];
  const tier = STARTUP_TIERS[Math.floor(Math.random()*STARTUP_TIERS.length)];
  const nw = netWorth();
  const price = Math.max(400, Math.round(nw * 0.06 * tier.priceMult * difficultyCostMult()));
  state.mailbox.unshift({id:genMailId(), type:'startup', day:state.day, typeId:type.id, monetizationId:model.id, tierId:tier.id, trackLevel:tier.trackLevel, price, minStatus:tier.minStatus, expiresDay:state.day+MAIL_OFFER_EXPIRE_DAYS, resolved:false});
  trimMailbox();
  refreshInboxBadge();
}
function buyStartupOffer(id){
  ensureMailbox(); ensureBusinessStatus();
  const m = state.mailbox.find(x=>x.id===id);
  if(!m || m.type!=='startup' || m.resolved) return;
  if((state.businessStatus||0) < m.minStatus){ toast(tr('Ваш статус слишком низкий — продавец отказывается','Your status is too low — the seller refuses')); playSound('error'); return; }
  const nw = netWorth();
  if(state.sites.length >= maxSiteSlots(nw)){ toast(tr('Нет свободных слотов — растите активы','No free slots — grow your net worth')); playSound('error'); return; }
  if(state.cash < m.price){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= m.price;
  const site = createSiteObject(m.typeId, m.monetizationId, m.trackLevel);
  state.sites.push(site);
  m.resolved = true; m.accepted = true;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===m.typeId);
  log(`🏢 ${tr('Куплен стартап','Bought startup')} «${esc(site.name)}» (${type?L(type,'name'):''}) ${tr('за','for')} ${fmt(m.price)}`);
  toast(`🏢 +${tr('бизнес','business')}: ${esc(site.name)}`);
  playSound('buy'); vibrateFeedback(15);
  closeModal();
  save(); renderAll(); renderInbox();
}
function declineStartupOffer(id){
  ensureMailbox();
  const m = state.mailbox.find(x=>x.id===id);
  if(!m) return;
  m.resolved = true; m.accepted = false;
  toast(tr('Предложение отклонено','Offer declined'));
  closeModal();
  save(); renderInbox();
}
function openStartupPreviewModal(id){
  ensureMailbox(); ensureBusinessStatus();
  const m = state.mailbox.find(x=>x.id===id);
  if(!m || m.type!=='startup') return;
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===m.typeId);
  const tier = STARTUP_TIERS.find(t=>t.id===m.tierId) || STARTUP_TIERS[0];
  const model = MONETIZATION_MODELS.find(mm=>mm.id===m.monetizationId);
  const tracksHtml = TRACK_ORDER.map(k=>{
    const meta = TRACK_META[k];
    return `<div class="card-row" style="margin-bottom:4px;"><div class="card-icon" style="font-size:14px;">${meta.icon}</div><div style="flex:1;font-size:12.5px;color:var(--dim);">${tr(meta.name,meta.nameEn)}</div><div class="num">${tr('ур.','lvl')} ${m.trackLevel}</div></div>`;
  }).join('');
  const statusOk = (state.businessStatus||0) >= m.minStatus;
  openModal(`<h3>${type?type.icon:'🏢'} ${type?L(type,'name'):''}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:10px;">${tr(tier.name,tier.nameEn)} · ${model?L(model,'name'):''}</p>
    ${tracksHtml}
    <div class="card-sub" style="margin-top:10px;">${tr('Нужен статус','Status required')}: <b class="${statusOk?'c-green':'c-red'}">${m.minStatus}</b> · ${tr('ваш статус','your status')}: <b>${Math.round(state.businessStatus||0)}</b></div>
    ${!statusOk?`<div class="card-sub" style="color:var(--red);">${tr('Продавец пока не готов иметь с вами дело — поднимите статус на интервью','The seller isn\'t ready to deal with you yet — raise your status in interviews')}</div>`:''}
    <div class="btn-row" style="margin-top:10px;"><button class="btn btn-outline btn-block" onclick="declineStartupOffer('${m.id}')">${tr('Отклонить','Decline')}</button><button class="btn btn-green btn-block" ${(!statusOk||state.cash<m.price)?'disabled':''} onclick="buyStartupOffer('${m.id}')">${tr('Купить за','Buy for')} ${fmt(m.price)}</button></div>`);
}
function buildInboxMailHtml(){
  ensureMailbox(); ensurePersonalExpenses(); ensureBusinessStatus();
  const openOffers = state.mailbox.filter(m=>m.type==='offer' && !m.resolved);
  const openBills = state.mailbox.filter(m=>m.type==='bill' && !m.paid);
  const openInterviews = state.mailbox.filter(m=>m.type==='interview' && !m.resolved);
  const openStartups = state.mailbox.filter(m=>m.type==='startup' && !m.resolved);
  const tier = businessStatusTier(state.businessStatus||0);
  const statusHtml = `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row"><div class="card-icon">${tier.icon}</div><div style="flex:1">
        <div class="card-title">${tr('Деловой статус','Business status')}: ${Math.round(state.businessStatus||0)}/100 — ${tr(tier.name,tier.nameEn)}</div>
        <div class="card-sub">${tr('Растёт и падает от ответов на деловые интервью — открывает доступ к покупке лучших стартапов','Rises and falls with your interview answers — unlocks access to buying the better startups')}</div>
      </div></div>
    </div>`;
  if(!openOffers.length && !openBills.length && !openInterviews.length && !openStartups.length) return statusHtml;
  let rows = '';
  openInterviews.forEach(m=>{
    const q = INTERVIEW_QUESTIONS.find(x=>x.id===m.qId);
    if(!q) return;
    const optsHtml = q.options.map((o,i)=>`<button class="btn btn-outline btn-block" style="margin-bottom:6px;text-align:left;" onclick="answerInterview('${m.id}',${i})">${tr(o.t,o.tEn)}</button>`).join('');
    rows += `<div class="card glass" style="margin-bottom:8px;border-color:rgba(255,214,10,.4);">
      <div class="card-row"><div class="card-icon">🎤</div><div style="flex:1">
        <div class="card-title">${tr('Деловое интервью','Business interview')}</div>
        <div class="card-sub">${tr(q.q,q.qEn)}</div>
      </div></div>
      <div style="margin-top:8px;">${optsHtml}</div>
    </div>`;
  });
  openStartups.forEach(m=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===m.typeId);
    const tierMeta = STARTUP_TIERS.find(t=>t.id===m.tierId) || STARTUP_TIERS[0];
    const statusOk = (state.businessStatus||0) >= m.minStatus;
    rows += `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row"><div class="card-icon">${type?type.icon:'🏢'}</div><div style="flex:1">
        <div class="card-title">${tr('Продаётся','For sale')}: ${type?L(type,'name'):''} (${tr(tierMeta.name,tierMeta.nameEn)})</div>
        <div class="card-sub">${tr('Цена','Price')}: ${fmt(m.price)} · ${tr('нужен статус','needs status')} ${m.minStatus}${!statusOk?' ❌':' ✅'} · ${tr('истекает через','expires in')} ${Math.max(0,m.expiresDay-state.day)} ${tr('дн.','d')}</div>
      </div></div>
      <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openStartupPreviewModal('${m.id}')">👀 ${tr('Посмотреть','View')}</button><button class="btn btn-green btn-block" ${(!statusOk||state.cash<m.price)?'disabled':''} onclick="buyStartupOffer('${m.id}')">${tr('Купить','Buy')}</button></div>
    </div>`;
  });
  openOffers.forEach(m=>{
    rows += `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row"><div class="card-icon">📬</div><div style="flex:1">
        <div class="card-title">${esc(m.buyer)} ${tr('хочет купить','wants to buy')} «${esc(m.siteName)}»</div>
        <div class="card-sub">${tr('Предложение','Offer')}: ${fmt(m.price)} · ${tr('истекает через','expires in')} ${Math.max(0,m.expiresDay-state.day)} ${tr('дн.','d')}</div>
      </div></div>
      <div class="btn-row"><button class="btn btn-outline btn-block" onclick="declineBusinessOffer('${m.id}')">${tr('Отклонить','Decline')}</button><button class="btn btn-green btn-block" onclick="acceptBusinessOffer('${m.id}')">${tr('Продать','Sell')} ${fmt(m.price)}</button></div>
    </div>`;
  });
  openBills.forEach(m=>{
    const b = m.breakdown;
    rows += `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row"><div class="card-icon">🧾</div><div style="flex:1">
        <div class="card-title">${tr('Личные счета','Personal bills')} — ${tr('день','day')} ${m.day}</div>
        <div class="card-sub">${tr('Аренда','Rent')} ${fmt(b.rent)} · ${tr('Еда','Food')} ${fmt(b.food)} · ${tr('Здоровье','Health')} ${fmt(b.health)} · ${tr('Налог','Tax')} ${fmt(b.tax)}</div>
      </div></div>
      <div class="btn-row"><button class="btn btn-red btn-block" ${state.cash<m.amount?'disabled':''} onclick="payLifeBill('${m.id}')">${tr('Оплатить','Pay')} ${fmt(m.amount)}</button></div>
    </div>`;
  });
  return `<div class="section-title">📬 ${tr('Почта','Mail')}</div><div style="margin-bottom:14px;">${statusHtml}${rows}</div>`;
}

/* ---------- INCOME / EXPENSES DETAIL (Phase 1) ----------
   A full itemized breakdown, not just the two aggregate numbers on the
   finance card — every category of site income listed separately, and
   every recurring expense (payroll, taxes, loan interest) as its own line,
   so it's clear exactly what's earning and exactly what's bleeding money. */
function incomeBreakdown(){
  return ownedTaxCategories().map(function(cat){
    const meta = CATEGORY_META[cat];
    const perSec = categoryIncomePerSec(cat);
    return {icon: meta?meta.icon:'📁', label: meta?L(meta,'name'):cat, perSec};
  }).filter(function(row){ return row.perSec > 0; }).sort(function(a,b){ return b.perSec-a.perSec; });
}
function expenseBreakdown(){
  const rows = [];
  const monthlyPayroll = totalMonthlySalary();
  if(monthlyPayroll>0) rows.push({icon:'💸', label:tr('Зарплата персонала','Staff payroll'), perSec: monthlyPayroll/(PAYROLL_PERIOD_DAYS*GAME_DAY_SECONDS)});
  const periodHosting = totalHostingCost();
  if(periodHosting>0) rows.push({icon:'🌐', label:tr('Хостинг и обслуживание','Hosting & maintenance'), perSec: periodHosting/(HOSTING_PERIOD_DAYS*GAME_DAY_SECONDS)});
  if(state.taxes){
    const taxPerSec = ownedTaxCategories().reduce(function(sum,cat){ return sum + categoryIncomePerSec(cat)*state.taxes.rate; },0);
    if(taxPerSec>0) rows.push({icon:'🧾', label:tr('Налоги','Taxes'), perSec: taxPerSec});
  }
  if(state.loan && state.loan.principal>0){
    rows.push({icon:'🏦', label:tr('Проценты по кредиту','Loan interest'), perSec: state.loan.principal*loanRate()/GAME_DAY_SECONDS});
  }
  if(state.personalExpenses){
    const hist = state.personalExpenses.history||[];
    const recent = hist.slice(-5);
    const avgDaily = recent.length ? recent.reduce((s,h)=>s+h.amount,0)/recent.length : (30*state.propertyIndex+12);
    if(avgDaily>0) rows.push({icon:'🏠', label:tr('Личные расходы (аренда/еда/здоровье/налог)','Personal expenses (rent/food/health/tax)'), perSec: avgDaily/GAME_DAY_SECONDS});
  }
  return rows.sort(function(a,b){ return b.perSec-a.perSec; });
}
function buildFinanceDetailHtml(){
  const inc = incomeBreakdown();
  const exp = expenseBreakdown();
  const perDay = function(v){ return fmt(Math.round(v*GAME_DAY_SECONDS)); };
  const rowsHtml = function(rows, emptyText){
    if(!rows.length) return `<p style="color:var(--dim);font-size:12.5px;">${emptyText}</p>`;
    return rows.map(function(r){
      return `<div class="card-row" style="padding:8px 0;border-bottom:1px solid var(--border);">
        <div class="card-icon" style="width:34px;height:34px;font-size:17px;">${r.icon}</div>
        <div style="flex:1">${esc(r.label)}</div>
        <div class="num" style="font-weight:700;">${perDay(r.perSec)}/${tr('дн.','d')}</div>
      </div>`;
    }).join('');
  };
  const totalInc = inc.reduce((s,r)=>s+r.perSec,0);
  const totalExp = exp.reduce((s,r)=>s+r.perSec,0);
  return `
    <div class="section-title" style="margin-top:0;">📈 ${tr('Доходы','Income')}</div>
    ${rowsHtml(inc, tr('Пока нет сайтов, приносящих доход.','No sites generating income yet.'))}
    <div class="card-row" style="padding:8px 0;"><div style="flex:1;font-weight:800;">${tr('Итого доход','Total income')}</div><div class="num c-green" style="font-weight:800;">+${perDay(totalInc)}/${tr('дн.','d')}</div></div>
    <div class="section-title">📉 ${tr('Расходы','Expenses')}</div>
    ${rowsHtml(exp, tr('Пока нет постоянных расходов.','No recurring expenses yet.'))}
    <div class="card-row" style="padding:8px 0;"><div style="flex:1;font-weight:800;">${tr('Итого расход','Total expenses')}</div><div class="num c-red" style="font-weight:800;">−${perDay(totalExp)}/${tr('дн.','d')}</div></div>
    <div class="card glass" style="margin-top:6px;text-align:center;padding:14px;">
      <div class="card-sub">${tr('Чистая прибыль','Net profit')}</div>
      <div class="num ${totalInc-totalExp>=0?'c-green':'c-red'}" style="font-size:19px;font-weight:800;">${totalInc-totalExp>=0?'+':'−'}${perDay(Math.abs(totalInc-totalExp))}/${tr('дн.','d')}</div>
    </div>
    ${buildLifePnlHistoryHtml()}`;
}
// Full P&L history (item 15): business income/expenses by day (existing
// state.finance.dailyHistory) plus the personal rent/food/health/tax
// breakdown by day (state.personalExpenses.history), side by side.
function buildLifePnlHistoryHtml(){
  ensurePersonalExpenses();
  const bizDays = (state.finance && state.finance.dailyHistory) ? state.finance.dailyHistory.slice(-14) : [];
  const lifeDays = state.personalExpenses.history.slice(-14);
  const owed = Math.round(state.personalExpenses.owed);
  const byDay = {};
  bizDays.forEach(d=>{ byDay[d.day] = byDay[d.day]||{}; byDay[d.day].biz = d; });
  lifeDays.forEach(d=>{ byDay[d.day] = byDay[d.day]||{}; byDay[d.day].life = d; });
  const days = Object.keys(byDay).map(Number).sort((a,b)=>b-a);
  const rows = days.map(day=>{
    const b = byDay[day].biz, l = byDay[day].life;
    const bizNet = b ? Math.round(b.income-b.expenses) : null;
    return `<div class="card-row" style="padding:7px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;">
        <div class="card-title" style="font-size:12.5px;">${tr('День','Day')} ${day}</div>
        <div class="card-sub" style="font-size:11px;">${b?`${tr('Бизнес','Business')}: ${bizNet>=0?'+':''}${fmt(bizNet)}`:''}${l?` · ${tr('Жизнь','Life')}: −${fmt(l.amount)} (${tr('аренда','rent')} ${fmt(l.rent)}, ${tr('еда','food')} ${fmt(l.food)}, ${tr('здоровье','health')} ${fmt(l.health)}, ${tr('налог','tax')} ${fmt(l.tax)})`:''}</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="section-title">🗒️ ${tr('История по дням','Daily history')}</div>
    ${rows || `<p style="color:var(--dim);font-size:12.5px;">${tr('Данных пока нет.','No data yet.')}</p>`}
    ${owed>0?`<div class="card glass" style="margin-top:10px;${state.personalExpenses.audited?'border-color:rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
      <div class="card-row"><div class="card-icon">🏠</div><div style="flex:1"><div class="card-title">${tr('Долг по личным счетам','Personal bills owed')}</div><div class="card-sub">${fmt(owed)}${state.personalExpenses.audited?' · 😩 '+tr('выгорание: доход −10%','burnout: income −10%'):''}</div></div></div>
      <div class="btn-row"><button class="btn btn-red btn-block" ${state.cash<owed?'disabled':''} onclick="payAllLifeBills()">${tr('Оплатить всё','Pay all')} ${fmt(owed)}</button></div>
    </div>`:''}`;
}
function openFinanceDetailModal(){ openModal(`<h3>💹 ${tr('Доходы и расходы','Income & expenses')}</h3><div id="finance-detail-body">${buildFinanceDetailHtml()}</div>`); }
function refreshFinanceDetailModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('finance-detail-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildFinanceDetailHtml();
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
      businesses: genNpcBusinesses(i),
    };
  });
}
// A business an NPC owns that the player can buy outright and add straight
// to their own site list — distinct from buyoutCompetitor()/buyHoldingStake()
// above, which only grant an abstract income-% bonus, never an actual site.
function genNpcBusinesses(tier){
  const startLevel = Math.min(8, 2+tier);
  const count = 1 + (tier>=3 ? 1 : 0); // bigger competitors run 2 businesses, smaller ones 1
  const pool = ALL_BUSINESS_TYPES.slice().sort((a,b)=>a.baseCost-b.baseCost);
  const bracket = pool.slice(Math.min(tier*2,pool.length-3), Math.min(tier*2+4,pool.length));
  const src = bracket.length ? bracket : pool.slice(0,4);
  const out = [];
  for(let k=0;k<count;k++){
    const type = src[Math.floor(Math.random()*src.length)];
    const model = MONETIZATION_MODELS[Math.floor(Math.random()*MONETIZATION_MODELS.length)];
    out.push({id:genUid(), typeId:type.id, monetizationId:model.id, level:startLevel});
  }
  return out;
}
// Old saves may have npcCompetitors without a businesses array — backfill lazily.
function ensureNpcBusinesses(npc, tier){
  if(!Array.isArray(npc.businesses)) npc.businesses = genNpcBusinesses(tier||0);
}
// ITEM 6: competitors now really grow together with the player instead of
// just compounding a fixed daily rate on their own — on top of their own
// organic growth, each NPC is pulled a little closer every day toward a
// size proportional to the player's *current* net worth (higher-tier NPCs
// track a bigger share), so late-game buyouts/business purchases stay
// meaningful instead of the NPCs becoming trivially small once the player
// snowballs. playerNw is passed in from runDayRollover(), which already
// has it computed; fall back to netWorth() if called without it.
function growNpcCompetitors(playerNw){
  if(!state.npcCompetitors) state.npcCompetitors = generateNpcCompetitors();
  const nw = typeof playerNw==='number' ? playerNw : netWorth();
  state.npcCompetitors.forEach(function(n,i){
    ensureNpcBusinesses(n,i);
    const variance = 1 + (Math.random()-0.4)*0.06;
    n.netWorth *= (1 + n.growthRate) * variance;
    const targetShare = 0.15 + i*0.12; // tier 0 ≈15% of player nw, top tier ≈75%
    const target = nw * targetShare;
    if(target > n.netWorth) n.netWorth += (target - n.netWorth) * 0.08; // gradual catch-up, not instant
  });
}
function buildLeaderboardHtml(){
  if(!state.npcCompetitors) state.npcCompetitors = generateNpcCompetitors();
  state.npcCompetitors.forEach(function(n,i){ ensureNpcBusinesses(n,i); });
  const rows = state.npcCompetitors.map(function(n){ return {name:n.name, co:n.co, nw:n.netWorth, isPlayer:false, isNpc:true, businesses:n.businesses}; });
  rows.push({name:state.ceoName, co:'Ваша империя', nw:netWorth(), isPlayer:true});
  rows.sort(function(a,b){ return b.nw-a.nw; });
  const html = rows.map(function(r,i){
    const buyoutBtn = r.isNpc ? (function(){
      const cost = buyoutCost(r.nw);
      const pct = holdingPct(r.name);
      const stakeCost = pct<HOLDING_CONTROL_PCT ? holdingStakeCost({name:r.name, netWorth:r.nw}) : 0;
      const stakeLine = pct>0 ? `<div class="card-sub" style="margin-top:6px;">📊 ${tr('Ваша доля','Your stake')}: <b class="c-green">${Math.round(pct*100)}%</b> · ${tr('дивиденды/день','dividends/day')} ≈${fmt(r.nw*pct*HOLDING_DIVIDEND_SHARE)}</div>` : '';
      const stakeBtn = pct<HOLDING_CONTROL_PCT ? `<button class="btn btn-outline" style="flex:1;" onclick="buyHoldingStake('${esc(r.name).replace(/'/g,"\\'")}')">📊 +${Math.round(HOLDING_STAKE_STEP*100)}% ${tr('за','for')} ${fmt(stakeCost)}</button>` : '';
      const bizHtml = (r.businesses||[]).map(function(b){
        const type = ALL_BUSINESS_TYPES.find(t=>t.id===b.typeId);
        if(!type) return '';
        const bcost = npcBusinessCost(r.nw, r.businesses.length);
        return `<div class="card-row" style="margin-top:6px;">
          <div class="card-icon" style="font-size:14px;">${type.icon}</div>
          <div style="flex:1;font-size:11.5px;color:var(--dim);">${L(type,'name')} · ${tr('ур.','lvl')} ${b.level}</div>
          <button class="btn btn-outline aff-btn" data-aff-cost="${bcost}" ${state.cash<bcost?'disabled':''} style="font-size:11px;padding:6px 10px;" onclick="buyCompetitorBusiness('${esc(r.name).replace(/'/g,"\\'")}','${b.id}')">${tr('Купить за','Buy for')} ${fmt(bcost)}</button>
        </div>`;
      }).join('');
      return stakeLine+'<div class="btn-row" style="margin-top:8px;">'+stakeBtn+'<button class="btn btn-outline" style="flex:1;" onclick="buyoutCompetitor(\''+esc(r.name).replace(/'/g,"\\'")+'\')">Поглотить за '+fmt(cost)+'</button></div>'+bizHtml;
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
  return '<h3>🏆 Рейтинг конкурентов</h3><p style="color:var(--dim);font-size:12px;margin-bottom:12px;">Локальный рейтинг — конкуренты растут раз в игровой день (и подтягиваются к вашему масштабу). Можно купить долю (дивиденды каждый день, 51% = автопоглощение), купить конкретный бизнес конкурента напрямую в свой список, или сразу поглотить целиком для мгновенного постоянного бонуса. Крупных конкурентов можно поглотить только имея от '+fmt(NPC_BUYOUT_MIN_CASH_LARGE)+' на счету, менее богатых — от '+fmt(NPC_BUYOUT_MIN_CASH_SMALL)+'.'+bonusLine+'</p>'+html+
    buildWorldRichHtml();
}
// ITEM 9 FIX: the leaderboard used to only ever be (re)built the moment the
// player opened it or completed a purchase in it. But NPC net worth (and
// therefore every buyout/stake/business cost shown) also changes on its own
// once a game day rolls over (growNpcCompetitors() in runDayRollover()) —
// if that happened while the modal was already open, its buttons kept
// showing the OLD, now-stale cost baked into their data-aff-cost, so a
// button could still look affordable (enabled) while the actual recomputed
// cost at click time was already higher than state.cash, producing a
// "куплено... недостаточно средств" false-positive. Wrapping the rebuildable
// part in #leaderboard-modal-body and refreshing it from runDayRollover()
// (same pattern as refreshTaxModal/refreshHostingModal/etc.) keeps it live.
function openLeaderboardModal(){
  bumpQuest('view_leaderboard');
  openModal('<div id="leaderboard-modal-body">'+buildLeaderboardHtml()+'</div>'+
    '<div class="btn-row" style="margin-top:8px;"><button class="btn btn-outline btn-block" onclick="closeModal()">Закрыть</button></div>');
}
function refreshLeaderboardModal(){
  const bg = document.getElementById('modal-bg');
  const body = document.getElementById('leaderboard-modal-body');
  if(bg && bg.classList.contains('show') && body) body.innerHTML = buildLeaderboardHtml();
}
/* ---------- ITEM 7: buy a specific competitor business outright ----------
   Distinct from buyoutCompetitor()/buyHoldingStake() above, which only grant
   an abstract income-% bonus. This adds the actual business as a real site
   in the player's own list (via createSiteObject), already leveled up since
   it's a going concern rather than a fresh launch. */
// ITEM 6: businesses bought directly off a competitor are now 30× more
// expensive than before, to match the full-buyout cash-threshold gating
// added to buyoutCompetitor()/buyHoldingStake() below.
function npcBusinessCost(npcNetWorth, businessCount){
  return Math.round(npcNetWorth * (0.45/Math.max(1,businessCount)) * 30 * difficultyCostMult());
}
function buyCompetitorBusiness(name, bizId){
  const npc = state.npcCompetitors.find(n=>n.name===name);
  if(!npc || !npc.businesses) return;
  const bidx = npc.businesses.findIndex(b=>b.id===bizId);
  if(bidx<0) return;
  const biz = npc.businesses[bidx];
  const nw = netWorth();
  if(state.sites.length >= maxSiteSlots(nw)){ toast(tr('Нет свободных слотов — растите активы','No free slots — grow your net worth')); playSound('error'); return; }
  const cost = npcBusinessCost(npc.netWorth, npc.businesses.length);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===biz.typeId);
  state.cash -= cost;
  npc.businesses.splice(bidx,1);
  npc.netWorth = Math.max(100, npc.netWorth - cost);
  const site = createSiteObject(biz.typeId, biz.monetizationId, biz.level);
  state.sites.push(site);
  log(`🤝 ${tr('Куплен бизнес','Bought business')} «${esc(site.name)}» (${type?L(type,'name'):''}) ${tr('у','from')} «${esc(npc.co)}» ${tr('за','for')} ${fmt(cost)}`);
  toast(`🤝 +${tr('бизнес','business')}: ${esc(site.name)}`);
  playSound('buy');
  vibrateFeedback(15);
  renderAll(); save();
  openLeaderboardModal();
}
// Called from buyoutCompetitor() and buyHoldingStake()'s full-control branch:
// any businesses the NPC still had at the moment of full acquisition come
// along for free instead of just disappearing along with the NPC.
function transferNpcBusinessesToPlayer(npc){
  if(!npc.businesses || !npc.businesses.length) return;
  npc.businesses.forEach(function(biz){
    const nw = netWorth();
    if(state.sites.length >= maxSiteSlots(nw)){
      // No room — refund a token cash amount instead of silently discarding it.
      state.cash += Math.round(npcBusinessCost(npc.netWorth, 1) * 0.5);
      return;
    }
    const site = createSiteObject(biz.typeId, biz.monetizationId, biz.level);
    state.sites.push(site);
    log(`🤝 ${tr('Вместе с поглощением получен бизнес','Buyout included the business')} «${esc(site.name)}»`);
  });
  npc.businesses = [];
}
/* ---------- NPC BUYOUT — remove a competitor from the board for a permanent income bonus ---------- */
// ITEM 6: full acquisition is now gated by a minimum cash balance, on top of
// the usual buyout cost — you need real firepower on hand, not just enough
// to cover this one deal. The top two tiers (i=4,5 in NPC_NAMES — the
// "крупные"/large competitors) require $10B in cash; the rest (the "менее
// богатые"/less-rich competitors) require $10M. npcTier() looks the NPC's
// original tier up by name so this still works after other NPCs have
// already been bought out and removed from state.npcCompetitors.
const NPC_LARGE_TIER_FROM = 4;
const NPC_BUYOUT_MIN_CASH_LARGE = 10000000000;   // $10B — required to absorb a large competitor
const NPC_BUYOUT_MIN_CASH_SMALL = 10000000;      // $10M — required to absorb a smaller competitor
function npcTier(name){ return NPC_NAMES.findIndex(n=>n.name===name); }
function npcBuyoutMinCash(name){
  return npcTier(name) >= NPC_LARGE_TIER_FROM ? NPC_BUYOUT_MIN_CASH_LARGE : NPC_BUYOUT_MIN_CASH_SMALL;
}
function buyoutCost(npcNetWorth){ return Math.round(npcNetWorth * 1.6 * difficultyCostMult()); }
function buyoutCompetitor(name){
  const idx = state.npcCompetitors.findIndex(function(n){ return n.name===name; });
  if(idx<0) return;
  const npc = state.npcCompetitors[idx];
  const cost = buyoutCost(npc.netWorth);
  const minCash = npcBuyoutMinCash(npc.name);
  if(state.cash < minCash){
    toast(tr(`Нужно минимум ${fmt(minCash)} на счету, чтобы поглотить этого конкурента`, `You need at least ${fmt(minCash)} in cash to acquire this competitor`));
    playSound('error');
    return;
  }
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  transferNpcBusinessesToPlayer(npc);
  state.npcCompetitors.splice(idx,1);
  if(!state.acquiredCompetitors) state.acquiredCompetitors = [];
  state.acquiredCompetitors.push(npc.name);
  if(state.holdings) delete state.holdings[npc.name];
  log(`🤝 Поглощён конкурент «${esc(npc.name)}» (${esc(npc.co)}) за ${fmt(cost)} — доход +${Math.round(acquisitionBonusTotal()*100)}% навсегда`);
  toast(`🤝 «${npc.name}» поглощён!`);
  playSound('achievement');
  vibrateFeedback(20);
  renderAll(); save();
  openLeaderboardModal();
  // CLEANUP (3): wires fx-npc-alert — named explicitly in the plan — as a
  // little post-buyout flourish on the freshly re-rendered leaderboard.
  fxId('modal','fx-npc-alert');
}
/* ---------- INVESTMENT HOLDING (Раздел 4.2 плана) ----------
   A lighter alternative to buyoutCompetitor() above: buy a minority
   stake in an NPC in 10-point increments instead of paying the full
   buyout price up front. Each stake pays a daily dividend proportional
   to the NPC's (growing) net worth; reaching the 51% controlling stake
   automatically converts into a full buyout — same permanent income
   bonus as buyoutCompetitor(), no extra charge since the stake already
   cost proportionally. */
const HOLDING_STAKE_STEP = 0.10;    // each purchase adds 10 percentage points
const HOLDING_CONTROL_PCT = 0.51;   // stake required for automatic full control
const HOLDING_DIVIDEND_SHARE = 0.02; // daily dividend = pct * npc.netWorth * this
function holdingPct(name){ return (state.holdings && state.holdings[name]) ? state.holdings[name].pct : 0; }
function holdingStakeCost(npc){
  const pct = holdingPct(npc.name);
  const remaining = Math.min(HOLDING_STAKE_STEP, HOLDING_CONTROL_PCT-pct);
  return Math.round(npc.netWorth * 1.6 * difficultyCostMult() * remaining);
}
function buyHoldingStake(name){
  const npc = state.npcCompetitors.find(n=>n.name===name);
  if(!npc) return;
  const pct = holdingPct(name);
  if(pct >= HOLDING_CONTROL_PCT) return;
  const cost = holdingStakeCost(npc);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  // ITEM 6: same minimum-cash gate as a direct buyoutCompetitor() — if this
  // particular stake purchase would cross into the 51% controlling stake
  // (i.e. trigger a full acquisition below), it needs the same firepower
  // on hand as a manual buyout would.
  const willReachControl = (pct + HOLDING_STAKE_STEP) >= HOLDING_CONTROL_PCT;
  if(willReachControl){
    const minCash = npcBuyoutMinCash(name);
    if(state.cash < minCash){
      toast(tr(`Нужно минимум ${fmt(minCash)} на счету для полного поглощения`, `You need at least ${fmt(minCash)} in cash for a full acquisition`));
      playSound('error');
      return;
    }
  }
  state.cash -= cost;
  if(!state.holdings) state.holdings = {};
  const newPct = Math.min(HOLDING_CONTROL_PCT, pct + HOLDING_STAKE_STEP);
  state.holdings[name] = {pct:newPct, boughtAt: state.holdings[name]?state.holdings[name].boughtAt:state.day};
  if(newPct >= HOLDING_CONTROL_PCT){
    const idx = state.npcCompetitors.findIndex(n=>n.name===name);
    if(idx>=0){ transferNpcBusinessesToPlayer(npc); state.npcCompetitors.splice(idx,1); }
    delete state.holdings[name];
    if(!state.acquiredCompetitors) state.acquiredCompetitors = [];
    state.acquiredCompetitors.push(npc.name);
    log(`👑 ${tr('Контрольный пакет получен — полное поглощение','Controlling stake reached — full buyout')} «${esc(npc.co)}» ${tr('за','for')} ${fmt(cost)}`);
    toast(`👑 «${npc.name}» — ${tr('под полным контролем','fully controlled')}!`);
    playSound('achievement'); vibrateFeedback(20);
  } else {
    log(`📊 ${tr('Куплена доля','Stake bought')} ${Math.round(newPct*100)}% ${tr('в','in')} «${esc(npc.co)}» ${tr('за','for')} ${fmt(cost)}`);
    toast(`📊 ${Math.round(newPct*100)}% ${tr('в','of')} «${npc.co}»`);
    playSound('buy');
  }
  renderAll(); save(); openLeaderboardModal();
}
// Called once per game day (from tick()'s day-rollover block, alongside growNpcCompetitors()).
function payHoldingDividends(){
  if(!state.holdings) return;
  let total = 0;
  Object.keys(state.holdings).forEach(name=>{
    const npc = state.npcCompetitors.find(n=>n.name===name);
    if(!npc){ delete state.holdings[name]; return; }
    total += npc.netWorth * state.holdings[name].pct * HOLDING_DIVIDEND_SHARE;
  });
  if(total>0){
    state.cash += total;
    log(`📊 ${tr('Дивиденды от долей','Dividends from holdings')}: +${fmt(total)}`);
  }
}

/* ---------- ITEM 10: WORLD RICH LIST — мировой рейтинг богатейших ----------
   A second, much bigger leaderboard sitting above the local NPC competitors:
   a handful of fictional global magnates (oil, cars, retail, tech, luxury,
   finance, mining, gas — echoing the new INDUSTRY_TYPES businesses above)
   worth tens to hundreds of billions. The player can never buy them out —
   that's the whole point, they're simply out of reach — but can buy a small
   minority stake (capped at 10%) that pays a proportional daily dividend:
   the richer the person, the bigger the payout for the same % stake.
   Gated behind a high net-worth threshold so it reads as a genuine
   end-game system rather than something available from turn one. */
const WORLD_RICH_LIST = [
  {name:'Омар Аль-Файед',    co:'Gulf Sovereign Fund',     icon:'🕌', netWorth:260000000000},
  {name:'Кай Ротвелл',       co:'RotWell Aerospace',       icon:'🚀', netWorth:210000000000},
  {name:'Арно Дюлак',        co:'DuLac Luxury Group',      icon:'👜', netWorth:190000000000},
  {name:'Вэй Чжан',          co:'Zhang Retail Holdings',   icon:'🛒', netWorth:175000000000},
  {name:'Прия Мехротра',     co:'MetaSphere Inc.',         icon:'📱', netWorth:160000000000},
  {name:'Ганс Ольберг',      co:'NordOil Energy',          icon:'🛢️', netWorth:145000000000},
  {name:'Ичиро Такеда',      co:'Takeda Motors',           icon:'🚗', netWorth:130000000000},
  {name:'Ребекка Стерлинг',  co:'Sterling Capital Group',  icon:'💹', netWorth:115000000000},
  {name:'Диего Рейес',       co:'Reyes Mining Corp',       icon:'⛰️', netWorth:100000000000},
  {name:'Анастасия Волкова', co:'Volkov Gas Group',        icon:'🔥', netWorth:90000000000},
];
const WORLD_RICH_UNLOCK_NW = 10000000; // must reach $10M net worth before this table even shows up
const WORLD_STAKE_STEP = 0.02;         // each purchase adds 2 percentage points
const WORLD_STAKE_MAX  = 0.10;         // hard cap — you can invest, never take over
const WORLD_STAKE_COST_RATE = 0.00045; // cost = netWorth * this * pct bought
const WORLD_DIVIDEND_RATE   = 0.000006;// daily dividend = netWorth * pct * this
function worldRichUnlocked(){ return netWorth() >= WORLD_RICH_UNLOCK_NW; }
function worldStakePct(name){ return (state.worldStakes && state.worldStakes[name]) || 0; }
function worldStakeCost(entry){
  const pct = worldStakePct(entry.name);
  const remaining = Math.min(WORLD_STAKE_STEP, WORLD_STAKE_MAX-pct);
  return Math.round(entry.netWorth * WORLD_STAKE_COST_RATE * remaining * difficultyCostMult());
}
function worldStakeDividend(entry, pct){ return entry.netWorth * pct * WORLD_DIVIDEND_RATE; }
function buyWorldStake(name){
  const entry = WORLD_RICH_LIST.find(e=>e.name===name);
  if(!entry || !worldRichUnlocked()) return;
  const pct = worldStakePct(name);
  if(pct >= WORLD_STAKE_MAX) return;
  const cost = worldStakeCost(entry);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  if(!state.worldStakes) state.worldStakes = {};
  const newPct = Math.min(WORLD_STAKE_MAX, pct + WORLD_STAKE_STEP);
  state.worldStakes[name] = newPct;
  log(`🌍 ${tr('Куплена доля','Stake bought')} ${Math.round(newPct*100)}% ${tr('в','in')} «${esc(entry.co)}» ${tr('за','for')} ${fmt(cost)}`);
  toast(`🌍 ${Math.round(newPct*100)}% ${tr('в','of')} «${entry.co}»`);
  playSound('buy'); vibrateFeedback(15);
  renderAll(); save(); openLeaderboardModal();
}
// Called once per game day (from tick()'s day-rollover block, alongside payHoldingDividends()).
function payWorldDividends(){
  if(!state.worldStakes) return;
  let total = 0;
  Object.keys(state.worldStakes).forEach(name=>{
    const entry = WORLD_RICH_LIST.find(e=>e.name===name);
    if(!entry){ delete state.worldStakes[name]; return; }
    total += worldStakeDividend(entry, state.worldStakes[name]);
  });
  if(total>0){
    state.cash += total;
    log(`🌍 ${tr('Дивиденды от мировых инвестиций','World investment dividends')}: +${fmt(total)}`);
  }
}
function buildWorldRichHtml(){
  if(!worldRichUnlocked()){
    return `<div class="card glass" style="padding:12px;margin-top:14px;">
      <div class="card-title">🌍 ${tr('Мировой рейтинг богатейших','World rich list')}</div>
      <div class="card-sub" style="margin-top:4px;">🔒 ${tr('Откроется при собственном капитале','Unlocks at net worth')} ${fmt(WORLD_RICH_UNLOCK_NW)}</div>
    </div>`;
  }
  const rows = WORLD_RICH_LIST.slice().sort((a,b)=>b.netWorth-a.netWorth).map((entry,i)=>{
    const pct = worldStakePct(entry.name);
    const stakeLine = pct>0 ? `<div class="card-sub" style="margin-top:4px;">📊 ${tr('Ваша доля','Your stake')}: <b class="c-green">${Math.round(pct*100)}%</b> · ${tr('дивиденды/день','dividends/day')} ≈${fmt(worldStakeDividend(entry,pct))}</div>` : '';
    const cost = worldStakeCost(entry);
    const btn = pct < WORLD_STAKE_MAX
      ? `<button class="btn btn-outline aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} style="flex:1;" onclick="buyWorldStake('${esc(entry.name).replace(/'/g,"\\'")}')">📊 +${Math.round(WORLD_STAKE_STEP*100)}% ${tr('за','for')} ${fmt(cost)}</button>`
      : `<div class="card-sub" style="margin-top:4px;">${tr('Максимальная доля достигнута','Max stake reached')}</div>`;
    return `<div class="card glass" style="margin-bottom:8px;padding:10px 12px;">
      <div class="card-row">
        <div class="card-icon" style="font-size:15px;">${entry.icon}</div>
        <div style="flex:1"><div class="card-title">#${i+1} ${esc(entry.name)}</div><div class="card-sub">${esc(entry.co)}</div></div>
        <div class="num c-green" style="font-weight:700;">${fmt(entry.netWorth)}</div>
      </div>
      ${stakeLine}
      <div class="btn-row" style="margin-top:8px;">${btn}</div>
    </div>`;
  }).join('');
  return `<h3 style="margin-top:18px;">🌍 ${tr('Мировой рейтинг богатейших','World rich list')}</h3>
    <p style="color:var(--dim);font-size:12px;margin-bottom:12px;">${tr('Их нельзя поглотить — только инвестировать. Максимум 10% доли на человека, но чем он богаче, тем больше дивиденды каждый день.','You can\'t buy them out — only invest. Max 10% stake per person, but the richer they are, the bigger the daily payout.')}</p>
    ${rows}`;
}

const MAX_EMPLOYEES_BASE = 3;
// Economy-balance fix: hiring cost and salary used to be flat numbers
// (EMPLOYEE_BASE_COST=2100, a flat $70 base salary) completely independent
// of which site they work at. That made hiring punishingly expensive
// relative to a cheap early site (a $2100 hire on a $220 blog) while being
// trivially cheap relative to a late-game site (the same $2100 on a $2.25M
// AI-agent business). Both now scale with the site's own baseCost/baseIncome,
// the same way hosting fees already did — so hiring stays proportionate at
// every tier instead of only making sense in the middle of the game.
// ITEM 10 FIX: hiring share lowered (0.9 → 0.35 of the site's baseCost) —
// see employeeHireCost() below for the other half of this fix (the growth
// curve itself, which used to be exponential).
const EMPLOYEE_HIRE_COST_SHARE = 0.35;  // hire cost ≈ this × the site's own baseCost, before the per-hire growth ramp
const EMPLOYEE_SALARY_SHARE = 0.012;    // salary per pay period ≈ this × one period's worth of the site's raw baseIncome
const EMPLOYEE_BASE_COST = 2100;
const EMPLOYEE_INCOME_BONUS = 0.11;
// Phase 1 of the economy overhaul: employees now have levels (reviewed via
// their stats at hire time, not just an anonymous headcount). Each level
// gives a bigger income-bonus multiplier but costs proportionally more to
// hire AND draws a real monthly salary — see assessPayroll().
const EMPLOYEE_LEVELS = [
  {level:1, name:'Стажёр',     nameEn:'Intern',      icon:'🌱', statMult:1.00, salaryMult:1.0},
  {level:2, name:'Специалист', nameEn:'Specialist',  icon:'💼', statMult:1.35, salaryMult:1.9},
  {level:3, name:'Сеньор',     nameEn:'Senior',      icon:'⭐', statMult:1.80, salaryMult:3.2},
  {level:4, name:'Тимлид',     nameEn:'Team Lead',   icon:'🚀', statMult:2.30, salaryMult:5.1},
  {level:5, name:'Директор',   nameEn:'Director',    icon:'👑', statMult:3.00, salaryMult:8.0},
];
function empLevelMeta(level){ return EMPLOYEE_LEVELS[Math.min(EMPLOYEE_LEVELS.length, Math.max(1,level))-1]; }

/* ---------- EMPLOYEE SPECIALIZATIONS ----------
   Every employee also has a specialization tied to exactly one upgrade
   track — they're the ones who actually make that track hum.
   IMPORTANT: this multiplier is nested inside trackIncomeMultiplier(),
   which is already exponential in track level (5 tracks multiplied
   together). Stacking multiple specialists — worse, scaling each one by
   seniority level — turned this into a second exponential on top of the
   first and let a single well-staffed site blow past the rebirth
   threshold almost immediately. So the bonus is deliberately flat and
   non-stacking: having at least one active specialist of the right
   profile on site gives that track a flat bonus, full stop. Hiring more
   of the same specialty, or more senior ones, doesn't compound it —
   only diversifying across all 5 profiles (Dream Team) pays out further,
   and that bonus is flat too. */
const SPECIALIZATIONS = [
  {id:'designer', trackKey:'design',    icon:'🎨', name:'Дизайнер',   nameEn:'Designer'},
  {id:'analyst',  trackKey:'traffic',   icon:'📊', name:'Аналитик',   nameEn:'Analyst'},
  {id:'engineer', trackKey:'infra',     icon:'⚙️', name:'Инженер',    nameEn:'Engineer'},
  {id:'marketer', trackKey:'marketing', icon:'📣', name:'Маркетолог', nameEn:'Marketer'},
  {id:'security', trackKey:'security',  icon:'🔒', name:'Инфобез',    nameEn:'Security'},
];
function specMeta(id){ return SPECIALIZATIONS.find(s=>s.id===id) || SPECIALIZATIONS[0]; }
function specForTrack(trackKey){ return SPECIALIZATIONS.find(s=>s.trackKey===trackKey); }
function randomSpecId(){ return SPECIALIZATIONS[Math.floor(Math.random()*SPECIALIZATIONS.length)].id; }
// Kept in sync with site.employees, index-for-index, same pattern as
// ensureStaffLevels — older saves (and auto-hire, which bypasses the hire
// modal) get backfilled with a random specialization on first access.
function ensureStaffSpecs(site){
  if(!Array.isArray(site.staffSpecs)) site.staffSpecs = [];
  while(site.staffSpecs.length < site.employees) site.staffSpecs.push(randomSpecId());
  if(site.staffSpecs.length > site.employees) site.staffSpecs.length = site.employees;
  return site.staffSpecs;
}
// Flat +12% to a track if at least one active (non-vacationing) specialist
// of the matching profile is on staff — does NOT stack with more hires and
// does NOT scale with seniority level, precisely to avoid compounding with
// trackIncomeMultiplier's own per-track exponential growth.
const SPEC_TRACK_BONUS = 0.12;
function trackSpecializationMultiplier(site, trackKey){
  const spec = specForTrack(trackKey);
  if(!spec) return 1;
  ensureStaffSpecs(site); ensureStaffVacation(site);
  const hasActive = site.staffSpecs.some((id,i)=>id===spec.id && !isOnVacation(site,i));
  return hasActive ? 1+SPEC_TRACK_BONUS : 1;
}
// "Dream team" — one active (non-vacationing) specialist of every kind on
// the same site at once. Rewards diversifying hires instead of always
// stacking the single specialist that helps the priority track most.
const DREAM_TEAM_STAFF_MULT = 1.15; // +15% to the level-based staffStatBonus() channel
const DREAM_TEAM_INCOME_MULT = 1.10; // +10% flat business income on top
function dreamTeamActive(site){
  ensureStaffSpecs(site); ensureStaffVacation(site);
  return SPECIALIZATIONS.every(spec=>site.staffSpecs.some((id,i)=>id===spec.id && !isOnVacation(site,i)));
}
function dreamTeamIncomeMult(site){ return dreamTeamActive(site) ? DREAM_TEAM_INCOME_MULT : 1; }
// One-time toast/log the moment a site's roster first completes the full
// set of 5 specializations — same pattern as maybeAnnounceTrackSynergy.
function maybeAnnounceDreamTeam(site){
  if(dreamTeamActive(site)){
    if(!site.dreamTeamNotified){
      site.dreamTeamNotified = true;
      toast(`👥 ${tr('Команда мечты собрана','Dream team assembled')}: «${esc(site.name)}» (+${Math.round((DREAM_TEAM_INCOME_MULT-1)*100)}% ${tr('доход','income')}, +${Math.round((DREAM_TEAM_STAFF_MULT-1)*100)}% ${tr('к сотрудникам','staff')})`);
      log(`👥 ${tr('Команда мечты','Dream team')}: «${esc(site.name)}» ${tr('собрала по одному специалисту каждого профиля','assembled one specialist of every profile')}`);
      playSound('achievement');
      vibrateFeedback(15);
      fxId('sv-employees','fx-star-burst');
    }
  } else {
    site.dreamTeamNotified = false;
  }
}
// Salary for one employee of a given level, on a given business type (paid
// every PAYROLL_PERIOD_DAYS in-game days — see assessPayroll()). Scales with
// the site's own baseIncome so payroll stays a meaningful, felt cost at every
// tier instead of becoming irrelevant late-game or crushing early-game.
function employeeSalary(type, level){
  const periodEarnings = type.baseIncome * GAME_DAY_SECONDS * PAYROLL_PERIOD_DAYS;
  return Math.round(Math.max(20, periodEarnings * EMPLOYEE_SALARY_SHARE) * empLevelMeta(level).salaryMult * difficultyCostMult());
}
// One-time hiring cost, scaled by the site's own baseCost (so hiring is
// proportionate whether it's a $220 blog or a $2.25M AI-agent business),
// still scaled by how many are already on staff, plus the level premium.
function employeeHireCost(site, level){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const renoSalary = (typeof site.renovationSalaryMult==='number') ? site.renovationSalaryMult : 1;
  // BUGFIX/BALANCE (3): this floor used to be EMPLOYEE_BASE_COST*0.3 (630).
  // It only ever kicks in on the two cheapest starter business types
  // (baseCost 180/220 — everything else is 1400+, well above the floor
  // already), where 0.9×baseCost is ~162-198. A new player starts with 450
  // cash total, so a 630 first hire wasn't a "floor" so much as a tax that
  // ate 90%+ of the starting budget before a single track upgrade — see the
  // matching fix in siteIncome()'s neglect-penalty ramp, which this
  // directly feeds into (hiring immediately used to leave nothing to get
  // every track to level 3, guaranteeing the neglect penalty). Lowered so
  // the first hire on a starter business costs roughly half the starting
  // budget instead of nearly all of it.
  const base = Math.max(EMPLOYEE_BASE_COST*0.12, (type?type.baseCost:EMPLOYEE_BASE_COST) * EMPLOYEE_HIRE_COST_SHARE);
  // ITEM 10 FIX: the per-hire growth used to be Math.pow(1.35, employees) —
  // exponential, so a well-developed high-tier business (high baseCost,
  // employees pushing toward the 40-slot cap, a senior/director-level hire
  // at ×8 salaryMult on top) routinely priced a single hire at hundreds of
  // millions, making late-game upgrading feel punishing rather than
  // rewarding. Replaced with a linear ramp — still noticeably pricier to
  // staff up a big team than a small one, but it no longer runs away: even
  // at the 40-employee cap it's only ~8× the first hire's growth factor
  // instead of ~160,000×.
  const growth = 1 + site.employees * 0.18;
  return Math.round(base * growth * empLevelMeta(level).salaryMult * difficultyCostMult() * (hasSkill('cheap_hire')?0.85:1) * renoSalary);
}
// Every hired employee's level is tracked in site.staffLevels (kept in sync
// with site.employees, index-for-index). Older saves only have the
// headcount, so this backfills level-1 entries for anything missing.
function ensureStaffLevels(site){
  if(!Array.isArray(site.staffLevels)) site.staffLevels = [];
  while(site.staffLevels.length < site.employees) site.staffLevels.push(1);
  if(site.staffLevels.length > site.employees) site.staffLevels.length = site.employees;
  return site.staffLevels;
}
// Sum of each employee's stat multiplier — this is what actually drives the
// income bonus now, instead of a flat count × EMPLOYEE_INCOME_BONUS, so
// *which* candidates you hired matters, not just how many.
/* ---------- EMPLOYEE FATIGUE & VACATION ----------
   Each staff slot accrues fatigue over in-game days worked (see
   advanceStaffFatigue(), called once per day from tick()). Fatigue eats
   into that employee's income contribution in staffStatBonus() below.
   Sending someone on vacation costs upfront "отпускные" pay, then resets
   their fatigue to 0 and takes them off income duty for VACATION_DAYS. */
const FATIGUE_PER_DAY = 9;          // fatigue % gained per in-game day worked
const FATIGUE_MAX = 100;
const FATIGUE_INCOME_PENALTY = 0.5; // at max fatigue, that employee's contribution is halved
const VACATION_DAYS = 3;            // in-game days an employee is away recovering
const VACATION_PAY_SHARE = 0.5;     // vacation pay = this fraction of one salary period
function ensureStaffFatigue(site){
  if(!Array.isArray(site.staffFatigue)) site.staffFatigue = [];
  while(site.staffFatigue.length < site.employees) site.staffFatigue.push(0);
  if(site.staffFatigue.length > site.employees) site.staffFatigue.length = site.employees;
  return site.staffFatigue;
}
function ensureStaffVacation(site){
  if(!Array.isArray(site.staffVacationUntil)) site.staffVacationUntil = [];
  while(site.staffVacationUntil.length < site.employees) site.staffVacationUntil.push(0);
  if(site.staffVacationUntil.length > site.employees) site.staffVacationUntil.length = site.employees;
  return site.staffVacationUntil;
}
function isOnVacation(site, i){
  return (ensureStaffVacation(site)[i]||0) > state.day;
}
function vacationCost(site, i){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const lv = ensureStaffLevels(site)[i]||1;
  return Math.round(employeeSalary(type, lv) * VACATION_PAY_SHARE * difficultyCostMult());
}
const FIRE_PAY_SHARE = 1; // severance = one full salary period
function fireCost(site, i){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const lv = ensureStaffLevels(site)[i]||1;
  return Math.round(employeeSalary(type, lv) * FIRE_PAY_SHARE * difficultyCostMult());
}
// Firing is permanent: unlike vacation (which just parks the employee),
// this removes their slot entirely from staffLevels/staffFatigue/staffVacationUntil
// and lowers site.employees by 1. Requires severance pay up front, confirmed via modal.
function confirmFireEmployee(idx, empIdx){
  const site = state.sites[idx];
  if(!site) return;
  ensureStaffLevels(site);
  if(empIdx>=site.employees) return;
  const meta = empLevelMeta(site.staffLevels[empIdx]||1);
  const cost = fireCost(site, empIdx);
  openModal(`<h3>🚪 ${tr('Уволить сотрудника?','Fire employee?')}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">${tr(`«${esc(tr(meta.name,meta.nameEn))}» покинет «${esc(site.name)}» безвозвратно. Выходное пособие: <b>${fmt(cost)}</b>.`,`«${esc(tr(meta.name,meta.nameEn))}» will permanently leave «${esc(site.name)}». Severance pay: <b>${fmt(cost)}</b>.`)}</p>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openStaffModal(${idx})">${tr('Отмена','Cancel')}</button><button class="btn btn-red btn-block" ${state.cash<cost?'disabled':''} onclick="fireEmployee(${idx},${empIdx})">${tr('Уволить','Fire')}</button></div>`);
}
function fireEmployee(idx, empIdx){
  const site = state.sites[idx];
  if(!site) return;
  ensureStaffLevels(site); ensureStaffFatigue(site); ensureStaffVacation(site); ensureStaffSpecs(site);
  if(empIdx>=site.employees) { closeModal(); return; }
  const cost = fireCost(site, empIdx);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  const meta = empLevelMeta(site.staffLevels[empIdx]||1);
  state.cash -= cost;
  site.staffLevels.splice(empIdx,1);
  site.staffFatigue.splice(empIdx,1);
  site.staffVacationUntil.splice(empIdx,1);
  site.staffSpecs.splice(empIdx,1);
  site.employees -= 1;
  log(`🚪 ${tr('Уволен','Fired')}: ${esc(tr(meta.name,meta.nameEn))} — «${esc(site.name)}» (−${fmt(cost)})`);
  toast(`🚪 ${tr('Сотрудник уволен','Employee fired')}`);
  playSound('sell');
  vibrateFeedback(20);
  maybeAnnounceDreamTeam(site);
  refreshSiteViewSections(idx, ['employees']);
  fxId('sv-employees','fx-rubber');
  if(document.getElementById('staff-modal-body')) openModal(buildStaffModalHtml(idx));
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
// Called once per in-game day (from tick()'s day-rollover block, alongside assessPayroll()).
function advanceStaffFatigue(site){
  ensureStaffLevels(site); ensureStaffFatigue(site); ensureStaffVacation(site);
  for(let i=0;i<site.employees;i++){
    if(isOnVacation(site,i)) continue;
    site.staffFatigue[i] = Math.min(FATIGUE_MAX, (site.staffFatigue[i]||0) + FATIGUE_PER_DAY);
  }
}
function sendEmployeeOnVacation(idx, empIdx){
  const site = state.sites[idx];
  if(!site) return;
  ensureStaffLevels(site); ensureStaffFatigue(site); ensureStaffVacation(site);
  if(empIdx>=site.employees) return;
  if(isOnVacation(site, empIdx)){ toast(tr('Уже в отпуске','Already on vacation')); return; }
  const cost = vacationCost(site, empIdx);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.staffFatigue[empIdx] = 0;
  site.staffVacationUntil[empIdx] = state.day + VACATION_DAYS;
  const meta = empLevelMeta(site.staffLevels[empIdx]);
  log(`🏖️ ${tr('Отправлен в отпуск','Sent on vacation')}: ${esc(tr(meta.name,meta.nameEn))} — «${esc(site.name)}» (${fmt(cost)})`);
  toast(`🏖️ ${tr('Отпуск оплачен','Vacation paid')} — ${fmt(cost)}`);
  playSound('buy');
  maybeAnnounceDreamTeam(site);
  refreshSiteViewSections(idx, ['employees']);
  if(document.getElementById('staff-modal-body')) openModal(buildStaffModalHtml(idx));
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function staffStatBonus(site){
  ensureStaffLevels(site); ensureStaffFatigue(site); ensureStaffVacation(site);
  let sum = 0;
  for(let i=0;i<site.staffLevels.length;i++){
    if(isOnVacation(site,i)) continue; // away on vacation — no income contribution
    const fatigue = site.staffFatigue[i]||0;
    const fatigueMult = 1 - (fatigue/FATIGUE_MAX)*FATIGUE_INCOME_PENALTY;
    sum += empLevelMeta(site.staffLevels[i]).statMult*EMPLOYEE_INCOME_BONUS*fatigueMult;
  }
  if(dreamTeamActive(site)) sum *= DREAM_TEAM_STAFF_MULT;
  return sum;
}

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
  {id:'apt',      name:'Квартира-студия — Берлин',    nameEn:'Studio apartment — Berlin',    icon:'🏚️', cost:1800,    bonus:0.03},
  {id:'cowork',   name:'Коворкинг — Остин',           nameEn:'Coworking — Austin',           icon:'🏬', cost:5000,    bonus:0.05},
  {id:'loft',     name:'Лофт-офис — Берлин',          nameEn:'Loft office — Berlin',         icon:'🏛️', cost:12000,   bonus:0.08},
  {id:'rack',     name:'Серверная стойка — Сингапур', nameEn:'Server rack — Singapore',      icon:'🖥️', cost:25000,   bonus:0.10},
  {id:'warehouse',name:'Склад-хаб — Роттердам',       nameEn:'Warehouse hub — Rotterdam',    icon:'🏗️', cost:55000,   bonus:0.13},
  {id:'dc',       name:'Дата-центр — Дубай',          nameEn:'Data center — Dubai',          icon:'🏭', cost:120000,  bonus:0.18},
  {id:'tower',    name:'Бизнес-башня — Токио',        nameEn:'Business tower — Tokyo',       icon:'🏙️', cost:280000,  bonus:0.24},
  {id:'hq',       name:'Штаб-квартира — Нью-Йорк',    nameEn:'Headquarters — New York',      icon:'🏢', cost:600000,  bonus:0.30},
  {id:'campus',   name:'Кампус-кластер — Цюрих',      nameEn:'Campus cluster — Zurich',      icon:'🏟️', cost:1400000, bonus:0.37},
  {id:'satellite',name:'Спутниковый узел — Рейкьявик',nameEn:'Satellite hub — Reykjavik',    icon:'🛰️', cost:3000000, bonus:0.45},
  {id:'orbital',  name:'Орбитальная станция',         nameEn:'Orbital station',              icon:'🛸', cost:8000000, bonus:0.55},
];

const RANKS = [
  {min:0,          title:'Новичок',            titleEn:'Newbie',              icon:'🥉'},
  {min:5000,       title:'Фрилансер',           titleEn:'Freelancer',          icon:'🥈'},
  {min:25000,      title:'Стартапер',           titleEn:'Startupper',          icon:'🥇'},
  {min:100000,     title:'Предприниматель',     titleEn:'Entrepreneur',        icon:'💼'},
  {min:500000,     title:'Бизнесмен',           titleEn:'Businessman',         icon:'🏆'},
  {min:2000000,    title:'Магнат',              titleEn:'Tycoon',              icon:'👑'},
  {min:10000000,   title:'Digital Tycoon',      titleEn:'Digital Tycoon',      icon:'🌍'},
  {min:50000000,   title:'Легенда Digital Empire',  titleEn:'Digital Empire Legend',   icon:'⭐'},
];

const LUXURY = [
  {id:'watch',   name:'Умные часы премиум',        nameEn:'Premium smartwatch',        icon:'⌚', cost:2000,    rep:5,   slot:'accessory'},
  {id:'suit',    name:'Костюм на заказ',           nameEn:'Bespoke suit',              icon:'🕴️', cost:8000,    rep:10,  slot:'accessory'},
  {id:'jewelry', name:'Ювелирные украшения',        nameEn:'Fine jewelry',              icon:'💎', cost:35000,   rep:25,  slot:'accessory'},
  {id:'art',     name:'Коллекция современного искусства', nameEn:'Contemporary art collection', icon:'🖼️', cost:150000,  rep:55,  slot:'accessory'},
  {id:'car1',    name:'Электрокар Tesla-класса',   nameEn:'Tesla-class electric car',   icon:'🚗', cost:40000,  rep:20,  slot:'garage'},
  // ITEM 17: two new garage items slotted between the existing tiers so the
  // ⚡40k → 🚙120k → 🏎️900k jump isn't quite as abrupt.
  {id:'moto',    name:'Спортивный мотоцикл',        nameEn:'Sport motorcycle',           icon:'🏍️', cost:65000,  rep:25,  slot:'garage'},
  {id:'car1b',   name:'Внедорожник премиум-класса', nameEn:'Premium SUV',               icon:'🚙', cost:120000, rep:45,  slot:'garage'},
  {id:'rv',      name:'Люксовый автодом',           nameEn:'Luxury RV',                 icon:'🚐', cost:400000, rep:90,  slot:'garage'},
  {id:'car2',    name:'Гиперкар',                  nameEn:'Hypercar',                   icon:'🏎️', cost:900000, rep:150, slot:'garage'},
  {id:'car2b',   name:'Коллекция ретро-автомобилей',nameEn:'Vintage car collection',    icon:'🚘', cost:3000000,rep:280, slot:'garage'},
  {id:'boat',    name:'Спортивный катер',          nameEn:'Sport boat',                 icon:'🚤', cost:250000, rep:60,  slot:'hangar'},
  {id:'chopper', name:'Личный вертолёт',           nameEn:'Private helicopter',        icon:'🚁', cost:1200000, rep:180, slot:'hangar'},
  {id:'yacht',   name:'Частная яхта',              nameEn:'Private yacht',              icon:'🛥️', cost:5000000,rep:400, slot:'hangar'},
  {id:'jet',     name:'Частный самолёт',           nameEn:'Private jet',                icon:'✈️', cost:20000000,rep:900,slot:'hangar'},
  {id:'island',  name:'Частный остров',            nameEn:'Private island',            icon:'🏝️', cost:60000000,rep:1800,slot:'hangar'},
  // ITEM 17: "Статус" (the reputation-tier ladder card) was removed from
  // the Garage screen as unnecessary UI — every item here was already
  // purchasable for plain cash with no tier gating (see buyLuxury()), so
  // nothing about ownership changes. What item 17 actually asks for is more
  // to spend cash on: three brand-new shop sections (electronics, fashion,
  // collectibles) with 20 new items between them, on top of the two new
  // garage items above.
  {id:'phone',      name:'Флагманский смартфон',           nameEn:'Flagship smartphone',        icon:'📱', cost:1500,    rep:4,   slot:'electronics'},
  {id:'laptop',     name:'Игровой ноутбук',                nameEn:'Gaming laptop',              icon:'💻', cost:4000,    rep:8,   slot:'electronics'},
  {id:'drone',      name:'Профессиональный дрон',          nameEn:'Professional drone',         icon:'🛸', cost:15000,   rep:15,  slot:'electronics'},
  {id:'camera',     name:'Камера для контента',            nameEn:'Content-creator camera',     icon:'📷', cost:25000,   rep:18,  slot:'electronics'},
  {id:'hometheater',name:'Домашний кинотеатр',              nameEn:'Home theater system',        icon:'📺', cost:60000,   rep:30,  slot:'electronics'},
  {id:'vrstudio',   name:'VR-студия',                       nameEn:'VR studio setup',            icon:'🥽', cost:200000,  rep:65,  slot:'electronics'},
  {id:'datacenter', name:'Личный дата-центр',               nameEn:'Private data center',        icon:'🖥️', cost:2000000, rep:250, slot:'electronics'},
  {id:'sneakers',   name:'Коллекционные кроссовки',        nameEn:'Collector sneakers',         icon:'👟', cost:3000,    rep:6,   slot:'fashion'},
  {id:'sunglasses', name:'Дизайнерские очки',               nameEn:'Designer sunglasses',        icon:'🕶️', cost:6000,    rep:9,   slot:'fashion'},
  {id:'shoes',      name:'Обувь ручной работы',            nameEn:'Handmade dress shoes',       icon:'👞', cost:12000,   rep:12,  slot:'fashion'},
  {id:'bag',        name:'Дизайнерская сумка',              nameEn:'Designer bag',               icon:'👜', cost:20000,   rep:16,  slot:'fashion'},
  {id:'coat',       name:'Пальто от кутюр',                 nameEn:'Haute couture coat',         icon:'🧥', cost:45000,   rep:22,  slot:'fashion'},
  {id:'wardrobe',   name:'Гардероб от личного стилиста',   nameEn:'Personal-stylist wardrobe',  icon:'🎽', cost:300000,  rep:80,  slot:'fashion'},
  {id:'couture',    name:'Коллекция haute couture',        nameEn:'Haute couture collection',   icon:'👑', cost:1500000, rep:220, slot:'fashion'},
  {id:'coins',      name:'Нумизматическая коллекция',      nameEn:'Rare coin collection',       icon:'🪙', cost:15000,   rep:10,  slot:'collectible'},
  {id:'guitar',     name:'Коллекция гитар',                nameEn:'Guitar collection',          icon:'🎸', cost:40000,   rep:20,  slot:'collectible'},
  {id:'library',    name:'Библиотека редких книг',         nameEn:'Rare book library',          icon:'📚', cost:250000,  rep:55,  slot:'collectible'},
  {id:'wine',       name:'Винный погреб',                  nameEn:'Wine cellar',                icon:'🍷', cost:90000,   rep:35,  slot:'collectible'},
  {id:'rareclocks', name:'Коллекция редких часов',         nameEn:'Rare timepiece collection',  icon:'🕰️', cost:500000,  rep:100, slot:'collectible'},
  {id:'sculpture',  name:'Скульптура известного автора',   nameEn:'Sculpture by a renowned artist', icon:'🗿', cost:800000,  rep:140, slot:'collectible'},
];

/* ---------- LIVE SITE PREVIEW CONFIG ---------- */
// Merge note: SITE_VISUAL/SITE_LAYOUT/NAME_POOLS below are still keyed by the
// bare tier id (e.g. 'blog', 'hybrid_fulfillment') the way the three original
// engines had them — retyping ~80 entries three times over wasn't worth it
// for content that's cosmetic (mockup preview, generated site names). Every
// real business id is now `${tierId}_${vertical}` (or just tierId for games,
// which never had a vertical), so any lookup into these tables goes through
// this helper first.
function tierIdOf(id){
  if(!id) return id;
  for(const v of VERTICALS){ if(id.endsWith('_'+v)) return id.slice(0, -(v.length+1)); }
  return id; // games ids (no vertical suffix) or an already-bare tier id
}
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
  crypto_wallet:['VaultPay','KeyNest','CoinPocket','SafeChain','WalletOne'],
  staking_pool:['YieldNest','StakeHub','LockYield','PoolChain','EarnStake'],
  mining_farm:['HashRow','RigYard','BlockDig','MineGrid','HashNest'],
  token_launchpad:['LaunchMint','TokenForge','CoinLift','MintPad','ChainLaunch'],
  nft_marketplace:['ArtChain','MintGallery','RareVerse','NFTBazaar','PixelVault'],
  oil_rig:['BedrockOil','TerraPetrol','NordDrilling','OrionCrude','ApexOil'],
  gas_station_chain:['GlobalFuel','UnionGas','TitanPetrol','OrionStop','TerraFuel'],
  coal_mine:['BedrockCoal','OrionCarbon','VertexMine','TerraSeam','SummitCoal'],
  quarry:['IronStone','NordRock','ContinentalQuarry','TerraAggregate','GlobalStone'],
  textile_factory:['GlobalTextile','VertexFabric','SummitWeave','NordThread','ContinentalTextile'],
  furniture_factory:['GlobalFurniture','OrionWoodcraft','BedrockHome','ContinentalInteriors','VertexFurniture'],
  food_processing_plant:['IronFoods','GlobalHarvest','AtlasProvisions','SummitPantry','ApexFoods'],
  cement_factory:['MeridianCement','ContinentalConcrete','NordBuilding','TitanCornerstone','IronCement'],
  electronics_factory:['PrimeElectronics','ApexCircuit','TitanDevices','GlobalTech','UnionElectronics'],
  chemical_plant:['TerraChem','UnionPolymer','IronReagent','ContinentalIndustries','PrimeChem'],
  pharma_plant:['ContinentalPharma','PrimeMed','SummitBiotech','ApexHealth','NordPharma'],
  gas_field:['OrionGas','AtlasEnergy','VertexField','TerraLNG','IronGas'],
  oil_refinery:['TerraRefining','VertexPetro','ApexFuels','BedrockDownstream','SummitRefining'],
  steel_mill:['UnionSteel','ContinentalMetalworks','PrimeForge','SummitAlloy','GlobalSteel'],
  car_manufacturer:['OrionMotors','TerraAuto','NordVehicles','BedrockWheels','GlobalMotors'],
  shipyard:['ApexShipyard','TitanMarine','MeridianVessels','SummitDockyard','IronShipyard'],
  power_plant:['UnionPower','ContinentalEnergy','PrimeGrid','TerraElectric','NordPower'],
  mining_corp:['GlobalMining','AtlasMinerals','TitanResources','VertexOre','BedrockMining'],
  aircraft_manufacturer:['ApexAero','OrionAviation','SummitAerospace','ContinentalFlight','PrimeAero'],
  industrial_conglomerate:['MeridianIndustries','GlobalHoldings','TitanGroup','ApexConglomerate','UnionConglomerate'],
  ai:['MindForge','NeuroChat','BrainBox','SynthMind','CogniFlow'],
  ai_agent:['AutoMind','AgentForge','NeuroOps','TaskBrain','SynthAgent'],
  retail:['QuickPoint','BoxDrop','ParcelHub','GrabSpot','DropZone'],
  logistics:['CargoLine','FastRoute','ShipNet','TruckHub','RouteX'],
  restaurant:['FoodFly','MealJet','QuickBite','DishDash','TastyGo'],
  gym:['IronCore','FitZone','PulseGym','FlexHub','PowerBase'],
  bank:['PayCore','VaultX','FinLeap','MoneyNest','CoinKeep'],
  realty:['HomeNest','KeyBase','RealPeak','EstateHub','AddressOne'],
  arcade:['PixelDash','ArcadeBox','JumpLoop','RetroPlay','QuickTap'],
  puzzle:['BrainKnot','PuzzleNest','MindTiles','ShiftBox','LoopSolve'],
  rpg:['RealmForge','QuestLine','HeroPath','EpicVale','DungeonKit'],
  battle_royale:['LastStand','DropZone','SquadWin','FinalCircle','VictoryRoyale'],
  ai_game_studio:['SynthPlay','ProcGen','NeuroGames','AutoStudio','GenPlay'],
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
  arcade:{accent:'#ff9f0a',domainBase:'arcade',heroTitle:'Играй где угодно, когда угодно',tagline:'Аркадная игра с простым и залипательным геймплеем',navLabel:'Уровни',ctaLabel:'Играть',itemIcon:'🕹️',adText:'Реклама между уровнями — от $6/1000 показов',
    items:[{t:'Новый рекорд игрока',s:'128 450 очков'},{t:'Ежедневный челлендж',s:'Награда: скин'},{t:'Турнир недели',s:'2.1K участников'},{t:'Обновление: 10 новых уровней',s:'Только что'}]},
  puzzle:{accent:'#0a84ff',domainBase:'puzzle',heroTitle:'Разомни мозги',tagline:'Головоломка с сотнями уровней и растущей сложностью',navLabel:'Головоломки',ctaLabel:'Решать',itemIcon:'🧩',adText:'Подсказка за просмотр рекламы',
    items:[{t:'Уровень 342 пройден',s:'3 звезды'},{t:'Новый набор уровней',s:'«Космос»'},{t:'Ежедневная головоломка',s:'Награда: подсказки'},{t:'Рейтинг друзей',s:'Вы на 2 месте'}]},
  rpg:{accent:'#bf5af2',domainBase:'rpg',heroTitle:'Твоё приключение начинается здесь',tagline:'Мобильная RPG с прокачкой персонажа и рейдами',navLabel:'Квесты',ctaLabel:'В бой',itemIcon:'⚔️',adText:'Двойные награды за просмотр рекламы',
    items:[{t:'Новый рейд-босс',s:'Гильдейское событие'},{t:'Сезонное обновление',s:'Новый класс героя'},{t:'Внутриигровой магазин',s:'Скидка 30%'},{t:'PvP-арена',s:'Сезон 4 начался'}]},
  battle_royale:{accent:'#ff453a',domainBase:'br',heroTitle:'Останься последним',tagline:'Battle Royale на 100 игроков в реальном времени',navLabel:'Матчи',ctaLabel:'В бой',itemIcon:'🎯',adText:'Спонсорский скин — эксклюзив сезона',
    items:[{t:'Победа! Топ-1',s:'12 фрагов'},{t:'Новая карта сезона',s:'«Заброшенный город»'},{t:'Боевой пропуск',s:'Сезон 7'},{t:'Турнир с призовым фондом',s:'$50K'}]},
  ai_game_studio:{accent:'#8b5cf6',domainBase:'gamestudio',heroTitle:'Игры, которые создаёт нейросеть',tagline:'AI-игровая студия: процедурная генерация контента',navLabel:'Релизы',ctaLabel:'Играть',itemIcon:'🎮',adText:'Кросс-промо новых AI-игр студии',
    items:[{t:'Новая игра сгенерирована ИИ',s:'За 48 часов'},{t:'Процедурные уровни',s:'Бесконечны'},{t:'AI-режиссёр сложности',s:'Подстраивается под вас'},{t:'Портфель студии',s:'14 релизов'}]},
  crypto_wallet:{accent:'#ffd60a',domainBase:'wallet',heroTitle:'Твои монеты, твой контроль',tagline:'Некастодиальный крипто-кошелёк с обменом внутри',navLabel:'Активы',ctaLabel:'Открыть кошелёк',itemIcon:'👛',adText:'Партнёрский своп-виджет — комиссия 0.3%',
    items:[{t:'BTC баланс',s:'0.842 ₿'},{t:'Своп ETH → USDT',s:'Комиссия 0.3%'},{t:'Холодное хранение',s:'Включено'},{t:'История транзакций',s:'On-chain'}]},
  staking_pool:{accent:'#ffd60a',domainBase:'stake',heroTitle:'Зарабатывай, пока спишь',tagline:'Стейкинг-пул с доходностью до 14% годовых',navLabel:'Пулы',ctaLabel:'Застейкать',itemIcon:'🔒',adText:'Новый пул с повышенной ставкой — первые 48 часов',
    items:[{t:'Пул ETH 2.0',s:'6.2% годовых'},{t:'Пул SOL',s:'9.8% годовых'},{t:'Пул стейблкоинов',s:'4.1% годовых'},{t:'Флекси-стейкинг',s:'Вывод в любой момент'}]},
  mining_farm:{accent:'#ffd60a',domainBase:'mine',heroTitle:'Хешрейт, который работает на тебя',tagline:'Майнинг-ферма ASIC/GPU с удалённым мониторингом',navLabel:'Оборудование',ctaLabel:'Смотреть ферму',itemIcon:'⛏️',adText:'Апгрейд охлаждения — минус 8% к простоям',
    items:[{t:'Хешрейт фермы',s:'482 TH/s'},{t:'Загрузка оборудования',s:'97%'},{t:'Ближайшая выплата',s:'Через 6 ч'},{t:'Стоимость электричества',s:'$0.04/кВт·ч'}]},
  token_launchpad:{accent:'#ffd60a',domainBase:'launch',heroTitle:'Запусти свой токен за один день',tagline:'Лаунчпад для выпуска и листинга новых токенов',navLabel:'Листинги',ctaLabel:'Запустить токен',itemIcon:'🚀',adText:'Ускоренный листинг — от $15K',
    items:[{t:'Новый листинг: NOVA',s:'Собрано $1.2M'},{t:'IDO раунд открыт',s:'48 часов'},{t:'Аудит смарт-контракта',s:'Пройден'},{t:'Вестинг команды',s:'12 месяцев'}]},
  nft_marketplace:{accent:'#ffd60a',domainBase:'nft',heroTitle:'Коллекционируй цифровое искусство',tagline:'NFT-маркетплейс редких коллекций',navLabel:'Коллекции',ctaLabel:'Смотреть галерею',itemIcon:'🖼️',adText:'Продвижение коллекции в топе — от $500',
    items:[{t:'Legendary Punk #4021',s:'12.4 ETH'},{t:'Новая дроп-коллекция',s:'Старт через 2ч'},{t:'Флор-цена коллекции',s:'0.8 ETH'},{t:'Объём торгов за 24ч',s:'$2.1M'}]},
  oil_rig:{accent:'#8b5cf6',domainBase:'oilrig',heroTitle:'Чёрное золото из-под земли',tagline:'Нефтяная скважина с собственным трубопроводом',navLabel:'Добыча',ctaLabel:'Смотреть добычу',itemIcon:'🛢️',adText:'Контракт на поставку сырой нефти — от $500K/мес',
    items:[{t:'Суточная добыча',s:'1 240 барр.'},{t:'Цена барреля Brent',s:'$78.40'},{t:'Простой скважины',s:'0 дней'},{t:'Запасы месторождения',s:'хватит на 40 лет'}]},
  gas_station_chain:{accent:'#0a84ff',domainBase:'fuel',heroTitle:'Заправься и поезжай дальше',tagline:'Сеть автозаправочных станций по всей стране',navLabel:'Заправки',ctaLabel:'Найти АЗС',itemIcon:'⛽',adText:'Реклама на топливной колонке — от $8/день',
    items:[{t:'АЗС №1',s:'Трасса М-4'},{t:'АЗС №2',s:'Въезд в город'},{t:'АЗС №3',s:'Кольцевая'},{t:'АЗС №4',s:'Промзона'}]},
  coal_mine:{accent:'#8b93a7',domainBase:'coalmine',heroTitle:'Уголь, который держит завод на плаву',tagline:'Угольная шахта с собственным транспортным парком',navLabel:'Добыча',ctaLabel:'Смотреть шахту',itemIcon:'⛏️',adText:'Долгосрочный контракт с ТЭЦ — от $300K/год',
    items:[{t:'Суточная добыча',s:'4 800 т'},{t:'Глубина шахты',s:'620 м'},{t:'Техника безопасности',s:'0 инцидентов'},{t:'Запасы пласта',s:'хватит на 25 лет'}]},
  quarry:{accent:'#ff9f0a',domainBase:'quarry',heroTitle:'Камень, на котором строят города',tagline:'Карьер по добыче щебня и природного камня',navLabel:'Карьер',ctaLabel:'Смотреть добычу',itemIcon:'🪨',adText:'Оптовая поставка щебня строительным компаниям',
    items:[{t:'Суточная добыча',s:'2 100 т'},{t:'Парк техники',s:'14 самосвалов'},{t:'Активных карьеров',s:'3'},{t:'Заказчиков',s:'28 строек'}]},
  textile_factory:{accent:'#ff375f',domainBase:'textile',heroTitle:'От нити до готовой коллекции',tagline:'Текстильная фабрика полного цикла',navLabel:'Коллекции',ctaLabel:'Смотреть каталог',itemIcon:'🧵',adText:'Оптовый заказ для сети магазинов одежды',
    items:[{t:'Хлопковая ткань',s:'Рулон 500м'},{t:'Джинсовая коллекция',s:'SS сезон'},{t:'Трикотаж',s:'12 цветов'},{t:'Экспортный контракт',s:'3 страны'}]},
  furniture_factory:{accent:'#30d158',domainBase:'furniture',heroTitle:'Мебель, которая живёт в доме',tagline:'Мебельная фабрика с собственным дизайн-бюро',navLabel:'Каталог',ctaLabel:'Смотреть мебель',itemIcon:'🪑',adText:'Партнёрство с сетью мебельных салонов',
    items:[{t:'Диван «Комфорт»',s:'$680'},{t:'Обеденный стол',s:'$420'},{t:'Офисное кресло',s:'$210'},{t:'Кухонный гарнитур',s:'$1 900'}]},
  food_processing_plant:{accent:'#ff9f0a',domainBase:'foodplant',heroTitle:'От поля до полки магазина',tagline:'Пищевой комбинат полного цикла переработки',navLabel:'Продукция',ctaLabel:'Смотреть каталог',itemIcon:'🥫',adText:'Контракт на поставку продукции в сеть супермаркетов',
    items:[{t:'Консервы овощные',s:'1200 банок/ч'},{t:'Заморозка полуфабрикатов',s:'800 кг/ч'},{t:'Молочная линия',s:'Новинка'},{t:'Сертификат качества',s:'ISO 22000'}]},
  cement_factory:{accent:'#8b93a7',domainBase:'cement',heroTitle:'Фундамент, на котором всё держится',tagline:'Цементный завод с собственным карьером сырья',navLabel:'Производство',ctaLabel:'Смотреть завод',itemIcon:'🧱',adText:'Оптовые поставки цемента застройщикам',
    items:[{t:'Суточный выпуск',s:'3 400 т'},{t:'Марка цемента',s:'М500'},{t:'Складские запасы',s:'92%'},{t:'Действующих контрактов',s:'19'}]},
  electronics_factory:{accent:'#0a84ff',domainBase:'electro',heroTitle:'Техника, собранная с точностью до микрона',tagline:'Завод по сборке бытовой электроники',navLabel:'Продукция',ctaLabel:'Смотреть линейку',itemIcon:'🔌',adText:'Контракт на сборку для международного бренда',
    items:[{t:'Смартфон линейка X',s:'Сборка 40К/мес'},{t:'Умные часы',s:'Новая линия'},{t:'Бытовая техника',s:'12 моделей'},{t:'Экспорт',s:'24 страны'}]},
  chemical_plant:{accent:'#30d158',domainBase:'chem',heroTitle:'Реакции, которые двигают индустрию',tagline:'Химический завод полного производственного цикла',navLabel:'Производство',ctaLabel:'Смотреть завод',itemIcon:'🧪',adText:'Поставка полимеров производителям упаковки',
    items:[{t:'Суточный выпуск',s:'2 800 т'},{t:'Линия полимеров',s:'98% загрузка'},{t:'Экологический контроль',s:'Пройден'},{t:'Действующих патентов',s:'6'}]},
  pharma_plant:{accent:'#ff453a',domainBase:'pharma',heroTitle:'Лекарства, которым доверяют',tagline:'Фармацевтический завод с полным циклом контроля качества',navLabel:'Препараты',ctaLabel:'Смотреть каталог',itemIcon:'💊',adText:'Государственный тендер на поставку в аптечные сети',
    items:[{t:'Обезболивающее',s:'Партия 200К уп.'},{t:'Антибиотик широкого спектра',s:'GMP-сертификат'},{t:'Вакцина сезонная',s:'Новинка'},{t:'Экспортный портфель',s:'31 страна'}]},
  gas_field:{accent:'#ff9f0a',domainBase:'gasfield',heroTitle:'Газ, который греет и питает города',tagline:'Газовое месторождение с собственной трубопроводной сетью',navLabel:'Добыча',ctaLabel:'Смотреть добычу',itemIcon:'🔥',adText:'Долгосрочный экспортный контракт — от $2M/год',
    items:[{t:'Суточная добыча',s:'18 млн м³'},{t:'Давление в скважине',s:'стабильно'},{t:'Экспортный трубопровод',s:'Активен'},{t:'Запасы месторождения',s:'хватит на 35 лет'}]},
  oil_refinery:{accent:'#8b5cf6',domainBase:'refinery',heroTitle:'Из сырой нефти — в готовое топливо',tagline:'Нефтеперерабатывающий завод полного цикла',navLabel:'Переработка',ctaLabel:'Смотреть завод',itemIcon:'⚗️',adText:'Оптовые поставки топлива сетям АЗС',
    items:[{t:'Суточная переработка',s:'95 000 барр.'},{t:'Выход бензина',s:'42%'},{t:'Глубина переработки',s:'88%'},{t:'Действующих контрактов',s:'34'}]},
  steel_mill:{accent:'#8b93a7',domainBase:'steel',heroTitle:'Сталь, на которой держится индустрия',tagline:'Металлургический комбинат полного цикла',navLabel:'Производство',ctaLabel:'Смотреть комбинат',itemIcon:'🏭',adText:'Долгосрочный контракт с автопроизводителем',
    items:[{t:'Суточная выплавка',s:'6 200 т'},{t:'Марка стали',s:'09Г2С'},{t:'Загрузка мощностей',s:'94%'},{t:'Экспортных контрактов',s:'17'}]},
  car_manufacturer:{accent:'#0a84ff',domainBase:'motors',heroTitle:'С конвейера — сразу на дорогу',tagline:'Автомобильный завод полного цикла сборки',navLabel:'Модели',ctaLabel:'Смотреть модели',itemIcon:'🚗',adText:'Дилерский контракт на 40 городов',
    items:[{t:'Седан City',s:'от $18 900'},{t:'Кроссовер Trail',s:'от $27 400'},{t:'Электромобиль Volt',s:'от $34 900'},{t:'Грузовик Hauler',s:'от $52 000'}]},
  shipyard:{accent:'#0a84ff',domainBase:'shipyard',heroTitle:'Корабли, что выходят в открытый океан',tagline:'Судостроительная верфь полного цикла',navLabel:'Верфь',ctaLabel:'Смотреть заказы',itemIcon:'🛳️',adText:'Контракт на строительство контейнеровоза — $80M',
    items:[{t:'Сухогруз класса Panamax',s:'В постройке'},{t:'Танкер',s:'Сдан заказчику'},{t:'Контейнеровоз 14К TEU',s:'Заложен'},{t:'Портфель заказов',s:'6 судов'}]},
  power_plant:{accent:'#ffd60a',domainBase:'power',heroTitle:'Энергия, которая не гаснет',tagline:'Электростанция комбинированного цикла',navLabel:'Генерация',ctaLabel:'Смотреть станцию',itemIcon:'⚡',adText:'Контракт на поставку энергии промышленному парку',
    items:[{t:'Установленная мощность',s:'1 240 МВт'},{t:'Загрузка турбин',s:'91%'},{t:'Аварийных отключений',s:'0'},{t:'Потребителей сети',s:'280 000'}]},
  mining_corp:{accent:'#8b93a7',domainBase:'mining',heroTitle:'Из недр земли — в промышленность мира',tagline:'Горнодобывающая корпорация с рудниками на трёх континентах',navLabel:'Рудники',ctaLabel:'Смотреть рудники',itemIcon:'⛰️',adText:'Контракт на поставку редкоземельных металлов',
    items:[{t:'Добыча железной руды',s:'28 000 т/сут'},{t:'Добыча меди',s:'4 100 т/сут'},{t:'Активных рудников',s:'9'},{t:'Стран присутствия',s:'6'}]},
  aircraft_manufacturer:{accent:'#bf5af2',domainBase:'aero',heroTitle:'От чертежа — до взлётной полосы',tagline:'Авиастроительный завод полного цикла',navLabel:'Модели',ctaLabel:'Смотреть модели',itemIcon:'✈️',adText:'Контракт с авиакомпанией на поставку 40 бортов',
    items:[{t:'Региональный лайнер',s:'120 мест'},{t:'Дальнемагистральный борт',s:'310 мест'},{t:'Грузовой самолёт',s:'до 90т груза'},{t:'Портфель заказов',s:'62 борта'}]},
  industrial_conglomerate:{accent:'#bf5af2',domainBase:'conglomerate',heroTitle:'Одна империя — вся тяжёлая промышленность',tagline:'Промышленный конгломерат: нефть, сталь и машиностроение под одним брендом',navLabel:'Дивизионы',ctaLabel:'Смотреть портфель',itemIcon:'🌐',adText:'Кросс-контракт между всеми дивизионами холдинга',
    items:[{t:'Портфель дивизионов',s:'11 заводов'},{t:'Суммарная выручка',s:'$4.8B/год'},{t:'Стран присутствия',s:'19'},{t:'Сотрудников по всему миру',s:'240 000'}]},
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
  arcade:'grid', puzzle:'grid', rpg:'dash', battle_royale:'dash', ai_game_studio:'dash',
  crypto_wallet:'dash', staking_pool:'dash', mining_farm:'dash', token_launchpad:'dash', nft_marketplace:'grid',
  oil_rig:'dash', gas_station_chain:'grid', coal_mine:'dash', quarry:'dash', textile_factory:'grid',
  furniture_factory:'grid', food_processing_plant:'grid', cement_factory:'dash', electronics_factory:'grid', chemical_plant:'dash',
  pharma_plant:'grid', gas_field:'dash', oil_refinery:'dash', steel_mill:'dash', car_manufacturer:'grid',
  shipyard:'grid', power_plant:'dash', mining_corp:'dash', aircraft_manufacturer:'grid', industrial_conglomerate:'dash',
};
function siteLayout(typeId){ return SITE_LAYOUT[tierIdOf(typeId)] || 'grid'; }
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
  // deterministic pseudo-split for search/social/direct, always sums to 100;
  // the "Реклама" (ads) slice now reflects real active ad placements
  const seed = (site.tracks.traffic*7 + site.tracks.infra*3) % 97;
  let a = 30 + (seed%25);
  let b = 20 + ((seed*3)%20);
  let c = 15 + ((seed*5)%15);
  const adCount = (site.ads||[]).filter(a=>{ const m=findSlotType(a.typeId); return m && m.category==='ad'; }).length;
  let d = Math.max(5, adCount*9);
  const total = a+b+c+d;
  return [a,b,c,d].map(v=>Math.round(v/total*100));
}
const REVIEW_POOL = [
  {name:'Алексей М.', nameEn:'Alex M.',      stars:5, text:'Пользуюсь уже полгода — стабильно и быстро, никаких нареканий.', textEn:"Been using it for six months — stable and fast, no complaints."},
  {name:'Ирина К.',    nameEn:'Irene K.',    stars:4, text:'В целом хорошо, но иногда хочется больше функций за те же деньги.', textEn:'Good overall, though I sometimes wish for more features for the same price.'},
  {name:'Дмитрий С.',  nameEn:'Dmitri S.',   stars:5, text:'Лучшее решение в своей категории, всем рекомендую!', textEn:'Best solution in its category, highly recommend!'},
  {name:'Ольга П.',    nameEn:'Olga P.',     stars:4, text:'Удобно и понятно, поддержка отвечает быстро.', textEn:'Simple and intuitive, support responds quickly.'},
  {name:'Максим Р.',   nameEn:'Max R.',      stars:5, text:'Не думал, что найду что-то настолько удобное. Топ.', textEn:"Didn't think I'd find something this convenient. Top-notch."},
  {name:'Екатерина В.',nameEn:'Kate V.',     stars:3, text:'Нормально, но были небольшие сбои на прошлой неделе.', textEn:'Decent, though there were some minor glitches last week.'},
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
function pickSiteName(typeId){ const pool = NAME_POOLS[tierIdOf(typeId)] || ['Venture']; return pool[Math.floor(Math.random()*pool.length)]; }

/* ---------- STATE ---------- */
let state = null;
function defaultState(){
  return {
    cash: 450,
    day: 1,
    calendarDay: 1,
    secondsElapsed: 0,
    netWorthHistory: [450],
    sites: [],            // {typeId, name, employees, tracks:{design,traffic,infra}, ads:[{typeId,placedAt,expiresAt}]}
    stocks: {},            // sym -> shares (stocks + crypto)
    estateOwned: {garage:1},
    luxuryOwned: {},
    propertyIndex: 1,
    lastRankIndex: 0,
    settings: {sound:true, notif:true, speed:2, sfxVolume:90, music:false, musicVolume:35, lang:'ru', pushNotif:false, theme:'dark', unlockedThemes:['dark','light']},
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
    holdings: {},                   // name -> {pct, boughtAt} — minority stakes bought via buyHoldingStake(), see spec 4.2
    worldStakes: {},                // ITEM 10: name -> pct — minority stakes bought in WORLD_RICH_LIST magnates, see buyWorldStake()
    globalEvent: null,              // {id, startDay, endDay} — multi-day macro-event, see spec 3.1
    autoManagerUnlocked: false,     // one-time cash purchase, independent of the prestige tree; unlocks the per-site auto-manager toggle
    ceoName: 'Игрок',
    difficulty: 'normal',
    setupDone: false,           // true once the player has gone through new-game setup (name/difficulty)
    starterBoostUntil: null,    // real-time ms timestamp — see STARTER_BOOST_MS/starterBoostMultiplier()
    billGraceUntilDay: 0,       // taxes/payroll/hosting stay quiet until state.day passes this — eases the first session in
    log: [],
    lastSeen: Date.now(),
    dailyStreak: {count:0, lastClaim:null},
    achievements: {},
    loan: {principal:0, rating:0, takenDay:null, type:null, dueDay:null, lumpTotal:0, overdueDays:0, lastRepayDay:null},  // rating grows with on-time full repayments — see loanRate()/maxLoanAmount()
    bankruptcy: {negativeSince:null, rescueShown:false, gameOver:false},  // Phase 3: real risk of a crash — see checkBankruptcy()
    investorDeal: null,             // Phase 6: {siteUid, sharePercent, startDay, termDays, totalPaidOut} — at most one active
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
    // Recurring bills, same owed/overdueDays/audited shape as taxes above —
    // these were missing from defaultState() even though migrate() already
    // backfills them for loaded saves. That meant a brand-new game had no
    // state.payroll/state.hosting at all until the next page reload, and
    // opening either modal crashed immediately (buildPayrollHtml/
    // buildHostingHtml read .owed off of them unconditionally).
    payroll: {owed:0, overdueDays:0, lastAssessDay:1, audited:false},
    hosting: {owed:0, overdueDays:0, lastAssessDay:1, audited:false},
    // Было Neural Empire-only, теперь общая механика единой экономики:
    // recurring "service fee" owed for every site running on a
    // partner-licensed model (see AI_LAB.licensed). See
    // assessAiMaintenance()/payAiMaintenance().
    aiMaint: {owed:0, overdueDays:0, audited:false},
    // Было Neural Empire-only: rotating board of NPC-client contracts to
    // train *their* model for pay. See refreshTrainingOffers()/acceptTrainingContract().
    training: {offers:[], active:[], lastRefreshDay:0},
    techs: {},                      // techId -> true, once bought a tech is permanent (see TECH_TREE)
    regions: {home:true},           // regionId -> true, "home" (domestic market) starts unlocked and free (see REGIONS)
    eur: {balance:0, rate:1.08},    // валютный коридор EUR/USD — see driftEurRate()/convertToEur()
    // ---- MAIL (item 14): business-purchase offers + recurring personal bills ----
    // {id, type:'offer'|'bill', ...}. Offers replace the old manual
    // "sell business" button — buyers now come to you. Bills are the
    // day's personal life expenses (see personalExpenses below).
    mailbox: [],
    // ---- ITEM 12: action-earned status, moved by business-interview answers ----
    businessStatus: BUSINESS_STATUS_START,
    // ---- LIFE-SIM PERSONAL EXPENSES (item 15): rent/food/health/personal tax ----
    // Separate from state.taxes/state.hosting/state.payroll, which are
    // BUSINESS expenses. This is the player's own cost of living.
    personalExpenses: {owed:0, overdueDays:0, audited:false, lastAssessDay:1, history:[]},
    // ---- STORY (item 13): intro flashback (yacht/plane/parents) + the
    // 3-rebirth ending's parents-reunion branch ----
    story: {
      introSeen: false,        // new-game intro cutscene shown once, only for brand-new saves
      parentsChoice: null,     // null | 'joined' | 'declined'
      parentsPenalty: false,   // true while the player is defying the parents — costs +25% (see difficultyCostMult())
      parentsTargetValue: 0,   // net worth needed to fully absorb the parents' empire, set on decline
      parentsAbsorbed: false,  // true once the absorb-the-empire goal is reached
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
/* ---------- LEGACY SAVE MIGRATION (Sites+Apps+Neural → one economy) ----------
   Runs once: if a unified save already exists, this whole block is skipped.
   Merge strategy per field is explained in unified-state-merge.js (the
   standalone reviewed version this was inlined from). Short version: cash
   sums (minus double starter capital), sites[] concatenates with typeId
   rewritten to `${old}_${vertical}`, estate/stocks sum by key, achievements/
   skills union, prestige keeps the best run, day/lifetime stats take the
   max/sum, aiMaint/training come from the neural save if present. */
function __sumMaps(a,b){ a=a||{}; b=b||{}; const out={...a}; for(const k in b) out[k]=(out[k]||0)+b[k]; return out; }
function __orMaps(a,b){ a=a||{}; b=b||{}; const out={...a}; for(const k in b) out[k]=out[k]||b[k]; return out; }
function __dedupeByName(...lists){ const seen=new Set(); const out=[]; (lists||[]).forEach(list=>(list||[]).forEach(item=>{ const key=typeof item==='string'?item:item.name; if(!seen.has(key)){seen.add(key);out.push(item);} })); return out; }
function __remapTypeId(oldTypeId, vertical){
  if(['arcade','puzzle','rpg','battle_royale','ai_game_studio'].includes(oldTypeId)) return oldTypeId; // games: no vertical suffix
  if(oldTypeId.startsWith('hybrid_')) return `${oldTypeId}_${vertical}`;
  if(BUSINESS_TIERS.some(t=>t.tierId===oldTypeId)) return `${oldTypeId}_${vertical}`;
  console.warn(`[migrate] unknown legacy typeId "${oldTypeId}" (${vertical}) — kept as-is`);
  return oldTypeId;
}
function migrateLegacySaves(raw){
  const present = VERTICALS.filter(v=>raw[v]);
  if(present.length===0) return null;
  const primaryVertical = present.reduce((best,v)=>(raw[v].lastSeen||0)>(raw[best].lastSeen||0)?v:best, present[0]);
  const primary = raw[primaryVertical];
  const unified = JSON.parse(JSON.stringify(primary));
  const STARTER_CASH = 450;
  let cashTotal = 0; present.forEach(v=>{ cashTotal += (raw[v].cash||0); });
  cashTotal -= STARTER_CASH * Math.max(0, present.length-1);
  unified.cash = Math.max(0, Math.round(cashTotal));
  unified.day = Math.max(...present.map(v=>raw[v].day||1));
  unified.sites = [];
  present.forEach(v=>{ (raw[v].sites||[]).forEach(site=>{ unified.sites.push({...site, typeId: __remapTypeId(site.typeId, v), vertical: v}); }); });
  unified.estateOwned = present.reduce((acc,v)=>__sumMaps(acc, raw[v].estateOwned), {});
  unified.luxuryOwned = present.reduce((acc,v)=>__sumMaps(acc, raw[v].luxuryOwned), {});
  unified.stocks = present.reduce((acc,v)=>__sumMaps(acc, raw[v].stocks), {});
  unified.shorts = present.reduce((acc,v)=>({...acc, ...raw[v].shorts}), {});
  unified.achievements = present.reduce((acc,v)=>__orMaps(acc, raw[v].achievements), {});
  // Initial accumulator MUST have every field prestigeMultiplier()/UI reads
  // (count, points) — not just points. When every legacy save ties at 0
  // points (the common case: most players haven't rebirthed yet), the
  // reduce never replaces this accumulator, so if it were missing 'count'
  // here, state.prestige.count would be undefined and prestigeMultiplier()
  // (`state.prestige.count*0.5`) would silently return NaN — which then
  // poisons totalIncomePerSec() and, via the very first offline-earnings
  // payout on boot, state.cash itself, permanently. (Caught via a real
  // three-save migration test — see /areas/web-empire.md.)
  const bestPrestige = present.map(v=>raw[v].prestige).filter(Boolean).reduce((best,p)=>(p.points||0)>(best.points||0)?p:best, {points:0, count:0});
  unified.prestige = { ...bestPrestige,
    count: bestPrestige.count||0,
    points: bestPrestige.points||0,
    skills: present.reduce((acc,v)=>__orMaps(acc, (raw[v].prestige||{}).skills), {}),
    runs: __dedupeByName(...present.map(v=>(raw[v].prestige||{}).runs||[])) };
  unified.lifetimeStats = { ...primary.lifetimeStats,
    totalEarned: present.reduce((sum,v)=>sum+((raw[v].lifetimeStats||{}).totalEarned||0), 0) };
  unified.npcCompetitors = __dedupeByName(...present.map(v=>raw[v].npcCompetitors||[]));
  unified.acquiredCompetitors = __dedupeByName(...present.map(v=>raw[v].acquiredCompetitors||[]));
  unified.taxes = { rate: primary.taxes?.rate,
    owed: present.reduce((acc,v)=>__sumMaps(acc, (raw[v].taxes||{}).owed), {}),
    overdueDays: present.reduce((acc,v)=>({...acc, ...((raw[v].taxes||{}).overdueDays||{})}), {}),
    audited: present.reduce((acc,v)=>__orMaps(acc, (raw[v].taxes||{}).audited), {}) };
  unified.aiMaint = raw.neural?.aiMaint || {owed:0, overdueDays:0, audited:false};
  unified.training = raw.neural?.training || {offers:[], active:[], lastRefreshDay:0};
  const withLoan = present.map(v=>raw[v].loan).filter(l=>l && l.principal>0);
  unified.loan = withLoan.length ? withLoan.reduce((biggest,l)=>l.principal>biggest.principal?l:biggest) : primary.loan;
  unified.log = [...(primary.log||[])];
  unified.log.push({text:`🔀 Компании Sites/Apps/Neural объединены в единую экономику`, day:unified.day, ts:Date.now()});
  unified._migratedFrom = present;
  unified._migratedAt = Date.now();
  return unified;
}
async function load(){
  try{
    const raw = await storageGetRaw(SAVE_KEY);
    if(raw){ state = JSON.parse(raw); migrate(); return; }
  }catch(e){ /* no save yet, or corrupted save */ }
  // Единого сейва ещё нет — проверяем, есть ли что мигрировать из трёх
  // старых раздельных игр (одноразово, при первом запуске слитого движка).
  try{
    const legacyRaw = {};
    for(const v of VERTICALS){
      const s = await storageGetRaw(LEGACY_SAVE_KEYS[v]);
      if(s){ try{ legacyRaw[v] = JSON.parse(s); }catch(e){ /* corrupt legacy save — ignore */ } }
    }
    const migrated = migrateLegacySaves(legacyRaw);
    if(migrated){
      state = migrated;
      migrate();
      await save(); // persist immediately under the new unified key
      return;
    }
  }catch(e){ console.warn('legacy migration failed', e); }
  state = defaultState();
}
function migrate(){
  // Tier cut (20→10 per vertical) removed some business types. Any site a
  // returning player still owns of a now-gone type would crash every lookup
  // against ALL_BUSINESS_TYPES.find(...) downstream — refund it as cash
  // instead of just deleting it outright, so the change isn't a straight loss.
  if(Array.isArray(state.sites)){
    const stillValid = id => ALL_BUSINESS_TYPES.some(t=>t.id===id);
    const orphaned = state.sites.filter(s=>!stillValid(s.typeId));
    if(orphaned.length){
      state.cash = (state.cash||0) + orphaned.length * 5000;
      state.sites = state.sites.filter(s=>stillValid(s.typeId));
    }
  }
  if(Array.isArray(state.estateOwned)){ const m={}; state.estateOwned.forEach(id=>m[id]=1); state.estateOwned=m; }
  if(Array.isArray(state.luxuryOwned)){ const m={}; state.luxuryOwned.forEach(id=>m[id]=1); state.luxuryOwned=m; }
  if(typeof state.propertyIndex !== 'number') state.propertyIndex = 1;
  if(!state.estateOwned.garage) state.estateOwned.garage = 1;
  if(typeof state.lastRankIndex !== 'number') state.lastRankIndex = currentRankIndex(netWorth());
  if(!state.boosty) state.boosty = {unlocked:false, code:null};
  // Manual ×2/×4 acceleration was removed (Phase 4) — game always runs at
  // a fixed base pace now: 1 real second = 2 in-game seconds (item 5).
  state.settings.speed = 2;
  // Returning saves from before the calendar existed: seed it from the
  // existing economic day count via the same conversion the calendar uses
  // everywhere else, so it doesn't jump back to "Day 1" on first load.
  if(typeof state.calendarDay !== 'number'){
    state.calendarDay = 1 + Math.round(Math.max(0, state.day-1) * (GAME_DAY_SECONDS/(state.settings.speed||1)));
  }
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
  if(typeof state.prestige.count !== 'number') state.prestige.count = 0;
  if(typeof state.prestige.points !== 'number') state.prestige.points = 0;
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
  if(typeof state.starterBoostUntil === 'undefined') state.starterBoostUntil = null;
  if(typeof state.billGraceUntilDay !== 'number') state.billGraceUntilDay = 0;
  if(typeof state.lastSeen !== 'number') state.lastSeen = Date.now();
  if(!state.dailyStreak) state.dailyStreak = {count:0, lastClaim:null};
  if(!state.achievements) state.achievements = {};
  if(typeof state.prestige.skillPoints !== 'number') state.prestige.skillPoints = 0;
  if(!state.prestige.skills) state.prestige.skills = {};
  if(!state.loan) state.loan = {principal:0, rating:0, takenDay:null};
  if(typeof state.loan.principal !== 'number') state.loan.principal = 0;
  if(typeof state.loan.rating !== 'number') state.loan.rating = 0;
  if(typeof state.loan.takenDay !== 'number' && state.loan.takenDay !== null) state.loan.takenDay = null;
  if(state.loan.type !== 'installment' && state.loan.type !== 'lumpsum') state.loan.type = state.loan.principal>0 ? 'installment' : null;
  if(typeof state.loan.dueDay !== 'number' && state.loan.dueDay !== null) state.loan.dueDay = null;
  if(typeof state.loan.lumpTotal !== 'number') state.loan.lumpTotal = 0;
  if(typeof state.loan.overdueDays !== 'number') state.loan.overdueDays = 0;
  if(typeof state.loan.lastRepayDay !== 'number' && state.loan.lastRepayDay !== null) state.loan.lastRepayDay = state.loan.takenDay;
  if(!state.bankruptcy) state.bankruptcy = {negativeSince:null, rescueShown:false, gameOver:false};
  if(typeof state.bankruptcy.negativeSince !== 'number' && state.bankruptcy.negativeSince !== null) state.bankruptcy.negativeSince = null;
  if(typeof state.bankruptcy.rescueShown !== 'boolean') state.bankruptcy.rescueShown = false;
  if(typeof state.bankruptcy.gameOver !== 'boolean') state.bankruptcy.gameOver = false;
  if(typeof state.investorDeal === 'undefined') state.investorDeal = null;
  if(state.investorDeal && !state.sites.some(s=>s.uid===state.investorDeal.siteUid)) state.investorDeal = null; // the site it was tied to is gone
  if(!state.holdings) state.holdings = {};
  if(typeof state.globalEvent === 'undefined') state.globalEvent = null;
  if(state.globalEvent && !GLOBAL_EVENTS.some(d=>d.id===state.globalEvent.id)) state.globalEvent = null;
  if(!state.shorts) state.shorts = {};
  if(!state.finance) state.finance = {incomeHist:[],expenseHist:[],todayIncome:0,todayExpenses:0,dailyHistory:[],lastTickCash:state.cash};
  if(!state.taxes) state.taxes = {rate:TAX_RATE, owed:{}, overdueDays:{}, audited:{}};
  if(typeof state.taxes.rate !== 'number') state.taxes.rate = TAX_RATE;
  if(!state.taxes.owed) state.taxes.owed = {};
  if(!state.taxes.overdueDays) state.taxes.overdueDays = {};
  if(!state.taxes.audited) state.taxes.audited = {};
  if(!state.payroll) state.payroll = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  if(typeof state.payroll.owed !== 'number') state.payroll.owed = 0;
  if(typeof state.payroll.overdueDays !== 'number') state.payroll.overdueDays = 0;
  if(typeof state.payroll.lastAssessDay !== 'number') state.payroll.lastAssessDay = state.day;
  if(!state.hosting) state.hosting = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  if(typeof state.hosting.owed !== 'number') state.hosting.owed = 0;
  if(typeof state.hosting.overdueDays !== 'number') state.hosting.overdueDays = 0;
  if(typeof state.hosting.lastAssessDay !== 'number') state.hosting.lastAssessDay = state.day;
  if(typeof state.payroll.audited !== 'boolean') state.payroll.audited = false;
  if(!state.techs) state.techs = {};
  if(!state.regions) state.regions = {home:true};
  if(typeof state.regions.home !== 'boolean') state.regions.home = true;
  if(!state.eur) state.eur = {balance:0, rate:1.08};
  if(typeof state.eur.balance !== 'number') state.eur.balance = 0;
  if(typeof state.eur.rate !== 'number') state.eur.rate = 1.08;
  state.sites.forEach(ensureStaffLevels);
  state.sites.forEach(s=>{ if('analyst' in s) delete s.analyst; });
  state.sites.forEach(s=>{ if(typeof s.bugged === 'undefined') s.bugged = null; });
  state.sites.forEach(s=>{ if(!Array.isArray(s.content)) s.content = []; });
  state.sites.forEach(s=>{ if(!Array.isArray(s.platforms)) s.platforms = []; });
  state.sites.forEach(s=>{ if(typeof s.hostingTier !== 'number') s.hostingTier = 0; if(typeof s.hostingPaidUntilDay !== 'number' && s.hostingPaidUntilDay !== null) s.hostingPaidUntilDay = null; if(typeof s.domain === 'undefined') s.domain = null; });
  state.sites.forEach(s=>{
    if(typeof s.specPoints !== 'number') s.specPoints = 0;
    if(!Array.isArray(s.specNodes)) s.specNodes = [];
    if(!s.specLockedGroups || typeof s.specLockedGroups !== 'object') s.specLockedGroups = {};
    if(!Array.isArray(s.specPendingPenalties)) s.specPendingPenalties = [];
    if(!Array.isArray(s.specAppliedPenalties)) s.specAppliedPenalties = [];
    if(!s.specExtra || typeof s.specExtra !== 'object') s.specExtra = {};
  });
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
      s.tracks = {design:1,traffic:1,infra:1,marketing:1,security:1};
      delete s.level;
    }
    if(typeof s.tracks.marketing !== 'number') s.tracks.marketing = 1; // back-fill for saves from before the marketing track existed
    if(typeof s.tracks.security !== 'number') s.tracks.security = 1; // back-fill for saves from before the security track existed
    if(!Array.isArray(s.ads)) s.ads = [];
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
  // aiMaint/training: было Neural Empire-only, теперь общая механика.
  if(!state.aiMaint) state.aiMaint = {owed:0, overdueDays:0, audited:false};
  if(typeof state.aiMaint.owed !== 'number') state.aiMaint.owed = 0;
  if(typeof state.aiMaint.overdueDays !== 'number') state.aiMaint.overdueDays = 0;
  if(typeof state.aiMaint.audited !== 'boolean') state.aiMaint.audited = false;
  if(!state.training) state.training = {offers:[], active:[], lastRefreshDay:0};
  if(!Array.isArray(state.training.offers)) state.training.offers = [];
  if(!Array.isArray(state.training.active)) state.training.active = [];
  if(typeof state.training.lastRefreshDay !== 'number') state.training.lastRefreshDay = 0;
  if(!Array.isArray(state.mailbox)) state.mailbox = [];
  if(!state.personalExpenses) state.personalExpenses = {owed:0, overdueDays:0, audited:false, lastAssessDay:state.day, history:[]};
  if(typeof state.personalExpenses.owed !== 'number') state.personalExpenses.owed = 0;
  if(typeof state.personalExpenses.overdueDays !== 'number') state.personalExpenses.overdueDays = 0;
  if(typeof state.personalExpenses.audited !== 'boolean') state.personalExpenses.audited = false;
  if(typeof state.personalExpenses.lastAssessDay !== 'number') state.personalExpenses.lastAssessDay = state.day;
  if(!Array.isArray(state.personalExpenses.history)) state.personalExpenses.history = [];
  if(!state.story) state.story = {introSeen:true, parentsChoice:null, parentsPenalty:false, parentsTargetValue:0, parentsAbsorbed:false}; // existing saves: skip the intro, they're not new players
  if(typeof state.story.introSeen !== 'boolean') state.story.introSeen = true;
  if(typeof state.story.parentsChoice === 'undefined') state.story.parentsChoice = null;
  if(typeof state.story.parentsPenalty !== 'boolean') state.story.parentsPenalty = false;
  if(typeof state.story.parentsTargetValue !== 'number') state.story.parentsTargetValue = 0;
  if(typeof state.story.parentsAbsorbed !== 'boolean') state.story.parentsAbsorbed = false;
  if(typeof state.businessStatus !== 'number') state.businessStatus = BUSINESS_STATUS_START;
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
  t.classList.remove('fx-toast-in'); void t.offsetWidth; t.classList.add('fx-toast-in');
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(()=>t.classList.remove('show'), 1900);
}
/* ---------- Shared one-shot animation trigger ----------
   Adds an fx-* class (see the "ANIMATION LIBRARY" section of style.css),
   forces a reflow so the same class can retrigger back-to-back, then
   removes it once the animation finishes so it's ready to fire again.
   Never throws on a missing element — lots of call sites fire optimistically
   from places where the target might not be mounted (off-screen card, closed
   modal, etc). */
function fx(el, name){
  if(!el) return;
  el.classList.remove(name);
  void el.offsetWidth;
  el.classList.add(name);
  el.addEventListener('animationend', function h(){ el.classList.remove(name); el.removeEventListener('animationend',h); }, {once:true});
}
function fxId(id, name){ fx(document.getElementById(id), name); }
function log(msg){ pushLogSilent(msg); }
function pushLogSilent(msg){
  state.log.unshift({t: Date.now(), msg});
  state.log = state.log.slice(0,30);
  renderLog();
}

/* ---------- DERIVED VALUES ---------- */
function employeeCap(site){ return Math.min(40, MAX_EMPLOYEES_BASE + (site.tracks.infra-1)*4); }
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
  // BUGFIX (1.4): each track's bonus used to MULTIPLY into the running
  // total ("mult *= ..."), so investing in several tracks at once compounded
  // exponentially instead of adding up. A numerical simulation of a careful
  // bot (no cheat-cash) blew past the $80M rebirth threshold in 11-21
  // in-game days and reached $8.9B by day 65 — ~100x past the threshold —
  // because reinvesting profits into more tracks kept multiplying the
  // income multiplier itself, not just adding to it. Tracks now ADD their
  // bonuses instead: investing in more tracks is still clearly better than
  // investing in fewer, but the growth curve stays roughly linear in total
  // track investment instead of exponential in how many tracks you touch.
  let bonus = 0;
  TRACK_ORDER.forEach(key=>{
    const lvl = site.tracks[key];
    const growth = TRACK_META[key].incomeGrowth;
    bonus += (lvl-1) * growth * trackSpecializationMultiplier(site, key);
  });
  return 1 + bonus;
}
/* ---------- BUGS & PATCHES (Phase 5) ----------
   Sites upgrade instantly, but per the roadmap they get their own,
   differently-conditioned patch mechanic: shipping a track upgrade has a
   real chance of shaking something loose in production. Most tiers get a
   straight, instant pay-to-fix. App-tier sites are the one deliberate
   exception — see APP_PATCH_SECONDS below: an app patch takes real dev
   time to ship, not just cash, mirroring how app updates actually work
   (build → review → release) instead of a same-tier instant fix.
   Bigger, infra-heavy upgrades are the likeliest to break something. */
const BUG_CHANCE_BY_TRACK = {design:0.05, traffic:0.05, infra:0.11};
function rollForBug(site, trackId){
  if(site.bugged) return; // one at a time
  let chance = BUG_CHANCE_BY_TRACK[trackId] || 0.06;
  if(state.boosty && state.boosty.unlocked) chance *= 0.75; // Boosty perk: sturdier deploys
  if(Math.random() < chance){
    const severity = Math.random() < 0.3 ? 'major' : 'minor';
    site.bugged = {severity, foundDay: state.day};
    log(`🐞 ${tr('После обновления обнаружен баг на','A bug was found after the update on')} «${esc(site.name)}» (${severity==='major'?tr('серьёзный','major'):tr('мелкий','minor')})`);
    toast(`🐞 ${tr('Баг на','Bug on')} «${esc(site.name)}» — ${tr('нужен патч','a patch is needed')}`);
  }
}
function bugIncomePenaltyMultiplier(site){
  if(!site.bugged) return 1;
  return site.bugged.severity==='major' ? 0.75 : 0.88;
}
function bugPatchCost(site){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const mult = site.bugged && site.bugged.severity==='major' ? 0.18 : 0.08;
  return Math.round(type.baseCost * mult * difficultyCostMult());
}
// App-tier patches: fixed real-world dev time instead of an instant fix —
// a major bug needs a bigger release than a minor one. Applies only to the
// 'app' tier; every other tier keeps the instant pay-to-fix in patchBug().
const APP_PATCH_SECONDS = {minor: 45, major: 120};
function isAppTierSite(site){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  return !!type && tierIdOf(type.id)==='app';
}
function patchBug(idx){
  const site = state.sites[idx];
  if(!site || !site.bugged) return;
  if(isAppTierSite(site)){
    if(site.bugged.patchingUntil){ toast(tr('Патч уже готовится','A patch is already in the works')); return; }
    const cost = bugPatchCost(site);
    if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
    state.cash -= cost;
    const secs = APP_PATCH_SECONDS[site.bugged.severity] || APP_PATCH_SECONDS.minor;
    site.bugged.patchingUntil = Date.now() + secs*1000;
    log(`🔧 ${tr('Патч в разработке для','Patch in development for')} «${esc(site.name)}» — ${tr('готов через','ready in')} ~${secs}${tr('с','s')}`);
    toast(`🔧 ${tr('Патч запущен в разработку','Patch started')} (~${secs}${tr('с','s')})`);
    playSound('buy');
    refreshSiteViewSections(idx, ['tracks']);
    requestAnimationFrame(()=>{ renderAll(); save(); });
    return;
  }
  const cost = bugPatchCost(site);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  log(`🔧 ${tr('Патч выпущен для','Patch shipped for')} «${esc(site.name)}»`);
  toast(tr('Патч выпущен — доход восстановлен','Patch shipped — income restored'));
  site.bugged = null;
  playSound('buy');
  refreshSiteViewSections(idx, ['tracks']);
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
// Called every tick (see tick()) — resolves any app patch whose dev-time
// window has elapsed, the way the release actually "ships".
function resolveFinishedAppPatches(){
  state.sites.forEach((site, idx)=>{
    if(site.bugged && site.bugged.patchingUntil && Date.now() >= site.bugged.patchingUntil){
      site.bugged = null;
      log(`✅ ${tr('Патч выпущен для','Patch shipped for')} «${esc(site.name)}» — ${tr('доход восстановлен','income restored')}`);
      toast(`✅ ${tr('Патч выпущен для','Patch shipped for')} «${esc(site.name)}»`);
      playSound('achievement');
      if(openSiteIdx===idx) refreshSiteViewSections(idx, ['tracks']);
    }
  });
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
// Single knob for overall pace: was 1 (no reduction). Lowered on request so
// a single site can't be pushed to the rebirth threshold almost instantly —
// change this one number to re-tune without touching every baseIncome value.
const GLOBAL_SITE_INCOME_MULT = 0.8;
/* ---------- NEGLECT PENALTY ----------
   Businesses launch for free (see buySite()) — there's no upfront price
   to gate growth. The tradeoff moved from "can you afford to open it" to
   "are you actually running it": three effort checks per site —
   (1) every upgrade track at least at NEGLECT_MIN_TRACK_LEVEL,
   (2) at least NEGLECT_MIN_EMPLOYEES staff hired,
   (3) hosting/maintenance not in the audited-overdue state (see
       hostingPenaltyMultiplier() / state.hosting.audited) — this one is
       account-wide, so unpaid hosting hits every site's neglect score
       at once, not just one.
   Each unmet check adds a failure. 0 failures = full income. 1 = a soft
   warning cut. 2+ flips the multiplier negative — the site burns cash
   instead of making it — which is the "сильный минус" behavior asked
   for: a business you never invest in becomes a liability, not just a
   weaker asset. */
// PRODUCT (4.1): "first 60 seconds without penalties" — see also
// buildPageMockupHtml(), which skips the "under construction" placeholder
// for the same window. siteInOnboardingGrace() is real-time-based (not
// in-game days) so it covers the literal first minute of play regardless
// of game speed.
// BUGFIX/BALANCE (3): was 60000 (60 real seconds) — against a 1440-real-
// second (24-real-minute) in-game day, that's about 4% of day one. A player
// who just bought their first site and hired someone (a completely normal
// opening move, see employeeCost()) has nowhere near enough income yet to
// have leveled every track to 3 within their first 60 seconds, so the
// neglect penalty was landing on essentially every new player before they'd
// had a real chance to avoid it. Six real minutes — still short, but enough
// room to hire and get a couple of upgrades in — combined with the eased
// ramp in siteIncome() above (instead of an instant cut) is the actual fix;
// this just makes sure the ramp has room to matter before it starts.
const ONBOARDING_GRACE_MS = 360000;
function siteInOnboardingGrace(site){
  return typeof site.foundedAt==='number' && (Date.now()-site.foundedAt) < ONBOARDING_GRACE_MS;
}
const NEGLECT_MIN_TRACK_LEVEL = 3;
const NEGLECT_MIN_EMPLOYEES = 1;
function siteNeglectFailures(site){
  let failures = 0;
  if(TRACK_ORDER.some(k => site.tracks[k] < NEGLECT_MIN_TRACK_LEVEL)) failures++;
  if(site.employees < NEGLECT_MIN_EMPLOYEES) failures++;
  if(state.hosting && state.hosting.audited) failures++;
  return failures;
}
// CLEANUP (3): siteNeglectMultiplier() used to live here as a simple
// failures->multiplier lookup, but the actual neglect math was rewritten
// inline inside siteIncome() (grace ramp, liability sizing off site scale
// instead of gross income — see the BUGFIX/BALANCE comment there) and this
// function was never called again. Removed rather than left as dead code.
function siteIncome(type, site, opts){
  if(site.downtimeUntil && Date.now() < site.downtimeUntil) return 0; // post-merge downtime
  // BUGFIX (7): ad/product slot payouts used to be priced off this
  // function's full, instantaneous output — including every *temporary*
  // multiplier (a boost, a live event, a viral/trend spike, a discount
  // window). Those can each push income up 1.5-3x for a few minutes, and
  // since an ad slot pays out up to 300 SECONDS of "current income" as an
  // instant, permanent lump sum, timing a placement right after stacking
  // temporary buffs turned a brief spike into a huge, permanent cash grant
  // (reported: one ad + one track upgrade → 51,000 on a 450-start economy).
  // Passing {stableOnly:true} strips exactly the temporary/timed
  // multipliers below so payout math reflects sustainable income instead
  // of a momentary peak. Passive income (tick()/totalIncomePerSec()) is
  // unaffected — it always calls this with no opts, i.e. the full boosted
  // rate — only lump-sum payout pricing uses the stabilized figure.
  const stableOnly = !!(opts && opts.stableOnly);
  const empBonus = 1 + staffStatBonus(site);
  const aiBonus = type.category==='ai' || tierIdOf(type.id)==='hybrid_ai_saas' ? aiIncomeMult(site) : 1;
  const boostBonus = (!stableOnly && site.boostUntil && Date.now() < site.boostUntil) ? 1.5 : 1;
  const eventBonus = stableOnly ? 1 : eventSiteMultiplier(site, type);
  const synergyMult = sameTypeSynergyMult(site);
  const trackSynMult = trackSynergyIncomeMult(site);
  const dreamTeamMult = dreamTeamIncomeMult(site);
  const partnershipMult = 1 + (site.partnershipBonus||0);
  const ipoMult = site.ipoed ? 0.5 : 1; // IPO'd sites keep running but their income is permanently halved after the payout
  const renoMult = (typeof site.renovationIncomeMult==='number') ? site.renovationIncomeMult : 1;
  const adMult = adPenaltyMultiplier(site);
  const productMult = productBonusMultiplier(site);
  const payrollMult = payrollPenaltyMultiplier();
  const monMult = monetizationIncomeMult(site, type);
  const hostingMult = hostingPenaltyMultiplier();
  const hostingPlanMult = hostingCapacityMult(site);
  const bankruptcyMult = bankruptcyPenaltyMultiplier();
  const bugMult = bugIncomePenaltyMultiplier(site);
  const contentMult = contentIncomeMult(site);
  const platformMult = platformIncomeMult(site);
  const starterMult = starterBoostMultiplier();
  const techMult = techCategoryMult(type.category);
  const regionMult = regionGlobalMult();
  const specTreeMult = specTreeIncomeMult(site);
  const globalEventMult = stableOnly ? 1 : globalEventCategoryMult(type.category);
  const discountMult = (!stableOnly && site.discountUntil && Date.now() < site.discountUntil) ? (typeof site.discountMult==='number' ? site.discountMult : 1) : 1;
  const viralMult = (!stableOnly && site.viralUntil && Date.now() < site.viralUntil) ? (typeof site.viralMult==='number' ? site.viralMult : 1) : 1;
  const trendMult = (!stableOnly && site.trendUntil && Date.now() < site.trendUntil) ? (typeof site.trendMult==='number' ? site.trendMult : 1) : 1;
  const grossIncome = GLOBAL_SITE_INCOME_MULT * type.baseIncome * trackIncomeMultiplier(site) * empBonus * aiBonus * boostBonus * eventBonus * synergyMult * trackSynMult * dreamTeamMult * partnershipMult * ipoMult * renoMult * adMult * productMult * payrollMult * monMult * hostingMult * hostingPlanMult * bankruptcyMult * bugMult * contentMult * platformMult * starterMult * techMult * regionMult * globalEventMult * discountMult * viralMult * trendMult * specTreeMult;
  // BUGFIX: neglectMult used to be folded straight into the multiplication
  // chain above. That meant its negative cases (siteNeglectFailures>=2)
  // scaled with trackIncomeMultiplier — i.e. with how much you'd actually
  // invested in the tracks that weren't neglected. Net effect: upgrading
  // any one track on an under-staffed/under-leveled site made its losses
  // BIGGER, not smaller — the opposite of what upgrading is supposed to
  // do, and the likely cause of "I upgrade and the numbers get worse".
  // Now the liability case is sized off the site's base scale instead, so
  // it stays a flat-ish penalty regardless of unrelated track investment.
  // BUGFIX/BALANCE (2): a numerical simulation of a careless-but-natural new
  // player (all starting cash dumped into 5 tracks at once on day 1, which
  // leaves one track under NEGLECT_MIN_TRACK_LEVEL and 0 employees hired)
  // showed income sitting at -$1.56..-$3.11/s for 21+ in-game days with no
  // way for the player to know what happened or that it's fixable in one
  // hire. The correct curve, per the plan, is a forgiving start with
  // difficulty ramping up over time — not the reverse. Rather than only
  // fixing discoverability (see the rescue-loan modal, 1.3), the liability
  // itself now ramps in over a short grace window from a site's founding
  // instead of hitting at full strength immediately, giving new players
  // room to notice and correct course before the full penalty applies.
  const NEGLECT_GRACE_DAYS = 3;
  const NEGLECT_GRACE_MIN_MULT = 0.25; // liability starts at 25% strength on day 0
  const foundedDay = (typeof site.foundedDay==='number') ? site.foundedDay : (state.day - NEGLECT_GRACE_DAYS);
  const daysSinceFounding = Math.max(0, state.day - foundedDay);
  const graceRamp = NEGLECT_GRACE_MIN_MULT + (1-NEGLECT_GRACE_MIN_MULT) * Math.min(1, daysSinceFounding/NEGLECT_GRACE_DAYS);
  // BUGFIX/BALANCE (3): the day-based ramp above only ever applied to the
  // neglectFailures>=2 (liability) branch. The much more common
  // neglectFailures===1 case — a totally normal spot for a new player to be
  // in, e.g. they hired someone (see employeeCost) and haven't finished
  // leveling every track to 3 yet — instead cut straight to a flat ×0.6 the
  // instant siteInOnboardingGrace() (60 real seconds — a small fraction of
  // one 1440s in-game day) ran out, with zero ramp. A brand-new player would
  // watch income climb happily for their first minute and then suddenly get
  // cut by 40% with no warning and no way to have already fixed it, which
  // reads exactly like "I upgrade and it doesn't help" — because at that
  // point the player is often still saving up for the very upgrades that
  // would clear the penalty. Reusing the same 0-to-1 day ramp here (instead
  // of the separate 0.25-based one above, which is liability-specific) turns
  // that cliff into the same kind of gradual ease-in the liability branch
  // already gets, so a new player's income keeps climbing smoothly instead
  // of falling off a step the moment the clock runs out.
  const onboardRamp = Math.min(1, daysSinceFounding/NEGLECT_GRACE_DAYS);
  const neglectFailures = siteNeglectFailures(site);
  let income;
  if(neglectFailures <= 0 || siteInOnboardingGrace(site)){
    // PRODUCT (4.1): "first few minutes without penalties" — a site is
    // exempt from the neglect penalty entirely (not just ramped down) for
    // its first stretch of real time (see ONBOARDING_GRACE_MS), on top of
    // the day-based ramps above which still apply afterward. New players
    // get a clean, growing-numbers first look regardless of how they spend
    // the starting cash.
    income = grossIncome;
  } else if(neglectFailures === 1){
    income = grossIncome * (1 - onboardRamp*0.4); // eases 1.0 -> 0.6 instead of snapping to 0.6
  } else {
    const liabilityBase = GLOBAL_SITE_INCOME_MULT * type.baseIncome * empBonus;
    income = -liabilityBase * (neglectFailures >= 3 ? 1.8 : 0.9) * graceRamp;
  }
  // Free-tier dial (SaaS only) — unlike the timed campaigns above, this is a
  // persistent on/off setting rather than a one-shot activation: it scales
  // gross income up, but also bills an ongoing infra upkeep every tick for
  // as long as it's left on, and if the Infra track can't cover the level
  // chosen, the upkeep still gets billed (wasted spend) *plus* an overload
  // penalty on top — see FREE_TIER_LEVELS / freeTierEffect().
  if(tierIdOf(type.id)==='saas' && site.freeTierLevel>0){
    const ft = freeTierEffect(type, site);
    income = income * ft.incomeMult - ft.upkeep;
  }
  // Generic campaign engine (app/ai/restaurant) — timed boost/backfire.
  const campaignDef = CAMPAIGN_DEFS[tierIdOf(type.id)];
  if(campaignDef && site.campaigns && site.campaigns[tierIdOf(type.id)]){
    const cs = site.campaigns[tierIdOf(type.id)];
    if(cs.until && Date.now() < cs.until){
      const cMult = (typeof cs.mult==='number' ? cs.mult : 1);
      // BUGFIX (1.1): income *= cMult used to flip sign when BOTH were
      // negative — a site already in the red from neglect (income<0) that
      // also caught a failed campaign (cMult<0, e.g. servers crashed
      // without capacity) came out with income *= negative = POSITIVE,
      // i.e. the failed campaign looked like it was paying the site out of
      // its hole. A flop should always make things worse, never better.
      // When income is already negative and the campaign also flopped, add
      // the (negative) penalty instead of multiplying, so the loss grows
      // instead of reversing. Every other combination keeps the original
      // multiplicative behaviour (that's the normal, correct boost/flop math).
      if(income < 0 && cMult < 0){
        income += grossIncome * cMult;
      } else {
        income *= cMult;
      }
    }
  }
  // Generic dial engine (crypto_exchange/logistics/bank) — persistent
  // toggle with ongoing upkeep, same additive shape as the SaaS free tier.
  if(DIAL_DEFS[tierIdOf(type.id)] && site.dials && site.dials[tierIdOf(type.id)]>0){
    const de = dialEffect(type, site, tierIdOf(type.id));
    income = income * de.incomeMult - de.upkeep;
  }
  return income;
}
function employeeCost(site){ return employeeHireCost(site, 1); }

function estateCount(id){ return state.estateOwned[id]||0; }
function luxuryCount(id){ return state.luxuryOwned[id]||0; }
function estateNextCost(e){ const n=estateCount(e.id); return Math.round(e.cost*Math.pow(1.55, n)); }
/* was Math.pow(1.55, n-1): the 2nd purchase of any property (n=1) landed on
   exponent 0, same price as the 1st. Every property's second unit was
   underpriced by a factor of 1.55x. Now matches luxuryNextCost's (correct)
   pattern of scaling from the very next purchase. */
function luxuryNextCost(l){ const n=luxuryCount(l.id); return Math.round(l.cost*Math.pow(1.4, n)); }
function estateBonusTotal(){ return Math.min(REAL_ESTATE.reduce((s,e)=>s+estateCount(e.id)*e.bonus,0), 4.0); }
// Reputation earned from the luxury collection, plus any one-time reputation
// events claimed below (state.reputationEventRep) — kept separate from
// luxuryOwned so it survives independent of what's currently in the garage.
function reputationTotal(){ return Math.max(0, LUXURY.reduce((s,l)=>s+luxuryCount(l.id)*l.rep,0) + (state.reputationEventRep||0)); }
function reputationBonus(){ return Math.min(reputationTotal()*0.0006, 1.5); }

/* ---------- REPUTATION TIERS ----------
   A named-status ladder over the existing reputation number (itself driven
   by the luxury collection) — purely a status/milestone layer. It does NOT
   change reputationBonus()'s income math (that formula is already tuned and
   used across several income calculations), it just narrates where the
   player stands on it and pays out one-time "big break" events (PR moments)
   the first time each tier is reached, similar in spirit to a leveled-up
   achievement. Thresholds are chosen to line up with the luxury item costs
   above — reachable gradually, "Легендарный" only after a serious luxury
   collection. */
const REPUTATION_TIERS = [
  {id:'unknown',   threshold:0,    name:'Неизвестный',   nameEn:'Unknown',      icon:'🌑'},
  {id:'local',     threshold:50,   name:'Местный',       nameEn:'Local',        icon:'🥉', eventName:'Заметка в местной прессе',    eventNameEn:'Local press mention',    eventCash:10000,   eventRep:50},
  {id:'city',      threshold:200,  name:'Городской',     nameEn:'City-wide',    icon:'🥈', eventName:'Выступление на конференции',  eventNameEn:'Conference talk',        eventCash:50000,   eventRep:100},
  {id:'regional',  threshold:500,  name:'Региональный',  nameEn:'Regional',     icon:'🥇', eventName:'Книга о вашем опыте',         eventNameEn:'A book about your journey', eventCash:100000, eventRep:200},
  {id:'national',  threshold:1000, name:'Национальный',  nameEn:'National',     icon:'💼', eventName:'Фильм о вашей империи',       eventNameEn:'A movie about your empire', eventCash:1000000, eventRep:500},
  {id:'world',     threshold:2500, name:'Мировой',       nameEn:'World-famous', icon:'🌍', eventName:'Мировое турне с лекциями',    eventNameEn:'World speaking tour',    eventCash:2000000, eventRep:300},
  {id:'legendary', threshold:5000, name:'Легендарный',   nameEn:'Legendary',    icon:'👑', eventName:'Место в истории бизнеса',     eventNameEn:'A place in business history', eventCash:5000000, eventRep:1000},
];
function currentReputationTier(){
  let t = REPUTATION_TIERS[0];
  for(const tier of REPUTATION_TIERS){ if(reputationTotal()>=tier.threshold) t=tier; else break; }
  return t;
}
function nextReputationTier(){
  const idx = REPUTATION_TIERS.indexOf(currentReputationTier());
  return REPUTATION_TIERS[idx+1] || null;
}
// Called after anything that can move reputationTotal() (buying luxury, or
// right after loading a save) — grants every un-claimed tier's one-time PR
// event up to the current tier, so nothing is missed even if several tiers
// were crossed in one jump (e.g. offline progress or a big luxury buy).
function checkReputationTierEvents(){
  if(!state.reputationTiersClaimed) state.reputationTiersClaimed = {};
  const total = reputationTotal();
  let gained = false;
  REPUTATION_TIERS.forEach(tier=>{
    if(!tier.eventCash) return; // 'unknown' has no event
    if(total < tier.threshold) return;
    if(state.reputationTiersClaimed[tier.id]) return;
    state.reputationTiersClaimed[tier.id] = true;
    state.cash += tier.eventCash;
    state.reputationEventRep = (state.reputationEventRep||0) + tier.eventRep;
    gained = true;
    log(`${tier.icon} ${tr('Новый статус','New status')}: ${tr(tier.name,tier.nameEn)} — ${tr(tier.eventName,tier.eventNameEn)} (+${fmt(tier.eventCash)}, +${tier.eventRep} ${tr('репутации','reputation')})`);
    toast(`${tier.icon} ${tr(tier.eventName,tier.eventNameEn)}! +${fmt(tier.eventCash)}`);
  });
  if(gained){ playSound('achievement'); vibrateFeedback(20); fxId('header-rank','fx-medal-shine'); save(); }
  return gained;
}

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
// Baseline economy buff added when the 5th upgrade track (security) was
// introduced, so income keeps pace with having 5 tracks to fund at once
// instead of 3 — without this, affording all 5 simultaneously would be a
// much slower grind than before.
const FIVE_TRACK_INCOME_BOOST = 1.35;
function totalIncomePerSec(){
  let base = 0;
  state.sites.forEach(site=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    base += siteIncome(type, site);
  });
  return base * (1+estateBonusTotal()) * (1+reputationBonus()) * (1+hybridBonusTotal()) * (1+acquisitionBonusTotal()) * prestigeMultiplier() * prestigeLevelMult() * (hasSkill('income_boost')?1.05:1) * (hasSkill('mega_income')?1.10:1) * FIVE_TRACK_INCOME_BOOST * personalExpensePenaltyMultiplier();
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
function netWorth(){ return state.cash + stocksValue() + estateValue() + luxuryValue() + shortsValue() + eurValueInUsd() - (state.loan?state.loan.principal:0); }
function eurValueInUsd(){ return (state.eur ? state.eur.balance*state.eur.rate : 0); }
function currentRank(nw){ let r=RANKS[0]; for(const rank of RANKS){ if(nw>=rank.min) r=rank; else break; } return r; }
function currentRankIndex(nw){ return RANKS.indexOf(currentRank(nw)); }
// [Пункт 1] Ранг не должен понижаться, если чистые активы потом просели
// (взял кредит, DDoS, крупная покупка) — достигнутый ранг сохраняется.
// currentRank/currentRankIndex выше остаются «сырыми» функциями от nw — они
// нужны как есть для триггера «новый ранг» в tick() (см. ниже, сравнение с
// state.lastRankIndex) и для инициализации lastRankIndex на старых сохранениях.
// Everywhere the rank is actually shown to the player, use keptRank/
// keptRankIndex instead — они берут максимум с state.lastRankIndex, который
// в tick() только растёт и никогда не уменьшается.
function keptRankIndex(nw){ return Math.max(currentRankIndex(nw), state.lastRankIndex||0); }
function keptRank(nw){ return RANKS[keptRankIndex(nw)]; }

/* ---------- GAME LOOP ---------- */
// Everything that needs to happen exactly once per in-game day: daily
// history snapshot, taxes/payroll/hosting/AI-maintenance assessment,
// NPC growth, staff fatigue, global events, dividends. Shared by tick()'s
// day-rollover branch and devSkipDay() (BUGFIX: devSkipDay() used to just
// bump state.day without running any of this, so using it to fast-forward
// silently skipped every recurring bill/event instead of simulating a real
// day — the opposite of what a "skip day" dev tool should guarantee).
function runDayRollover(nwNow){
  if(typeof nwNow !== 'number') nwNow = netWorth();
  state.finance.dailyHistory.push({day:state.day, income:state.finance.todayIncome, expenses:state.finance.todayExpenses});
  if(state.finance.dailyHistory.length>14) state.finance.dailyHistory.shift();
  state.finance.todayIncome = 0;
  state.finance.todayExpenses = 0;
  state.day++;
  state.lifetimeStats.netWorthByDay.push({day:state.day, nw:nwNow});
  if(state.lifetimeStats.netWorthByDay.length>200) state.lifetimeStats.netWorthByDay.shift();
  state.lifetimeStats.daysTracked++;
  growNpcCompetitors(nwNow);
  assessDailyTaxes();
  assessPayroll();
  assessPayrollOverdue();
  state.sites.forEach(advanceStaffFatigue);
  state.sites.forEach(maybeAnnounceDreamTeam);
  assessHosting();
  assessHostingOverdue();
  assessLoanOverdue();
  assessAiMaintenance();
  refreshTrainingOffers();
  assessPersonalExpenses();
  assessPersonalExpensesOverdue();
  maybeGenerateBusinessOffer();
  maybeGenerateInterview();
  maybeGenerateStartupOffer();
  expireOldMail();
  checkParentsAbsorption();
  driftEurRate();
  if(state.boosty && state.boosty.unlocked){
    // Boosty perk: a small daily "creator support" stipend, scaled gently
    // with net worth so it stays a nice-to-have and never a primary income
    // source (capped well below what a single site earns per day).
    const stipend = Math.round(Math.min(500, Math.max(50, nwNow*0.002)));
    state.cash += stipend;
    log(`🚀 ${tr('Boosty: ежедневный бонус','Boosty: daily bonus')} +${fmt(stipend)}`);
  }
  if(activeScreen==='dash'){ renderFinanceCard(); renderTaxCard(); renderPayrollCard(); renderHostingCard(); renderNeuralLabCard(); renderAiMaintCard(); renderTrainingCard(); }
  if(activeScreen==='inbox') renderInbox();
  else refreshInboxBadge();
  refreshTaxModal();
  refreshPayrollModal();
  refreshHostingModal();
  refreshFinanceDetailModal();
  refreshNeuralLabModal();
  refreshAiMaintModal();
  refreshTrainingModal();
  advanceGlobalEvent();
  maybeTriggerGlobalEvent();
  payHoldingDividends();
  payWorldDividends();
  refreshLeaderboardModal();
}
function tick(){
  if(state.bankruptcy && state.bankruptcy.gameOver) return; // frozen until resetAfterBankruptcy()
  // ITEM 1: cosmetic calendar — +1 calendar day per tick() call (tick fires
  // once per real second), independent of the economic clock below.
  state.calendarDay = (state.calendarDay||1) + 1;
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
  applyInvestorDealTick();
  resolveFinishedAppPatches();
  // netWorth() walks sites/stocks/estate/loans, so it's computed once here
  // and reused for every reader below instead of recalculating per reader —
  // this used to run 6-8x per tick (rank check, history sample, header,
  // dashboard...), which was one of the biggest per-second CPU costs.
  let nwNow = netWorth();
  if(state.secondsElapsed >= GAME_DAY_SECONDS){
    state.secondsElapsed = 0;
    runDayRollover(nwNow);
  }
  ensureDailyQuests();
  ensureSeasonEvent();

  cleanupExpiredEvents();
  maybeTriggerRandomEvent();
  maybeTriggerFatherDdos();
  runAutoHire();
  runAutoUpgrade();
  runSiteAutoManagers();

  if(state.loan.type==='lumpsum' && state.loan.principal>0){
    if(state.day >= state.loan.dueDay) settleLumpsumDefault();
  } else if(state.loan.principal > 0){
    const interest = state.loan.principal * loanRate() * (state.settings.speed/GAME_DAY_SECONDS);
    state.loan.principal += interest;
    tickExpense += interest;
  }

  checkBankruptcy();

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
  state.sites.forEach(tickSpecTree);

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
  cachedNwNow = nwNow;

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
  liveRefresh(nwNow);
  state.lastSeen = Date.now();
  if(tickCount % 3 === 0){ checkAchievements(); checkReputationTierEvents(); }
  tickCount++;
}
/* ---- Live UI refresh, decoupled from the 1s economy tick ----
   tick() above only runs once a second because that's the unit the whole
   economy (income, interest, daily events) is balanced around — speeding
   that up would need rescaling a dozen money/probability formulas at once.
   But countdowns, buff timers, discount/hosting-overdue text, and button
   affordability don't touch the economy at all; they just re-read state
   that's already correct. Running this part on its own faster interval
   (see setInterval below) makes all of that feel instant without touching
   the economy's cadence or recomputing netWorth() any more often. */
// ITEM 7 FIX (live ticking): specPoints accrue every second via
// tickSpecTree(), but every display of them was only ever refreshed after
// a structural action (buying a node, hiring, etc.) — so between actions
// the number just sat frozen everywhere while it kept growing invisibly
// underneath. The spec tree modal *looked* correct only because it happens
// to get rebuilt on every purchase click, not because it was actually
// live. This patches the handful of specPoints text nodes directly, every
// 200ms, same cheap text-only approach as the rest of liveRefresh() — no
// innerHTML rebuilds, so no flicker risk.
function updateSpecPointsLive(){
  if(openSiteIdx!==null){
    const site = state.sites[openSiteIdx];
    if(site){
      const pts = Math.floor(site.specPoints||0);
      const rate = specPointsPerSec(site).toFixed(2);
      ['tt-pts','sv-tracks-pts','sv-content-pts','sv-platforms-pts','sv-renovation-pts'].forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.textContent = pts;
      });
      ['tt-rate','sv-tracks-rate'].forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.textContent = rate;
      });
    }
  }
  if(activeScreen==='sites'){
    state.sites.forEach((site, idx)=>{
      const el = document.getElementById('list-pts-'+idx);
      if(el) el.textContent = Math.floor(site.specPoints||0);
    });
  }
}
function liveRefresh(nw){
  if(state.bankruptcy && state.bankruptcy.gameOver) return;
  if(nw===undefined) nw = cachedNwNow;
  renderHeader(nw);
  renderTicker();
  updateDashStatsLive(nw);
  updateEventsLive();
  if(activeScreen==='dash') renderDash(nw);
  updateAffordabilityAll();
  updateMarketLive();
  updateEstateLive();
  updateSiteViewLive();
  updateFinanceLive();
  updateSpecPointsLive();
  refreshLoanModal();
  updateBankruptcyBanner();
  updateGameClock();
  refreshCalendarModal();
  updateStarterBoostBadge();
}
updateGameClock();
updateStarterBoostBadge();
setInterval(tick, 1000);
setInterval(liveRefresh, 200);
setInterval(save, 15000);
document.addEventListener('visibilitychange', ()=>{
  document.body.classList.toggle('bg-paused', document.hidden);
  if(document.hidden){ pauseMusicLoop(); } else { resumeMusicLoopIfNeeded(); }
});

/* ---------- ACTIONS ---------- */
// Phase 2: creation is now a two-step flow. The type card's button opens
// this monetization picker instead of buying directly; buySite() itself
// now requires a monetizationId and won't create a site without one.
function openMonetizationModal(typeId){
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===typeId);
  if(!type) return;
  const nw = netWorth();
  if(state.sites.length >= maxSiteSlots(nw)){
    toast(tr('Нет свободных слотов — растите активы','No free slots — grow your net worth'));
    playSound('error'); renderAll(); return;
  }
  const rows = MONETIZATION_MODELS.map(function(m){
    return `<div class="card glass" style="margin-bottom:10px;">
      <div class="card-row">
        <div class="card-icon">${m.icon}</div>
        <div style="flex:1">
          <div class="card-title">${L(m,'name')}</div>
          <div class="card-sub">${L(m,'desc')}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn btn-cyan btn-block" onclick="buySite('${typeId}','${m.id}')">${tr('Выбрать','Choose')}</button></div>
    </div>`;
  }).join('');
  openModal(`<h3>${type.icon} ${tr('Модель монетизации','Monetization model')}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">${tr(`Прежде чем запустить «${L(type,'name')}», выберите, как проект будет зарабатывать. Заранее не известно, насколько модель подойдёт тематике — это выяснится по ходу работы бизнеса.`,`Before launching "${L(type,'name')}", choose how the project will make money. How well the model fits the theme isn't shown up front — you'll find out as the business runs.`)}</p>
    ${rows}
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Отмена')}</button></div>`);
}
// Shared site-object shape, used both for founding a new business (buySite,
// tracks start at level 1) and for acquiring an already-running business
// from a competitor (buyCompetitorBusiness, tracks start higher to reflect
// that it's a going concern, not a fresh launch).
function createSiteObject(typeId, monetizationId, trackLevel){
  trackLevel = trackLevel || 1;
  return {typeId, uid:genUid(), name:pickSiteName(typeId), employees:0, staffLevels:[], staffFatigue:[], staffVacationUntil:[], staffSpecs:[], tracks:{design:trackLevel,traffic:trackLevel,infra:trackLevel,marketing:trackLevel,security:trackLevel}, ads:[], aiModel:{kind:null, ownLevel:0}, boostUntil:0, insured:false, autoManager:false, ipoed:false, bugged:null, content:[], platforms:[], incomeHistory:[], lastUpgradeAt:Date.now(), foundedDay:state.day, foundedAt:Date.now(), renovationStage:0, renovationSalaryMult:1, renovationIncomeMult:1, monetization:monetizationId, discountLog:[], discountUntil:0, discountMult:1, viralLog:[], viralUntil:0, viralMult:1, trendLog:[], trendUntil:0, trendMult:1, freeTierLevel:0, campaigns:{}, dials:{}, hostingTier:0, hostingPaidUntilDay:null, domain:null, specPoints:0, specNodes:[], specLockedGroups:{}, specPendingPenalties:[], specAppliedPenalties:[], specExtra:{}};
}
function buySite(typeId, monetizationId){
  if(!monetizationId || !MONETIZATION_MODELS.some(m=>m.id===monetizationId)){ openMonetizationModal(typeId); return; }
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===typeId);
  const nw = netWorth();
  const owned = state.sites.filter(s=>s.typeId===typeId).length;
  // Card rendering treats a type as unlocked forever once you own one, even
  // if net worth later dips (e.g. right after a big purchase). This check
  // used to ignore "owned" and could reject a buy the UI showed as enabled.
  if(nw < type.unlockNetWorth && owned===0){ toast(tr('Ещё не открыто','Not unlocked yet')); playSound('error'); closeModal(); renderAll(); return; }
  if(state.sites.length >= maxSiteSlots(nw)){ toast(tr('Нет свободных слотов — растите активы','No free slots — grow your net worth')); playSound('error'); closeModal(); renderAll(); return; }
  if(state.sites.length>0 && !sitesReadyForExpansion()){
    toast(tr(`Сначала прокачайте ВСЕ ветки до ${EXPANSION_GATE_TRACK_LEVEL}+ и пройдите 1-е обновление на каждом сайте`, `First get EVERY track to level ${EXPANSION_GATE_TRACK_LEVEL}+ and complete the 1st renovation on every site`));
    playSound('error'); closeModal(); renderAll(); return;
  }
  // Launching a business is free (see FOUNDING_COST) — the real cost is
  // keeping it staffed, upgraded, and paid up (see siteNeglectFailures()),
  // not the upfront price. state.cash is untouched here on purpose.
  state.sites.push(createSiteObject(typeId, monetizationId, 1));
  bumpQuest('buy_site');
  const modelMeta = MONETIZATION_MODELS.find(m=>m.id===monetizationId);
  log(`🚀 ${tr('Запущен новый проект','New project launched')}: ${L(type,'name')} · ${modelMeta.icon} ${L(modelMeta,'name')}`);
  toast(`${tr('Куплено','Bought')}: ${L(type,'name')}`);
  playSound('buy');
  vibrateFeedback(15);
  closeModal();
  renderAll(); save();
}
// Shared side-effects that used to live in the removed cash-based
// upgradeTrack() (bug risk, quest progress, milestone FX) — now triggered
// from wherever a track level actually changes: node purchases in the tree.
function afterTrackLevelChange(idx, site, trackId, before, after){
  site.lastUpgradeAt = Date.now();
  rollForBug(site, trackId);
  bumpQuest('upgrade_track', after-before);
  // Item 7 fix: buying a tree node/repeat spends specPoints, and that same
  // balance is shown in three other panels (content/platforms/renovation)
  // that don't otherwise get touched by a tree purchase — without this
  // they kept showing the pre-purchase point total until some unrelated
  // action happened to rebuild them.
  const sections = ['tracks','content','platforms','renovation'];
  if(trackId==='design') sections.push('page','reviews','stagepill');
  else if(trackId==='traffic') sections.push('page','traffic');
  else if(trackId==='infra') sections.push('employees');
  refreshSiteViewSections(idx, sections);
  if(openSiteIdx===idx) spawnSvBurst();
  if(Math.floor(after/5) > Math.floor(before/5)) fxId('sv-tracks','fx-level-up');
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
  const aFatigue = ensureStaffFatigue(a).concat(ensureStaffFatigue(b));
  const aVac = ensureStaffVacation(a).concat(ensureStaffVacation(b));
  const aSpecs = ensureStaffSpecs(a).concat(ensureStaffSpecs(b));
  a.staffLevels = ensureStaffLevels(a).concat(ensureStaffLevels(b)).slice(0, a.employees);
  a.staffFatigue = aFatigue.slice(0, a.employees);
  a.staffVacationUntil = aVac.slice(0, a.employees);
  a.staffSpecs = aSpecs.slice(0, a.employees);
  const aScore = !a.aiModel||!a.aiModel.kind ? 0 : (a.aiModel.kind==='licensed' ? 0.5 : a.aiModel.ownLevel);
  const bScore = !b.aiModel||!b.aiModel.kind ? 0 : (b.aiModel.kind==='licensed' ? 0.5 : b.aiModel.ownLevel);
  if(bScore > aScore) a.aiModel = JSON.parse(JSON.stringify(b.aiModel));
  a.trackCapBonus = (a.trackCapBonus||0) + MERGE_CAP_BONUS;
  a.merged = (a.merged||0) + 1;
  a.downtimeUntil = Date.now() + MERGE_DOWNTIME_MS;
  maybeAnnounceTrackSynergy(a);
  maybeAnnounceDreamTeam(a);
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
  newSite.staffLevels = ensureStaffLevels(a).concat(ensureStaffLevels(b)).slice(0, newSite.employees);
  newSite.staffFatigue = ensureStaffFatigue(a).concat(ensureStaffFatigue(b)).slice(0, newSite.employees);
  newSite.staffVacationUntil = ensureStaffVacation(a).concat(ensureStaffVacation(b)).slice(0, newSite.employees);
  newSite.staffSpecs = ensureStaffSpecs(a).concat(ensureStaffSpecs(b)).slice(0, newSite.employees);
  closeSiteView(); closeModal();
  const hi = Math.max(idx, partnerIdx), lo = Math.min(idx, partnerIdx);
  state.sites.splice(hi,1);
  state.sites.splice(lo,1);
  state.sites.push(newSite);
  log(tr(`🧬 Собран гибрид: ${recipe.icon} ${recipe.name}`,`🧬 Hybrid assembled: ${recipe.icon} ${recipe.nameEn}`));
  toast(tr(`Новый бизнес: ${recipe.name}!`,`New business: ${recipe.nameEn}!`));
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
      <div class="card-title">${r.icon} ${tr(r.name,r.nameEn)} ${done?'✅':''}</div>
      <div class="card-sub">${typeA?tr(typeA.name,typeA.nameEn):r.aId} + ${typeB?tr(typeB.name,typeB.nameEn):r.bId} · ${tr('оба трека ≥ ур.','both tracks ≥ lvl.')}${r.requiredTrackLevel}</div>
      <div class="card-sub">${tr(r.desc,r.descEn)}</div>
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
  refreshSiteViewSections(idx, ['ailab']);
  if(openSiteIdx===idx) spawnSvBurst();
  requestAnimationFrame(()=>{ renderAll(); save(); });
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
  refreshSiteViewSections(idx, ['ailab']);
  refreshNeuralLabModal();
  if(openSiteIdx===idx) spawnSvBurst();
  requestAnimationFrame(()=>{ renderAll(); save(); });
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
  if(openSiteIdx===idx) updateSiteViewLive();
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
/* ---------- DISCOUNT CAMPAIGNS — marketplace-only unique mechanic ----------
   The 'shop' tier's own lever: a discount pulls in more shoppers, but that
   crowd needs infra (server) capacity to actually serve — undersized infra
   flips the campaign from a boost into an overload (lost orders, refunds,
   straight cash loss instead of a gain). Independently, running campaigns
   back-to-back racks up "fatigue": each one within DISCOUNT_FATIGUE_WINDOW_MS
   of a previous one costs more (Math.pow growth) and pays off less, and
   spamming 3+ in the window burns the effect through zero into a loss even
   with plenty of server capacity — discounting too often is its own way to
   lose money, not just a capacity problem. */
const DISCOUNT_FATIGUE_WINDOW_MS = 15*60*1000; // repeat campaigns inside this real-time window build fatigue
const DISCOUNT_TIERS = [
  {id:'small',  pct:10, requiredInfra:2, boostMult:1.6, durationMs:90000,  costMult:0.10},
  {id:'medium', pct:25, requiredInfra:5, boostMult:2.6, durationMs:120000, costMult:0.28},
  {id:'big',    pct:50, requiredInfra:8, boostMult:4.0, durationMs:150000, costMult:0.55},
];
function discountFatigueCount(site){
  if(!site.discountLog) site.discountLog = [];
  const cutoff = Date.now() - DISCOUNT_FATIGUE_WINDOW_MS;
  site.discountLog = site.discountLog.filter(ts=>ts>cutoff);
  return site.discountLog.length;
}
function discountCost(type, dtier, fatigue){
  return Math.round(type.baseCost * dtier.costMult * Math.pow(1.9, fatigue) * difficultyCostMult());
}
function launchDiscount(idx, tierId){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='shop') return;
  if(site.discountUntil && Date.now() < site.discountUntil){ toast(tr('Акция уже активна','A campaign is already live')); return; }
  const dtier = DISCOUNT_TIERS.find(d=>d.id===tierId);
  if(!dtier) return;
  const fatigue = discountFatigueCount(site);
  const cost = discountCost(type, dtier, fatigue);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.discountLog.push(Date.now());
  const infraOk = site.tracks.infra >= dtier.requiredInfra;
  let mult;
  if(infraOk){
    mult = dtier.boostMult - fatigue*0.55;
    if(fatigue>=3) mult -= 1.2; // brand burn: customers stop trusting nonstop sales
    // BUGFIX (4): fatigue decay could push this below 0 even though infraOk
    // is true — i.e. a site that met the actual requirement still got the
    // "servers can't cope" flop treatment (deeply negative income) purely
    // from posting too often, indistinguishable from the genuinely-
    // unprepared case below. Meeting the requirement should mean "at worst,
    // no bonus", never "worse than not running a promo at all".
    mult = Math.max(mult, 1);
  } else {
    mult = -(0.9 + fatigue*0.35); // servers can't serve the crowd — lost orders/refunds
  }
  site.discountUntil = Date.now() + dtier.durationMs;
  site.discountMult = mult;
  if(mult<0){
    log(`🔥 ${esc(site.name)}: акция −${dtier.pct}% обернулась перегрузкой — доход временно в минусе`);
    toast(tr("Серверы не справились — доход ушёл в минус","Servers couldn't keep up — income went negative"));
    playSound('error');
  } else {
    log(`🏷️ ${esc(site.name)}: запущена акция −${dtier.pct}%${fatigue>0?` (усталость: ${fatigue})`:''}`);
    toast(`🏷️ ${tr('Акция запущена','Campaign launched')}: −${dtier.pct}%`);
    playSound('buy');
  }
  refreshSiteViewSections(idx, ['discount']);
  // CLEANUP (3): wires fx-discount-tag (success) / fx-headshake (flop) —
  // named explicitly in the plan as an obvious, ready-to-wire animation.
  fxId('sv-discount', mult<0 ? 'fx-headshake' : 'fx-discount-tag');
  if(openSiteIdx===idx) updateSiteViewLive();
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
/* ---------- VIRAL POSTS — blog-only unique mechanic ----------
   Same timed-campaign shape as the shop's discount, but a different lever
   and a different bottleneck: a viral push needs the Marketing track (not
   Infra) to sustain the attention — undersized Marketing and the post just
   flops, wasting the spend and souring readers (negative multiplier)
   instead of taking off. Posting viral bait too often within the fatigue
   window is its own failure mode regardless of Marketing level — readers
   start tuning out ("clickbait fatigue"), same escalating-cost/decaying-
   payoff/eventual-loss curve as discounts. */
const VIRAL_FATIGUE_WINDOW_MS = 15*60*1000;
const VIRAL_TIERS = [
  {id:'small',  requiredMarketing:2, boostMult:1.5, durationMs:90000,  costMult:0.08},
  {id:'medium', requiredMarketing:5, boostMult:2.4, durationMs:120000, costMult:0.20},
  {id:'big',    requiredMarketing:8, boostMult:3.6, durationMs:150000, costMult:0.40},
];
function viralFatigueCount(site){
  if(!site.viralLog) site.viralLog = [];
  const cutoff = Date.now() - VIRAL_FATIGUE_WINDOW_MS;
  site.viralLog = site.viralLog.filter(ts=>ts>cutoff);
  return site.viralLog.length;
}
function viralCost(type, vtier, fatigue){
  return Math.round(type.baseCost * vtier.costMult * Math.pow(1.9, fatigue) * difficultyCostMult());
}
function launchViralPost(idx, tierId){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='blog') return;
  if(site.viralUntil && Date.now() < site.viralUntil){ toast(tr('Пост уже набирает охваты','A post is already live')); return; }
  const vtier = VIRAL_TIERS.find(d=>d.id===tierId);
  if(!vtier) return;
  const fatigue = viralFatigueCount(site);
  const cost = viralCost(type, vtier, fatigue);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.viralLog.push(Date.now());
  const marketingOk = site.tracks.marketing >= vtier.requiredMarketing;
  let mult;
  if(marketingOk){
    mult = vtier.boostMult - fatigue*0.55;
    if(fatigue>=3) mult -= 1.2; // readers tune out nonstop clickbait
    // BUGFIX (4): same fix as the discount case above — meeting the
    // Marketing requirement should never end up worse than "no bonus"
    // purely from repeated-use fatigue.
    mult = Math.max(mult, 1);
  } else {
    mult = -(0.7 + fatigue*0.3); // flopped post — wasted spend plus a credibility hit
  }
  site.viralUntil = Date.now() + vtier.durationMs;
  site.viralMult = mult;
  if(mult<0){
    log(`📉 ${esc(site.name)}: виральный пост не зашёл — доход временно в минусе`);
    toast(tr('Пост провалился — доход ушёл в минус','The post flopped — income went negative'));
    playSound('error');
  } else {
    log(`🚀 ${esc(site.name)}: пост выстрелил${fatigue>0?` (усталость аудитории: ${fatigue})`:''}`);
    toast(`🚀 ${tr('Пост набирает охваты','Post is going viral')}`);
    playSound('buy');
  }
  refreshSiteViewSections(idx, ['viral']);
  // CLEANUP (3): wires fx-viral-burst — named explicitly in the plan.
  fxId('sv-viral', mult<0 ? 'fx-headshake' : 'fx-viral-burst');
  if(openSiteIdx===idx) updateSiteViewLive();
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
/* ---------- TRENDS/CHALLENGES — social-only unique mechanic ----------
   Same shape again, third bottleneck type: a trend/challenge push needs
   enough hired moderators (site.employees — not a track at all) to keep the
   resulting flood of new users in line. Understaffed and the wave turns
   into unmoderated spam/toxicity (negative multiplier) instead of growth.
   Frequency fatigue works the same way as the other two levers. */
const TREND_FATIGUE_WINDOW_MS = 15*60*1000;
const TREND_TIERS = [
  {id:'small',  requiredEmployees:2, boostMult:1.7, durationMs:90000,  costMult:0.12},
  {id:'medium', requiredEmployees:5, boostMult:2.8, durationMs:120000, costMult:0.32},
  {id:'big',    requiredEmployees:9, boostMult:4.2, durationMs:150000, costMult:0.60},
];
function trendFatigueCount(site){
  if(!site.trendLog) site.trendLog = [];
  const cutoff = Date.now() - TREND_FATIGUE_WINDOW_MS;
  site.trendLog = site.trendLog.filter(ts=>ts>cutoff);
  return site.trendLog.length;
}
function trendCost(type, ttier, fatigue){
  return Math.round(type.baseCost * ttier.costMult * Math.pow(1.9, fatigue) * difficultyCostMult());
}
function launchTrend(idx, tierId){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='social') return;
  if(site.trendUntil && Date.now() < site.trendUntil){ toast(tr('Тренд уже раскручивается','A trend is already live')); return; }
  const ttier = TREND_TIERS.find(d=>d.id===tierId);
  if(!ttier) return;
  const fatigue = trendFatigueCount(site);
  const cost = trendCost(type, ttier, fatigue);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.trendLog.push(Date.now());
  const staffOk = site.employees >= ttier.requiredEmployees;
  let mult;
  if(staffOk){
    mult = ttier.boostMult - fatigue*0.55;
    if(fatigue>=3) mult -= 1.2; // users get trend fatigue too — feed feels like spam
    // BUGFIX (4): same fix as discount/viral above.
    mult = Math.max(mult, 1);
  } else {
    mult = -(0.85 + fatigue*0.3); // not enough moderators — spam/toxicity floods in
  }
  site.trendUntil = Date.now() + ttier.durationMs;
  site.trendMult = mult;
  if(mult<0){
    log(`☣️ ${esc(site.name)}: тренд захлебнулся без модерации — доход временно в минусе`);
    toast(tr('Не хватило модераторов — доход ушёл в минус','Not enough moderators — income went negative'));
    playSound('error');
  } else {
    log(`📈 ${esc(site.name)}: тренд раскрутился${fatigue>0?` (усталость аудитории: ${fatigue})`:''}`);
    toast(`📈 ${tr('Тренд раскручивается','Trend is taking off')}`);
    playSound('buy');
  }
  refreshSiteViewSections(idx, ['trend']);
  if(openSiteIdx===idx) updateSiteViewLive();
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
/* ---------- FREE TIER DIAL — SaaS-only unique mechanic ----------
   Structurally different from the two timed campaigns above: this is a
   persistent setting (0/1/2/3), not a one-shot activation. Turning it up
   grows the user base (income multiplier) but bills an ongoing Infra
   upkeep every single tick for as long as it stays on — and if the Infra
   track can't actually cover the level chosen, that upkeep is pure waste
   *plus* an overload penalty on top, so an unsupported free tier bleeds
   cash continuously rather than failing once and recovering. */
const FREE_TIER_LEVELS = [
  {level:1, requiredInfra:2, incomeMult:1.35, upkeepFrac:0.18},
  {level:2, requiredInfra:5, incomeMult:1.8,  upkeepFrac:0.38},
  {level:3, requiredInfra:8, incomeMult:2.4,  upkeepFrac:0.65},
];
function freeTierEffect(type, site){
  const ft = FREE_TIER_LEVELS[(site.freeTierLevel||0)-1];
  if(!ft) return {incomeMult:1, upkeep:0, infraOk:true};
  const infraOk = site.tracks.infra >= ft.requiredInfra;
  const upkeep = type.baseIncome * ft.upkeepFrac * GLOBAL_SITE_INCOME_MULT;
  return infraOk
    ? {incomeMult:ft.incomeMult, upkeep, infraOk:true}
    : {incomeMult:1, upkeep:upkeep*1.8, infraOk:false}; // wasted spend + overload penalty, no growth realized
}
function setFreeTierLevel(idx, level){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='saas') return;
  site.freeTierLevel = level;
  if(level===0){
    log(`🆓 ${esc(site.name)}: бесплатный тариф свёрнут`);
    toast(tr('Бесплатный тариф отключён','Free tier turned off'));
  } else {
    const ft = FREE_TIER_LEVELS[level-1];
    const infraOk = site.tracks.infra >= ft.requiredInfra;
    log(`🆓 ${esc(site.name)}: бесплатный тариф → уровень ${level}${infraOk?'':' (не хватает Infra!)'}`);
    toast(infraOk ? tr('Бесплатный тариф расширен','Free tier expanded') : tr('Включено, но серверов не хватает — будет течь убыток','Turned on, but Infra can\'t cover it — this will bleed cash'));
    if(!infraOk) playSound('error'); else playSound('buy');
  }
  refreshSiteViewSections(idx, ['freetier']);
  if(level>0) fxId('sv-freetier','fx-outline-pulse');
  if(openSiteIdx===idx) updateSiteViewLive();
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
/* ---------- GENERIC CAMPAIGN ENGINE — app / ai / restaurant ----------
   Same timed-campaign shape as shop/blog/social (lever → demand spike →
   gate resource → backfire if unprepared → fatigue if overused), but
   data-driven across the 3 remaining tiers that fit this shape instead of
   three more hand-rolled copies. gate is one of 'infra'/'marketing'/
   'security'/'employees' — 'employees' reads site.employees directly,
   the rest read a site.tracks level. State lives in site.campaigns[tierId]
   = {log:[], until:0, mult:1}, created lazily. */
const CAMPAIGN_DEFS = {
  app: {
    icon:'📲', gate:'infra',
    title:'Реферальная акция «Позови друга»', titleEn:'Referral push',
    intro:'Реферальная акция резко разгоняет установки, но нагрузку должны выдержать серверы (трек «Инфраструктура»). Не хватит мощности — вместо роста будут краши и шквал негативных отзывов. Слишком частые акции быстро выгорают у аудитории.',
    introEn:'A referral push spikes installs hard, but the servers (Infra track) have to handle the load. Not enough capacity and it turns into crashes and a wave of bad reviews instead of growth. Running it too often burns out fast.',
    gateLabel:'Нужен уровень инфраструктуры', gateLabelEn:'Needs Infra track level',
    liveOkTitle:'Акция активна', liveOkTitleEn:'Campaign live', liveOkIcon:'📲',
    liveBadTitle:'Серверы легли', liveBadTitleEn:'Servers crashed', liveBadIcon:'💥',
    okDesc:'Волна новых установок', okDescEn:'A wave of new installs',
    badDesc:'Наплыв установок обвалил серверы — шквал негативных отзывов', badDescEn:'The install spike crashed the servers — a wave of bad reviews',
    fatigueText:'Пользователи устали от промо-рефералки — следующая акция дороже и слабее', fatigueTextEn:'Users are referral-fatigued — the next push costs more and pays off less',
    riskLabel:'⚠️ Рискнуть без мощностей за', riskLabelEn:'⚠️ Risk it without capacity for',
    okLog:'📲 акция набирает установки', okLogEn:'📲 the push is pulling in installs',
    flopLog:'💥 акция обвалила серверы — доход временно в минусе', flopLogEn:"💥 the push crashed the servers — income went negative",
    tiers:[
      {id:'small',  requiredLevel:2, boostMult:1.6, durationMs:90000,  costMult:0.10},
      {id:'medium', requiredLevel:5, boostMult:2.6, durationMs:120000, costMult:0.28},
      {id:'big',    requiredLevel:8, boostMult:4.0, durationMs:150000, costMult:0.55},
    ]},
  ai: {
    icon:'🧬', gate:'security',
    title:'Агрессивное дообучение', titleEn:'Aggressive retraining',
    intro:'Дообучение на свежих данных резко поднимает качество ответов, но без проверки данных (трек «Безопасность») модель нахватается мусора и начнёт галлюцинировать. Слишком частые дообучения размывают качество независимо от защиты.',
    introEn:"Retraining on fresh data jumps answer quality fast, but without data vetting (Security track) the model ingests garbage and starts hallucinating. Retraining too often blurs quality regardless of protection.",
    gateLabel:'Нужен уровень безопасности', gateLabelEn:'Needs Security track level',
    liveOkTitle:'Модель дообучена', liveOkTitleEn:'Model retrained', liveOkIcon:'🧬',
    liveBadTitle:'Модель испорчена', liveBadTitleEn:'Model corrupted', liveBadIcon:'⚠️',
    okDesc:'Качество ответов заметно выросло', okDescEn:'Answer quality jumped',
    badDesc:'Модель нахваталась мусорных данных — галлюцинации бьют по репутации', badDescEn:'The model ingested garbage data — hallucinations are hurting reputation',
    fatigueText:'Модель переобучена — слишком частые дообучения размывают качество', fatigueTextEn:'Overtrained — retraining too often blurs quality',
    riskLabel:'⚠️ Рискнуть без проверки данных за', riskLabelEn:'⚠️ Risk it without data vetting for',
    okLog:'🧬 модель дообучена, качество выросло', okLogEn:'🧬 model retrained, quality improved',
    flopLog:'⚠️ модель испорчена мусорными данными — доход временно в минусе', flopLogEn:'⚠️ model corrupted by bad data — income went negative',
    tiers:[
      {id:'small',  requiredLevel:2, boostMult:1.6, durationMs:90000,  costMult:0.12},
      {id:'medium', requiredLevel:5, boostMult:2.6, durationMs:120000, costMult:0.30},
      {id:'big',    requiredLevel:8, boostMult:4.0, durationMs:150000, costMult:0.60},
    ]},
  restaurant: {
    icon:'🍔', gate:'employees',
    title:'Промо с партнёрами', titleEn:'Partner promo',
    intro:'Промо с партнёрами приводит волну заказов, но с ней должны справляться курьеры и кухня (наёмные сотрудники). Не хватит рук — задержки и жалобы вместо роста. Слишком частые промо быстро выгорают у клиентов.',
    introEn:"A partner promo brings a wave of orders, but couriers and kitchen staff (hired employees) have to keep up. Not enough hands and it's delays and complaints instead of growth. Running it too often burns customers out fast.",
    gateLabel:'Нужно сотрудников', gateLabelEn:'Needs staff (employees)',
    liveOkTitle:'Заказы валом', liveOkTitleEn:'Orders flooding in', liveOkIcon:'🍔',
    liveBadTitle:'Кухня не успевает', liveBadTitleEn:"Kitchen can't keep up", liveBadIcon:'🔥',
    okDesc:'Партнёрская сеть приводит заказы', okDescEn:'The partner network is driving orders in',
    badDesc:'Курьеры и кухня не справляются — задержки и жалобы', badDescEn:"Couriers and kitchen can't keep up — delays and complaints",
    fatigueText:'Клиенты устали от постоянных промо — акция дороже и слабее', fatigueTextEn:'Customers are promo-fatigued — the next one costs more and pays off less',
    riskLabel:'⚠️ Рискнуть без персонала за', riskLabelEn:'⚠️ Risk it understaffed for',
    okLog:'🍔 промо приводит заказы', okLogEn:'🍔 the promo is driving orders in',
    flopLog:'🔥 кухня не справилась — доход временно в минусе', flopLogEn:"🔥 the kitchen couldn't keep up — income went negative",
    tiers:[
      {id:'small',  requiredLevel:2, boostMult:1.7, durationMs:90000,  costMult:0.12},
      {id:'medium', requiredLevel:5, boostMult:2.8, durationMs:120000, costMult:0.32},
      {id:'big',    requiredLevel:9, boostMult:4.2, durationMs:150000, costMult:0.60},
    ]},
};
const CAMPAIGN_FATIGUE_WINDOW_MS = 15*60*1000;
function campaignGateLevel(site, gate){ return gate==='employees' ? site.employees : site.tracks[gate]; }
function campaignState(site, tierId){
  if(!site.campaigns) site.campaigns = {};
  if(!site.campaigns[tierId]) site.campaigns[tierId] = {log:[], until:0, mult:1};
  return site.campaigns[tierId];
}
function campaignFatigueCount(site, tierId){
  const cs = campaignState(site, tierId);
  const cutoff = Date.now() - CAMPAIGN_FATIGUE_WINDOW_MS;
  cs.log = cs.log.filter(ts=>ts>cutoff);
  return cs.log.length;
}
function campaignCost(type, ctier, fatigue){
  return Math.round(type.baseCost * ctier.costMult * Math.pow(1.9, fatigue) * difficultyCostMult());
}
function launchCampaign(idx, subTierId){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const tierId = tierIdOf(type.id);
  const def = CAMPAIGN_DEFS[tierId];
  if(!def) return;
  const cs = campaignState(site, tierId);
  if(cs.until && Date.now() < cs.until){ toast(tr('Кампания уже активна','A campaign is already live')); return; }
  const ctier = def.tiers.find(d=>d.id===subTierId);
  if(!ctier) return;
  const fatigue = campaignFatigueCount(site, tierId);
  const cost = campaignCost(type, ctier, fatigue);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  cs.log.push(Date.now());
  const gateOk = campaignGateLevel(site, def.gate) >= ctier.requiredLevel;
  let mult;
  if(gateOk){
    mult = ctier.boostMult - fatigue*0.55;
    if(fatigue>=3) mult -= 1.2;
  } else {
    mult = -(0.85 + fatigue*0.3);
  }
  cs.until = Date.now() + ctier.durationMs;
  cs.mult = mult;
  if(mult<0){
    log(`${esc(site.name)}: ${L(def,'flopLog')}`);
    toast(tr("Не справились — доход ушёл в минус","Couldn't keep up — income went negative"));
    playSound('error');
  } else {
    log(`${esc(site.name)}: ${L(def,'okLog')}${fatigue>0?` (усталость: ${fatigue})`:''}`);
    toast(`${def.icon} ${tr('Кампания запущена','Campaign launched')}`);
    playSound('buy');
  }
  refreshSiteViewSections(idx, ['campaign']);
  // CLEANUP (3): AI's flop is specifically "model corrupted by bad data" —
  // fx-hacker-glitch is a near-perfect match that was sitting unused.
  // Everything else gets a generic success/flop cue on the campaign card.
  if(tierId==='ai') fxId('sv-campaign', mult<0 ? 'fx-hacker-glitch' : 'fx-glow-purple');
  else fxId('sv-campaign', mult<0 ? 'fx-headshake' : 'fx-tada');
  if(openSiteIdx===idx) updateSiteViewLive();
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function buildCampaignHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const tierId = tierIdOf(type.id);
  const def = CAMPAIGN_DEFS[tierId];
  if(!def) return '';
  const cs = campaignState(site, tierId);
  const fatigue = campaignFatigueCount(site, tierId);
  const active = cs.until && Date.now() < cs.until;
  if(active){
    const bad = cs.mult < 0;
    const secsLeft = Math.max(0, Math.ceil((cs.until-Date.now())/1000));
    return `
      <div class="card glass" style="${bad?'border:1px solid rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
        <div class="card-title">${bad?def.liveBadIcon+' '+L(def,'liveBadTitle'):def.liveOkIcon+' '+L(def,'liveOkTitle')}</div>
        <div class="card-sub" style="${bad?'color:#ff453a;':''}">${bad?L(def,'badDesc'):L(def,'okDesc')} · ${tr('доход','income')} ×${cs.mult.toFixed(2)} · ${secsLeft}${tr('с','s')}</div>
      </div>`;
  }
  const fatigueWarn = fatigue>=2 ? `<div class="card-sub" style="color:#ff9f0a;margin-bottom:8px;">⚠️ ${L(def,'fatigueText')}</div>` : '';
  const rows = def.tiers.map(d=>{
    const cost = campaignCost(type, d, fatigue);
    const gateOk = campaignGateLevel(site, def.gate) >= d.requiredLevel;
    const cur = campaignGateLevel(site, def.gate);
    return `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row">
        <div class="card-icon">${def.icon}</div>
        <div style="flex:1">
          <div class="card-title">${d.id==='small'?tr('малая','small'):d.id==='medium'?tr('средняя','medium'):tr('крупная','big')}</div>
          <div class="card-sub">${L(def,'gateLabel')} ≥${d.requiredLevel} — ${gateOk?'✅ '+tr('хватает','ready'):`❌ ${tr('сейчас','currently')} ${cur}`}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn ${gateOk?'btn-cyan':'btn-outline'} btn-block aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="launchCampaign(${idx},'${d.id}')">${gateOk?tr('Запустить за','Launch for'):L(def,'riskLabel')} ${fmt(cost)}</button></div>
    </div>`;
  }).join('');
  return `
    <div class="card-sub" style="margin-bottom:10px;">${L(def,'intro')}</div>
    ${fatigueWarn}
    ${rows}`;
}
/* ---------- GENERIC DIAL ENGINE — crypto_exchange / logistics / bank ----------
   Same persistent-toggle shape as SaaS's free tier (0-3 level, ongoing
   upkeep every tick rather than a timed campaign), data-driven across the
   3 remaining tiers that fit this shape. gate is 'employees' or a tracks
   key, same convention as the campaign engine above. State lives in
   site.dials[tierId] = level (0-3). */
const DIAL_DEFS = {
  crypto_exchange: {
    icon:'🪙', gate:'security',
    title:'Листинг новых токенов', titleEn:'New token listings',
    intro:'Листинг новых токенов — переключатель: пока он включён, каждую секунду списывается апкип на аудит безопасности (трек «Безопасность»). Хватает защиты — растёт объём торгов и доход. Не хватает — деньги утекают на компенсации после взломов.',
    introEn:"New token listings is a toggle: while it's on, security-audit upkeep (Security track) is billed every second. Enough protection and trading volume grows. Not enough and money leaks out covering hack losses.",
    gateLabel:'Безопасность', gateLabelEn:'Security',
    usersLabel:'объёма', usersLabelEn:'volume',
    okStatus:'Аудит справляется — объём торгов растёт стабильно, апкип списывается каждую секунду', okStatusEn:'Audits are keeping up — steady volume growth, upkeep billed every second',
    badStatus:'Защиты не хватает — риск взлома съедает деньги без роста, пока не прокачаете Security', badStatusEn:"Not enough Security — hack risk is burning cash with no growth until you upgrade it",
    levels:[
      {level:1, requiredLevel:2, incomeMult:1.3, upkeepFrac:0.15},
      {level:2, requiredLevel:5, incomeMult:1.7, upkeepFrac:0.35},
      {level:3, requiredLevel:8, incomeMult:2.2, upkeepFrac:0.60},
    ]},
  logistics: {
    icon:'🚚', gate:'employees',
    title:'Расширение зоны доставки', titleEn:'Delivery zone expansion',
    intro:'Расширение зоны — переключатель: пока оно включено, каждую секунду списывается апкип за курьеров и транспорт. Хватает людей (сотрудников) — растёт объём доставок. Не хватает — сорванные доставки съедают деньги без роста.',
    introEn:"Zone expansion is a toggle: while it's on, courier/transport upkeep is billed every second. Enough staff and delivery volume grows. Not enough and missed deliveries burn cash with no growth.",
    gateLabel:'Сотрудников', gateLabelEn:'Staff',
    usersLabel:'доставок', usersLabelEn:'deliveries',
    okStatus:'Курьеров хватает — зона расширяется стабильно, апкип списывается каждую секунду', okStatusEn:'Enough couriers — the zone is expanding steadily, upkeep billed every second',
    badStatus:'Курьеров не хватает — сорванные доставки съедают деньги без роста', badStatusEn:'Not enough couriers — missed deliveries are burning cash with no growth',
    levels:[
      {level:1, requiredLevel:2, incomeMult:1.3, upkeepFrac:0.15},
      {level:2, requiredLevel:5, incomeMult:1.7, upkeepFrac:0.35},
      {level:3, requiredLevel:9, incomeMult:2.2, upkeepFrac:0.60},
    ]},
  bank: {
    icon:'🏦', gate:'security',
    title:'Повышение кредитных лимитов', titleEn:'Credit limit increase',
    intro:'Повышение лимитов — переключатель: пока оно включено, каждую секунду списывается апкип на андеррайтинг (трек «Безопасность»). Хватает проверок — выдачи растут стабильно. Не хватает — невозвраты съедают деньги без роста.',
    introEn:"Raising limits is a toggle: while it's on, underwriting upkeep (Security track) is billed every second. Enough vetting and loan volume grows steadily. Not enough and defaults burn cash with no growth.",
    gateLabel:'Безопасность', gateLabelEn:'Security',
    usersLabel:'выдач', usersLabelEn:'loans issued',
    okStatus:'Проверки справляются — выдачи растут стабильно, апкип списывается каждую секунду', okStatusEn:'Underwriting is keeping up — steady loan growth, upkeep billed every second',
    badStatus:'Проверок не хватает — невозвраты съедают деньги без роста', badStatusEn:'Not enough underwriting — defaults are burning cash with no growth',
    levels:[
      {level:1, requiredLevel:2, incomeMult:1.3, upkeepFrac:0.15},
      {level:2, requiredLevel:5, incomeMult:1.7, upkeepFrac:0.35},
      {level:3, requiredLevel:8, incomeMult:2.2, upkeepFrac:0.60},
    ]},
};
function dialGateLevel(site, gate){ return gate==='employees' ? site.employees : site.tracks[gate]; }
function dialEffect(type, site, tierId){
  const def = DIAL_DEFS[tierId];
  const lvl = (site.dials && site.dials[tierId]) || 0;
  if(!def || !lvl) return {incomeMult:1, upkeep:0};
  const cfg = def.levels[lvl-1];
  const ok = dialGateLevel(site, def.gate) >= cfg.requiredLevel;
  const upkeep = type.baseIncome * cfg.upkeepFrac * GLOBAL_SITE_INCOME_MULT;
  return ok ? {incomeMult:cfg.incomeMult, upkeep} : {incomeMult:1, upkeep:upkeep*1.8};
}
function setDialLevel(idx, level){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const tierId = tierIdOf(type.id);
  const def = DIAL_DEFS[tierId];
  if(!def) return;
  if(!site.dials) site.dials = {};
  site.dials[tierId] = level;
  if(level===0){
    log(`${esc(site.name)}: ${L(def,'title')} — ${tr('свёрнуто','turned off')}`);
    toast(tr('Отключено','Turned off'));
  } else {
    const cfg = def.levels[level-1];
    const ok = dialGateLevel(site, def.gate) >= cfg.requiredLevel;
    log(`${esc(site.name)}: ${L(def,'title')} → ${tr('уровень','level')} ${level}${ok?'':` (${tr('не хватает','not enough')} ${L(def,'gateLabel')}!)`}`);
    toast(ok ? tr('Включено','Turned on') : tr('Включено, но мощностей не хватает — будет течь убыток','Turned on, but capacity is short — this will bleed cash'));
    if(!ok) playSound('error'); else playSound('buy');
  }
  refreshSiteViewSections(idx, ['dial']);
  if(level>0) fxId('sv-dial','fx-ring-pulse');
  if(openSiteIdx===idx) updateSiteViewLive();
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function buildDialHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const tierId = tierIdOf(type.id);
  const def = DIAL_DEFS[tierId];
  if(!def) return '';
  const level = (site.dials && site.dials[tierId]) || 0;
  const rows = [0,1,2,3].map(lvl=>{
    const active = level===lvl;
    const cfg = lvl>0 ? def.levels[lvl-1] : null;
    const ok = cfg ? dialGateLevel(site, def.gate) >= cfg.requiredLevel : true;
    const label = lvl===0 ? tr('Выключено','Off') : `${tr('Уровень','Level')} ${lvl} (+${Math.round((cfg.incomeMult-1)*100)}% ${L(def,'usersLabel')})`;
    return `<button class="btn ${active?'btn-cyan':'btn-outline'} btn-block" style="margin-bottom:6px;${lvl>0&&!ok?'border-color:rgba(255,69,58,.5);':''}" onclick="setDialLevel(${idx},${lvl})">${active?'● ':''}${label}${lvl>0?` · ${L(def,'gateLabel')} ≥${cfg.requiredLevel} ${ok?'✅':'❌'}`:''}</button>`;
  }).join('');
  const cfg = level>0 ? def.levels[level-1] : null;
  const status = level>0
    ? (dialGateLevel(site, def.gate) >= cfg.requiredLevel
        ? `<div class="card-sub" style="color:#32d74b;">${L(def,'okStatus')}</div>`
        : `<div class="card-sub" style="color:#ff453a;">🔥 ${L(def,'badStatus')}</div>`)
    : '';
  return `
    <div class="card-sub" style="margin-bottom:10px;">${L(def,'intro')}</div>
    ${rows}
    ${status}`;
}
/* ---------- INSURANCE — one-time premium, permanent protection ---------- */
/* ---------- OWN CONTENT (Phase 6) ----------
   A small catalog of self-authored content add-ons a site can buy into,
   independent of the track/employee/monetization systems — the roadmap's
   "самостоятельное наполнение". Each is a one-time purchase per site that
   adds a permanent, stacking income bonus. Every item fits every
   category, but items whose tag matches the site's category are flagged
   as an especially good fit (a small nudge, not a hard requirement). */
const CONTENT_ITEMS = [
  {id:'blog',    icon:'📝', name:'Блог',            nameEn:'Blog',           costMult:0.33, bonus:0.06, fits:['content','hybrid']},
  {id:'forum',   icon:'💬', name:'Форум',           nameEn:'Forum',          costMult:0.40, bonus:0.07, fits:['social','content']},
  {id:'shop',    icon:'🛍️', name:'Магазин',         nameEn:'Shop',           costMult:0.55, bonus:0.09, fits:['commerce']},
  {id:'podcast', icon:'🎙️', name:'Подкаст',         nameEn:'Podcast',        costMult:0.44, bonus:0.07, fits:['content','social']},
  {id:'api',     icon:'🔌', name:'Публичное API',   nameEn:'Public API',     costMult:0.66, bonus:0.10, fits:['software','ai','fintech']},
  {id:'events',  icon:'🎉', name:'Ивенты',          nameEn:'Events',         costMult:0.44, bonus:0.08, fits:['social','offline']},
];
// Cost has two parts: a small baseCost-scaled floor (so it's never free
// even on a fresh, low-income site) plus a term proportional to the site's
// CURRENT income, sized to the item's own bonus — so as track/employee
// upgrades grow a site's income, these permanent boosts keep costing a
// meaningful slice of that income instead of staying flat and eventually
// trivial. COST_INCOME_DAYS is "how many game-days of current income, per
// 1.0 of bonus fraction" the income-scaled part is worth.
const CONTENT_COST_INCOME_DAYS = 3;
// [Item 4] Own-content items are now bought with specialization points
// (site.specPoints) instead of cash, same currency as the upgrade tree —
// cost is sized to sit in the same 15-120 range as tree nodes rather than
// scaling off cash/income.
function contentItemCost(site, item){
  return Math.round(item.costMult*80 + item.bonus*500);
}
function contentIncomeMult(site){
  if(!site.content || !site.content.length) return 1;
  let mult = 1;
  site.content.forEach(id=>{
    const item = CONTENT_ITEMS.find(c=>c.id===id);
    if(item) mult *= (1+item.bonus);
  });
  return mult;
}
function buyContentItem(idx, itemId){
  const site = state.sites[idx];
  const item = CONTENT_ITEMS.find(c=>c.id===itemId);
  if(!site || !item) return;
  if(!site.content) site.content = [];
  if(site.content.includes(itemId)){ toast(tr('Уже куплено','Already owned')); return; }
  const cost = contentItemCost(site, item);
  if((site.specPoints||0) < cost){ toast(tr('Не хватает очков специализации','Not enough specialization points')); playSound('error'); return; }
  site.specPoints -= cost;
  site.content.push(itemId);
  log(`${item.icon} ${tr('Добавлено','Added')}: ${L(item,'name')} → «${esc(site.name)}»`);
  toast(`${item.icon} ${L(item,'name')} ${tr('добавлено','added')}`);
  playSound('buy');
  // Item 7 fix: content items also spend specPoints — keep the tree/
  // platforms/renovation panels' point display in sync too.
  refreshSiteViewSections(idx, ['content','tracks','platforms','renovation']);
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function buildContentHtml(idx){
  const site = state.sites[idx];
  if(!site) return '';
  if(!site.content) site.content = [];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  let html = `<div class="section-title">🧩 ${tr('Собственный контент','Own content')} <span class="pill" style="background:rgba(10,132,255,.15);color:var(--blue);">🔷 <span id="sv-content-pts">${Math.floor(site.specPoints||0)}</span></span></div>`;
  html += CONTENT_ITEMS.map(item=>{
    const owned = site.content.includes(item.id);
    const fits = item.fits.includes(type.category);
    const cost = contentItemCost(site, item);
    return `<div class="card glass" style="margin-bottom:8px;${owned?'border-color:rgba(48,209,88,.35);':''}">
      <div class="card-row">
        <div class="card-icon">${item.icon}</div>
        <div style="flex:1">
          <div class="card-title">${L(item,'name')}${fits?` <span style="color:var(--green);font-size:11px;">· ${tr('подходит','good fit')}</span>`:''}</div>
          <div class="card-sub">+${Math.round(item.bonus*100)}% ${tr('к доходу навсегда','to income, permanently')}</div>
        </div>
        ${owned
          ? `<div style="color:var(--green);font-size:12px;font-weight:700;">✓ ${tr('куплено','owned')}</div>`
          : `<button class="btn btn-outline" ${(site.specPoints||0)<cost?'disabled':''} onclick="buyContentItem(${idx},'${item.id}')">🔷 ${cost}</button>`}
      </div>
    </div>`;
  }).join('');
  return html;
}
/* ---------- PLATFORMS / PUBLISHING (Phase 6) ----------
   Publishing a site to more surfaces than "just the desktop web" — each
   platform is a one-time unlock per site with a permanent, stacking
   income bonus (wider reach = more traffic). Same shape as CONTENT_ITEMS
   but a conceptually separate catalog, since the roadmap calls out
   multi-platform publishing as its own feature. */
const PLATFORM_ITEMS = [
  {id:'mobile',   icon:'📱', name:'Мобильная версия',            nameEn:'Mobile version',     costMult:0.26, bonus:0.08},
  {id:'pwa',      icon:'⚡', name:'PWA-приложение',              nameEn:'PWA app',            costMult:0.40, bonus:0.07},
  {id:'desktop',  icon:'🖥️', name:'Десктоп-клиент',              nameEn:'Desktop client',     costMult:0.44, bonus:0.06},
  {id:'ext',      icon:'🧩', name:'Расширение для браузера',     nameEn:'Browser extension',  costMult:0.33, bonus:0.05},
];
// [Item 4] Publishing/platform unlocks are now bought with specialization
// points, same as own-content items above — see contentItemCost() for why
// the formula no longer scales off cash/income.
const PLATFORM_COST_INCOME_DAYS = 3;
function platformItemCost(site, item){
  return Math.round(item.costMult*80 + item.bonus*500);
}
function platformIncomeMult(site){
  if(!site.platforms || !site.platforms.length) return 1;
  let mult = 1;
  site.platforms.forEach(id=>{
    const item = PLATFORM_ITEMS.find(c=>c.id===id);
    if(item) mult *= (1+item.bonus);
  });
  return mult;
}
function buyPlatform(idx, itemId){
  const site = state.sites[idx];
  const item = PLATFORM_ITEMS.find(c=>c.id===itemId);
  if(!site || !item) return;
  if(!site.platforms) site.platforms = [];
  if(site.platforms.includes(itemId)){ toast(tr('Уже опубликовано','Already published')); return; }
  const cost = platformItemCost(site, item);
  if((site.specPoints||0) < cost){ toast(tr('Не хватает очков специализации','Not enough specialization points')); playSound('error'); return; }
  site.specPoints -= cost;
  site.platforms.push(itemId);
  log(`${item.icon} ${tr('Опубликовано на','Published on')}: ${L(item,'name')} → «${esc(site.name)}»`);
  toast(`${item.icon} ${L(item,'name')} ${tr('опубликовано','published')}`);
  playSound('buy');
  // Item 7 fix: platforms also spend specPoints — keep the tree/content/
  // renovation panels' point display in sync too.
  refreshSiteViewSections(idx, ['platforms','tracks','content','renovation']);
  fxId('sv-platforms','fx-pop-in');
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function buildPlatformsHtml(idx){
  const site = state.sites[idx];
  if(!site) return '';
  if(!site.platforms) site.platforms = [];
  let html = `<div class="section-title">📡 ${tr('Публикация','Publishing')} <span class="pill" style="background:rgba(10,132,255,.15);color:var(--blue);">🔷 <span id="sv-platforms-pts">${Math.floor(site.specPoints||0)}</span></span></div>`;
  html += PLATFORM_ITEMS.map(item=>{
    const owned = site.platforms.includes(item.id);
    const cost = platformItemCost(site, item);
    return `<div class="card glass" style="margin-bottom:8px;${owned?'border-color:rgba(48,209,88,.35);':''}">
      <div class="card-row">
        <div class="card-icon">${item.icon}</div>
        <div style="flex:1">
          <div class="card-title">${L(item,'name')}</div>
          <div class="card-sub">+${Math.round(item.bonus*100)}% ${tr('к доходу навсегда','to income, permanently')}</div>
        </div>
        ${owned
          ? `<div style="color:var(--green);font-size:12px;font-weight:700;">✓ ${tr('опубликовано','published')}</div>`
          : `<button class="btn btn-outline" ${(site.specPoints||0)<cost?'disabled':''} onclick="buyPlatform(${idx},'${item.id}')">🔷 ${cost}</button>`}
      </div>
    </div>`;
  }).join('');
  return html;
}
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
  refreshSiteViewSections(idx, ['insurance']);
  fxId('sv-insurance','fx-ring-pulse');
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
/* ---------- INVESTORS (Phase 6) ----------
   Investor deal — a smaller cash injection now; the investor takes a
   fixed cut of that site's income automatically every tick for a fixed
   term, then the deal ends on its own and the site is fully yours again.
   (The old one-click "sell forever to investors" payout has been removed —
   per item 5, selling a business now only happens through the mailbox:
   either a buyer offer arrives on its own, or the player can proactively
   ask for one with requestBusinessOffer(), see the MAIL section above.) */
const INVESTOR_DEAL_DAYS = 4;    // deal upfront payout = this many days of income
const INVESTOR_SHARE = 0.30;     // fixed revenue share the investor takes during the deal
const INVESTOR_TERM_DAYS = 10;   // deal duration, in in-game days
function investorDealAmount(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  return Math.max(100, Math.round(siteIncome(type, site) * GAME_DAY_SECONDS * INVESTOR_DEAL_DAYS));
}
function startInvestorDeal(idx){
  const site = state.sites[idx];
  if(!site) return;
  if(state.investorDeal){ toast(tr('Уже есть активная сделка с инвестором — не более одной одновременно','An investor deal is already active — only one at a time')); return; }
  const amount = investorDealAmount(idx);
  closeModal();
  state.cash += amount;
  state.investorDeal = {siteUid: site.uid, sharePercent: INVESTOR_SHARE, startDay: state.day, termDays: INVESTOR_TERM_DAYS, totalPaidOut: 0};
  log(`💼 ${tr('Сделка с инвестором','Investor deal')}: «${esc(site.name)}» → +${fmt(amount)}, ${Math.round(INVESTOR_SHARE*100)}% ${tr('дохода на','of income for')} ${INVESTOR_TERM_DAYS} ${tr('дней','days')}`);
  toast(`💼 ${tr('Сделка заключена','Deal signed')}: +${fmt(amount)}`);
  playSound('buy');
  refreshSiteViewSections(idx, ['investor']);
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
// Called every tick (see tick()) — deducts the investor's cut of the deal
// site's current income, and ends the deal once its term is up or the
// site it was tied to is gone (sold/merged away).
function applyInvestorDealTick(){
  const deal = state.investorDeal;
  if(!deal) return;
  const idx = state.sites.findIndex(s=>s.uid===deal.siteUid);
  if(idx<0){ state.investorDeal = null; return; }
  if(state.day - deal.startDay >= deal.termDays){
    const site = state.sites[idx];
    log(`💼 ${tr('Сделка с инвестором завершена','Investor deal has ended')}: «${esc(site.name)}» — ${tr('доход снова полностью ваш','income is fully yours again')}`);
    toast(tr('Сделка с инвестором завершена','Investor deal has ended'));
    state.investorDeal = null;
    refreshSiteViewSections(idx, ['investor']);
    return;
  }
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const cut = siteIncome(type, site) * state.settings.speed * deal.sharePercent;
  state.cash -= cut;
  deal.totalPaidOut = (deal.totalPaidOut||0) + cut;
}
function buildInvestorHtml(idx){
  const site = state.sites[idx];
  if(!site) return '';
  const deal = state.investorDeal;
  const isThisSiteDealing = deal && deal.siteUid===site.uid;
  const otherDealActive = deal && !isThisSiteDealing;
  if(isThisSiteDealing){
    const daysLeft = Math.max(0, deal.termDays - (state.day - deal.startDay));
    return `<div class="section-title">💼 ${tr('Инвестор','Investor')}</div>
    <div class="card glass">
      <div class="card-title">${Math.round(deal.sharePercent*100)}% ${tr('дохода уходит инвестору','of income goes to the investor')}</div>
      <div class="card-sub">${tr('Осталось','Remaining')}: ~${daysLeft} ${tr('игровых дней','in-game days')} · ${tr('выплачено уже','paid out so far')}: ${fmt(Math.round(deal.totalPaidOut||0))}</div>
    </div>`;
  }
  const dealAmount = investorDealAmount(idx);
  const offerCheck = canRequestBusinessOffer(idx);
  return `<div class="section-title">💼 ${tr('Инвестор','Investor')}</div>
    <div class="card glass" style="margin-bottom:10px;">
      <div class="card-title">🤝 ${tr('Сделка с инвестором','Investor deal')}</div>
      <div class="card-sub">${tr(`Сайт остаётся у вас. Инвестор получает ${Math.round(INVESTOR_SHARE*100)}% дохода этого сайта в течение ${INVESTOR_TERM_DAYS} игровых дней, затем сделка сама заканчивается`,`The site stays yours. The investor takes ${Math.round(INVESTOR_SHARE*100)}% of this site's income for ${INVESTOR_TERM_DAYS} in-game days, then the deal ends on its own`)}</div>
      <div class="btn-row"><button class="btn btn-violet btn-block" ${otherDealActive?'disabled':''} onclick="startInvestorDeal(${idx})">${tr('Заключить сделку','Sign the deal')} — ${fmt(dealAmount)}</button></div>
      ${otherDealActive?`<div class="card-sub" style="color:var(--orange);margin-top:6px;">${tr('Уже есть активная сделка на другом сайте','A deal is already active on another site')}</div>`:''}
    </div>
    <div class="card glass">
      <div class="card-title">📤 ${tr('Продать бизнес','Sell the business')}</div>
      <div class="card-sub">${tr('Бизнес можно продать только по предложению из почты. Не хотите ждать — выберите, к кому обратиться самостоятельно','A business can only be sold via an offer from your mail. If you don\u2019t want to wait, choose who to approach yourself')}</div>
      <div class="btn-row"><button class="btn btn-outline btn-block" ${offerCheck.ok?'':'disabled'} onclick="openBuyersListModal(${idx})">${tr('Список покупателей','Buyer list')}</button></div>
      ${!offerCheck.ok?`<div class="card-sub" style="color:var(--orange);margin-top:6px;">${offerCheck.reason}</div>`:''}
    </div>`;
}

function ipoValue(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  let invested = type.baseCost;
  TRACK_ORDER.forEach(k=>{ for(let l=1; l<site.tracks[k]; l++) invested += trackUpgradeCost(type, k, l); });
  ensureStaffLevels(site); for(let e=0; e<site.employees; e++) invested += Math.round(EMPLOYEE_BASE_COST * Math.pow(1.35, e) * empLevelMeta(site.staffLevels[e]||1).salaryMult * difficultyCostMult());
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
  log(`📈 IPO «${esc(site.name)}» (${tr(type.name,type.nameEn)}): ${tr(`разовая выплата ${fmt(value)}, доход сайта -50% навсегда`,`one-time payout ${fmt(value)}, site income -50% forever`)}`);
  toast(tr(`🎉 IPO проведено: +${fmt(value)}`,`🎉 IPO completed: +${fmt(value)}`));
  playSound('achievement');
  fxId('header-cash','fx-ipo-confetti');
  vibrateFeedback(20);
  closeModal();
  refreshSiteViewSections(idx, ['tracks','page','ipo']);
  requestAnimationFrame(()=>{ renderAll(); save(); });
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
  openHireModal(idx);
}
// Phase 1 hiring: 3 rolled candidates of different levels, the player picks
// who to hire based on their stats/salary trade-off — not just an anonymous
// headcount click. Higher levels only start appearing once infra is built up.
function rollHireCandidates(site){
  const maxLevel = site.tracks.infra>=8 ? 5 : site.tracks.infra>=5 ? 4 : 3;
  const pool = [];
  for(let i=0;i<3;i++){
    const roll = Math.random();
    let level = 1;
    if(roll > 0.55 && maxLevel>=2) level = 2;
    if(roll > 0.85 && maxLevel>=3) level = 3;
    if(maxLevel>=4 && Math.random()>0.92) level = 4;
    if(maxLevel>=5 && Math.random()>0.97) level = 5;
    pool.push({level, specId:randomSpecId()});
  }
  return pool;
}
function buildHireModalHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const candidates = rollHireCandidates(site);
  const cards = candidates.map(function(cand){
    const level = cand.level, specId = cand.specId;
    const meta = empLevelMeta(level);
    const spec = specMeta(specId);
    const cost = employeeHireCost(site, level);
    const salary = employeeSalary(type, level);
    const afford = state.cash >= cost;
    const specBonusPct = Math.round(SPEC_TRACK_BONUS * 100);
    return `<div class="card glass" style="margin-bottom:10px;">
      <div class="card-row">
        <div class="card-icon">${meta.icon}</div>
        <div style="flex:1">
          <div class="card-title">${tr(meta.name, meta.nameEn)} <span class="pill spec-pill">${spec.icon} ${tr(spec.name,spec.nameEn)}</span></div>
          <div class="card-sub">+${Math.round(meta.statMult*EMPLOYEE_INCOME_BONUS*100)}% ${tr('к доходу','to income')} · 💸 ${tr('ЗП','salary')} ${fmt(salary)}/${tr('мес','mo')}</div>
          <div class="card-sub">${spec.icon} +${specBonusPct}% ${tr('к треку','to track')} ${TRACK_META[spec.trackKey].icon} ${L(TRACK_META[spec.trackKey],'name')}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn btn-violet btn-block" ${afford?'':'disabled'} onclick="confirmHireCandidate(${idx},${level},'${specId}')">${tr('Нанять за','Hire for')} ${fmt(cost)}</button></div>
    </div>`;
  }).join('');
  return `<h3>👥 ${tr('Выбор кандидата','Choose a candidate')}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:12px;">${tr('Более опытные кандидаты стоят дороже и просят бóльшую зарплату каждый месяц, но сильнее поднимают доход. Специализация усиливает конкретный трек.','More experienced candidates cost more and draw a bigger monthly salary, but boost income harder. Their specialization strengthens one specific track.')}</p>
    <div id="hire-modal-body">${cards}</div>`;
}
function openHireModal(idx){ openModal(buildHireModalHtml(idx)); }
function confirmHireCandidate(idx, level, specId){
  const site = state.sites[idx];
  if(!site) return;
  const cap = employeeCap(site);
  if(site.employees >= cap){ toast(tr('Нужна прокачка инфраструктуры для найма','Infrastructure upgrade needed to hire')); return; }
  const cost = employeeHireCost(site, level);
  if(state.cash < cost){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= cost;
  site.employees++;
  ensureStaffLevels(site).push(level);
  ensureStaffFatigue(site).push(0);
  ensureStaffVacation(site).push(0);
  ensureStaffSpecs(site).push(SPECIALIZATIONS.some(s=>s.id===specId) ? specId : randomSpecId());
  bumpQuest('hire');
  const meta = empLevelMeta(level);
  const spec = specMeta(specId);
  log(`👤 ${tr('Нанят','Hired')} ${esc(tr(meta.name,meta.nameEn))} (${spec.icon} ${tr(spec.name,spec.nameEn)}) ${tr('в проект','for project')} ${esc(site.name)}`);
  playSound('buy');
  maybeAnnounceDreamTeam(site);
  closeModal();
  refreshSiteViewSections(idx, ['employees','renovation']);
  fxId('sv-employees','fx-bounce-in');
  requestAnimationFrame(()=>{ renderAll(); save(); });
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
  if(!depthFeatureUnlocked('shorts')){ toast(`🔒 ${tr('Шорты откроются при активах','Shorting unlocks at net worth')} ${fmt(DEPTH_UNLOCK_NW.shorts)}`); return; }
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
// A brand-new player has zero income and zero collateral, so the cap formula
// below would round to $0 — meaning nobody could actually take a loan until
// well into their first session. This floor guarantees a small loan is
// always on offer, from day one, regardless of income/assets.
const LOAN_BASE_FLOOR = 800;
// Approval isn't guaranteed — asking for a big bite of the remaining limit
// is more likely to be turned down, and a poor/no credit history makes
// every ask riskier in the bank's eyes. Shown to the player before they
// borrow (see buildLoanModalHtml) so it's never a surprise.
const LOAN_APPROVAL_BASE = 0.95;
const LOAN_APPROVAL_MIN = 0.15;
// If an installment loan goes this many consecutive in-game days without
// so much as a partial repayment, the bank stops waiting: first a warning,
// then (LOAN_SEIZE_DAYS) it repossesses a business to cover the debt and
// the credit rating takes a real hit — see assessLoanOverdue()/
// seizeLoanCollateral(), mirroring the payroll/hosting overdue pattern.
const LOAN_SEIZE_WARN_DAYS = 10;
const LOAN_SEIZE_DAYS = 16;
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
// Collateral for a loan should be the player's actual assets (stocks, real
// estate, luxury, EUR) — NOT netWorth(), which also folds in state.cash and
// the loan itself. Using netWorth() created a death spiral: going negative
// shrinks netWorth(), which shrinks the loan cap, which blocks the rescue
// loan exactly when it's needed most. loanCollateralValue() intentionally
// excludes cash and existing debt so borrowing power stays stable.
function loanCollateralValue(){ return stocksValue() + estateValue() + luxuryValue() + shortsValue() + eurValueInUsd(); }
function maxLoanAmount(){
  const base = Math.round((totalIncomePerSec()*600 + loanCollateralValue()*0.1) * (1 + (state.loan.rating||0)*LOAN_CAP_BONUS_PER_RATING));
  let cap = Math.max(0, state.boosty.unlocked ? Math.round(base*1.25) : base);
  cap = Math.max(cap, LOAN_BASE_FLOOR); // a small loan is always on offer, even to a fresh player with no income/assets yet
  // A negative balance must always be rescuable, even with zero income/assets
  // (e.g. a fresh restart) — floor the cap so it can always cover the
  // shortfall plus a small buffer, on top of whatever is already owed.
  if(state.cash < 0){
    const needed = state.loan.principal + Math.round(-state.cash) + 200;
    cap = Math.max(cap, needed);
  }
  return cap;
}
// Chance the bank approves a given ask, shown to the player up front and
// rolled once when they confirm. Two things move it: how big a bite of the
// remaining headroom the ask is (bigger ask → lower odds), and credit
// rating (better history → better odds, and recovers what a seizure cost —
// see seizeLoanCollateral()).
function loanApprovalChance(amount){
  const cap = maxLoanAmount();
  const avail = Math.max(1, cap - (state.loan.principal||0));
  const frac = Math.max(0, Math.min(1, amount / avail));
  const rating = state.loan.rating || 0;
  const chance = LOAN_APPROVAL_BASE - frac*0.4 + rating*0.02;
  return Math.max(LOAN_APPROVAL_MIN, Math.min(0.99, chance));
}
function takeLoan(amount){
  amount = Math.round(amount);
  if(amount<=0) return;
  if(state.loan.type==='lumpsum' && state.loan.principal>0){ toast(tr('Сначала погасите текущий кредит','Repay the current loan first')); return; }
  const cap = maxLoanAmount();
  if(state.loan.principal + amount > cap){ toast(tr('Превышен лимит кредита','Loan limit exceeded')); playSound('error'); return; }
  const chance = loanApprovalChance(amount);
  if(Math.random() > chance){
    log(`🏦 ${tr('Банк отклонил заявку на кредит','Bank declined the loan application')}: ${fmt(amount)} (${tr('шанс одобрения был','approval odds were')} ${Math.round(chance*100)}%)`);
    toast(`🏦 ${tr('Заявка отклонена','Application declined')} (${Math.round(chance*100)}% ${tr('шанс','odds')})`);
    playSound('error');
    return;
  }
  if(state.loan.principal === 0) state.loan.takenDay = state.day; // start of a fresh borrowing streak, for the on-time check
  state.loan.type = 'installment';
  state.loan.dueDay = null;
  state.loan.principal += amount;
  state.loan.lastRepayDay = state.day; // taking a loan counts as "active" — resets the seizure clock
  state.loan.overdueDays = 0;
  state.cash += amount;
  log(`🏦 ${tr('Взят кредит','Loan taken')}: ${fmt(amount)} (${tr('долг','debt')}: ${fmt(state.loan.principal)}, ${tr('ставка','rate')} ${(loanRate()*100).toFixed(1)}%${tr('/день','/day')})`);
  toast(`${tr('Кредит выдан','Loan issued')}: +${fmt(amount)}`);
  playSound('buy');
  fxId('header-cash','fx-coin-spin');
  renderAll(); save();
}
function repayLoan(amount){
  if(state.loan.type==='lumpsum'){ repayLumpsum(); return; }
  // [Пункт 3] "Погасить всё" раньше передавал сюда Math.round(debt), снятый
  // в момент отрисовки модалки — а проценты по кредиту продолжают тикать,
  // пока модалка открыта, так что к моменту клика реальный state.loan.principal
  // мог подрасти, и от кредита оставался "хвост" в несколько сотен/тысяч $.
  // Теперь кнопка "Погасить всё" передаёт сюда Infinity — что означает "весь
  // долг по факту прямо сейчас", а не устаревший снимок.
  const requestedFullPayoff = amount===Infinity;
  if(requestedFullPayoff) amount = state.loan.principal;
  const principalBefore = state.loan.principal;
  amount = Math.min(amount, state.loan.principal, state.cash);
  if(amount<=0){ toast(tr('Нечего погашать или не хватает средств','Nothing to repay or not enough cash')); return; }
  state.loan.principal -= amount;
  state.cash -= amount;
  state.loan.lastRepayDay = state.day;
  state.loan.overdueDays = 0;
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
    state.loan.type = null;
    fxId('header-cash','fx-check-draw');
    toast(`${tr('Погашено','Repaid')}: ${fmt(amount)}`);
  } else if(requestedFullPayoff){
    // Хотел закрыть кредит целиком, но наличных не хватило — явно объясняем
    // остаток вместо тихого "почти погашено", которое выглядит как баг.
    log(`🏦 ${tr('Не хватило наличных на полное погашение','Not enough cash to repay in full')}: ${fmt(amount)} ${tr('из','of')} ${fmt(principalBefore)} (${tr('осталось','remaining')}: ${fmt(state.loan.principal)})`);
    toast(`⚠️ ${tr('Не хватило наличных — погашено','Not enough cash — repaid')} ${fmt(amount)}, ${tr('осталось','remaining')} ${fmt(state.loan.principal)}`);
  } else {
    log(`🏦 ${tr('Погашение кредита','Loan repayment')}: ${fmt(amount)} (${tr('осталось','remaining')}: ${fmt(state.loan.principal)})`);
    toast(`${tr('Погашено','Repaid')}: ${fmt(amount)}`);
  }
  playSound('sell');
  renderAll(); save();
}
/* ---------- LUMP-SUM LOAN — fixed amount, fixed term, one balloon payment ----------
   The player's other loan option (see takeLoan() above for the periodic-
   interest alternative): borrow a fixed sum now, and owe a fixed, larger
   sum back — no daily interest ticking — due in full by a fixed deadline.
   Simpler to reason about, but unforgiving if the deadline passes unpaid:
   see settleLumpsumDefault() in tick(). */
const LUMPSUM_TERM_DAYS = 7;
const LUMPSUM_FACTOR = 1.35; // total owed = borrowed * this, all at once, by the deadline
function maxLumpsumAmount(){ return maxLoanAmount(); } // same underlying capacity as the installment option
function takeLumpsumLoan(amount){
  amount = Math.round(amount);
  if(amount<=0) return;
  if(state.loan.principal>0){ toast(tr('Уже есть активный кредит','A loan is already active')); return; }
  const cap = maxLumpsumAmount();
  if(amount > cap){ toast(tr('Превышен лимит кредита','Loan limit exceeded')); playSound('error'); return; }
  const chance = loanApprovalChance(amount);
  if(Math.random() > chance){
    log(`🏦 ${tr('Банк отклонил заявку на кредит','Bank declined the loan application')}: ${fmt(amount)} (${tr('шанс одобрения был','approval odds were')} ${Math.round(chance*100)}%)`);
    toast(`🏦 ${tr('Заявка отклонена','Application declined')} (${Math.round(chance*100)}% ${tr('шанс','odds')})`);
    playSound('error');
    return;
  }
  state.loan.type = 'lumpsum';
  state.loan.principal = amount;
  state.loan.lumpTotal = Math.round(amount * LUMPSUM_FACTOR);
  state.loan.dueDay = state.day + LUMPSUM_TERM_DAYS;
  state.loan.takenDay = state.day;
  state.loan.lastRepayDay = state.day;
  state.loan.overdueDays = 0;
  state.cash += amount;
  log(`🏦 ${tr('Взят кредит одной суммой','Lump-sum loan taken')}: ${fmt(amount)} (${tr('к возврату','to repay')}: ${fmt(state.loan.lumpTotal)} ${tr('до дня','by day')} ${state.loan.dueDay})`);
  toast(`${tr('Кредит выдан','Loan issued')}: +${fmt(amount)}`);
  playSound('buy');
  renderAll(); save();
}
function repayLumpsum(){
  const owed = Math.round(state.loan.lumpTotal);
  if(owed<=0) return;
  if(state.cash < owed){ toast(tr('Недостаточно средств для полного погашения','Not enough cash for full repayment')); playSound('error'); return; }
  state.cash -= owed;
  const onTime = true; // repaid before/at the tick that would have defaulted it
  if(state.loan.rating < LOAN_MAX_RATING){
    state.loan.rating++;
    log(`🏦 ${tr('Кредит погашен в срок — кредитный рейтинг вырос','Loan repaid on time — credit rating improved')} (${state.loan.rating}/${LOAN_MAX_RATING}, «${loanRatingLabel(state.loan.rating)}»)`);
  } else {
    log(`🏦 ${tr('Кредит полностью погашен','Loan fully repaid')}`);
  }
  state.loan.principal = 0;
  state.loan.lumpTotal = 0;
  state.loan.dueDay = null;
  state.loan.takenDay = null;
  state.loan.type = null;
  toast(`${tr('Погашено','Repaid')}: ${fmt(owed)}`);
  playSound('sell');
  renderAll(); save();
}
// Called from tick() once a lump-sum loan's deadline (state.loan.dueDay) has
// passed without full repayment. Since there was no daily interest to make
// the debt visible ticking up, the deadline itself is the "you should have
// dealt with this" moment — the bank collects by force, cash can go
// negative, and the credit rating takes a real hit.
function settleLumpsumDefault(){
  const owed = Math.round(state.loan.lumpTotal);
  state.cash -= owed;
  state.loan.rating = Math.max(0, (state.loan.rating||0) - 2);
  state.loan.principal = 0;
  state.loan.lumpTotal = 0;
  state.loan.dueDay = null;
  state.loan.takenDay = null;
  state.loan.type = null;
  log(`🏦 ${tr('Кредит не погашен в срок — банк списал','Loan not repaid in time — the bank force-collected')} ${fmt(owed)} ${tr('принудительно, рейтинг снижен',', credit rating dropped')}`);
  toast(`🏦 ${tr('Кредит просрочен — списано принудительно','Loan defaulted — force-collected')}: ${fmt(owed)}`);
  playSound('error');
}
/* ---------- LOAN OVERDUE / COLLATERAL SEIZURE ----------
   Installment loans have no fixed deadline (unlike lump-sum above), so
   without this an installment loan could sit unpaid forever with the debt
   just compounding — no real consequence for ignoring it. Instead: go
   LOAN_SEIZE_WARN_DAYS with zero repayment and the bank warns; keep
   ignoring it past LOAN_SEIZE_DAYS and it repossesses your most valuable
   business to cover the debt and knocks your credit rating down hard —
   which also lowers future approval odds (see loanApprovalChance()).
   Called once per in-game day from runDayRollover(), same spot as
   assessPayrollOverdue()/assessHostingOverdue(). */
function assessLoanOverdue(){
  if(!state.loan) return;
  if(state.loan.type!=='installment' || state.loan.principal<=0){ state.loan.overdueDays = 0; return; }
  const base = state.loan.lastRepayDay!=null ? state.loan.lastRepayDay : state.loan.takenDay;
  const sinceRepay = base!=null ? (state.day - base) : 0;
  state.loan.overdueDays = Math.max(0, sinceRepay);
  if(sinceRepay === LOAN_SEIZE_WARN_DAYS){
    toast(`⚠️ ${tr('Банк требует хотя бы частично погасить кредит','The bank wants at least a partial repayment')}`);
    log(`🏦 ${tr('Кредит не обслуживается','Loan not being serviced')} ${LOAN_SEIZE_WARN_DAYS} ${tr('дн. подряд — если не погасить хотя бы часть, банк заберёт бизнес','days straight — repay at least part of it, or the bank will seize a business')}`);
    renderEvents();
  }
  if(sinceRepay >= LOAN_SEIZE_DAYS) seizeLoanCollateral();
}
function seizeLoanCollateral(){
  if(state.sites.length){
    let bestIdx = -1, bestVal = -1;
    state.sites.forEach((s,i)=>{ const v = siteSellValue(i); if(v>bestVal){ bestVal=v; bestIdx=i; } });
    const site = state.sites[bestIdx];
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    state.sites.splice(bestIdx,1);
    state.loan.principal = Math.max(0, state.loan.principal - bestVal);
    log(`🏦⚠️ ${tr('Банк изъял бизнес за долг','The bank seized a business over unpaid debt')}: «${esc(site.name)}» (${type?L(type,'name'):''}) — ${tr('погашено','offset')} ${fmt(bestVal)}, ${tr('остаток долга','remaining debt')} ${fmt(state.loan.principal)}`);
    toast(`🏦 ${tr('Бизнес изъят за долги!','A business was seized over debt!')}`);
  } else {
    // Nothing left to repossess — force-collect from cash instead, same as a defaulted lump-sum.
    const owed = Math.round(state.loan.principal);
    state.cash -= owed;
    state.loan.principal = 0;
    log(`🏦⚠️ ${tr('Банк списал долг принудительно','The bank force-collected the debt')}: ${fmt(owed)}`);
    toast(`🏦 ${tr('Долг списан принудительно','Debt force-collected')}: ${fmt(owed)}`);
  }
  state.loan.rating = Math.max(0, (state.loan.rating||0) - 3);
  state.loan.overdueDays = 0;
  state.loan.lastRepayDay = state.day;
  if(state.loan.principal <= 0){ state.loan.principal = 0; state.loan.type = null; state.loan.takenDay = null; }
  playSound('error');
  renderEvents(); save(); renderAll();
}
/* ---------- VOLUNTARY LOAN BANKRUPTCY (item 18) ----------
   Distinct from the "Phase 3" negative-balance bankruptcy below (which is
   an automatic, negative-cash game-over/penalty state) and from
   seizeLoanCollateral() above (an automatic punishment for ignoring an
   overdue loan, which takes whatever your best business is worth even if
   that's less than the debt). This is a *voluntary* action the player can
   take from the loan modal at any time: settle the loan outright by
   surrendering a business (or, if no single business covers the debt, the
   two most valuable ones) whose sell value covers what's owed. If neither
   a single business nor your two best combined are worth enough — or you
   don't even own two businesses — bankruptcy simply isn't offered.
   siteSellValue() (used elsewhere for the same "what's this business
   worth in cash" question — mail buyout offers, manual selling) is reused
   here as the valuation, so this isn't a separate, inconsistent number. */
function loanOwedTotal(){
  if(!state.loan || state.loan.principal<=0) return 0;
  return state.loan.type==='lumpsum' ? state.loan.lumpTotal : state.loan.principal;
}
function bankruptcyCandidate(){
  const debt = loanOwedTotal();
  if(debt<=0) return {mode:'none', reason:'no-debt', debt};
  if(!state.sites.length) return {mode:'none', reason:'no-business', debt};
  const values = state.sites.map((s,i)=>({idx:i, value:siteSellValue(i)})).sort((a,b)=>b.value-a.value);
  if(values[0].value >= debt) return {mode:'single', idxs:[values[0].idx], value:values[0].value, debt};
  if(values.length>=2 && (values[0].value+values[1].value) >= debt) return {mode:'double', idxs:[values[0].idx, values[1].idx], value:values[0].value+values[1].value, debt};
  return {mode:'none', reason: values.length<2 ? 'not-enough-businesses' : 'not-enough-value', debt};
}
function openBankruptcyModal(){
  const c = bankruptcyCandidate();
  if(c.mode==='none'){
    let reasonText;
    if(c.reason==='no-debt') reasonText = tr('Нет активного кредита — банкротство не нужно.','There is no active loan — bankruptcy isn\'t needed.');
    else if(c.reason==='no-business') reasonText = tr('У вас нет ни одного бизнеса, который можно передать в счёт долга.','You don\'t own a single business to surrender toward the debt.');
    else if(c.reason==='not-enough-businesses') reasonText = tr(`Ни один ваш бизнес не покрывает долг ${fmt(c.debt)} целиком, а чтобы передать два, нужно владеть хотя бы двумя. Подать на банкротство нельзя.`,`No single business you own covers the ${fmt(c.debt)} debt, and surrendering two requires owning at least two. Bankruptcy isn't available.`);
    else reasonText = tr(`Даже два ваших самых дорогих бизнеса в сумме не покрывают долг ${fmt(c.debt)}. Подать на банкротство нельзя.`,`Even your two most valuable businesses combined don't cover the ${fmt(c.debt)} debt. Bankruptcy isn't available.`);
    openModal(`<h3>💀 ${tr('Банкротство','Bankruptcy')}</h3><p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">${reasonText}</p><div class="btn-row"><button class="btn btn-outline btn-block" onclick="openLoanModal()">${tr('Назад','Back')}</button></div>`);
    return;
  }
  const names = c.idxs.map(i=>esc(state.sites[i].name));
  const bodyText = c.mode==='single'
    ? tr(`Вы передадите банку бизнес «${names[0]}» (оценка ${fmt(c.value)}) — этого хватит, чтобы полностью списать долг ${fmt(c.debt)}.`,`You'll surrender the business "${names[0]}" (valued at ${fmt(c.value)}) — enough to fully clear the ${fmt(c.debt)} debt.`)
    : tr(`Один бизнес не покрывает долг ${fmt(c.debt)} — банк заберёт два: «${names[0]}» и «${names[1]}» (суммарно ${fmt(c.value)}).`,`No single business covers the ${fmt(c.debt)} debt — the bank will take two: "${names[0]}" and "${names[1]}" (combined ${fmt(c.value)}).`);
  openModal(`<h3>💀 ${tr('Подать на банкротство?','File for bankruptcy?')}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:10px;">${bodyText}</p>
    <p style="color:var(--red);font-size:12px;margin-bottom:14px;">${tr('Бизнес(ы) будут утеряны безвозвратно, а кредитный рейтинг снизится. Это необратимо.','The business(es) will be lost for good, and your credit rating will drop. This cannot be undone.')}</p>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openLoanModal()">${tr('Отмена','Cancel')}</button><button class="btn btn-red btn-block" onclick="fileBankruptcy()">${tr('Да, объявить банкротство','Yes, file bankruptcy')}</button></div>`);
}
function fileBankruptcy(){
  const c = bankruptcyCandidate();
  if(c.mode==='none'){ toast(tr('Банкротство недоступно','Bankruptcy is not available')); return; }
  const idxsDesc = c.idxs.slice().sort((a,b)=>b-a); // splice from the end so earlier indices don't shift mid-removal
  const names = idxsDesc.map(i=>esc(state.sites[i].name));
  idxsDesc.forEach(i=>state.sites.splice(i,1));
  state.loan.principal = 0;
  state.loan.lumpTotal = 0;
  state.loan.dueDay = null;
  state.loan.takenDay = null;
  state.loan.type = null;
  state.loan.overdueDays = 0;
  state.loan.lastRepayDay = state.day;
  state.loan.rating = Math.max(0, (state.loan.rating||0) - 2); // softer hit than the forced seizeLoanCollateral() (-3) — this was the player's own call
  log(`💀 ${tr('Банкротство','Bankruptcy')}: ${tr('в счёт долга переданы бизнесы','businesses surrendered to cover the debt')} — ${names.join(', ')} (${fmt(c.value)}). ${tr('Кредит списан, кредитный рейтинг снижен','Loan cleared, credit rating dropped')}.`);
  toast(`💀 ${tr('Кредит списан через банкротство','Loan cleared via bankruptcy')}`);
  playSound('error');
  closeModal();
  save(); renderAll();
}
/* ---------- BANKRUPTCY (Phase 3) ----------
   Tied to difficulty, per the roadmap: on "hardcore", a negative cash
   balance left unresolved for a full in-game day ends the run. On
   "normal" it's a real, felt cost (a temporary income penalty) but never
   a game over — just warnings and soft pain. The rescue-loan offer (see
   openRescueLoanModal()) is shown up front, the moment the balance goes
   negative, not after the fact. */
const BANKRUPTCY_GRACE_DAYS = 1;
const BANKRUPTCY_SOFT_PENALTY = 0.85; // normal difficulty: income multiplier while cash<0
function bankruptcyPenaltyMultiplier(){
  if(state.cash >= 0) return 1;
  return state.difficulty==='hardcore' ? 1 : BANKRUPTCY_SOFT_PENALTY;
}
/* ---------- IN-GAME CLOCK ----------
   Shows in-game time of day and a countdown to the next in-game day — not
   real-world time. 1 in-game hour = 60 real seconds (GAME_TIME_SCALE), so
   state.secondsElapsed (which counts real seconds within the current
   in-game day, 0..GAME_DAY_SECONDS) is scaled up by GAME_TIME_SCALE to get
   the actual in-game seconds-of-day (0..86400) the clock displays. */
function formatGameClockTime(gameSecondsOfDay){
  const h = Math.floor(gameSecondsOfDay/3600)%24;
  const m = Math.floor((gameSecondsOfDay%3600)/60);
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}
function updateGameClock(){
  if(!state) return; // called once before boot() finishes loading state — harmless no-op then
  const el = document.getElementById('game-clock');
  if(!el) return;
  const gameSecondsOfDay = state.secondsElapsed * GAME_TIME_SCALE;
  const remain = Math.max(0, 86400 - gameSecondsOfDay);
  const rh = Math.floor(remain/3600);
  const rm = Math.floor((remain%3600)/60);
  // ITEM 1: calendar date (tap to open the Calendar window) prepended to
  // the existing clock/countdown text.
  el.textContent = `📅 ${formatCalendarShort(state.calendarDay)}  🕒 ${formatGameClockTime(gameSecondsOfDay)} · ${tr('до дня','until day')} ${state.day+1}: ${rh}${tr('ч','h')} ${rm}${tr('м','m')}`;
}
function updateStarterBoostBadge(){
  if(!state) return;
  const el = document.getElementById('starter-boost-badge');
  if(!el) return;
  if(!state.starterBoostUntil || Date.now() >= state.starterBoostUntil){
    el.classList.remove('show');
    return;
  }
  const secsLeft = Math.max(0, Math.round((state.starterBoostUntil-Date.now())/1000));
  const m = Math.floor(secsLeft/60), s = secsLeft%60;
  el.textContent = `🚀 ×${STARTER_BOOST_MULT} — ${m}:${String(s).padStart(2,'0')}`;
  el.classList.add('show');
}
function updateBankruptcyBanner(){
  const el = document.getElementById('bankruptcy-banner');
  // CLEANUP (3): wires fx-bankruptcy-warn — its keyframe is `infinite`, so
  // (unlike the one-shot effects wired via fx()/fxId(), which rely on an
  // animationend event that never fires on an infinite animation) this one
  // is toggled directly off state instead, on the cash figure itself, as a
  // second, more localized cue alongside the banner's own pulse.
  const cashEl = document.getElementById('header-cash');
  if(cashEl){
    cashEl.classList.toggle('fx-bankruptcy-warn', state.cash < 0 && !(state.bankruptcy && state.bankruptcy.gameOver));
    // fx-heartbeat: a softer pre-warning for "still positive, but one bad
    // bill away from going negative" — distinct from the red bankruptcy
    // glow, which only kicks in once cash has actually gone negative.
    const upcomingBills = (typeof totalMonthlySalary==='function'?totalMonthlySalary():0)/PAYROLL_PERIOD_DAYS + (typeof totalHostingCost==='function'?totalHostingCost():0)/HOSTING_PERIOD_DAYS;
    cashEl.classList.toggle('fx-heartbeat', state.cash >= 0 && upcomingBills>0 && state.cash < upcomingBills);
  }
  if(!el) return;
  if(state.cash >= 0 || (state.bankruptcy && state.bankruptcy.gameOver)){
    el.classList.remove('show');
    return;
  }
  el.classList.add('show');
  if(state.difficulty==='hardcore' && state.bankruptcy && state.bankruptcy.negativeSince!=null){
    const nowDayFrac = state.day + state.secondsElapsed/GAME_DAY_SECONDS;
    const hoursLeft = Math.max(0, Math.round((state.bankruptcy.negativeSince + BANKRUPTCY_GRACE_DAYS - nowDayFrac)*24));
    el.textContent = `🚨 ${tr('Баланс','Balance')} ${fmt(state.cash)} — ${tr('до банкротства','until bankruptcy')} ~${hoursLeft}${tr('ч','h')} · ${tr('нажмите за кредитом','tap for a loan')}`;
  } else {
    el.textContent = `⚠️ ${tr('Баланс отрицательный','Balance is negative')}: ${fmt(state.cash)} · ${tr('доход снижен — нажмите за кредитом','income reduced — tap for a loan')}`;
  }
}
function checkBankruptcy(){
  if(!state.bankruptcy) state.bankruptcy = {negativeSince:null, rescueShown:false, gameOver:false};
  if(state.bankruptcy.gameOver) return; // already ended — resetAfterBankruptcy() clears this
  const nowDayFrac = state.day + state.secondsElapsed/GAME_DAY_SECONDS;
  if(state.cash < 0){
    if(state.bankruptcy.negativeSince === null){
      state.bankruptcy.negativeSince = nowDayFrac;
      state.bankruptcy.rescueShown = false;
      log(`⚠️ ${tr('Баланс ушёл в минус','Balance went negative')}: ${fmt(state.cash)}`);
      if(state.difficulty==='hardcore'){
        toast(`🚨 ${tr('Баланс отрицательный! 1 игровой день на исправление, иначе — банкротство','Balance negative! 1 in-game day to fix it, or it\'s bankruptcy')}`);
      } else {
        toast(`⚠️ ${tr('Баланс отрицательный — доход временно снижен','Balance negative — income is temporarily reduced')}`);
      }
    }
    // BUGFIX (1.3): used to gate the auto-shown rescue modal to hardcore
    // only. Normal-difficulty players got just the toast above and were
    // left to discover the (already-unlimited) rescue loan on their own —
    // easy to read as "the balance is permanently broken". Show the same
    // modal on normal too (buildLoanModalHtml() renders a non-scary,
    // no-countdown explanation for normal — see the urgentBanner branch).
    if(!state.bankruptcy.rescueShown){
      state.bankruptcy.rescueShown = true;
      openRescueLoanModal();
    }
    if(state.difficulty==='hardcore' && (nowDayFrac - state.bankruptcy.negativeSince) >= BANKRUPTCY_GRACE_DAYS){
      triggerBankruptcyGameOver();
    }
  } else if(state.bankruptcy.negativeSince !== null){
    state.bankruptcy.negativeSince = null;
    state.bankruptcy.rescueShown = false;
  }
}
function triggerBankruptcyGameOver(){
  if(state.bankruptcy.gameOver) return;
  state.bankruptcy.gameOver = true;
  closeModal();
  const nw = netWorth();
  log(`💀 ${tr('Банкротство — баланс не удалось выровнять вовремя, бизнес закрыт','Bankruptcy — balance could not be fixed in time, business shut down')}`);
  const el = document.getElementById('bankruptcy-gameover');
  if(el){
    el.innerHTML = `
      <div class="bankruptcy-card">
        <div style="font-size:44px;margin-bottom:8px;">💀</div>
        <h2 style="margin:0 0 8px;">${tr('Банкротство','Bankruptcy')}</h2>
        <p style="color:var(--dim);font-size:13px;margin-bottom:10px;">${tr('Баланс оставался отрицательным дольше игрового дня — бизнес пришлось закрыть.','Balance stayed negative for longer than an in-game day — the business had to shut down.')}</p>
        <p style="color:var(--dim);font-size:12.5px;margin-bottom:18px;">${tr('День','Day')} ${state.day} · ${tr('Итоговый капитал','Final net worth')}: ${fmt(nw)}</p>
        <button class="btn btn-red btn-block" onclick="resetAfterBankruptcy()">${tr('Начать заново','Start over')}</button>
      </div>`;
    el.classList.add('show');
  }
  playSound('error');
  save();
}
function resetAfterBankruptcy(){
  const el = document.getElementById('bankruptcy-gameover');
  if(el) el.classList.remove('show');
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
  state.loan = {principal:0, rating:0, takenDay:null, type:null, dueDay:null, lumpTotal:0, overdueDays:0, lastRepayDay:null};
  state.shorts = {};
  state.finance = {incomeHist:[],expenseHist:[],todayIncome:0,todayExpenses:0,dailyHistory:[],lastTickCash:state.cash};
  state.payroll = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  state.hosting = {owed:0, overdueDays:0, lastAssessDay:state.day, audited:false};
  // BUGFIX: see the matching fix in doRebirth() — taxes owed/overdueDays/audited
  // was missing from this reset too, leaving old debt and audit flags in place
  // through a fresh start that's supposed to wipe everything.
  state.taxes = {rate:TAX_RATE, owed:{}, overdueDays:{}, audited:{}};
  state.aiMaint = {owed:0, overdueDays:0, audited:false};
  state.bankruptcy = {negativeSince:null, rescueShown:false, gameOver:false};
  // ITEM 9 FIX: same issue as doRebirth() — old mailbox items from the run
  // that just went bankrupt (offers on now-gone sites, unpaid bills from a
  // finance state that no longer exists) survived the reset, leaving the
  // inbox badge showing a count that pointed at nothing real. Clear it
  // along with everything else a fresh start wipes.
  state.mailbox = [];
  refreshInboxBadge();
  log(`🔄 ${tr('Новый старт после банкротства','Fresh start after bankruptcy')}`);
  save(); renderAll();
  toast(tr('Новый старт','Fresh start'));
}

function buildLoanModalHtml(urgent){
  const cap = maxLoanAmount();
  const rating = state.loan.rating||0;
  const ratingInfo = `<p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">🏅 ${tr('Кредитный рейтинг','Credit rating')}: <b style="color:var(--text);">${rating}/${LOAN_MAX_RATING}</b> — «${loanRatingLabel(rating)}»${rating<LOAN_MAX_RATING?tr(`. Гасите кредиты полностью и в срок, чтобы поднять рейтинг — это снижает ставку и повышает лимит.`,`. Repay loans in full and on time to raise your rating — this lowers the rate and raises the limit.`):''}</p>`;
  let urgentBanner = '';
  if(urgent && state.cash<0 && state.bankruptcy && state.bankruptcy.negativeSince!=null){
    if(state.difficulty==='hardcore'){
      const nowDayFrac = state.day + state.secondsElapsed/GAME_DAY_SECONDS;
      const deadline = state.bankruptcy.negativeSince + BANKRUPTCY_GRACE_DAYS;
      const hoursLeft = Math.max(0, Math.round((deadline-nowDayFrac)*24));
      urgentBanner = `<p id="loan-modal-countdown" style="color:var(--red);font-size:12.5px;margin-bottom:12px;font-weight:700;">🚨 ${tr('Баланс отрицательный','Balance is negative')}: ${fmt(state.cash)}. ${tr('До банкротства','Until bankruptcy')}: ~${hoursLeft} ${tr('ч.','h')}</p>`;
    } else {
      // BUGFIX (1.3): on "normal" difficulty there's no bankruptcy
      // countdown/game-over — the balance just sits negative earning a soft
      // income penalty (BANKRUPTCY_SOFT_PENALTY) indefinitely, with no
      // in-game explanation of what's going on or that a rescue loan
      // exists. Previously this modal only auto-opened on hardcore, so
      // normal-difficulty players who dug themselves into a hole via an
      // eager early investment (see 1.3 in the plan) saw one throwaway
      // toast and were left to guess. Show an equivalent, non-scary
      // explanation here instead of the hardcore countdown.
      urgentBanner = `<p id="loan-modal-countdown" style="color:var(--orange);font-size:12.5px;margin-bottom:12px;font-weight:700;">⚠️ ${tr('Баланс отрицательный','Balance is negative')}: ${fmt(state.cash)}. ${tr('Пока баланс в минусе, доход снижен. Банкротство не грозит — но кредит поможет быстрее выйти в плюс.','While the balance is negative, income is reduced. There is no bankruptcy risk — but a loan can help you get back in the black faster.')}</p>`;
    }
  }

  if(state.loan.type==='lumpsum' && state.loan.principal>0){
    const owed = Math.round(state.loan.lumpTotal);
    const nowDayFrac = state.day + state.secondsElapsed/GAME_DAY_SECONDS;
    const daysLeft = Math.max(0, state.loan.dueDay - nowDayFrac);
    const hoursLeft = Math.round(daysLeft*24);
    return `
    <h3>🏦 ${tr('Кредит одной суммой','Lump-sum loan')}</h3>
    ${urgentBanner}
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:6px;">${tr('К возврату целиком','Owed in full')}: <b style="color:var(--text);">${fmt(owed)}</b></p>
    <p id="loan-modal-lumpsum-deadline" style="color:var(--orange);font-size:12.5px;margin-bottom:14px;">⏳ ${tr('Срок','Deadline')}: ${tr('через','in')} ~${hoursLeft} ${tr('ч. игрового времени','game hours')} (${tr('день','day')} ${state.loan.dueDay})</p>
    <p style="color:var(--dim);font-size:12px;margin-bottom:14px;">${tr('Если не погасить в срок — банк спишет всю сумму принудительно, даже уводя баланс в минус, и снизит кредитный рейтинг.','If not repaid in time, the bank force-collects the full amount — even pushing your balance negative — and your credit rating drops.')}</p>
    <div class="btn-row"><button class="btn btn-violet btn-block" ${state.cash<owed?'disabled':''} onclick="repayLumpsum();closeModal();">${tr('Погасить полностью','Repay in full')} — ${fmt(owed)}</button></div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openBankruptcyModal()">💀 ${tr('Подать на банкротство','File for bankruptcy')}</button></div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>`;
  }

  const debt = state.loan.principal;
  if(debt>0){
    // Active installment loan.
    const avail = Math.max(0, cap-debt);
    const quarterAmt = Math.round(avail*0.25), maxAmt = Math.round(avail);
    const overdueDays = state.loan.overdueDays||0;
    let overdueWarning = '';
    if(overdueDays >= LOAN_SEIZE_WARN_DAYS){
      const daysLeft = Math.max(0, LOAN_SEIZE_DAYS-overdueDays);
      overdueWarning = `<p style="color:var(--red);font-size:12.5px;margin-bottom:12px;font-weight:600;">⚠️ ${tr('Кредит не обслуживается','Loan not being serviced')} ${overdueDays} ${tr('дн.','d')}. ${daysLeft>0?tr(`Погасите хоть часть в течение ${daysLeft} дн., иначе банк заберёт бизнес.`,`Repay at least some within ${daysLeft} day(s), or the bank will seize a business.`):tr('Бизнес под угрозой прямо сейчас.','A business is at risk right now.')}</p>`;
    }
    return `
    <h3>🏦 ${tr('Кредит под будущий доход','Loan against future income')}</h3>
    ${urgentBanner}
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:6px;">${tr('Текущий долг','Current debt')}: ${fmt(debt)} · ${tr('Лимит','Limit')}: ${fmt(cap)} · ${tr('Ставка','Rate')} ${(loanRate()*100).toFixed(1)}%${tr('/игровой день','/game day')}</p>
    ${ratingInfo}
    ${overdueWarning}
    <div class="btn-row">
      <button class="btn btn-violet btn-block" ${avail<1?'disabled':''} onclick="takeLoan(${quarterAmt});closeModal();">${tr('Взять ещё 25%','Take another 25%')} · ${Math.round(loanApprovalChance(quarterAmt)*100)}%</button>
      <button class="btn btn-violet btn-block" ${avail<1?'disabled':''} onclick="takeLoan(${maxAmt});closeModal();">${tr('Взять максимум','Take maximum')} · ${Math.round(loanApprovalChance(maxAmt)*100)}%</button>
    </div>
    ${buildLoanCustomAmountHtml(avail, 'takeLoan')}
    <div class="btn-row">
      <button class="btn btn-outline btn-block" ${debt<1?'disabled':''} onclick="repayLoan(${Math.round(debt*0.5)});closeModal();">${S('Погасить 50%')}</button>
      <button class="btn btn-outline btn-block" ${debt<1?'disabled':''} onclick="repayLoan(Infinity);closeModal();">${S('Погасить всё')}</button>
    </div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openBankruptcyModal()">💀 ${tr('Подать на банкротство','File for bankruptcy')}</button></div>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>`;
  }

  // No active loan — offer the choice between the two loan types (Phase 3).
  const quarterCap = Math.round(cap*0.25);
  const lumpAmount = Math.round(cap);
  const lumpOwed = Math.round(lumpAmount * LUMPSUM_FACTOR);
  return `
    <h3>🏦 ${tr('Кредит под будущий доход','Loan against future income')}</h3>
    ${urgentBanner}
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:6px;">${tr('Лимит','Limit')}: ${fmt(cap)} · ${tr('Ставка','Rate')} ${(loanRate()*100).toFixed(1)}%${tr('/игровой день','/game day')}</p>
    ${ratingInfo}
    <p style="color:var(--dim);font-size:11.5px;margin-bottom:12px;">${tr('Чем больше от лимита вы просите и чем ниже рейтинг — тем ниже шанс одобрения. Долго не платите по кредиту — банк заберёт бизнес и снизит рейтинг.','The bigger the ask relative to your limit and the lower your rating, the lower the approval odds. Go too long without paying — the bank seizes a business and drops your rating.')}</p>
    <div class="card glass" style="margin-bottom:10px;">
      <div class="card-title">📈 ${tr('Периодические выплаты','Installment loan')}</div>
      <div class="card-sub">${tr('Проценты начисляются каждый день, гасите частями в любой момент','Interest accrues daily, repay in parts whenever you like')}</div>
      <div class="btn-row">
        <button class="btn btn-violet btn-block" ${cap<1?'disabled':''} onclick="takeLoan(${quarterCap});closeModal();">${tr('Взять 25%','Take 25%')} — ${fmt(quarterCap)} · ${Math.round(loanApprovalChance(quarterCap)*100)}%</button>
        <button class="btn btn-violet btn-block" ${cap<1?'disabled':''} onclick="takeLoan(${cap});closeModal();">${tr('Взять максимум','Take maximum')} — ${fmt(cap)} · ${Math.round(loanApprovalChance(cap)*100)}%</button>
      </div>
      ${buildLoanCustomAmountHtml(cap, 'takeLoan')}
    </div>
    <div class="card glass">
      <div class="card-title">💰 ${tr('Разовая сумма','Lump sum')}</div>
      <div class="card-sub">${tr(`Без процентов день за днём — фиксированная сумма к возврату целиком через ${LUMPSUM_TERM_DAYS} игровых дней (×${LUMPSUM_FACTOR})`,`No daily interest — a fixed total due in full in ${LUMPSUM_TERM_DAYS} in-game days (×${LUMPSUM_FACTOR})`)}</div>
      <div class="btn-row"><button class="btn btn-outline btn-block" ${cap<1?'disabled':''} onclick="takeLumpsumLoan(${lumpAmount});closeModal();">${tr('Взять','Take')} ${fmt(lumpAmount)} → ${tr('вернуть','repay')} ${fmt(lumpOwed)} · ${Math.round(loanApprovalChance(lumpAmount)*100)}%</button></div>
      ${buildLoanCustomAmountHtml(cap, 'takeLumpsumLoan', true)}
    </div>
    <div class="btn-row" style="margin-top:10px;"><button class="btn btn-outline btn-block" onclick="closeModal()">${S('Закрыть')}</button></div>`;
}
// BUGFIX (4): the loan modal used to only offer fixed 25%/maximum preset
// buttons — no way to borrow an exact amount. At a high credit limit, even
// the smaller 25% preset can be a huge sum (e.g. a $300K limit makes "25%"
// a $75K loan), which reads as "I asked for 200 and got 75000" even though
// the player never asked for 200 anywhere the UI could know that — the
// modal simply never offered a way to say so. This adds a real number input
// (clamped to the actual borrowable ceiling) next to the presets.
function buildLoanCustomAmountHtml(maxAmount, fnName, isLump){
  const cap = Math.max(0, Math.round(maxAmount));
  if(cap<1) return '';
  const inputId = `loan-custom-${fnName}-${isLump?'lump':'inst'}`;
  return `<div class="btn-row" style="margin-top:8px;align-items:center;">
    <input type="number" id="${inputId}" class="set-select" style="flex:1;" placeholder="${tr('Своя сумма','Custom amount')}" min="1" max="${cap}" step="1" />
    <button class="btn btn-outline" onclick="submitLoanCustomAmount('${inputId}',${cap},'${fnName}')">${tr('Взять','Take')}</button>
  </div>`;
}
function submitLoanCustomAmount(inputId, cap, fnName){
  const el = document.getElementById(inputId);
  if(!el) return;
  let amount = Math.round(Number(el.value));
  if(!amount || amount<=0){ toast(tr('Введите сумму','Enter an amount')); return; }
  if(amount>cap) amount = cap; // clamp instead of silently refusing — the player's intent is clear even if they typed over the limit
  if(fnName==='takeLumpsumLoan') takeLumpsumLoan(amount);
  else takeLoan(amount);
  closeModal();
}
function openLoanModal(){ openModal(buildLoanModalHtml(false)); }
function openRescueLoanModal(){ openModal(buildLoanModalHtml(true)); }
function refreshLoanModal(){
  const bg = document.getElementById('modal-bg');
  if(!bg || !bg.classList.contains('show')) return;
  if(document.getElementById('loan-modal-countdown')){
    // Only patch when the urgent rescue countdown view is showing, to avoid
    // clobbering the player mid-interaction with the regular loan modal.
    document.getElementById('modal').innerHTML = buildLoanModalHtml(true);
  }
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
  fxId('header-cash','fx-jelly');
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
  fxId('header-cash','fx-sparkle');
  checkReputationTierEvents();
  renderAll(); save();
}
function toggleSwitch(key){
  state.settings[key] = !state.settings[key];
  const el = document.getElementById('sw-'+key);
  if(el) el.classList.toggle('on', state.settings[key]);
  save();
}
// BALANCE (3.5): every purple-ish accent in the game (ACCENT_THEMES'
// "Роялти", DESIGN_THEMES' "Неон") lives entirely behind the Boosty
// subscription — a non-paying player who builds an AI-focused empire (the
// game's own AI site previews already use this exact purple, see
// SITE_VISUAL.ai/.ai_agent/.hybrid_ai_saas) has no free way to carry that
// into the app's own chrome. This is a small, free, purely cosmetic accent
// swap, independent of the Boosty theme system — it doesn't replace or
// gate behind it, just layers on top as the final, most-specific user
// preference (see applyUiAccent()).
const AI_ACCENT_PURPLE = '#bf5af2';
function applyUiAccent(){
  if(state.settings.aiAccent){
    document.documentElement.style.setProperty('--blue', AI_ACCENT_PURPLE);
    document.documentElement.style.setProperty('--teal', '#d264ff');
  } else {
    // Re-apply whatever the design/Boosty-accent theme says --blue/--teal
    // should be, so turning this off doesn't leave stale purple behind.
    applyDesignTheme(state.settings.theme || 'dark');
    if(state.boosty && state.boosty.unlocked && state.boosty.theme) applyAccentTheme(state.boosty.theme);
  }
}
function toggleAiAccent(){
  state.settings.aiAccent = !state.settings.aiAccent;
  const el = document.getElementById('sw-aiAccent');
  if(el) el.classList.toggle('on', state.settings.aiAccent);
  applyUiAccent();
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
  // One switch here reaches every buy/upgrade/sell/error/achievement/rebirth/
  // rankup call site already scattered across the file — each of those
  // already calls playSound(kind), so hooking the matching animation in here
  // lights up dozens of existing actions without editing each call site.
  const FX_BY_SOUND = {
    buy: ['header-cash','fx-num-pop'], upgrade: ['header-cash','fx-num-pop'],
    sell: ['header-cash','fx-glow-green'], error: ['toast','fx-shake'],
    achievement: ['toast','fx-badge-pop'], rebirth: ['header-rank','fx-rebirth-starburst'],
    rankup: ['header-rank','fx-rank-crown'],
  };
  if(FX_BY_SOUND[kind]) fxId(FX_BY_SOUND[kind][0], FX_BY_SOUND[kind][1]);
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
    fireLocalNotification('🔥 Стрик скоро сгорит', `Зайдите в Digital Empire в течение ${Math.max(1,Math.round(msLeftToday/60000))} мин, чтобы не потерять серию входов`);
  }
  // Weekly event ending soon and not claimed yet.
  ensureSeasonEvent();
  const wk = state.seasonEvent.weekKey;
  const theme = currentSeasonTheme(wk);
  const target = seasonTarget(theme);
  if(!state.seasonEvent.claimed && seasonProgressValue(theme)>=target && pushNotifiedSeasonWeek!==wk){
    pushNotifiedSeasonWeek = wk;
    fireLocalNotification(tr('🎆 Награда недели готова','🎆 Weekly reward ready'), tr(`«${theme.name}» выполнено — заберите награду в приложении`,`"${theme.nameEn}" complete — claim your reward in the app`));
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
  // ITEM 13 FIX: Boosty isn't game progress — it's tied to a real-world
  // subscription/code the player already redeemed (see redeemBoostyCode()).
  // state = defaultState() below used to wipe it along with everything
  // else, so "reset progress" silently revoked a paid perk. Snapshot it
  // first and restore it onto the fresh state afterward.
  const boostyBackup = (state.boosty && state.boosty.unlocked)
    ? {unlocked:true, code:state.boosty.code, theme:state.boosty.theme||'default'}
    : null;
  state = defaultState();
  if(boostyBackup) state.boosty = boostyBackup;
  state.npcCompetitors = generateNpcCompetitors();
  applyAccentTheme(state.boosty.unlocked ? state.boosty.theme : 'default');
  ALL_ASSETS.forEach(s=>{stockPrices[s.sym]=s.price; priceHistory[s.sym]=[s.price];});
  closeSiteView(); closeModal(); save(); renderAll();
  toast(tr('Прогресс сброшен','Progress reset'));
  // A reset IS a new game — send the player through the same name/difficulty
  // setup screen a brand-new player gets (confirmSetup() below then shows
  // the story intro itself, since state.story.introSeen is false again).
  nav('dash');
  setTimeout(showSetupScreen, 300);
}

/* ---------- MODAL ---------- */
// CLEANUP (3): wires fx-slide-up-in — one of ~40 CSS fx-* animations that
// were defined but never triggered from JS. Every openModal() call in the
// game (dozens of call sites) now gets a bottom-sheet slide-in for free.
function openModal(html){ document.getElementById('modal').innerHTML = html; document.getElementById('modal-bg').classList.add('show'); fxId('modal','fx-slide-up-in'); }
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
    ${depthFeatureUnlocked('shorts') ? `
    <div class="btn-row">
      <button class="btn btn-red btn-block" ${state.cash<price?'disabled':''} onclick="openShort('${sym}',1);closeModal();">Шорт 1</button>
      <button class="btn btn-red btn-block" ${state.cash<price*10?'disabled':''} onclick="openShort('${sym}',10);closeModal();">Шорт 10</button>
    </div>` : `
    <p style="color:var(--dim);font-size:12px;margin-bottom:4px;">🔒 ${tr('Откроется при активах','Unlocks at net worth')} ${fmt(DEPTH_UNLOCK_NW.shorts)}</p>`}
    ${short ? `<div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeShort('${sym}',${short.qty});closeModal();">Закрыть шорт (${short.qty.toFixed(2)} шт)</button></div>` : ''}
  `);
}

/* ---------- LIVE SITE VIEW ---------- */
let openSiteIdx = null;
let specTreeSelected = {}; // siteIdx -> currently-selected node id in the tech-tree modal
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

/* ---------- APP-WIDE DOUBLE-TAP/DOUBLE-CLICK: TOGGLE FULLSCREEN ----------
   Double-tapping/double-clicking anywhere on empty screen space toggles
   real OS/browser fullscreen for the whole app. Any element with an
   onclick (basically every interactive card/button/row in the game, since
   they're all wired via inline onclick="...") is ignored so a fast double
   tap on gameplay UI doesn't also flip fullscreen. */
function isAppFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}
function toggleAppFullscreen(){
  try{
    if(isAppFullscreen()){
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if(exit){ const r = exit.call(document); if(r && r.catch) r.catch(()=>{}); }
    } else {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if(req){ const r = req.call(el); if(r && r.catch) r.catch(()=>{}); }
    }
  }catch(e){ /* ignore — API unavailable/blocked in some embedded WebViews */ }
}
document.addEventListener('dblclick', function(e){
  if(e.target.closest && e.target.closest('[onclick], button, a, input, textarea, select, .no-dbltap-fs')) return;
  toggleAppFullscreen();
});
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
  // Discount campaign countdown — same live-patch pattern as boost above,
  // but the whole card swaps content on expiry (offer list vs. live status)
  // so it's simplest to just re-render the section each tick while a
  // campaign is running, rather than patch individual text nodes.
  // BUGFIX: these four cards (discount/viral/trend/campaign) used to call
  // buildXHtml() -> innerHTML on every single 200ms liveRefresh tick while
  // active, i.e. 5x/second, even though the only thing in that markup that
  // ever changes moment-to-moment is a once-per-second countdown number.
  // Tearing down and recreating the whole card 5x/second for a number that
  // only visually changes 1x/second is exactly what reads as "everything
  // flickers" in the upgrades/site view — so now we only rebuild when the
  // displayed second actually changed (or the active/inactive state flipped,
  // same as before).
  if(site.discountUntil){
    const discountActive = Date.now() < site.discountUntil;
    const secsLeft = discountActive ? Math.max(0, Math.ceil((site.discountUntil-Date.now())/1000)) : null;
    const discountEl = document.getElementById('sv-discount');
    if(discountEl){
      const changed = (discountActive !== site._discountWasActive) || (discountActive && secsLeft !== site._discountLastSecs);
      if(changed && (discountActive || site._discountWasActive)) discountEl.innerHTML = buildDiscountHtml(openSiteIdx);
    }
    site._discountWasActive = discountActive;
    site._discountLastSecs = secsLeft;
  }
  if(site.viralUntil){
    const viralActive = Date.now() < site.viralUntil;
    const secsLeft = viralActive ? Math.max(0, Math.ceil((site.viralUntil-Date.now())/1000)) : null;
    const viralEl = document.getElementById('sv-viral');
    if(viralEl){
      const changed = (viralActive !== site._viralWasActive) || (viralActive && secsLeft !== site._viralLastSecs);
      if(changed && (viralActive || site._viralWasActive)) viralEl.innerHTML = buildViralHtml(openSiteIdx);
    }
    site._viralWasActive = viralActive;
    site._viralLastSecs = secsLeft;
  }
  if(site.trendUntil){
    const trendActive = Date.now() < site.trendUntil;
    const secsLeft = trendActive ? Math.max(0, Math.ceil((site.trendUntil-Date.now())/1000)) : null;
    const trendEl = document.getElementById('sv-trend');
    if(trendEl){
      const changed = (trendActive !== site._trendWasActive) || (trendActive && secsLeft !== site._trendLastSecs);
      if(changed && (trendActive || site._trendWasActive)) trendEl.innerHTML = buildTrendHtml(openSiteIdx);
    }
    site._trendWasActive = trendActive;
    site._trendLastSecs = secsLeft;
  }
  {
    const type2 = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    const cTierId = tierIdOf(type2.id);
    const cs = site.campaigns && site.campaigns[cTierId];
    if(cs && cs.until){
      const campActive = Date.now() < cs.until;
      const secsLeft = campActive ? Math.max(0, Math.ceil((cs.until-Date.now())/1000)) : null;
      const campEl = document.getElementById('sv-campaign');
      if(campEl){
        const changed = (campActive !== site._campaignWasActive) || (campActive && secsLeft !== site._campaignLastSecs);
        if(changed && (campActive || site._campaignWasActive)) campEl.innerHTML = buildCampaignHtml(openSiteIdx);
      }
      site._campaignWasActive = campActive;
      site._campaignLastSecs = secsLeft;
    }
  }
  // Income sparkline — cheap path-only patch, no rebuild.
  const chartPath = document.getElementById('sv-income-chart-path');
  if(chartPath && site.incomeHistory && site.incomeHistory.length>=2){
    chartPath.setAttribute('d', sparklinePath(site.incomeHistory, 280, 50));
  }
  // Ad countdowns tick every second; if any expired since the last tick,
  // do a structural refresh so the slot/mockup banner actually disappears
  // and income recovers visibly instead of just silently in the formula.
  if(Array.isArray(site.ads) && site.ads.length){
    const now = Date.now();
    if(site.ads.some(a=>a.expiresAt<=now)){
      cleanupSiteAds(site);
      refreshSiteViewSections(openSiteIdx, ['ads','page']);
    } else {
      site.ads.forEach(a=>{
        const el = document.getElementById('sv-ad-timer-'+a.id);
        if(el) el.textContent = Math.max(0, Math.ceil((a.expiresAt-now)/1000))+tr('с','s');
      });
    }
  }
}
// Cash-only afford toggles across the whole app (buy-site cards, estate,
// garage, site-view tracks/AI-lab/hire buttons, etc.) — cheap attribute
// toggles, no DOM replacement, so this can safely run every tick without
// causing any flicker.
// PERF: used to be a bare document.querySelectorAll() — it scanned every
// aff-btn on every single screen (5-6 of them, most hidden via .screen.active
// rather than removed from the DOM) 5x/sec forever. Scoping the scan to just
// the visible screen plus an open modal (the only two places an aff-btn can
// actually be seen/tapped) cuts that DOM walk down to a fraction of the size
// with no behavior change.
function updateAffordabilityAll(){
  const scopes = [document.querySelector('.screen.active')];
  const modalBg = document.getElementById('modal-bg');
  if(modalBg && modalBg.classList.contains('show')) scopes.push(document.getElementById('modal'));
  scopes.forEach(scope=>{
    if(!scope) return;
    scope.querySelectorAll('.aff-btn[data-aff-cost]').forEach(btn=>{
      btn.disabled = state.cash < Number(btn.dataset.affCost);
    });
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
  const vis = SITE_VISUAL[tierIdOf(type.id)];
  const rawStage = designStage(site.tracks.design);
  // PRODUCT (4.1): a brand-new site starts at Design level 1 → stage 1 →
  // a bare "under construction" skeleton with a "get design to level 3"
  // nag — the very first thing a new player sees after founding a
  // business is a wall telling them nothing is happening yet. For the
  // first ONBOARDING_GRACE_MS of real time after founding, show the
  // stage-2 "just launched" mockup instead (real header, hero, live
  // visitor counter) even if Design hasn't caught up — so the first
  // minute of play always shows a visible, real-feeling business.
  const stage = (rawStage===1 && siteInOnboardingGrace(site)) ? 2 : rawStage;
  const income = siteIncome(type, site) * (1+estateBonusTotal()) * (1+reputationBonus());
  const traffic = site.tracks.traffic;
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
  const adsShown = (site.ads||[]).length > 0;
  const verified = site.tracks.infra >= 6;
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
    const u1 = Math.max(1, Math.round(traffic*3.2 + site.tracks.design*1.5));
    const u2 = Math.round(income*100)/100;
    // small deterministic bar-chart driven by traffic/design so it
    // visibly grows with those tracks instead of being purely decorative
    const bars = Array.from({length:7}, (_,i)=>{
      const seed = (traffic*13 + site.tracks.design*7 + i*29) % 100;
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
    ${adsShown?(site.ads||[]).map(a=>{ const m=findSlotType(a.typeId); return `<div class="sp-ad${m&&m.category==='product'?' sp-product':''}">${m?m.icon:'📢'} <span>${m?L(m,'name'):vis.adText}</span></div>`; }).join(''):''}
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
function buildSynergyBannerHtml(site){
  const count = trackSynergyCount(site);
  const active = trackSynergyActive(site);
  const dots = TRACK_ORDER.map(k=>{
    const t = TRACK_META[k];
    const hit = site.tracks[k] >= TRACK_SYNERGY_LEVEL;
    return `<span style="opacity:${hit?1:.35};font-size:15px;" title="${tr(t.name,t.nameEn)} ${site.tracks[k]}">${t.icon}</span>`;
  }).join(' ');
  if(active){
    return `<div class="card glass synergy-banner synergy-banner-active">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:20px;">⚡</span>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:13px;color:#ffd60a;">${tr('Режим синергии активен','Synergy mode active')}</div>
          <div style="font-size:11.5px;color:var(--dim);">${tr('3+ трека на уровне','3+ tracks at level')} ${TRACK_SYNERGY_LEVEL}+ → <b style="color:#ffd60a;">+${Math.round((TRACK_SYNERGY_INCOME_MULT-1)*100)}% ${tr('к доходу','income')}</b></div>
        </div>
        <div>${dots}</div>
      </div>
    </div>`;
  }
  return `<div class="card glass synergy-banner">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:20px;opacity:.5;">⚡</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:12.5px;color:var(--text);">${tr('Синергия треков','Track synergy')}: ${count}/${TRACK_SYNERGY_MIN_TRACKS}</div>
        <div style="font-size:11.5px;color:var(--dim);">${tr('Прокачайте ещё','Level up')} ${Math.max(0,TRACK_SYNERGY_MIN_TRACKS-count)} ${tr('трек(а/ов) до уровня','track(s) to level')} ${TRACK_SYNERGY_LEVEL}+ → <b>+${Math.round((TRACK_SYNERGY_INCOME_MULT-1)*100)}%</b> ${tr('к доходу','income')}</div>
      </div>
      <div>${dots}</div>
    </div>
  </div>`;
}
function buildTracksHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const capLevel = trackMaxLevel(site);
  const prio = priorityTrackId(type);
  let html = `<div class="card glass" style="margin-bottom:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;">
    <span style="font-size:18px;">🎯</span>
    <div style="flex:1;font-size:12.5px;color:var(--dim);">${tr('Приоритет категории','Category priority')}: <b style="color:var(--text);">${priorityTrackLabel(type)}</b> — ${tr('сильно отставая по нему, бизнес не выйдет в стабильный плюс','falling badly behind on it, the business will not reach stable profit')}</div>
  </div>`;
  html += buildSynergyBannerHtml(site);
  if(site.bugged){
    const sev = site.bugged.severity;
    const cost = bugPatchCost(site);
    const patching = isAppTierSite(site) && site.bugged.patchingUntil;
    const secsLeft = patching ? Math.max(0, Math.ceil((site.bugged.patchingUntil-Date.now())/1000)) : 0;
    html += `<div class="card glass" style="margin-bottom:10px;border-color:rgba(255,159,10,.4);">
      <div class="card-title">🐞 ${sev==='major'?tr('Серьёзный баг','Major bug'):tr('Мелкий баг','Minor bug')}</div>
      <div class="card-sub">${tr('Пользователи жалуются — доход снижен, пока не выпущен патч','Users are complaining — income is reduced until a patch ships')} (${sev==='major'?'-25%':'-12%'})</div>
      ${patching
        ? `<div class="card-sub" style="margin-top:4px;">🔧 ${tr('Патч в разработке','Patch in development')} <span class="fx-loading-dots"><span>.</span><span>.</span><span>.</span></span> ~${secsLeft}${tr('с','s')}</div>`
        : `<div class="btn-row"><button class="btn btn-outline btn-block" ${state.cash<cost?'disabled':''} onclick="patchBug(${idx})">🔧 ${tr('Выпустить патч','Ship a patch')} — ${fmt(cost)}${isAppTierSite(site)?` (~${APP_PATCH_SECONDS[sev]}${tr('с','s')})`:''}</button></div>`}
    </div>`;
  }
  // Точка 10: треки больше не покупаются напрямую за кэш — уровень растёт
  // только через узлы дерева прокачки (см. openSpecTreeModal), которые
  // покупаются за очки специализации, зарабатываемые сотрудниками. Здесь —
  // только текущий статус по каждой ветке плюс кнопка в дерево.
  const pts = Math.floor(site.specPoints||0);
  html += `<div class="card glass" style="margin-bottom:10px;padding:12px 14px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:${TRACK_ORDER.some(k=>site.tracks[k]<capLevel)?'10px':'0'};">
      <span style="font-size:20px;">🌳</span>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:13px;">${tr('Ветка прокачки','Upgrade tree')}</div>
        <div style="font-size:11.5px;color:var(--dim);">${tr('Уровни веток теперь растут только за очки специализации — их зарабатывают сотрудники','Branch levels now only grow via specialization points — earned by your staff')}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="num" style="font-weight:700;color:var(--blue);">🔷 <span id="sv-tracks-pts">${pts}</span></div>
        <div style="font-size:10px;color:var(--dim);">+<span id="sv-tracks-rate">${specPointsPerSec(site).toFixed(2)}</span>/${tr('с','s')}</div>
      </div>
    </div>
    ${TRACK_ORDER.map(key=>{
      const t = TRACK_META[key];
      const catDisp = specCatDisplay(key, type);
      const lvl = site.tracks[key];
      const atCap = lvl >= capLevel;
      const star = key===prio ? ' ⭐' : '';
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
        <div class="track-icon" style="width:28px;height:28px;font-size:13px;border-radius:9px;background:${t.color}22;color:${t.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">${catDisp.icon}</div>
        <div style="flex:1;font-size:12px;">${catDisp.name}${star}</div>
        <div class="num" style="font-size:11.5px;color:${atCap?'var(--orange)':'var(--dim)'};">${atCap?'🔒 ':''}Ур. ${lvl}/${capLevel}</div>
      </div>`;
    }).join('')}
    <div class="btn-row" style="margin-top:8px;"><button class="btn btn-cyan btn-block" onclick="openSpecTreeModal(${idx})">🌳 ${tr('Открыть ветку прокачки','Open the upgrade tree')}</button></div>
  </div>`;
  return html;
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
function buildDiscountHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='shop') return '';
  const fatigue = discountFatigueCount(site);
  const active = site.discountUntil && Date.now() < site.discountUntil;
  if(active){
    const isOverload = site.discountMult < 0;
    const secsLeft = Math.max(0, Math.ceil((site.discountUntil-Date.now())/1000));
    // CLEANUP (3): wires fx-pulse-fade (steady "campaign is live" breathing
    // glow) and fx-shimmer (an urgent sheen while it's actively overloaded)
    // — both infinite CSS animations, so applied as plain state-driven
    // classes on the freshly-built markup rather than via the one-shot
    // fx()/fxId() helper (whose animationend-based auto-remove would never
    // fire on an `infinite` animation).
    return `
      <div class="card glass ${isOverload?'fx-shimmer':'fx-pulse-fade'}" style="${isOverload?'border:1px solid rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
        <div class="card-title">${isOverload?'🔥 '+tr('Серверы перегружены','Servers overloaded'):'🏷️ '+tr('Акция активна','Campaign live')}</div>
        <div class="card-sub" style="${isOverload?'color:#ff453a;':''}">${isOverload?tr('Покупателей больше, чем выдерживают серверы — заказы теряются','More shoppers than the servers can handle — orders are being lost'):tr('Скидка привлекает покупателей','The discount is pulling shoppers in')} · ${tr('доход','income')} ×${site.discountMult.toFixed(2)} · ${secsLeft}${tr('с','s')}</div>
      </div>`;
  }
  const fatigueWarn = fatigue>=2 ? `<div class="card-sub" style="color:#ff9f0a;margin-bottom:8px;">⚠️ ${tr('Клиенты устали от скидок — следующая акция дороже и менее выгодна','Customers are discount-fatigued — the next campaign costs more and pays off less')}</div>` : '';
  const rows = DISCOUNT_TIERS.map(d=>{
    const cost = discountCost(type, d, fatigue);
    const infraOk = site.tracks.infra >= d.requiredInfra;
    return `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row">
        <div class="card-icon">🏷️</div>
        <div style="flex:1">
          <div class="card-title">−${d.pct}%</div>
          <div class="card-sub">${tr('Нужен уровень инфраструктуры','Needs Infra track level')} ≥${d.requiredInfra} — ${infraOk?'✅ '+tr('хватает','ready'):`❌ ${tr('сейчас','currently')} ${site.tracks.infra}`}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn ${infraOk?'btn-cyan':'btn-outline'} btn-block aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="launchDiscount(${idx},'${d.id}')">${infraOk?tr('Запустить за','Launch for'):tr('⚠️ Рискнуть без мощностей за','⚠️ Risk it without capacity for')} ${fmt(cost)}</button></div>
    </div>`;
  }).join('');
  return `
    <div class="card-sub" style="margin-bottom:10px;">${tr('Скидка привлекает больше покупателей, но нагрузку должны выдержать серверы (трек «Инфраструктура»). Не хватит мощности — распродажа обернётся перегрузкой и потерями вместо роста. Слишком частые акции быстро дорожают и выгорают.','A discount pulls in more shoppers — but the servers (Infra track) have to handle the load. Not enough capacity and the sale turns into an overload and losses instead of growth. Running campaigns too often gets pricier and burns out fast.')}</div>
    ${fatigueWarn}
    ${rows}`;
}
function buildViralHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='blog') return '';
  const fatigue = viralFatigueCount(site);
  const active = site.viralUntil && Date.now() < site.viralUntil;
  if(active){
    const flopped = site.viralMult < 0;
    const secsLeft = Math.max(0, Math.ceil((site.viralUntil-Date.now())/1000));
    return `
      <div class="card glass" style="${flopped?'border:1px solid rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
        <div class="card-title">${flopped?'📉 '+tr('Пост провалился','Post flopped'):'🚀 '+tr('Пост набирает охваты','Post is going viral')}</div>
        <div class="card-sub" style="${flopped?'color:#ff453a;':''}">${flopped?tr('Читателям не хватило качества подачи — доверие просело','Readers weren\'t sold on it — trust took a hit'):tr('Трафик растёт','Traffic is climbing')} · ${tr('доход','income')} ×${site.viralMult.toFixed(2)} · ${secsLeft}${tr('с','s')}</div>
      </div>`;
  }
  const fatigueWarn = fatigue>=2 ? `<div class="card-sub" style="color:#ff9f0a;margin-bottom:8px;">⚠️ ${tr('Аудитория устала от кликбейта — следующий пост дороже и слабее','Readers are clickbait-fatigued — the next post costs more and pays off less')}</div>` : '';
  const rows = VIRAL_TIERS.map(v=>{
    const cost = viralCost(type, v, fatigue);
    const marketingOk = site.tracks.marketing >= v.requiredMarketing;
    return `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row">
        <div class="card-icon">🚀</div>
        <div style="flex:1">
          <div class="card-title">${tr('Виральный пост','Viral post')} — ${v.id==='small'?tr('малый','small'):v.id==='medium'?tr('средний','medium'):tr('крупный','big')}</div>
          <div class="card-sub">${tr('Нужен уровень маркетинга','Needs Marketing track level')} ≥${v.requiredMarketing} — ${marketingOk?'✅ '+tr('хватает','ready'):`❌ ${tr('сейчас','currently')} ${site.tracks.marketing}`}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn ${marketingOk?'btn-cyan':'btn-outline'} btn-block aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="launchViralPost(${idx},'${v.id}')">${marketingOk?tr('Опубликовать за','Publish for'):tr('⚠️ Рискнуть без подготовки за','⚠️ Risk it unprepared for')} ${fmt(cost)}</button></div>
    </div>`;
  }).join('');
  return `
    <div class="card-sub" style="margin-bottom:10px;">${tr('Виральный пост резко разгоняет трафик, но удержать внимание может только прокачанный маркетинг. Не дотянул — пост проваливается, деньги на продвижение потрачены впустую. Слишком частые виральные попытки быстро выгорают у аудитории.','A viral post spikes traffic hard, but only a leveled-up Marketing track can hold that attention. Fall short and the post flops — the promo spend is wasted. Too many viral attempts too fast and readers burn out on it.')}</div>
    ${fatigueWarn}
    ${rows}`;
}
function buildTrendHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='social') return '';
  const fatigue = trendFatigueCount(site);
  const active = site.trendUntil && Date.now() < site.trendUntil;
  if(active){
    const toxic = site.trendMult < 0;
    const secsLeft = Math.max(0, Math.ceil((site.trendUntil-Date.now())/1000));
    return `
      <div class="card glass" style="${toxic?'border:1px solid rgba(255,69,58,.4);background:rgba(255,69,58,.08);':''}">
        <div class="card-title">${toxic?'☣️ '+tr('Тренд захлебнулся','Trend spiraled'):'📈 '+tr('Тренд раскручивается','Trend is taking off')}</div>
        <div class="card-sub" style="${toxic?'color:#ff453a;':''}">${toxic?tr('Не хватило модераторов — ленту заполнил спам и токсичность','Not enough moderators — the feed filled with spam and toxicity'):tr('Новые пользователи прибывают','New users are flooding in')} · ${tr('доход','income')} ×${site.trendMult.toFixed(2)} · ${secsLeft}${tr('с','s')}</div>
      </div>`;
  }
  const fatigueWarn = fatigue>=2 ? `<div class="card-sub" style="color:#ff9f0a;margin-bottom:8px;">⚠️ ${tr('Юзеры устали от трендов подряд — следующий дороже и слабее','Users are trend-fatigued — the next one costs more and pays off less')}</div>` : '';
  const rows = TREND_TIERS.map(t2=>{
    const cost = trendCost(type, t2, fatigue);
    const staffOk = site.employees >= t2.requiredEmployees;
    return `<div class="card glass" style="margin-bottom:8px;">
      <div class="card-row">
        <div class="card-icon">📈</div>
        <div style="flex:1">
          <div class="card-title">${tr('Тренд/челлендж','Trend/challenge')} — ${t2.id==='small'?tr('малый','small'):t2.id==='medium'?tr('средний','medium'):tr('крупный','big')}</div>
          <div class="card-sub">${tr('Нужно модераторов','Needs moderators (staff)')} ≥${t2.requiredEmployees} — ${staffOk?'✅ '+tr('хватает','ready'):`❌ ${tr('сейчас','currently')} ${site.employees}`}</div>
        </div>
      </div>
      <div class="btn-row"><button class="btn ${staffOk?'btn-cyan':'btn-outline'} btn-block aff-btn" data-aff-cost="${cost}" ${state.cash<cost?'disabled':''} onclick="launchTrend(${idx},'${t2.id}')">${staffOk?tr('Запустить за','Launch for'):tr('⚠️ Рискнуть без модераторов за','⚠️ Risk it understaffed for')} ${fmt(cost)}</button></div>
    </div>`;
  }).join('');
  return `
    <div class="card-sub" style="margin-bottom:10px;">${tr('Тренд приводит волну новых пользователей, но с ней должны справляться модераторы (наёмные сотрудники). Не хватит рук — ленту зальёт спам и токсичность вместо роста. Слишком частые тренды подряд быстро выгорают у аудитории.','A trend brings a wave of new users, but hired moderators (staff) have to keep up with it. Not enough hands and the feed floods with spam and toxicity instead of growth. Too many trends back to back and the audience burns out on it.')}</div>
    ${fatigueWarn}
    ${rows}`;
}
function buildFreeTierHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  if(tierIdOf(type.id)!=='saas') return '';
  const level = site.freeTierLevel||0;
  const rows = [0,1,2,3].map(lvl=>{
    const active = level===lvl;
    const ft = lvl>0 ? FREE_TIER_LEVELS[lvl-1] : null;
    const infraOk = ft ? site.tracks.infra >= ft.requiredInfra : true;
    const label = lvl===0 ? tr('Выключено','Off') : `${tr('Уровень','Level')} ${lvl} (+${Math.round((ft.incomeMult-1)*100)}% ${tr('юзеров','users')})`;
    return `<button class="btn ${active?'btn-cyan':'btn-outline'} btn-block" style="margin-bottom:6px;${lvl>0&&!infraOk?'border-color:rgba(255,69,58,.5);':''}" onclick="setFreeTierLevel(${idx},${lvl})">${active?'● ':''}${label}${lvl>0?` · Infra ≥${ft.requiredInfra} ${infraOk?'✅':'❌'}`:''}</button>`;
  }).join('');
  const ft = level>0 ? FREE_TIER_LEVELS[level-1] : null;
  const status = level>0
    ? (site.tracks.infra >= ft.requiredInfra
        ? `<div class="card-sub" style="color:#32d74b;">${tr('Серверы справляются — рост дохода идёт стабильно, но упкип за инфраструктуру списывается каждую секунду','Servers are keeping up — steady income growth, but infra upkeep is billed every second')}</div>`
        : `<div class="card-sub" style="color:#ff453a;">🔥 ${tr('Серверов не хватает — тариф просто жжёт деньги без роста, пока не прокачаете Infra','Not enough Infra — the tier is just burning cash with no growth until you upgrade it')}</div>`)
    : '';
  return `
    <div class="card-sub" style="margin-bottom:10px;">${tr('Расширенный бесплатный тариф — это переключатель, не разовая акция: пока он включён, каждую секунду списывается упкип за серверы (трек «Инфраструктура»). Хватает мощности — растёт доход. Не хватает — тариф просто сжигает деньги.','The expanded free tier is a toggle, not a one-shot campaign: while it\'s on, server upkeep (Infra track) is billed every second. Enough capacity and income grows. Not enough and the tier just burns cash.')}</div>
    ${rows}
    ${status}`;
}
function buildAdsHtml(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  cleanupSiteAds(site);
  const slots = adSlotsForSite(site);
  const cells = Array.from({length:slots}, (_,i)=>{
    const ad = site.ads[i];
    if(ad){
      const meta = findSlotType(ad.typeId);
      const secsLeft = Math.max(0, Math.ceil((ad.expiresAt-Date.now())/1000));
      const isAd = meta.category==='ad';
      const effectTxt = isAd ? `−${Math.round(meta.penalty*100)}%` : `+${Math.round(meta.incomeBonus*100)}%`;
      return `<div class="card glass ad-slot${isAd?'':' product-slot'}">
        <div class="card-row">
          <div class="card-icon">${meta.icon}</div>
          <div style="flex:1">
            <div class="card-title">${L(meta,'name')}</div>
            <div class="card-sub">${tr('доход','income')} ${effectTxt} · <span id="sv-ad-timer-${ad.id}">${secsLeft}${tr('с','s')}</span></div>
          </div>
        </div>
      </div>`;
    }
    return `<div class="card glass ad-slot ad-slot-empty" onclick="openAdPickerModal(${idx})">
      <div class="card-row">
        <div class="card-icon">➕</div>
        <div style="flex:1">
          <div class="card-title">${tr('Свободный слот','Free slot')}</div>
          <div class="card-sub">${tr('Реклама или товары','Ads or products')}</div>
        </div>
      </div>
    </div>`;
  }).join('');
  const penaltyPct = Math.round((1-adPenaltyMultiplier(site))*100);
  const bonusPct = Math.round((productBonusMultiplier(site)-1)*100);
  const nextSlotHint = slots<4 ? `<div class="card-sub" style="padding:2px 4px 0;">${tr('Ещё слот откроется на следующем этапе обновления','Another slot unlocks at the next renovation stage')}</div>` : '';
  return `<div class="ad-slots-grid">${cells}</div>
    ${penaltyPct>0?`<div class="card-sub" style="padding:0 4px 2px;">📉 ${tr('Просадка от рекламы','Ad income hit')}: −${penaltyPct}%</div>`:''}
    ${bonusPct>0?`<div class="card-sub" style="padding:0 4px 4px;">📈 ${tr('Бонус от товаров','Product income bonus')}: +${bonusPct}%</div>`:''}
    ${nextSlotHint}`;
}
function buildEmployeesCardHtml(idx){
  const site = state.sites[idx];
  const cap = employeeCap(site);
  ensureStaffLevels(site); ensureStaffFatigue(site); ensureStaffVacation(site); ensureStaffSpecs(site);
  let empDots = '';
  for(let i=0;i<cap;i++){
    const lv = site.staffLevels[i];
    const onVac = i<site.employees && isOnVacation(site,i);
    const spec = i<site.employees ? specMeta(site.staffSpecs[i]) : null;
    const title = lv ? `${tr(empLevelMeta(lv).name, empLevelMeta(lv).nameEn)}${spec?' · '+tr(spec.name,spec.nameEn):''}${onVac?' — '+tr('в отпуске','on vacation'):''}` : '';
    const specColor = spec ? TRACK_META[spec.trackKey].color : '';
    const dotStyle = (i<site.employees && !onVac && spec) ? ` style="background:${specColor};border-color:${specColor};"` : '';
    empDots += `<div class="emp-dot ${i<site.employees?'filled':''}${onVac?' on-vacation':''}" title="${esc(title)}"${dotStyle}></div>`;
  }
  const empCost = employeeHireCost(site, 1);
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const monthly = site.staffLevels.reduce((s,lv)=>s+employeeSalary(type, lv),0);
  const dreamTeam = dreamTeamActive(site);
  const dreamTeamBanner = dreamTeam
    ? `<div class="card-sub" style="color:#ffd60a;margin-top:4px;">👥 ${tr('Команда мечты','Dream team')}: +${Math.round((DREAM_TEAM_INCOME_MULT-1)*100)}% ${tr('доход','income')}, +${Math.round((DREAM_TEAM_STAFF_MULT-1)*100)}% ${tr('к сотрудникам','staff')}</div>`
    : '';
  return `
    <div class="card-row">
      <div class="card-icon">👤</div>
      <div style="flex:1">
        <div class="card-title">Сотрудники ${site.employees}/${cap}</div>
        <div class="card-sub">Уровень нанятого определяет прибавку к доходу и зарплату, специализация усиливает конкретный трек. Зарплата ${fmt(monthly)} за период спишется в общем платёжном дне. Больше слотов — прокачивайте инфраструктуру.</div>
        <div class="emp-dots">${empDots}</div>
        ${dreamTeamBanner}
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-outline btn-block" ${site.employees<=0?'disabled':''} onclick="openStaffModal(${idx})">👀 Усталость и отпуск</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-violet btn-block${site.employees<cap?' aff-btn':''}" ${site.employees<cap?`data-aff-cost="${empCost}"`:''} ${state.cash<empCost||site.employees>=cap?'disabled':''} onclick="hireForSite(${idx})">${site.employees>=cap ? tr('Нет места для сотрудников','No room for employees') : tr('Нанять — от','Hire — from')+' '+fmt(empCost)}</button>
    </div>`;
}
// View-employees modal: per-slot fatigue meter + a "send on vacation" action.
// Fatigue quietly eats into that employee's income contribution (see
// staffStatBonus()); vacation resets it to 0 but costs upfront pay and takes
// the employee off duty for VACATION_DAYS in-game days.
/* ---------- ITEM 13: bulk vacation ----------
   Sending employees on vacation one at a time got tedious on a big staff.
   This adds a checkbox per non-vacationing employee plus "select all" /
   "send selected" controls that pay every chosen vacation cost in a single
   confirm, on top of the existing per-employee sendEmployeeOnVacation(). */
function eligibleVacationIndices(site){
  const out = [];
  for(let i=0;i<site.employees;i++) if(!isOnVacation(site,i)) out.push(i);
  return out;
}
function confirmBulkVacation(idx, empIdxArr){
  const site = state.sites[idx];
  if(!site || !empIdxArr.length){ toast(tr('Нечего отправлять в отпуск','Nothing to send on vacation')); return; }
  let total = 0;
  empIdxArr.forEach(i=>{ total += vacationCost(site,i); });
  openModal(`<h3>🏖️ ${tr('Отправить в отпуск','Send on vacation')}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:14px;">${tr(`Сотрудников: <b>${empIdxArr.length}</b>. Общие отпускные: <b>${fmt(total)}</b>.`,`Employees: <b>${empIdxArr.length}</b>. Total vacation pay: <b>${fmt(total)}</b>.`)}</p>
    <div class="btn-row"><button class="btn btn-outline btn-block" onclick="openStaffModal(${idx})">${tr('Отмена','Cancel')}</button><button class="btn btn-cyan btn-block" ${state.cash<total?'disabled':''} onclick="applyBulkVacation(${idx},'${empIdxArr.join(',')}')">${tr('Отправить','Send')}</button></div>`);
}
function applyBulkVacation(idx, empIdxCsv){
  const site = state.sites[idx];
  if(!site) return;
  ensureStaffLevels(site); ensureStaffFatigue(site); ensureStaffVacation(site);
  const empIdxArr = String(empIdxCsv).split(',').filter(x=>x!=='').map(Number);
  let total = 0;
  empIdxArr.forEach(i=>{ if(i<site.employees && !isOnVacation(site,i)) total += vacationCost(site,i); });
  if(state.cash < total){ toast(tr('Недостаточно средств','Not enough cash')); playSound('error'); return; }
  state.cash -= total;
  let sent = 0;
  empIdxArr.forEach(i=>{
    if(i>=site.employees || isOnVacation(site,i)) return;
    site.staffFatigue[i] = 0;
    site.staffVacationUntil[i] = state.day + VACATION_DAYS;
    sent++;
  });
  log(`🏖️ ${tr('Массовый отпуск','Bulk vacation')}: «${esc(site.name)}» — ${sent} ${tr('сотрудников','employees')} (${fmt(total)})`);
  toast(`🏖️ ${tr('Отпуск оплачен','Vacation paid')} — ${fmt(total)}`);
  playSound('buy');
  maybeAnnounceDreamTeam(site);
  refreshSiteViewSections(idx, ['employees']);
  if(document.getElementById('staff-modal-body')) openModal(buildStaffModalHtml(idx));
  requestAnimationFrame(()=>{ renderAll(); save(); });
}
function sendAllOnVacationClick(idx){
  const site = state.sites[idx];
  if(!site) return;
  confirmBulkVacation(idx, eligibleVacationIndices(site));
}
function sendSelectedOnVacationClick(idx){
  const boxes = document.querySelectorAll('.staff-vac-check:checked');
  const arr = Array.from(boxes).map(b=>parseInt(b.getAttribute('data-idx'),10)).filter(n=>!isNaN(n));
  confirmBulkVacation(idx, arr);
}
function buildStaffModalHtml(idx){
  const site = state.sites[idx];
  if(!site) return '';
  ensureStaffLevels(site); ensureStaffFatigue(site); ensureStaffVacation(site); ensureStaffSpecs(site);
  const rows = [];
  for(let i=0;i<site.employees;i++){
    const lv = site.staffLevels[i];
    const meta = empLevelMeta(lv);
    const spec = specMeta(site.staffSpecs[i]);
    const stars = '⭐'.repeat(lv);
    const fatigue = site.staffFatigue[i]||0;
    const onVac = isOnVacation(site,i);
    const vacLeft = onVac ? site.staffVacationUntil[i]-state.day : 0;
    const cost = vacationCost(site,i);
    const hue = Math.round(120 - Math.min(100,fatigue)*1.2);
    const specBonusPct = Math.round(SPEC_TRACK_BONUS * 100);
    const checkbox = onVac ? '' : `<input type="checkbox" class="staff-vac-check" data-idx="${i}">`;
    rows.push(`<div class="card glass" style="margin-bottom:10px;">
      <div class="card-row">
        ${checkbox}
        <div class="card-icon">${onVac?'🏖️':meta.icon}</div>
        <div style="flex:1">
          <div class="card-title">${tr(meta.name,meta.nameEn)} <span style="opacity:.55;font-weight:400;">#${i+1}</span></div>
          <div class="card-sub">${spec.icon} ${tr(spec.name,spec.nameEn)} · +${specBonusPct}% ${TRACK_META[spec.trackKey].icon} <span style="letter-spacing:1px;">${stars}</span></div>
          <div class="card-sub">${onVac ? tr(`В отпуске — ещё ${vacLeft} дн.`,`On vacation — ${vacLeft}d left`) : `${tr('Усталость','Fatigue')}: ${fatigue}%${fatigue>=FATIGUE_MAX?' ⚠️':''}`}</div>
          <div class="fatigue-bar" style="margin-top:6px;"><div style="width:${onVac?0:fatigue}%;background:hsl(${hue},70%,50%);"></div></div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-outline btn-block" ${onVac||state.cash<cost?'disabled':''} onclick="sendEmployeeOnVacation(${idx},${i})">${onVac?`🏖️ ${tr('В отпуске','On vacation')}`:`🏖️ ${tr('В отпуск за','Send on vacation for')} ${fmt(cost)}`}</button>
        <button class="btn btn-red btn-block" onclick="confirmFireEmployee(${idx},${i})">🚪 ${tr('Уволить','Fire')}</button>
      </div>
    </div>`);
  }
  const dreamTeamHint = dreamTeamActive(site)
    ? `<div class="card glass" style="margin-bottom:12px;border-color:rgba(255,214,10,.4);background:rgba(255,214,10,.08);"><div class="card-sub" style="color:#ffd60a;">👥 ${tr('Команда мечты собрана','Dream team assembled')} — +${Math.round((DREAM_TEAM_INCOME_MULT-1)*100)}% ${tr('доход','income')}, +${Math.round((DREAM_TEAM_STAFF_MULT-1)*100)}% ${tr('к сотрудникам','staff')}</div></div>`
    : '';
  const eligibleCount = eligibleVacationIndices(site).length;
  const bulkControls = site.employees>1 ? `<div class="btn-row" style="margin-bottom:10px;">
      <button class="btn btn-outline btn-block" onclick="sendSelectedOnVacationClick(${idx})">☑️ ${tr('Выбранных в отпуск','Send selected')}</button>
      <button class="btn btn-cyan btn-block" ${eligibleCount?'':'disabled'} onclick="sendAllOnVacationClick(${idx})">🏖️ ${tr('Всех в отпуск','Send all')}</button>
    </div>` : '';
  return `<h3>👥 ${tr('Сотрудники','Employees')} — ${esc(site.name)}</h3>
    <p style="color:var(--dim);font-size:12.5px;margin-bottom:12px;">${tr('Усталость снижает вклад сотрудника в доход. Отпуск сбрасывает усталость, но нужно оплатить отпускные и подождать, пока сотрудник вернётся. По одному специалисту каждого профиля разом — «Команда мечты».','Fatigue lowers an employee income contribution. Vacation resets it, but needs upfront pay and time away. One specialist of every profile at once forms a "Dream team".')}</p>
    ${dreamTeamHint}
    ${bulkControls}
    <div id="staff-modal-body">${rows.join('') || `<p style="color:var(--dim);">${tr('Нет сотрудников','No employees')}</p>`}</div>`;
}
function openStaffModal(idx){ openModal(buildStaffModalHtml(idx)); }
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
    <div class="section-title">🛠️ ${tr('Обновление сайта','Site renovation')}${stage>0?` · ${tr('этап','stage')} ${stage}/${RENOVATION_MAX_STAGE}`:` · 0/${RENOVATION_MAX_STAGE}`} <span class="pill" style="background:rgba(10,132,255,.15);color:var(--blue);">🔷 <span id="sv-renovation-pts">${Math.floor(site.specPoints||0)}</span></span></div>
    <div class="card glass" style="${ready?'border-color:rgba(48,209,88,.4);background:rgba(48,209,88,.08);':''}">
      <div class="card-title">${tr('Следующий этап','Next stage')}: +${RENOVATION_CAP_BONUS} ${tr('к потолку уровня треков','to track level cap')}</div>
      <div class="card-sub">${statusLine}</div>
      <div class="progress-bar" style="margin:8px 0;"><div style="width:${staffPct}%;"></div></div>
      <div class="card-sub">👥 ${tr('Персонал','Staff')}: ${site.employees}/${needStaff} · 💸 ${tr('после обновления зарплаты дешевле на','after the update salaries drop by')} ${Math.round((1-RENOVATION_SALARY_DECAY)*100)}% · 📈 +${Math.round(RENOVATION_INCOME_BONUS*100)}% ${tr('к доходу навсегда','to income forever')}</div>
      <div class="btn-row"><button class="btn btn-green btn-block" ${ready&&(site.specPoints||0)>=cost?'':'disabled'} onclick="renovateSite(${idx})">${tr('Обновить за','Renovate for')} 🔷 ${cost}</button></div>
    </div>`;
}
function buildHybridHtml(idx){
  const eligible = eligibleHybridRecipes(idx);
  if(!eligible.length) return '';
  return `
    <div class="section-title">${tr('🧬 Доступен гибридный рецепт','🧬 Hybrid recipe available')}</div>
    ${eligible.map(({recipe,partnerIdx})=>{
      const cost = Math.round(recipe.baseCost*0.5);
      return `<div class="card glass" style="border-color:rgba(191,90,242,.4);background:rgba(191,90,242,.08);">
        <div class="card-title">${recipe.icon} ${tr(recipe.name,recipe.nameEn)}</div>
        <div class="card-sub">${tr(recipe.desc,recipe.descEn)}</div>
        <div class="btn-row"><button class="btn btn-violet btn-block" ${state.cash<cost?'disabled':''} onclick="craftHybrid(${idx},${partnerIdx},'${recipe.id}')">${tr(`Создать за ${fmt(cost)}`,`Create for ${fmt(cost)}`)}</button></div>
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
        <span>${site.autoManager?`<span class="fx-spin" style="display:inline-block;">🤖</span> `:''}Авто-найм и авто-прокачка на этом сайте</span>
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
    <div class="section-title">${tr('Отзывы посетителей','Visitor reviews')}</div>
    ${reviews.map(r=>`<div class="card glass review-card">
      <div class="review-head"><b>${tr(r.name,r.nameEn)}</b><span class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span></div>
      <div class="review-body">${tr(r.text,r.textEn)}</div>
    </div>`).join('')}`;
}
function buildSiteView(idx){
  const site = state.sites[idx];
  const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
  const vis = SITE_VISUAL[tierIdOf(type.id)];
  const income = siteIncome(type, site) * (1+estateBonusTotal()) * (1+reputationBonus());
  const slug = slugify(site.name);
  const boostActive = site.boostUntil && Date.now() < site.boostUntil;
  const boostSecsLeft = boostActive ? Math.ceil((site.boostUntil-Date.now())/1000) : 0;
  const boostCost = Math.round(type.baseCost * BOOST_COST_MULT);
  const monModel = MONETIZATION_MODELS.find(m=>m.id===site.monetization);
  const monetizationBadge = monModel ? `${monModel.icon} ${L(monModel,'name')}` : `— ${tr('не указана','not set')}`;

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

      <div class="stat-strip" style="grid-template-columns:1fr 1fr 1fr;margin:0 0 6px;">
        <div class="stat-box glass"><div class="lbl">Доход сайта</div><div class="val num c-green"><span id="sv-income-val">${fmt(income)}/с</span><span id="sv-boost-badge" class="boost-badge" style="${boostActive?'':'display:none;'}">📢 x1.5 · ${boostSecsLeft}с</span></div></div>
        <div class="stat-box glass"><div class="lbl">${tr('Тип бизнеса','Business type')}</div><div class="val" style="font-size:13px;">${tr(type.name,type.nameEn)}</div></div>
        <div class="stat-box glass"><div class="lbl">Монетизация</div><div class="val" style="font-size:13px;">${monetizationBadge}</div></div>
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

      ${tierIdOf(type.id)==='shop' ? `<div class="section-title">🏷️ Скидочная акция</div>
      <div id="sv-discount">${buildDiscountHtml(idx)}</div>` : ''}
      ${tierIdOf(type.id)==='blog' ? `<div class="section-title">🚀 Виральный пост</div>
      <div id="sv-viral">${buildViralHtml(idx)}</div>` : ''}
      ${tierIdOf(type.id)==='social' ? `<div class="section-title">📈 Тренд/челлендж</div>
      <div id="sv-trend">${buildTrendHtml(idx)}</div>` : ''}
      ${tierIdOf(type.id)==='saas' ? `<div class="section-title">🆓 Бесплатный тариф</div>
      <div id="sv-freetier">${buildFreeTierHtml(idx)}</div>` : ''}
      ${CAMPAIGN_DEFS[tierIdOf(type.id)] ? `<div class="section-title">${CAMPAIGN_DEFS[tierIdOf(type.id)].icon} ${L(CAMPAIGN_DEFS[tierIdOf(type.id)],'title')}</div>
      <div id="sv-campaign">${buildCampaignHtml(idx)}</div>` : ''}
      ${DIAL_DEFS[tierIdOf(type.id)] ? `<div class="section-title">${DIAL_DEFS[tierIdOf(type.id)].icon} ${L(DIAL_DEFS[tierIdOf(type.id)],'title')}</div>
      <div id="sv-dial">${buildDialHtml(idx)}</div>` : ''}

      <div class="section-title">Ветки прокачки</div>
      <div id="sv-tracks">${buildTracksHtml(idx)}</div>

      ${typeIsWebsite(type) ? `<div class="section-title">🌐 ${tr('Хостинг и домен','Hosting & domain')}</div>
      <div id="sv-hosting-wrap">${buildHostingPlanHtml(idx)}</div>` : ''}

      <div class="section-title">Реклама</div>
      <div id="sv-ads">${buildAdsHtml(idx)}</div>

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
        <div id="sv-investor">${buildInvestorHtml(idx)}</div>
        <div id="sv-content">${buildContentHtml(idx)}</div>
        <div id="sv-platforms">${buildPlatformsHtml(idx)}</div>
        <div id="sv-ipo">${buildIpoHtml(idx)}</div>
        <div id="sv-renovation">${buildRenovationHtml(idx)}</div>
        <div id="sv-merge">${buildMergeHtml(idx)}</div>
        <div id="sv-hybrid">${buildHybridHtml(idx)}</div>
        <div id="sv-reviews">${buildReviewsHtml(idx)}</div>
      </div>

      <div class="section-title">${tr('Продажа бизнеса','Selling a business')}</div>
      <div class="card glass" style="border-color:rgba(255,69,58,.25);">
        <div class="card-row">
          <div class="card-icon">📬</div>
          <div style="flex:1">
            <div class="card-title">${tr('Продать напрямую нельзя','No direct sale')}</div>
            <div class="card-sub">${tr('Покупатели сами присылают предложения на почту (вкладка «Уведомления») — там же можно принять или отклонить сделку','Buyers send their own offers to your mail (the "Notifications" tab) — accept or decline the deal there')}</div>
          </div>
        </div>
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
  ensureStaffLevels(site); for(let e=0; e<site.employees; e++) invested += Math.round(EMPLOYEE_BASE_COST * Math.pow(1.35, e) * empLevelMeta(site.staffLevels[e]||1).salaryMult * difficultyCostMult());
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
  if(sections.includes('tracks')){ set('sv-tracks', buildTracksHtml(idx)); set('sv-renovation', buildRenovationHtml(idx)); set('sv-merge', buildMergeHtml(idx)); set('sv-hybrid', buildHybridHtml(idx)); set('sv-synergy', buildSynergyHtml(idx)); set('sv-ads', buildAdsHtml(idx)); set('sv-discount', buildDiscountHtml(idx)); set('sv-viral', buildViralHtml(idx)); set('sv-freetier', buildFreeTierHtml(idx)); set('sv-campaign', buildCampaignHtml(idx)); set('sv-dial', buildDialHtml(idx)); if(!state.sites[idx].ipoed) set('sv-ipo', buildIpoHtml(idx)); }
  if(sections.includes('discount')) set('sv-discount', buildDiscountHtml(idx));
  if(sections.includes('hosting')) set('sv-hosting-wrap', buildHostingPlanHtml(idx));
  if(sections.includes('viral')) set('sv-viral', buildViralHtml(idx));
  if(sections.includes('trend')) set('sv-trend', buildTrendHtml(idx));
  if(sections.includes('freetier')) set('sv-freetier', buildFreeTierHtml(idx));
  if(sections.includes('campaign')) set('sv-campaign', buildCampaignHtml(idx));
  if(sections.includes('dial')) set('sv-dial', buildDialHtml(idx));
  if(sections.includes('renovation')){ set('sv-renovation', buildRenovationHtml(idx)); set('sv-ads', buildAdsHtml(idx)); }
  if(sections.includes('ads')) set('sv-ads', buildAdsHtml(idx));
  if(sections.includes('page')) set('sv-page', buildPageMockupHtml(idx));
  if(sections.includes('ailab')) set('sv-ailab', buildAiLabHtml(idx));
  if(sections.includes('employees')){ set('sv-employees', buildEmployeesCardHtml(idx)); set('sv-trend', buildTrendHtml(idx)); set('sv-campaign', buildCampaignHtml(idx)); set('sv-dial', buildDialHtml(idx)); }
  if(sections.includes('traffic')) set('sv-traffic', buildTrafficHtml(idx));
  if(sections.includes('reviews')) set('sv-reviews', buildReviewsHtml(idx));
  if(sections.includes('stagepill')) set('sv-stage-pill', buildStagePillHtml(idx));
  if(sections.includes('insurance')) set('sv-insurance', buildInsuranceHtml(idx));
  if(sections.includes('investor')) set('sv-investor', buildInvestorHtml(idx));
  if(sections.includes('content')) set('sv-content', buildContentHtml(idx));
  if(sections.includes('platforms')) set('sv-platforms', buildPlatformsHtml(idx));
  if(sections.includes('automgr')) set('sv-automgr', buildAutoManagerHtml(idx));
  if(sections.includes('ipo')) set('sv-ipo', buildIpoHtml(idx));
  if(sections.includes('title')){
    const site = state.sites[idx];
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    const vis = SITE_VISUAL[tierIdOf(type.id)];
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
// Shop screen filter by vertical (sites/apps/neural/all) — purely a UI
// convenience for browsing the merged 60-business catalog, not saved state.
let shopVerticalFilter = 'all';
function setShopVertical(v){ shopVerticalFilter = v; renderSites(); }
// Sub-filter shown only inside the "Бизнес" tab, to pick a specific
// vertical flavor (Сайты/Приложения/Нейросети) without needing a separate
// top-level tab for each — also purely a UI convenience, not saved state.
let shopBusinessVertical = 'all';
function setShopBusinessVertical(v){ shopBusinessVertical = v; renderSites(); }
// Sub-filter shown only inside the "Индустрия" tab, to narrow down to one
// industry section (Энергетика/Добыча/Производство/Тяжёлая пром-ть) — same
// pattern as shopBusinessVertical above, purely a UI convenience.
let shopIndustrySub = 'all';
function setShopIndustrySub(v){ shopIndustrySub = v; renderSites(); }
let tickCount = 0;
let cachedNwNow = 0;
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
  ['sound','progress','social','data'].forEach(t=>{
    const btn = document.getElementById('settingstab-'+t);
    const panel = document.getElementById('settings-panel-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
    if(panel) panel.style.display = (t===tab) ? '' : 'none';
  });
}
const NAV_SCREEN_ORDER = ['dash','sites','market','estate','inbox','settings'];
function nav(screen){
  // CLEANUP (3): wires fx-slide-left-in / fx-slide-right-in — direction
  // depends on whether the tapped tab sits to the right or left of the
  // current one in the bottom nav, so switching feels like moving along a
  // strip of screens instead of a plain cut. Only skips the animation (not
  // the render) when re-navigating to the same screen — nav('dash') is also
  // how the very first render after boot happens (see enterGame()), so a
  // full early-return here would leave the dashboard blank on load.
  const changed = screen !== activeScreen;
  const fromIdx = NAV_SCREEN_ORDER.indexOf(activeScreen), toIdx = NAV_SCREEN_ORDER.indexOf(screen);
  const dirClass = toIdx>fromIdx ? 'fx-slide-left-in' : 'fx-slide-right-in';
  activeScreen = screen;
  if(screen==='market') bumpQuest('visit_market');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.screen===screen));
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id==='screen-'+screen));
  renderScreenList(screen); // refresh immediately so switching tabs never shows stale data
  if(changed) fxId('screen-'+screen, dirClass);
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

  el.style.display = '';
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
      <button class="btn ${debt>0?'btn-outline':'btn-amber'}" style="padding:9px 14px;" onclick="event.stopPropagation();openLoanModal()">${debt>0?tr('Управлять','Manage'):tr('Взять кредит','Take a loan')}</button>
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
  const dur = 260;
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
  const r = keptRank(nw);
  document.getElementById('header-rank').textContent = `${r.icon} ${L(r,'title')}`;
  animateNumberText(document.getElementById('header-cash'), state.cash);
}
// BUGFIX: these five numbers (net worth, cash, income/sec, portfolio,
// reputation) used to only refresh inside renderDash(), which tick() only
// calls when activeScreen==='dash'. header-cash, by contrast, refreshes
// every single tick regardless of screen. Result: leave the Dashboard tab
// (e.g. go upgrade a site), come back, and header-cash shows the correct
// up-to-date total while "Наличные"/"Доход/сек"/"Чистые активы" are still
// showing whatever they were the moment you left — until the next full
// renderDash() call catches them up. Pulling these into their own cheap,
// always-run function closes that gap so they can never drift from the
// header.
// PERF: this touched 5 DOM nodes and recomputed totalIncomePerSec()/
// reputationTotal() 5x/sec unconditionally, even on screens where the dash
// isn't visible (its nodes stay in the DOM behind .screen.active, they just
// don't show) — sibling live-updaters (updateMarketLive, updateEstateLive,
// updateFinanceLive) all guard on activeScreen already; this one was missing
// that guard.
function updateDashStatsLive(nw){
  if(activeScreen!=='dash') return;
  if(nw===undefined) nw = netWorth();
  const ips = totalIncomePerSec();
  animateNumberText(document.getElementById('worth-val'), nw);
  document.getElementById('worth-delta').textContent = '+'+fmt(ips)+tr('/сек','/sec');
  animateNumberText(document.getElementById('stat-cash'), state.cash);
  document.getElementById('stat-income').textContent = fmt(ips)+'/с';
  document.getElementById('stat-stocks').textContent = fmt(stocksValue());
  const repEl = document.getElementById('stat-rep');
  const repNow = reputationTotal();
  // CLEANUP (3): wires fx-num-jump — last of the ~42 previously-unused
  // fx-* animations. Only fires on an actual change (tracked via a
  // dataset attribute on the element itself) so it doesn't restart on
  // every render while reputation sits still.
  if(repEl){
    if(repEl.dataset.rep!==undefined && Number(repEl.dataset.rep)!==repNow) fx(repEl,'fx-num-jump');
    repEl.dataset.rep = repNow;
    repEl.textContent = `${currentReputationTier().icon} ${repNow}`;
  }
}
function renderDash(nw){
  if(nw===undefined) nw = netWorth();
  const avatar = (state.ceo && state.ceo.avatar) ? state.ceo.avatar+' ' : '';
  document.getElementById('dash-sub').textContent = `${avatar}CEO ${state.ceoName} · ${tr('День','Day')} ${state.day} · ${state.sites.length}/${maxSiteSlots(nw)} ${tr('слотов занято','slots used')}`;
  document.getElementById('dash-global-event').innerHTML = buildGlobalEventBannerHtml();
  updateDashStatsLive(nw);
  renderRebirthCard(nw);

  const svg = document.getElementById('worth-svg');
  svg.innerHTML = `<path d="${sparklinePath(state.netWorthHistory,300,56)}" fill="none" stroke="#30d158" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

  const rIdx = keptRankIndex(nw);
  const r = RANKS[rIdx];
  const next = RANKS[rIdx+1];
  document.getElementById('rank-icon').textContent = r.icon;
  document.getElementById('rank-title').textContent = L(r,'title');
  if(next){
    const span = next.min-r.min;
    // Math.max(0,...) — если ранг сохранён выше того, что дают текущие
    // активы (см. keptRankIndex), nw может быть меньше r.min; без этого
    // прогресс-бар ушёл бы в отрицательную ширину.
    const prog = Math.max(0, Math.min(100, Math.round(((nw-r.min)/span)*100)));
    document.getElementById('rank-next').textContent = `${tr('До ранга','To rank')} «${L(next,'title')}»: ${fmt(Math.max(0, next.min-nw))}`;
    document.getElementById('rank-progress').style.width = prog+'%';
  } else {
    document.getElementById('rank-next').textContent = tr('Максимальный ранг достигнут','Maximum rank reached');
    document.getElementById('rank-progress').style.width = '100%';
  }
  refreshDailyQuestCard();
  renderNextUnlockCard(nw);
  renderSmartTipCard();
  renderTechRegionSummary();
  let seasonTargetVal;
  try{ seasonTargetVal = seasonTarget(currentSeasonTheme(state.seasonEvent.weekKey)); }catch(e){ /* season system not ready yet on first render */ }
  renderSeasonCard(seasonTargetVal);
  renderTaxCard();
  renderPayrollCard();
  renderHostingCard();
  renderNeuralLabCard();
  renderAiMaintCard();
  renderTrainingCard();
  updateDashAdvancedBadge(nw, seasonTargetVal);
}
// The rank/rebirth/finance/history group is collapsed by default (see
// toggleDashAdvanced), so anything actionable inside it — a rebirth
// that's ready, an unclaimed season reward — needs a visible cue on the
// collapsed toggle itself, or collapsing it would silently hide state
// the player used to see at a glance.
// A close, concrete goal beats an abstract growing number — shows the
// cheapest not-yet-unlocked business type and exactly how much net worth
// stands between the player and it. Hidden once everything is unlocked.
function renderNextUnlockCard(nw){
  const el = document.getElementById('next-unlock-card');
  if(!el) return;
  const owned = new Set(state.sites.map(s=>s.typeId));
  // [Пункт 2] HYBRID_TYPES не открываются чистыми активами — они собираются
  // через craftHybrid() по уровню трека (requiredTrackLevel), поэтому у них
  // unlockNetWorth:Infinity как "неприменимо". Раньше это исключение не
  // учитывалось здесь: если из всех net-worth-бизнесов уже куплено всё,
  // виджет "следующее открытие" хватал ближайший гибрид с unlockNetWorth
  // Infinity и показывал "нужно ещё $InfinityT" — сумму, которую физически
  // невозможно заработать. Теперь гибриды сюда не попадают вовсе.
  const NW_UNLOCKABLE = ALL_BUSINESS_TYPES.filter(t=>t.category!=='hybrid');
  const locked = NW_UNLOCKABLE
    .filter(t=>!owned.has(t.id) && t.unlockNetWorth > nw)
    .sort((a,b)=>a.unlockNetWorth-b.unlockNetWorth)[0];
  if(!locked){ el.style.display = 'none'; return; }
  el.style.display = '';
  const prevThreshold = NW_UNLOCKABLE.filter(t=>t.unlockNetWorth <= nw).reduce((m,t)=>Math.max(m,t.unlockNetWorth),0);
  const span = Math.max(1, locked.unlockNetWorth - prevThreshold);
  const prog = Math.min(100, Math.round(((nw-prevThreshold)/span)*100));
  document.getElementById('next-unlock-icon').textContent = locked.icon;
  document.getElementById('next-unlock-title').textContent = `${tr('Открывается','Unlocks')}: ${L(locked,'name')}`;
  document.getElementById('next-unlock-sub').textContent = `${tr('Нужно ещё','Still need')} ${fmt(locked.unlockNetWorth-nw)} ${tr('чистых активов','net worth')}`;
  document.getElementById('next-unlock-progress').style.width = prog+'%';
}
// Умные подсказки: среди всех треков всех открытых сайтов ищем следующий
// апгрейд с лучшим соотношением "прирост дохода / цена" (ROI), отдавая
// предпочтение тем, что игрок может купить прямо сейчас. Один трек одного
// сайта стоит один вызов siteIncome() (дёшево — сайтов и треков мало), так
// что пересчитывать это на каждый renderDash() не накладно.
// Точка 10: подсказка теперь советует либо нанять первого сотрудника
// (без них очки специализации не растут вообще), либо купить лучший
// доступный узел дерева прокачки — вместо кэшевого апгрейда трека.
function computeSmartTip(){
  if(!state.sites.length) return null;
  // Explicit order-of-operations hint for brand-new sites: with 0
  // employees no specialization points accrue at all, so hiring always
  // comes first, with its own beginner-friendly copy.
  for(let idx=0; idx<state.sites.length; idx++){
    const site = state.sites[idx];
    if(site.employees>0) continue;
    const hcost = employeeCost(site);
    return {siteIdx:idx, siteName:site.name, siteIcon:(ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId)||{}).icon, hire:true, cost:hcost, affordable:state.cash>=hcost, starter:true};
  }
  let best = null;
  state.sites.forEach((site, idx)=>{
    const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
    if(!type) return;
    const pick = cheapestSpecPurchase(site);
    if(!pick) return;
    const category = pick.repeat ? pick.category : pick.node.category;
    const levels = pick.repeat ? SPEC_TREE_REPEAT_LEVELS : pick.node.levels;
    const roi = levels/pick.cost; // уровней на каждое очко
    const affordable = (site.specPoints||0) >= pick.cost;
    if(!best || (affordable && !best.affordable) || (affordable===best.affordable && roi>best.roi)){
      best = {siteIdx:idx, siteName:site.name, siteIcon:type.icon, category, cost:pick.cost, levels, roi, affordable};
    }
  });
  return best;
}
function renderSmartTipCard(){
  const el = document.getElementById('smart-tip-card');
  if(!el) return;
  const tip = computeSmartTip();
  if(!tip){ el.style.display = 'none'; return; }
  el.style.display = '';
  const meta = tip.hire ? null : TRACK_META[tip.category];
  document.getElementById('smart-tip-icon').textContent = tip.starter ? '🤝' : meta.icon;
  const titleEl = document.getElementById('smart-tip-title');
  if(titleEl) titleEl.textContent = tip.starter ? tr('Первый шаг','First step') : t('dash.smarttip');
  document.getElementById('smart-tip-sub').innerHTML = tip.starter
    ? `${tr('Наймите первого сотрудника на','Hire your first employee at')} «${esc(tip.siteIcon)} ${esc(tip.siteName)}» — ${tr('без них очки специализации не копятся, а без очков не растёт ветка прокачки','without them specialization points never accrue, and the upgrade tree can\'t grow')} (${fmt(tip.cost)})`
    : `${tr('Купите узел','Buy a node')} <b>${esc(L(meta,'name'))}</b> ${tr('в дереве','in the tree')} «${esc(tip.siteIcon)} ${esc(tip.siteName)}» — `+
      `${tr('за','for')} ${tip.cost} 🔷, +${tip.levels} ${tr('ур.','lvl')}${tip.affordable?'':` (${tr('не хватает очков','need more points')})`}`;
  el._tip = tip;
}
function goToSmartTip(){
  const el = document.getElementById('smart-tip-card');
  const tip = el && el._tip;
  if(!tip) return;
  openSiteView(tip.siteIdx);
}
let _techUnlockedWas = null, _regionsUnlockedWas = null, _currencyUnlockedWas = null;
function renderTechRegionSummary(){
  const techUnlocked = depthFeatureUnlocked('tech');
  const techEl = document.getElementById('tech-tree-sub');
  const techRow = document.getElementById('tech-tree-row');
  if(techEl){
    techEl.textContent = techUnlocked
      ? `${TECH_TREE.filter(t=>techOwned(t.id)).length}/${TECH_TREE.length} ${tr('изучено','researched')}`
      : `🔒 ${tr('откроется при активах','unlocks at net worth')} ${fmt(DEPTH_UNLOCK_NW.tech)}`;
  }
  if(techRow) techRow.style.opacity = techUnlocked ? '' : '.5';
  // PRODUCT (4.4): announce each depth feature once, right when it
  // unlocks, instead of the player having to notice on their own that a
  // previously-greyed-out row became clickable.
  if(_techUnlockedWas===false && techUnlocked){ toast(`💡 ${tr('Открыты Технологии!','Tech tree unlocked!')}`); playSound('achievement'); if(techRow) fx(techRow,'fx-flip-in'); }
  _techUnlockedWas = techUnlocked;

  const regionsUnlocked = depthFeatureUnlocked('regions');
  const regEl = document.getElementById('regions-sub');
  const regRow = document.getElementById('regions-row');
  if(regEl){
    regEl.textContent = regionsUnlocked
      ? `${REGIONS.filter(r=>regionOwned(r.id)).length}/${REGIONS.length} · +${Math.round((regionGlobalMult()-1)*100)}%`
      : `🔒 ${tr('откроется при активах','unlocks at net worth')} ${fmt(DEPTH_UNLOCK_NW.regions)}`;
  }
  if(regRow) regRow.style.opacity = regionsUnlocked ? '' : '.5';
  if(_regionsUnlockedWas===false && regionsUnlocked){ toast(`🌍 ${tr('Открыты Регионы!','Regions unlocked!')}`); playSound('achievement'); if(regRow) fx(regRow,'fx-flip-in'); }
  _regionsUnlockedWas = regionsUnlocked;
}
let _advancedBadgeWasVisible = false;
function updateDashAdvancedBadge(nw, seasonTargetVal){
  const badge = document.getElementById('dash-advanced-badge');
  if(!badge) return;
  const rebirthReady = canRebirth();
  let seasonReady = false;
  try{
    const theme = currentSeasonTheme(state.seasonEvent.weekKey);
    const target = seasonTargetVal===undefined ? seasonTarget(theme) : seasonTargetVal;
    seasonReady = !state.seasonEvent.claimed && seasonProgressValue(theme) >= target;
  }catch(e){ /* season system not ready yet on first render */ }
  const taxAudit = !!(state.taxes && state.taxes.audited && Object.values(state.taxes.audited).some(Boolean));
  const visible = rebirthReady || seasonReady || taxAudit;
  badge.style.display = visible ? '' : 'none';
  // CLEANUP (3): wires fx-notif-bounce (new-notification pop) and fx-swing
  // (an ongoing "look at me" nudge for rebirth specifically) — only on the
  // hidden->visible edge, not every render, so it doesn't restart on every
  // tick while the badge stays up.
  if(visible && !_advancedBadgeWasVisible){
    fx(badge,'fx-notif-bounce');
  }
  _advancedBadgeWasVisible = visible;
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
let _rebirthCardWasReady = false;
function renderRebirthCard(nw){
  const wrap = document.getElementById('rebirth-card');
  if(!wrap) return;
  const threshold = prestigeThreshold();
  const nwReady = nw >= threshold;
  const siteReq = prestigeSiteRequirement();
  const sitesReady = state.sites.length >= siteReq;
  const ready = nwReady && sitesReady;
  // CLEANUP (3): wires fx-swing — nudges the card the moment rebirth first
  // becomes available, edge-triggered so it doesn't restart every render
  // while it stays ready.
  if(ready && !_rebirthCardWasReady) fx(wrap,'fx-swing');
  _rebirthCardWasReady = ready;
  const prog = Math.min(100, Math.round((nw/threshold)*100));
  const siteProg = Math.min(100, Math.round((state.sites.length/siteReq)*100));
  const nwLine = nwReady
    ? `✅ ${tr('Активы','Net worth')}: ${fmt(nw)} / ${fmt(threshold)}`
    : `${tr('До перерождения','Until rebirth')}: ${fmt(threshold-nw)}`;
  const siteLine = sitesReady
    ? `✅ ${tr('Сайтов','Sites')}: ${state.sites.length} / ${siteReq}`
    : `❌ ${tr('Сайтов','Sites')}: ${state.sites.length} / ${siteReq} ${tr('нужно открыть','needed')}`;
  const plevel = currentPrestigeLevel();
  const pnext = nextPrestigeLevel();
  const plevelLine = plevel
    ? `${plevel.icon} ${tr('Уровень','Level')} «${L(plevel,'name')}» (×${(1+plevel.mult).toFixed(2)})${pnext?` · ${tr('следующий','next')} ${pnext.icon} «${L(pnext,'name')}» ${tr('на','at')} ${pnext.count} 🔄`:''}`
    : (pnext ? `${tr('Первый уровень престижа','First prestige level')} «${L(pnext,'name')}» ${pnext.icon} ${tr('на','at')} ${pnext.count} 🔄` : '');
  wrap.style.display = '';
  wrap.innerHTML = `
    <div class="card-row">
      <div class="card-icon">🔄</div>
      <div style="flex:1">
        <div class="card-title">${tr('Перерождение','Rebirth')} (×${prestigeMultiplier().toFixed(2)} ${tr('к доходу','to income')})</div>
        <div class="card-sub">${ready ? tr('Все условия выполнены — можно переродиться!','All conditions met — you can rebirth!') : nwLine}</div>
        ${ready ? '' : `<div class="card-sub">${siteLine}</div>`}
        ${plevelLine ? `<div class="card-sub" style="opacity:.8;">${plevelLine}</div>` : ''}
      </div>
    </div>
    <div class="progress-bar"><div style="width:${prog}%"></div></div>
    <div class="progress-bar" style="margin-top:4px;"><div style="width:${siteProg}%;background:${sitesReady?'var(--green)':'var(--orange)'};"></div></div>
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
  // ITEM 13: can't add another site (of any type) until every site you
  // already own has EVERY track at EXPANSION_GATE_TRACK_LEVEL+ and has
  // cleared its first renovation stage — see sitesReadyForExpansion().
  const needsRenovation = !locked && state.sites.length>0 && !sitesReadyForExpansion();
  // Visual "locked" state — shown as 🔒 whenever the type isn't owned yet and
  // either the net-worth threshold or the renovation gate is blocking it.
  const showLocked = owned===0 && (locked || needsRenovation);
  // Launching a business no longer costs cash — it's free (see buySite()).
  // The catch is siteNeglectFailures(): leave it understaffed, un-upgraded,
  // or with hosting unpaid and it runs at a loss instead of a profit.
  let btnLabel = `🆓 ${tr('Открыть бесплатно','Launch for free')}`;
  let disabled = locked;
  if(!locked && slotsFull){ btnLabel = tr('Нет свободных слотов','No free slots'); disabled = true; }
  else if(!locked && !slotsFull && needsRenovation){ btnLabel = `🔒 ${tr(`Сначала прокачайте ветку до ${EXPANSION_GATE_TRACK_LEVEL}+ ур.`, `First get a track to level ${EXPANSION_GATE_TRACK_LEVEL}+`)}`; disabled = true; }
  return `<div class="card glass">
    <div class="card-row">
      <div class="card-icon">${type.icon}</div>
      <div style="flex:1">
        <div class="card-title">${L(type,'name')} <span class="pill ${owned>0?'pill-owned':'pill-locked'}">${owned>0?owned+tr(' шт',' owned'):(showLocked?`🔒 ${tr('закрыто','locked')}`:tr('нет','none'))}</span></div>
        <div class="card-sub">${tr('База дохода','Base income')}: ${fmt(type.baseIncome)}${tr('/с','/s')} ${locked?`· ${tr('откроется при','unlocks at')} $${type.unlockNetWorth.toLocaleString(isEN()?'en-US':'ru-RU')} ${tr('активов','net worth')}`:(needsRenovation&&owned===0?`· ${tr('откроется после прокачки текущих сайтов','unlocks once your current sites are upgraded a bit')}`:`· ${tr('но без вложений уйдёт в минус — см. подсказку по бизнесу','but neglect it and it runs at a loss — see the business tip')}`)}</div>
      </div>
    </div>
    <div class="btn-row"><button class="btn btn-cyan btn-block" ${disabled?'disabled':''} onclick="openMonetizationModal('${type.id}')">${btnLabel}</button></div>
  </div>`;
}
function renderSites(){
  const el = document.getElementById('sites-list');
  // ITEM 8 FIX: prune any site whose typeId no longer matches a known
  // business type BEFORE computing anything else this render pass. This
  // used to only happen once, at save-load migration time; if a site ever
  // became orphaned mid-session (a hybrid created a tick before its recipe
  // fully registered, a content update, etc.) the later grouping loop below
  // did `type.category` on an undefined `type` and threw — and since
  // el.innerHTML=html only happens at the very end of this function, that
  // exception aborted the whole render before anything reached the DOM, so
  // the entire sites screen (shop grid AND "Мои проекты") just stayed
  // blank with no error shown ("бизнесы вообще не появляются"). Pruning
  // first — like the load-time cleanup — means every index used below is
  // guaranteed valid for the rest of the function, so onclick handlers
  // baked into the HTML (openSiteView(idx), hireForSite(idx)...) never
  // point at a stale/shifted index.
  const stillValidType = id => ALL_BUSINESS_TYPES.some(t=>t.id===id);
  const orphaned = state.sites.filter(s=>!stillValidType(s.typeId));
  if(orphaned.length){
    state.cash = (state.cash||0) + orphaned.length * 5000;
    state.sites = state.sites.filter(s=>stillValidType(s.typeId));
  }
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

  // ITEM 11: quick-jump button at the top of the business screen — the shop
  // catalog above "Мои проекты" has grown into a lot of categories/tabs, so
  // scrolling past all of it every time just to reach your own projects got
  // tedious. Jumps straight to the #my-projects-section anchor below.
  if(state.sites.length){
    html += `<div class="btn-row" style="margin-bottom:16px;">
      <button class="btn btn-outline btn-block" onclick="document.getElementById('my-projects-section').scrollIntoView({behavior:'smooth',block:'start'});">📂 ${tr('Мои проекты','My projects')} (${state.sites.length}) ↓</button>
    </div>`;
  }

  if(state.sites.length>0 && !sitesReadyForExpansion()){
    html += `<div class="card glass" style="margin-bottom:16px;border-color:rgba(255,159,10,.35);background:rgba(255,159,10,.07);">
      <div class="card-title">🏗️ ${tr('Новый сайт пока закрыт','New site locked for now')}</div>
      <div class="card-sub">${tr(`Прокачайте хотя бы одну ветку до ${EXPANSION_GATE_TRACK_LEVEL}+ уровня на каждом сайте`, `Get at least one track to level ${EXPANSION_GATE_TRACK_LEVEL}+ on every site`)} ${tr('— тогда откроется покупка следующего','— then the next purchase unlocks')}.</div>
    </div>`;
  }

  const vFilterTabs = [
    { id:'all',   icon:'🗂️', label:tr('Все','All') },
    { id:'core',  icon:'🌐', label:tr('Интернет','Internet') },
    { id:'crypto', icon:'🪙', label:tr('Crypto','Crypto') },
    { id:'industry', icon:'🏭', label:tr('Индустрия','Industry') },
  ].map(t=>`<button class="btn ${shopVerticalFilter===t.id?'btn-cyan':'btn-outline'}" style="flex:1;padding:8px 4px;font-size:12.5px;" onclick="setShopVertical('${t.id}')">${t.icon} ${t.label}</button>`).join('');
  html += `<div class="btn-row" style="margin-bottom:16px;gap:6px;flex-wrap:wrap;">${vFilterTabs}</div>`;

  // Second-level tab, shown only inside "Интернет" — lets you narrow down to
  // one vertical flavor (Сайты/Приложения/Нейросети) of the same catalog
  // without needing a dedicated top-level tab for each. "Игры" (games) has
  // no vertical of its own and always shows in this tab regardless of which
  // sub-tab is picked, since it's not sites/apps/neural-specific.
  if(shopVerticalFilter==='core'){
    const subTabs = [
      { id:'all',    icon:'🗂️', label:tr('Все','All') },
      { id:'sites',  icon:VERTICAL_META.sites.icon,  label:L(VERTICAL_META.sites,'name') },
      { id:'apps',   icon:VERTICAL_META.apps.icon,   label:L(VERTICAL_META.apps,'name') },
      { id:'neural', icon:VERTICAL_META.neural.icon, label:L(VERTICAL_META.neural,'name') },
    ].map(t=>`<button class="btn ${shopBusinessVertical===t.id?'btn-cyan':'btn-outline'}" style="flex:1;padding:6px 4px;font-size:12px;" onclick="setShopBusinessVertical('${t.id}')">${t.icon} ${t.label}</button>`).join('');
    html += `<div class="btn-row" style="margin:-6px 0 16px;gap:6px;flex-wrap:wrap;">${subTabs}</div>`;
  }

  // Third-level tab, shown only inside "Индустрия" — narrows the 28-business
  // industry catalog down to one section (Энергетика/Добыча/Производство/
  // Тяжёлая пром-ть), same pattern as the "Интернет" sub-tabs above.
  if(shopVerticalFilter==='industry'){
    const indSubTabs = [
      { id:'all', icon:'🗂️', label:tr('Все','All') },
      ...INDUSTRY_SUB_ORDER.map(id=>({ id, icon:INDUSTRY_SUB_META[id].icon, label:L(INDUSTRY_SUB_META[id],'name') })),
    ].map(t=>`<button class="btn ${shopIndustrySub===t.id?'btn-cyan':'btn-outline'}" style="flex:1;padding:6px 4px;font-size:11.5px;" onclick="setShopIndustrySub('${t.id}')">${t.icon} ${t.label}</button>`).join('');
    html += `<div class="btn-row" style="margin:-6px 0 16px;gap:6px;flex-wrap:wrap;">${indSubTabs}</div>`;
  }

  CATEGORY_ORDER.forEach(catId=>{
    const cat = CATEGORY_META[catId];
    // BUYABLE_TYPES (regular tiers) always carry an explicit vertical
    // (sites/apps/neural) and all show together under the merged "Интернет"
    // tab, further narrowed by shopBusinessVertical if a specific vertical
    // is picked there. GAME_TYPES (category 'games') has no vertical but is
    // folded into the "Интернет" tab too, showing regardless of which
    // sub-vertical is selected. CRYPTO_TYPES and INDUSTRY_TYPES have no
    // vertical either — each is its own vertical-neutral bucket — so they
    // only ever appear under "Все" or their own dedicated tab.
    const types = ALL_BUSINESS_TYPES.filter(t=>{
      if(t.category!==catId) return false;
      if(shopVerticalFilter==='all') return true;
      if(shopVerticalFilter==='core'){
        if(catId==='games') return true;
        if(!t.vertical) return false;
        if(shopBusinessVertical==='sites' && catId==='ai') return false;
        if(shopBusinessVertical==='all') return true;
        return t.vertical===shopBusinessVertical;
      }
      if(t.vertical) return false;
      if(catId!==shopVerticalFilter) return false;
      if(shopVerticalFilter==='industry' && shopIndustrySub!=='all') return t.sub===shopIndustrySub;
      return true;
    });
    if(!types.length) return;
    html += `<div class="section-title">${cat.icon} ${L(cat,'name')}</div>`;
    if(catId==='ai'){
      html += `<div class="card glass" style="margin-bottom:10px;background:rgba(191,90,242,.08);border-color:rgba(191,90,242,.3);">
        <div class="card-sub" style="font-size:11.5px;">🧬 ${tr('Открыв AI-бизнес, вы сможете разработать собственную нейросеть или купить готовую лицензию у партнёра — выбор влияет на доход. Подробности — внутри проекта.','Once you unlock an AI business, you can develop your own neural network or buy a ready-made license from a partner — the choice affects income. Details are inside the project.')}</div>
      </div>`;
    }
    types.forEach(type=>{ html += renderTypeCard(type); });
  });

  html += `<div class="section-title" id="my-projects-section">${tr('Мои проекты','My projects')}</div>`;
  if(!state.sites.length){
    html += `<div class="empty">🌱 ${tr('У вас пока нет сайтов — купите первый выше','You do not have any sites yet — buy your first one above')}</div>`;
  } else {
    // Owned sites used to be one flat list regardless of business type,
    // which got messy once a player owned sites across several categories.
    // Group them the same way the shop above already groups purchasable
    // types — by category, in CATEGORY_ORDER, with hybrids (which have no
    // slot in CATEGORY_ORDER) collected in their own trailing group.
    const ownedByCat = {};
    state.sites.forEach((site, idx)=>{
      const type = ALL_BUSINESS_TYPES.find(t=>t.id===site.typeId);
      if(!type) return; // already pruned above — guard kept here too, cheap and defensive
      const cat = type.category;
      (ownedByCat[cat] = ownedByCat[cat]||[]).push({site, idx, type});
    });
    const ownedCatOrder = CATEGORY_ORDER.filter(c=>ownedByCat[c]).concat(
      Object.keys(ownedByCat).filter(c=>!CATEGORY_ORDER.includes(c))
    );
    const renderOwnedCard = (site, idx, type)=>{
      const vis = SITE_VISUAL[tierIdOf(type.id)];
      const stage = designStage(site.tracks.design);
      const meta = STAGE_META[stage];
      const income = siteIncome(type, site);
      const cap = employeeCap(site);
      let dots = '';
      for(let i=0;i<cap;i++) dots += `<div class="emp-dot ${i<site.employees?'filled':''}"></div>`;
      const tp = TRACK_ORDER.map(k=>`${TRACK_META[k].icon}${site.tracks[k]}`).join('  ');
      const specPtsBadge = `<span class="pill" style="background:rgba(10,132,255,.15);color:var(--blue);">🔷 <span id="list-pts-${idx}">${Math.floor(site.specPoints||0)}</span></span>`;
      const idleHrs = Math.floor((Date.now()-(site.lastUpgradeAt||Date.now()))/3600000);
      const idleBadge = idleHrs>=IDLE_WARN_HOURS ? `<span class="idle-badge">⏳ ${tr('без апгрейда','no upgrades')} ${idleHrs} ${tr('ч','h')}</span>` : '';
      const synergyActive = trackSynergyActive(site);
      const synergyBadge = synergyActive ? `<span class="pill synergy-pill">⚡ ${tr('Синергия','Synergy')}</span>` : '';
      const neglectFails = siteNeglectFailures(site);
      const neglectBadge = (neglectFails>=2 && income<0)
        ? `<span class="pill" style="background:rgba(255,69,58,.22);color:#ff453a;">🔻 ${tr('В минусе','Losing money')}</span>`
        : neglectFails>=1
          ? `<span class="pill" style="background:rgba(255,159,10,.22);color:#ff9f0a;">⚠️ ${tr('Мало усилий','Undermanaged')}</span>`
          : '';
      const cardStyle = synergyActive
        ? 'cursor:pointer;border:1px solid rgba(255,214,10,.5);box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,214,10,.15);'
        : (neglectFails>=2 && income<0)
          ? 'cursor:pointer;border:1px solid rgba(255,69,58,.4);box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,69,58,.12);'
          : `cursor:pointer;${state.boosty.unlocked?'border:1px solid rgba(255,214,10,.35);box-shadow:0 8px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,214,10,.1);':''}`;
      return `<div class="card glass${synergyActive?' synergy-glow':''}" style="${cardStyle}" onclick="openSiteView(${idx})">
        <div class="card-row">
          <div class="card-icon" style="background:${vis.accent}22;">${type.icon}${state.boosty.unlocked?' ✨':''}</div>
          <div style="flex:1">
            <div class="card-title">${esc(site.name)} <span class="pill" style="background:${vis.accent}22;color:${vis.accent};">${meta.icon} ${meta.label}</span> ${specPtsBadge} ${synergyBadge} ${neglectBadge} ${idleBadge}</div>
            <div class="card-sub" style="${income<0?'color:#ff453a;':''}">${L(type,'name')} · ${fmt(income)}${tr('/с','/s')} · ${tp}</div>
            <div class="emp-dots">${dots}</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn btn-outline btn-block" onclick="event.stopPropagation();openSiteView(${idx})">${tr('Открыть сайт и прокачать →','Open site and upgrade →')}</button></div>
      </div>`;
    };
    ownedCatOrder.forEach(catId=>{
      const catMeta = CATEGORY_META[catId];
      const label = catMeta ? `${catMeta.icon} ${L(catMeta,'name')}` : `🧬 ${tr('Гибриды','Hybrids')}`;
      html += `<div class="section-title" style="font-size:13px;opacity:.75;">${label}</div>`;
      ownedByCat[catId].forEach(({site, idx, type})=>{ html += renderOwnedCard(site, idx, type); });
    });
  }
  el.innerHTML = html;
  staggerCards(el);
  // BUGFIX (1): on this WebView, a big innerHTML swap on an already-visible
  // list (heavy on backdrop-filter/blur cards) doesn't always get repainted
  // right away — the new site card was really in the DOM, just visually
  // stuck until something forced a relayout, e.g. switching nav tabs (nav()
  // toggles a display-affecting class, which forces exactly that). Same
  // trick already used for #save-dot elsewhere in this file; doing it here
  // too means a newly bought site shows up instantly, no tab-switch needed.
  el.style.display = 'none'; void el.offsetHeight; el.style.display = '';
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
  el.style.display = '';
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
  renderCurrencySummary();
  const el = document.getElementById('stocks-card');
  el.style.display = '';
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
function renderCurrencySummary(){
  const el = document.getElementById('currency-sub');
  if(!el) return;
  const unlocked = depthFeatureUnlocked('currency');
  el.textContent = unlocked
    ? `EUR/USD — ${state.eur.rate.toFixed(3)}${state.eur.balance>0.005?` · €${state.eur.balance.toFixed(2)}`:''}`
    : `🔒 ${tr('откроется при активах','unlocks at net worth')} ${fmt(DEPTH_UNLOCK_NW.currency)}`;
  if(_currencyUnlockedWas===false && unlocked){ toast(`💱 ${tr('Открыты Валютные коридоры!','Currency corridors unlocked!')}`); playSound('achievement'); }
  _currencyUnlockedWas = unlocked;
}
function updateMarketLive(){
  if(activeScreen!=='market') return;
  const valEl = document.getElementById('mkt-value'); if(valEl) valEl.textContent = fmt(stocksValue());
  const cashEl = document.getElementById('mkt-cash'); if(cashEl) cashEl.textContent = fmt(state.cash);
  renderLoanCard();
  renderCurrencySummary();
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
function buildReputationTierHtml(){
  const total = reputationTotal();
  const tier = currentReputationTier();
  const next = nextReputationTier();
  const progressPct = next ? Math.min(100, Math.round((total-tier.threshold)/(next.threshold-tier.threshold)*100)) : 100;
  const ladder = REPUTATION_TIERS.map(t=>{
    const reached = total>=t.threshold;
    const active = t.id===tier.id;
    return `<div class="rep-tier-step${reached?' reached':''}${active?' active':''}" title="${esc(tr(t.name,t.nameEn))} (${t.threshold}+)">
      <span class="rep-tier-icon">${t.icon}</span>
      <span class="rep-tier-name">${tr(t.name,t.nameEn)}</span>
      <span class="rep-tier-thresh">${t.threshold}+</span>
    </div>`;
  }).join('');
  const nextHint = next
    ? `<div class="card-sub">${tr('До следующего статуса','To next status')} «${tr(next.name,next.nameEn)}» ${next.icon}: <b>${Math.max(0,next.threshold-total)}</b> ${tr('репутации','reputation')}</div>`
    : `<div class="card-sub">${tr('Достигнут высший статус','Reached the highest status')} 👑</div>`;
  return `<div class="card glass" style="margin-bottom:14px;">
    <div class="card-row">
      <div class="card-icon" style="font-size:22px;">${tier.icon}</div>
      <div style="flex:1">
        <div class="card-title">${tr('Статус','Status')}: ${tr(tier.name,tier.nameEn)}</div>
        ${nextHint}
        ${next?`<div class="rep-tier-progress"><div style="width:${progressPct}%;"></div></div>`:''}
      </div>
    </div>
    <div class="rep-tier-ladder">${ladder}</div>
  </div>`;
}
function renderGarage(){
  const rep = reputationTotal();
  document.getElementById('garage-bonus').textContent = rep+' → +'+Math.round(reputationBonus()*100)+'%';
  const el = document.getElementById('garage-list');
  // ITEM 17: the "Статус" ladder card (buildReputationTierHtml()) used to
  // open this screen — removed as unnecessary UI. The reputation→income
  // bonus itself is unaffected (still shown compactly above, in
  // #garage-bonus) and every item below was already just a cash purchase
  // with no tier gating.
  let html = buildCeoOfficeCardHtml();
  html += `<div class="fleet-group-title">⌚ ${tr('Аксессуары','Accessories')}</div>`;
  LUXURY.filter(l=>l.slot==='accessory').forEach(l=>{ html += renderLuxuryCard(l); });
  html += `<div class="fleet-group-title">👗 ${tr('Мода','Fashion')}</div>`;
  LUXURY.filter(l=>l.slot==='fashion').forEach(l=>{ html += renderLuxuryCard(l); });
  html += `<div class="fleet-group-title">💻 ${tr('Электроника','Electronics')}</div>`;
  LUXURY.filter(l=>l.slot==='electronics').forEach(l=>{ html += renderLuxuryCard(l); });
  html += `<div class="fleet-group-title">🎨 ${tr('Коллекционирование','Collectibles')}</div>`;
  LUXURY.filter(l=>l.slot==='collectible').forEach(l=>{ html += renderLuxuryCard(l); });
  html += `<div class="fleet-group-title">🚗 ${tr('Гараж (транспорт)','Garage (transport)')}</div>`;
  LUXURY.filter(l=>l.slot==='garage').forEach(l=>{ html += renderLuxuryCard(l); });
  html += `<div class="fleet-group-title">✈️ ${tr('Ангар (яхты и самолёты)','Hangar (yachts and jets)')}</div>`;
  LUXURY.filter(l=>l.slot==='hangar').forEach(l=>{ html += renderLuxuryCard(l); });
  el.innerHTML = html;
  staggerCards(el);
}
function renderSettings(){
  document.getElementById('sw-notif').classList.toggle('on', state.settings.notif);
  const swSound = document.getElementById('sw-sound');
  if(swSound) swSound.classList.toggle('on', state.settings.sound);
  const swMusic = document.getElementById('sw-music');
  if(swMusic) swMusic.classList.toggle('on', state.settings.music);
  const swAiAccent = document.getElementById('sw-aiAccent');
  if(swAiAccent) swAiAccent.classList.toggle('on', !!state.settings.aiAccent);
  const volSlider = document.querySelector('input[oninput="onMusicVolumeChange(this.value)"]');
  const volVal = document.getElementById('set-music-volume-val');
  const musicVol = typeof state.settings.musicVolume==='number' ? state.settings.musicVolume : 35;
  if(volSlider) volSlider.value = musicVol;
  if(volVal) volVal.textContent = musicVol+'%';
  renderThemeGrid();
  renderBoostyCard();
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
// Manual game-speed acceleration (×2/×4) was removed in the Phase 4 economy
// update: the game always runs at real-time ×1 now. Automatic offline-progress
// catch-up (computed separately from elapsed wall-clock time) is unaffected.
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
  if(state.settings.aiAccent) applyUiAccent();
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
  if(state.settings.aiAccent) applyUiAccent();
  renderSettings();
  save();
  const t = ACCENT_THEMES.find(x=>x.id===id);
  toast(tr('🎨 Тема применена: ','🎨 Theme applied: ')+(t?L(t,'name'):id));
}
function renderBoostyCard(){
  const el = document.getElementById('boosty-card');
  if(!el) return;
  el.style.display = '';
  if(state.boosty.unlocked){
    const themeBtns = ACCENT_THEMES.map(t=>`<button class="btn ${state.boosty.theme===t.id?'btn-violet':'btn-outline'}" style="padding:9px 10px;font-size:11.5px;" onclick="setBoostyTheme('${t.id}')">${t.icon} ${L(t,'name')}</button>`).join('');
    el.innerHTML = `
      <div class="boosty-head"><div class="boosty-ic">🚀</div><div class="boosty-title">${tr('Boosty активирован','Boosty activated')} <span class="unlocked-pill">✓ ${tr('РАЗБЛОКИРОВАНО','UNLOCKED')}</span></div></div>
      <div class="boosty-desc">${tr('Спасибо за поддержку! Ваши привилегии:','Thanks for your support! Your perks:')}</div>
      <ul style="margin:6px 0 10px 18px;color:var(--dim);font-size:12px;line-height:1.7;">
        <li>🌙 ${tr('Офлайн-доход без потолка на 50% + 100% в первые 24ч','Uncapped offline income at 50% + 100% for the first 24h')}</li>
        <li>🤖 ${tr('Авто-менеджер сайтов открыт бесплатно','Site auto-manager unlocked for free')}</li>
        <li>🏦 ${tr('Ставка по кредиту ниже на 20%, лимит выше на 25%','Loan rate 20% lower, limit 25% higher')}</li>
        <li>🧩 ${tr('+1 дополнительный слот под сайт','+1 extra site slot')}</li>
        <li>🚀 ${tr('Бейдж «Boosty CEO» в рейтинге конкурентов','"Boosty CEO" badge on the competitor leaderboard')}</li>
        <li>🎆 ${tr('Ранний доступ к сезонным событиям (на 2 дня раньше)','Early access to seasonal events (2 days earlier)')}</li>
        <li>🐞 ${tr('На 25% ниже шанс бага после апгрейда','25% lower chance of a bug after an upgrade')}</li>
        <li>🌐 ${tr('Тарифы хостинга дешевле на 20%','Hosting plans cost 20% less')}</li>
        <li>💸 ${tr('Небольшой ежедневный бонус деньгами','A small daily cash stipend')}</li>
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
        <li>🌙 ${tr('Офлайн-доход без потолка','Uncapped offline income')}</li>
        <li>🤖 ${tr('Авто-менеджер сайтов бесплатно','Site auto-manager for free')}</li>
        <li>🏦 ${tr('Льготная ставка и лимит по кредиту','Discounted loan rate and limit')}</li>
        <li>🧩 ${tr('+1 слот под сайт','+1 site slot')}</li>
        <li>🎨 ${tr('Эксклюзивные темы интерфейса','Exclusive interface themes')}</li>
        <li>🚀 ${tr('Бейдж CEO в рейтинге','CEO badge on the leaderboard')}</li>
        <li>🎆 ${tr('Ранний доступ к сезонным событиям','Early access to seasonal events')}</li>
        <li>🐞 ${tr('Меньше шанс бага после апгрейда','Lower chance of a bug after an upgrade')}</li>
        <li>🌐 ${tr('Скидка 20% на хостинг','20% off hosting plans')}</li>
        <li>💸 ${tr('Ежедневный денежный бонус','Daily cash stipend')}</li>
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
  log(tr('🚀 Активирована Boosty-подписка — безлимитный офлайн-доход, авто-менеджер, льготный кредит, +1 слот, бейдж CEO, ранний доступ к сезонным событиям, меньше багов, скидка на хостинг и ежедневный бонус','🚀 Boosty subscription activated — unlimited offline income, auto-manager, discounted loan, +1 slot, CEO badge, early access to seasonal events, fewer bugs, hosting discount and a daily bonus'));
  renderSettings();
  renderAll();
  save();
}
function renderAll(){
  renderHeader();
  renderTicker();
  renderDash();
  renderFinanceCard();
  // ITEM 11 FIX: renderAll() never used to touch the event feed
  // (#dash-log) — doReset() rebuilds a fresh, empty state.log but nothing
  // ever told the DOM to redraw, so the old feed just sat there looking
  // unchanged until the next log() call happened to overwrite it. Feed
  // now always mirrors state.log, including right after a reset.
  renderLog();
  // BUGFIX (4): same issue as the log fix above, but for the "Active
  // events" card (hacks, lawsuits, platform wars...) — renderEvents() was
  // only ever called from the individual trigger/resolve functions, never
  // from renderAll(). doReset()/doRebirth() correctly empty
  // state.activeEvents, but the #events-card DOM never got told to
  // redraw, so a stale event from the run that just ended (e.g. a lawsuit
  // against a site that no longer exists) kept showing until some
  // unrelated event happened to fire renderEvents() again.
  renderEvents();
  // Only rebuild the screen the person is actually looking at — the other
  // three screens' card lists are hidden behind display:none anyway, and
  // nav() already does a full refresh the moment someone switches to one,
  // so there's no need to tear down and rebuild all four every single
  // time any action happens anywhere in the app (e.g. upgrading a site
  // used to silently rebuild the estate/garage/market lists too).
  if(activeScreen!=='dash') renderScreenList(activeScreen);
  refreshInboxBadge();
}

/* ---------- GAME BOOT ---------- */
function hasSavedProgress(){ return !!state.setupDone || state.sites.length > 0 || state.day > 1; }
// Loading this file always lands on the main menu first; Play either
// resumes the existing save or drops into new-game setup if there isn't one.
function enterGame(){
  if(hasSavedProgress()){
    nav('dash');
    if(pendingWelcomeBack){ showWelcomeBackModal(pendingWelcomeBack); pendingWelcomeBack = null; save(); }
  }
  else showSetupScreen();
}

/* ---------- MAIN MENU ---------- */
function showMainMenu(){
  const label = document.getElementById('mm-play-label');
  if(label) label.textContent = t(hasSavedProgress() ? 'mm.continue' : 'mm.play');
  document.getElementById('main-menu-screen').classList.remove('hidden');
}
function menuPlay(){
  document.getElementById('app').classList.remove('menu-settings-mode');
  document.getElementById('menu-settings-back-btn').style.display = 'none';
  document.getElementById('main-menu-screen').classList.add('hidden');
  enterGame();
}
function menuHowToPlay(){
  const steps = ONBOARD_STEPS.map(s=>`<div class="card glass" style="margin-bottom:8px;text-align:left;">
    <div class="card-title">${s.icon} ${L(s,'title')}</div>
    <div class="card-sub">${L(s,'text')}</div>
  </div>`).join('');
  openModal(`<h3>❓ ${tr('Как играть','How to play')}</h3>${steps}<div class="btn-row"><button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Закрыть','Close')}</button></div>`);
}
function menuSettings(){
  // Settings are reachable from the main menu without starting a game
  // (language/theme, etc.), but the game's own header/ticker/bottom-nav
  // must stay hidden here — otherwise a bottom-nav tap would drop the
  // player straight into the dashboard, bypassing Play entirely.
  document.getElementById('main-menu-screen').classList.add('hidden');
  document.getElementById('app').classList.add('menu-settings-mode');
  document.getElementById('menu-settings-back-btn').style.display = 'flex';
  nav('settings');
}
function closeMenuSettings(){
  document.getElementById('app').classList.remove('menu-settings-mode');
  document.getElementById('menu-settings-back-btn').style.display = 'none';
  showMainMenu();
}
function menuAbout(){
  openModal(`<h3>👤 ${tr('Об авторе','About the author')}</h3>
    <p class="card-sub" style="text-align:left;line-height:1.6;">${tr(
      'DIGITAL EMPIRE — независимый проект, созданный одним разработчиком. Никаких издателей, никакого отдела маркетинга — только код, баланс и любовь к бизнес-симуляторам.',
      'DIGITAL EMPIRE is an indie project made by a solo developer. No publisher, no marketing department — just code, game-balance spreadsheets, and a love of business sims.'
    )}</p>
    <p class="card-sub" style="text-align:left;margin-top:10px;">${tr('Версия','Version')}: 2.1</p>
    <div class="btn-row" style="margin-top:10px;"><button class="btn btn-outline btn-block" onclick="closeModal()">${tr('Закрыть','Close')}</button></div>`);
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
  // First-session pacing (see the earlier balance pass): a temporary income
  // boost, an immediate cash bonus, and a short grace period before
  // taxes/payroll/hosting start being assessed — so the first few minutes
  // are all momentum, not admin.
  state.starterBoostUntil = Date.now() + STARTER_BOOST_MS;
  state.billGraceUntilDay = state.day + BILL_GRACE_DAYS;
  state.cash += WELCOME_BONUS;
  document.getElementById('setup-screen').classList.add('hidden');
  save(); renderAll();
  nav('dash');
  const finishSetup = function(){
    toast(`${tr('Добро пожаловать','Welcome')}, ${state.ceoName}! ${tr('Режим','Mode')}: ${L(DIFFICULTY_META[chosenDifficulty],'label')}`);
    log(`🎉 ${tr('Приветственный бонус','Welcome bonus')}: +${fmt(WELCOME_BONUS)}`);
    setTimeout(()=>toast(`🚀 ${tr('Стартовый рывок','Starter surge')}: ×${STARTER_BOOST_MULT} ${tr('к доходу на первые','to income for the first')} ${Math.round(STARTER_BOOST_MS/60000)} ${tr('минуты','minutes')}!`), 1200);
    if(!state.onboarding.done) setTimeout(startOnboarding, 500);
  };
  if(!state.story.introSeen){
    state.story.introSeen = true; save();
    setTimeout(()=>showStoryIntro(finishSetup), 300);
  } else finishSetup();
}

/* ---------- STORY (item 13, reworked) ----------
   Shown once per brand-new game (state.story.introSeen) right after setup,
   before the onboarding tour — and also replayed from scratch by doReset()
   (see confirmSetup()/doReset()), since a reset is a brand-new game too.
   Rather than just narrating "you blew it all on a yacht and a plane",
   the middle phase is interactive: the player taps through a shopping list
   funded by the $30,000,000 starting balance, watches the counter drop
   after every purchase, and only moves on once it's actually gone — so
   the fall from $30M to $450 is something the player *does*, not just
   reads about. Pure flashback/flavor — no state changes beyond the
   narrative flag, since the "you're down to your starting cash" ending is
   already exactly where a fresh game begins. */
const STORY_START_BALANCE = 30000000;
const STORY_SPEND_ITEMS = [
  {icon:'🛥️', name:tr('Яхта','Yacht'), cost:9000000},
  {icon:'✈️', name:tr('Личный самолёт','Private jet'), cost:12000000},
  {icon:'🚁', name:tr('Вертолёт','Helicopter'), cost:4000000},
  {icon:'🏎️', name:tr('Коллекция суперкаров','Supercar collection'), cost:3500000},
  {icon:'🏝️', name:tr('Вечеринка на частном острове','Private-island party'), cost:1500000},
];
function storyFmtMoney(n){
  const sign = n<0?'-':'';
  return sign+'$'+Math.round(Math.abs(n)).toLocaleString('en-US');
}
function showStoryIntro(onDone){
  let phase = 'title';       // title -> spend -> parents -> lesson
  let balance = STORY_START_BALANCE;
  const bought = {};
  let animFrame = null;

  function animateBalance(from, to){
    const dur = 550, start = performance.now();
    if(animFrame) cancelAnimationFrame(animFrame);
    (function step(now){
      const p = Math.min(1, (now-start)/dur);
      const val = from + (to-from)*p;
      const el = document.getElementById('story-balance');
      if(el) el.textContent = storyFmtMoney(val);
      animFrame = p<1 ? requestAnimationFrame(step) : null;
    })(start);
  }

  function renderTitle(){
    openModal(`
      <div style="text-align:center;padding:6px 0 2px;">
        <div style="font-size:46px;margin-bottom:10px;">💰</div>
        <h3 style="margin-bottom:8px;">${tr('Когда-то у вас было всё','Once, you had it all')}</h3>
        <div style="font-size:13px;color:var(--dim);margin-bottom:4px;">${tr('На счету семейной компании —','The family company\'s account holds —')}</div>
        <div id="story-balance" style="font-size:32px;font-weight:800;color:var(--green);margin-bottom:16px;">${storyFmtMoney(STORY_START_BALANCE)}</div>
        <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:18px;">${tr('Десятки бизнесов, доставшихся от родителей. Прокачивать их незачем — деньги и так текут сами.','Dozens of businesses inherited from your parents. No need to grow them — the money just flows in on its own.')}</p>
        <button class="btn btn-violet btn-block" onclick="__storyNext()">${tr('Далее','Next')}</button>
      </div>`);
  }

  function renderSpend(){
    const allBought = STORY_SPEND_ITEMS.every((_,i)=>bought[i]);
    openModal(`
      <div style="text-align:center;padding:6px 0 2px;">
        <div style="font-size:13px;color:var(--dim);margin-bottom:2px;">${tr('«Раз деньги есть — надо жить красиво»','"If there\'s money, might as well live well"')}</div>
        <div id="story-balance" style="font-size:30px;font-weight:800;color:${balance>0?'var(--text)':'var(--red)'};margin:4px 0 2px;">${storyFmtMoney(balance)}</div>
        <div style="font-size:11.5px;color:var(--dim);margin-bottom:14px;">${tr('осталось на счету','left in the account')}</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
          ${STORY_SPEND_ITEMS.map((it,i)=>`
            <button class="btn ${bought[i]?'btn-outline':'btn-violet'}" style="display:flex;justify-content:space-between;align-items:center;opacity:${bought[i]?0.5:1};" ${bought[i]?'disabled':''} onclick="__storyBuy(${i})">
              <span>${it.icon} ${esc(it.name)}</span>
              <span>${bought[i]?'✅':storyFmtMoney(it.cost)}</span>
            </button>`).join('')}
        </div>
        <button class="btn btn-block ${allBought?'btn-violet':'btn-outline'}" ${allBought?'':'disabled'} onclick="__storyNext()">${allBought?tr('Далее','Next'):tr('Потратьте всё','Spend it all first')}</button>
      </div>`);
  }

  function renderParents(){
    openModal(`
      <div style="text-align:center;padding:6px 0 2px;">
        <div style="font-size:46px;margin-bottom:10px;">😠</div>
        <h3 style="margin-bottom:8px;">${tr('Родители возвращаются','The parents come home')}</h3>
        <div style="font-size:22px;font-weight:800;color:var(--red);margin-bottom:12px;">$0</div>
        <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:18px;">${tr('«Мы всю жизнь строили это дело, а ты спустил всё на яхту, самолёт и вертолёт?!» — родители забирают компанию, все счета и все бизнесы обратно себе.','"We spent our whole lives building this business, and you blew it all on a yacht, a jet and a helicopter?!" — your parents take the company, every account, and every business back.')}</p>
        <button class="btn btn-violet btn-block" onclick="__storyNext()">${tr('Далее','Next')}</button>
      </div>`);
  }

  function renderLesson(){
    openModal(`
      <div style="text-align:center;padding:6px 0 2px;">
        <div style="font-size:46px;margin-bottom:10px;">🎯</div>
        <h3 style="margin-bottom:8px;">${tr('Урок','The lesson')}</h3>
        <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin-bottom:12px;">${tr('«Хочешь денег — научись зарабатывать их сам», — говорят они и оставляют вам немного на старт. Больше помощи не будет.','"If you want money, learn to earn it yourself," they say, handing you a little to start. There won\'t be any more help.')}</p>
        <div style="font-size:30px;font-weight:800;color:var(--green);margin-bottom:18px;">${storyFmtMoney(state.cash)}</div>
        <button class="btn btn-violet btn-block" onclick="__storyFinish()">${tr('Начать зарабатывать','Start earning')}</button>
      </div>`);
  }

  window.__storyBuy = function(i){
    if(bought[i]) return;
    bought[i] = true;
    const from = balance;
    balance -= STORY_SPEND_ITEMS[i].cost;
    renderSpend();
    animateBalance(from, balance);
    fxId('story-balance', balance<=0 ? 'fx-shake' : 'fx-num-pop');
    playSound('buy');
  };
  window.__storyNext = function(){
    if(phase==='title'){ phase='spend'; renderSpend(); }
    else if(phase==='spend'){ phase='parents'; playSound('error'); renderParents(); }
    else if(phase==='parents'){ phase='lesson'; renderLesson(); }
  };
  window.__storyFinish = function(){
    closeModal();
    window.__storyBuy = null; window.__storyNext = null; window.__storyFinish = null;
    if(onDone) onDone();
  };
  renderTitle();
}

/* ---------- ONBOARDING TOUR (first-time players only) ---------- */
const ONBOARD_STEPS = [
  {icon:'👋', title:'Добро пожаловать в DIGITAL EMPIRE!', titleEn:'Welcome to DIGITAL EMPIRE!', text:'Быстрый тур на 20 секунд — покажем, куда жать в первые минуты. Потом полностью уберём.', textEn:'A quick 20-second tour — we\'ll show you where to tap in the first few minutes, then get out of your way.'},
  {icon:'🌐', title:'Начните с вкладки «Бизнес»', titleEn:'Start with the "Business" tab', text:'Внизу экрана откройте «Бизнес» и купите свой первый сайт, приложение или нейросеть — это основной источник дохода.', textEn:'At the bottom of the screen, open "Business" and buy your first site, app or neural network — it\'s your main source of income.'},
  {icon:'📐', title:'Прокачивайте треки', titleEn:'Upgrade your tracks', text:'Внутри каждого сайта есть 3 трека: дизайн, трафик, инфраструктура. Прокачивайте самый дешёвый — это быстрее всего окупается. А деньги за рекламу зарабатывайте отдельно — в разделе «Реклама».', textEn:'Every site has 3 tracks: design, traffic, infrastructure. Upgrade the cheapest one — it pays off the fastest. Ad revenue is earned separately, in the "Ads" section.'},
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
  return 'DigitalEmpireGameBot';
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
  ctx.fillText('🌐 DIGITAL EMPIRE', 40, 60);
  ctx.fillStyle = '#98989f'; ctx.font = '400 16px Inter, sans-serif';
  ctx.fillText('Digital Tycoon', 40, 86);
  const nw = netWorth();
  const rank = keptRank(nw);
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
        await navigator.share({files:[file], title:'Digital Empire', text:`Мой прогресс в Digital Empire: $${fmt(netWorth())}!`});
      } else {
        await navigator.share({title:'Digital Empire', text:`Мой прогресс в Digital Empire: $${fmt(netWorth())}!`});
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
function ceoUnlockedAvatars(){ const idx = keptRankIndex(netWorth()); return CEO_AVATARS.filter(a=>a.unlockRank<=idx); }
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
    'nav.dash':'Дашборд', 'nav.sites':'Бизнес', 'nav.market':'Биржа', 'nav.estate':'Имущество', 'nav.inbox':'Уведомления', 'nav.settings':'Ещё',
    'title.dash':'Обзор', 'title.sites':'Мой бизнес', 'title.market':'Биржа', 'title.estate':'Имущество', 'title.inbox':'Уведомления', 'title.settings':'Настройки',
    'settings.lang':'Язык / Language', 'settings.social':'Сообщество',
    'mm.play':'🚀 Играть', 'mm.continue':'▶ Продолжить', 'mm.settings':'⚙️ Настройки',
    'mm.howtoplay':'❓ Как играть', 'mm.about':'👤 Об авторе',
    'mm.tag':'Digital Tycoon — построй свою цифровую империю',
    'mm.foot':'v2.1 · прогресс сохраняется автоматически',
    'setup.title':'Прежде чем начать',
    'setup.sub':'Представьтесь и выберите сложность — это можно будет увидеть, но не поменять позже',
    'setup.namelabel':'Как вас зовут?',
    'setup.difflabel':'Сложность',
    'setup.start':'🚀 Начать бизнес',
    'ending.title':'Родители возвращаются',
    'ending.tag':'Три перерождения позади. «Мы недооценили тебя, — говорят родители. — Может, объединим силы?»',
    'ending.endless':'🤝 Объединиться с родителями',
    'ending.continue':'💼 Отказаться — построить свою империю',
    'speedfx.label':'Ускорение',
    'dash.networth':'Чистые активы','dash.cash':'Наличные','dash.incomepersec':'Доход/сек','dash.portfolio':'Портфель','dash.reputation':'Репутация',
    'dash.activeevents':'⚡ Активные события','dash.moretoggle':'Ещё: ранг, перерождение, финансы, история','dash.smarttip':'Умная подсказка','dash.techtree':'Технологии','dash.regions':'Регионы',
    
    'dash.nextrank':'До следующего ранга: —','dash.seasonevent':'Событие недели',
    'dash.taxes':'Налоги',
    'dash.quickactions':'Быстрые действия','dash.upgradebiz':'Прокачать бизнес','dash.upgradebizsub':'Выберите, что именно улучшить','dash.gotosites':'Перейти к сайтам',
    'dash.leaderboard':'Рейтинг конкурентов','dash.leaderboardsub':'Сравните свою империю с локальными NPC','dash.openleaderboard':'Открыть рейтинг',
    'dash.eventfeed':'Лента событий',
    'sites.sub':'Прокачивайте дизайн, трафик и инфраструктуру — а рекламу размещайте отдельно ради быстрого кэша',
    'sites.recipebook':'📖 Книга рецептов гибридов',
    'market.sub':'Акции и криптовалюта. Цены меняются каждую секунду.',
    'market.portfoliovalue':'Стоимость портфеля','market.cash':'Свободные средства',
    'market.stocks':'📈 Акции','market.crypto':'🪙 Крипто','market.currency':'Валютные коридоры',
    'estate.sub':'Недвижимость и статус-символы — оба дают постоянный буст к доходу',
    'estate.realestate':'🏢 Недвижимость','estate.status':'🚗 Статус',
    'estate.currentboost':'Текущий буст дохода','estate.reptoboost':'Репутация → буст дохода',
    'inbox.sub':'Всё, что требует внимания — в одном месте',
    'settings.backtomenu':'🏠 Вернуться в главное меню',
    'settings.tab.design':'🎨 Дизайн','settings.tab.mode':'🎯 Режим игры','settings.tab.progress':'🏆 Прогресс','settings.tab.social':'👥 Сообщество','settings.tab.data':'💾 Данные',
    'settings.modes.title':'Режимы игры скоро появятся','settings.modes.sub':'Сайты, приложения и нейросети как отдельные режимы — в разработке',
    'settings.eventnotif':'Уведомления о событиях','settings.theme':'🎨 Тема оформления',
    'settings.soundfx':'🔊 Звуковые эффекты','settings.music':'🎵 Музыка','settings.musicvolume':'🔈 Громкость музыки',
    'settings.aiaccent':'🧠 Фиолетовый акцент для нейросетей','settings.aiaccentfree':'(бесплатно)',
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
    'nav.dash':'Dashboard', 'nav.sites':'Business', 'nav.market':'Market', 'nav.estate':'Property', 'nav.inbox':'Notifications', 'nav.settings':'More',
    'title.dash':'Overview', 'title.sites':'My Business', 'title.market':'Stock Market', 'title.estate':'Property', 'title.inbox':'Notifications', 'title.settings':'Settings',
    'settings.lang':'Язык / Language', 'settings.social':'Community',
    'mm.play':'🚀 Play', 'mm.continue':'▶ Continue', 'mm.settings':'⚙️ Settings',
    'mm.howtoplay':'❓ How to play', 'mm.about':'👤 About the author',
    'mm.tag':'Digital Tycoon — build your digital empire',
    'mm.foot':'v2.1 · progress saves automatically',
    'setup.title':'Before you start',
    'setup.sub':'Introduce yourself and pick a difficulty — visible later, but not changeable',
    'setup.namelabel':'What\'s your name?',
    'setup.difflabel':'Difficulty',
    'setup.start':'🚀 Start business',
    'ending.title':'The parents come back',
    'ending.tag':'Three rebirths behind you. "We underestimated you," your parents say. "Maybe we should join forces?"',
    'ending.endless':'🤝 Join forces with your parents',
    'ending.continue':'💼 Refuse — build your own empire',
    'speedfx.label':'Boost',
    'dash.networth':'Net worth','dash.cash':'Cash','dash.incomepersec':'Income/sec','dash.portfolio':'Portfolio','dash.reputation':'Reputation',
    'dash.activeevents':'⚡ Active events','dash.moretoggle':'More: rank, rebirth, finances, history','dash.smarttip':'Smart tip','dash.techtree':'Tech tree','dash.regions':'Regions',
    
    // RULE: dashboard cards must never show a literal "Загрузка"/"Loading"
    // placeholder — renderDash()/renderAll() runs synchronously as part of
    // boot, before the dashboard is ever painted on screen, so by the time
    // a person can actually see these cards their real render function has
    // already run. A "Loading..." placeholder was therefore always either
    // a lie (nothing was ever loading) or, worse, a sign the card's real
    // render function was never wired up at all (see renderTrainingCard()
    // below, which used to not exist). Use a neutral status dash '—'
    // instead — if it's ever visibly stuck, that's the bug to go fix, not
    // a placeholder to leave in place.
    'dash.nextrank':'To next rank: —','dash.seasonevent':'Weekly event','dash.loading':'',
    'dash.taxes':'Taxes',
    'dash.quickactions':'Quick actions','dash.upgradebiz':'Upgrade business','dash.upgradebizsub':'Choose what to improve','dash.gotosites':'Go to sites',
    'dash.leaderboard':'Competitor leaderboard','dash.leaderboardsub':'Compare your empire with local NPCs','dash.openleaderboard':'Open leaderboard',
    'dash.eventfeed':'Event feed',
    'sites.sub':'Upgrade design, traffic, and infrastructure — and place ads separately for quick cash',
    'sites.recipebook':'📖 Hybrid recipe book',
    'market.sub':'Stocks and crypto. Prices change every second.',
    'market.portfoliovalue':'Portfolio value','market.cash':'Available cash',
    'market.stocks':'📈 Stocks','market.crypto':'🪙 Crypto','market.currency':'Currency corridors',
    'estate.sub':'Real estate and status symbols — both give a permanent income boost',
    'estate.realestate':'🏢 Real estate','estate.status':'🚗 Status',
    'estate.currentboost':'Current income boost','estate.reptoboost':'Reputation → income boost',
    'inbox.sub':'Everything that needs attention — in one place',
    'settings.backtomenu':'🏠 Back to main menu',
    'settings.tab.design':'🎨 Design','settings.tab.mode':'🎯 Game mode','settings.tab.progress':'🏆 Progress','settings.tab.social':'👥 Community','settings.tab.data':'💾 Data',
    'settings.modes.title':'Game modes coming soon','settings.modes.sub':'Sites, apps, and neural networks as separate modes — in development',
    'settings.eventnotif':'Event notifications','settings.theme':'🎨 Interface theme',
    'settings.soundfx':'🔊 Sound effects','settings.music':'🎵 Music','settings.musicvolume':'🔈 Music volume',
    'settings.aiaccent':'🧠 Purple accent for neural networks','settings.aiaccentfree':'(free)',
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
  // ITEM 10 FIX: this used to select 'span:last-child', which — despite
  // reading like "the last of the button's two spans" — is a CSS
  // structural selector matched against the WHOLE subtree, not just
  // direct children. The inbox tab's icon span wraps the badge-dot span
  // inside it, and that inner badge span (being the only element child of
  // .ic) also satisfies ":last-child" — and comes first in document order,
  // so querySelector grabbed the badge instead of the label and overwrote
  // its digit with the word "Notifications"/"Уведомления" on every
  // language switch. Targeting the explicit .nav-label class removes the
  // ambiguity entirely.
  document.querySelectorAll('.nav-item').forEach(btn=>{
    const scr = btn.dataset.screen;
    const span = btn.querySelector('.nav-label');
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
      name: 'Digital Empire — Digital Tycoon',
      short_name: 'Digital Empire',
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
        toast(tr('❌ Файл не похож на сохранение Digital Empire','❌ This file does not look like a Digital Empire save')); return;
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
  runDayRollover();
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
  if(state.settings.aiAccent) applyUiAccent();
  if(hasSavedProgress()){
    const offline = computeOfflineEarnings();
    const streak = checkDailyStreak();
    if(offline || streak){
      pendingWelcomeBack = Object.assign({}, offline, streak);
      checkAchievements();
    }
    checkReputationTierEvents();
  }
  state.lastSeen = Date.now();
  renderSettings();
  renderLog();
  renderAll();
  applyLanguage();
  showMainMenu();
  updateGameClock();
  updateStarterBoostBadge();
  if(state.settings.music){
    const armMusic = ()=>{ startMusicLoop(); document.removeEventListener('click', armMusic); document.removeEventListener('touchend', armMusic); };
    document.addEventListener('click', armMusic, {once:true});
    document.addEventListener('touchend', armMusic, {once:true});
  }
})();