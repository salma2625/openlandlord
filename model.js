'use strict';

const categories = [
  ['maintenance', 'Maintenance & Repairs', 'Maintenance', ['Terrible', 'Poor', 'Okay', 'Good', 'Great']],
  ['communication', 'Landlord Communication', 'Communication', ['Hostile', 'Slow', 'Neutral', 'Responsive', 'Stellar']],
  ['fairness', 'Value & Deposit Fairness', 'Deposit Fairness', ['Unfair', 'Overpriced', 'Fair', 'Good Value', 'Honest']],
  ['privacy', 'Privacy Respect', 'Privacy Respect', ['Poor', 'Fair', 'Okay', 'Good', 'Great']]
];

const apex = {
  id:'apex', name:'Apex Ridge Residential Management', short:'Apex Ridge Residential', city:'Chicago, IL',
  area:'Chicago & Evanston, IL', address:'123 N Random Ave', neighborhood:'Lincoln Park',
  buildings:['814 Elm St','1204 Sheridan Rd','2219 N Clark St','1630 N Paulina St']
};

function listing(id, name, address, city, neighborhood) {
  return { id, name, address, city, neighborhood, short: name, area: city, buildings: [address] };
}

const directory = [
  apex,
  listing('oakwood', 'Oakwood Ridge Residential', '742 Evergreen Terrace', 'Chicago, IL', 'Lincoln Park'),
  listing('miller', 'David Miller Real Estate', '2108 N Milwaukee Ave', 'Chicago, IL', 'Logan Square'),
  listing('lakeview', 'Lakeview Metro Living LLC', '3410 N Broadway', 'Chicago, IL', 'Lakeview'),
  listing('greenbriar', 'Greenbriar Management', '4820 N Damen Ave', 'Chicago, IL', 'Lincoln Square'),
  listing('cedar', 'Cedar Grove Properties', '18 Juniper Lane', 'Portland, OR', 'Cedar Mill'),
  listing('midwest', 'Midwest Urban Living', '71 West Oak St', 'Chicago, IL', 'Lincoln Park'),
  listing('bay', 'Bay Ridge Asset Group', '15 Bay Ave', 'Boston, MA', 'Bay Village')
];

function sample(id, landlord, overall, date, property, status, body, helpful = 0, ratings = [overall,overall,overall,overall]) {
  const review = {
    id, landlord, overall, date, property, status, body, helpful,
    headline:'', owner:null, sample:true
  };
  for (let i = 0; i < categories.length; i++) {
    const categoryKey = categories[i][0];
    review[categoryKey] = ratings[i];
  }
  return review;
}

const sampleReviews = [
  sample('s1','apex',4,'2024-11-14','814 Elm St','Former Tenant','Lived in the 814 Elm building for two consecutive years. Management is responsive and significantly better than average. When the radiator had pressure issues during the January polar vortex, emergency maintenance arrived in under 3 hours with backup heating while repairs were completed overnight. Only critique is minor deductions from the security deposit for routine cleaning.',34,[4,4,3,5]),
  sample('s2','apex',1,'2024-09-28','1204 Sheridan Rd','Former Tenant','Had repeated unresolved issues with ceiling pipe leakage that went unattended for over a month. Maintenance entered multiple times without adequate notice, and amounts were withheld from the deposit for damage caused by plumbing.',52,[1,2,1,2]),
  sample('s3','apex',5,'2024-08-12','2219 N Clark St','Current Tenant','Renewed for my fourth consecutive year on Clark St. The on-site superintendent is prompt, always resolving repair requests within 24 hours. Annual lease renewal terms and rent adjustments have remained fair and consistent.',19,[5,5,4,5]),
  sample('s4','apex',3,'2024-07-08','1630 N Paulina St','Former Tenant','The apartment was quiet, but routine requests took several reminders.',8,[3,3,3,4]),
  sample('s5','oakwood',4,'2025-01-12','742 Evergreen Terrace','Former Tenant','Radiator repairs were resolved in less than 12 hours during the winter cold snap.'),
  sample('s6','miller',2,'2025-01-11','2108 N Milwaukee Ave','Former Tenant','I had to follow up several times about the security deposit return.'),
  sample('s7','lakeview',4,'2025-01-10','3410 N Broadway','Current Tenant','Prompt common area heating maintenance and predictable lease renewals.'),
  sample('s8','greenbriar',5,'2025-01-09','4820 N Damen Ave','Current Tenant','Direct communication, clear utility charges, and no surprise fees.'),
  sample('s9','cedar',5,'2026-11-10','18 Juniper Lane','Former Tenant','Quick repairs and fair handling of deposits. Genuinely great landlords.'),
  sample('s10','midwest',3,'2026-11-07','71 West Oak St','Current Tenant','Elevator was out for three weeks. Office rarely picks up the phone.'),
  sample('s11','bay',1,'2026-11-05','15 Bay Ave','Former Tenant','Heating kept failing throughout winter. Took forever to get the security deposit back.')
];

const storageKey = 'openlandlord-inst630-v1';
const emptyState = { landlords:[], reviews:[], accounts:[], active:null, drafts:{}, votes:[] };
let state = structuredClone(emptyState);
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) state = {...state, ...JSON.parse(saved)};
} catch { /* The demo can still run for this tab. */ }

function changeState(apply) {
  const next = structuredClone(state);
  apply(next);
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    state = next;
    return true;
  } catch {
    return false;
  }
}

const landlords = () => [...directory, ...state.landlords];
const landlordById = id => landlords().find(landlord => landlord.id === id);
const reviewsFor = id => [...sampleReviews, ...state.reviews].filter(review => review.landlord === id);
function average(reviews, key = 'overall') {
  if (reviews.length === 0) return null;

  let total = 0;
  for (const review of reviews) {
    total += review[key];
  }
  return total / reviews.length;
}
const normalize = value => value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const makeId = () => globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2);
const activeAccount = () => state.accounts.find(account => account.id === state.active);
function matchingLandlords(query) {
  const words = normalize(query).split(' ').filter(Boolean);
  return landlords().filter(landlord => {
    const searchText = normalize([landlord.name, landlord.address, landlord.city, landlord.area, landlord.neighborhood, ...landlord.buildings].join(' '));
    return words.every(word => searchText.includes(word));
  });
}
