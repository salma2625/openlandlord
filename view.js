'use strict';

const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (page, name) => '<img class="icon" alt="" src="assets/' + page + '-' + name + '.svg">';
const dateLabel = value => new Date(value.slice(0,10) + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const score = value => value === null ? '—' : value.toFixed(1);
const profileUrl = id => '#profile/' + encodeURIComponent(id);
const reviewUrl = id => '#review/' + encodeURIComponent(id);
const resultsUrl = (query = '', extra = {}) => {
  const params = new URLSearchParams({...extra});
  if (query) params.set('q',query);
  return '#results' + (params.size ? '?' + params : '');
};
const selectOptions = (values, selected) => values.map(([v, label]) =>
  '<option value="' + html(v) + '"' + (v === selected ? ' selected' : '') + '>' + html(label) + '</option>').join('');

function searchForm(query = '') {
  return `<form class="search-form" data-form="search"><label class="sr" for="query">Landlord name, company, or building address</label>
  ${icon('home','imgContainer')}<input id="query" name="query" type="search" value="${html(query)}" placeholder="Landlord name, company, or building address…" required>
  <button class="button black">Search</button></form>`;
}

function homeView() {
  const recent = ['cedar','midwest','bay'].map(id => {
    const landlord = landlordById(id);
    const review = reviewsFor(id).at(-1);
    return `<article class="card recent-card"><div class="split"><strong class="${review.overall < 2 ? 'red' : review.overall < 4 ? 'amber' : 'teal'}">${score(review.overall)}</strong><span class="muted">${html(landlord.city)}</span></div>
    <h3><a href="${profileUrl(id)}">${html(landlord.name)}</a></h3><p class="quote">“${html(review.body)}”</p>
    <div class="split recent-meta muted"><span>${review.sample ? 'Sample review' : 'Tenant review'}</span><time datetime="${html(review.date)}">${dateLabel(review.date)}</time></div></article>`;
  }).join('');
  return `<section class="home-hero"><div class="hero-inner"><h1>Find and review landlords</h1><p>Search landlords, property managers, and apartment buildings in the sample directory.</p>
  ${searchForm()}<div class="examples">Try searching: ${['Apex Ridge','Oakwood','Lakeview','Chicago, IL'].map(q => `<a href="${resultsUrl(q)}">${html(q)}</a>`).join(' <span aria-hidden="true">•</span> ')}</div></div></section>
  <section class="recent"><div class="home-width"><div class="split section-top"><h2>Recent Reviews</h2><a href="#results">Browse landlords</a></div><div class="three">${recent}</div></div></section>
`;
}

function resultsView(params) {
  const query = params.get('q') || '';
  const min = ['3','4'].includes(params.get('min')) ? params.get('min') : '0';
  const sort = ['highest','lowest','name'].includes(params.get('sort')) ? params.get('sort') : 'highest';
  const areas = params.getAll('area');
  const candidates = matchingLandlords(query).map(landlord => {
    const reviews = reviewsFor(landlord.id);
    return {landlord,reviews,rating:average(reviews)};
  });
  const neighborhoods = [...new Set(candidates.map(({landlord}) => landlord.neighborhood).filter(Boolean))].sort();
  const inAreas = candidates.filter(({landlord}) => !areas.length || areas.includes(landlord.neighborhood));
  const filtered = inAreas.filter(({rating}) => min === '0' || rating >= Number(min));
  filtered.sort((a,b) => {
    if (sort === 'name') return a.landlord.name.localeCompare(b.landlord.name);
    if (a.rating === null || b.rating === null) return Number(a.rating === null) - Number(b.rating === null);
    return sort === 'lowest' ? a.rating - b.rating : b.rating - a.rating;
  });
  const cards = filtered.map(({landlord:l,reviews,rating}) => {
    let tone = '';
    if (rating !== null && rating < 3) tone = 'low';
    if (rating !== null && rating >= 4) tone = 'high';
    const pin = tone === 'low' ? 'imgContainer4' : 'imgContainer2';
    const stars = Array.from({length:5},(_,i) => icon('results',i < Math.round(rating) ? 'imgIcon2' : 'imgIcon3')).join('');
    return `<article class="card result-card"><div class="rating-box ${tone}"><strong>${score(rating)}</strong><span class="stars" aria-label="${rating === null ? 'Unrated' : score(rating)+' out of 5'}">${rating === null ? '' : stars}</span></div>
    <div class="result-copy"><h2><a href="${profileUrl(l.id)}">${html(l.name)}</a></h2><span class="result-count">${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}</span>
    <p class="location">${icon('results',pin)}${html([l.address,l.city,l.neighborhood && '('+l.neighborhood+')'].filter(Boolean).join(', ').replace(', (',' ('))}</p>
    <p class="result-quote">${reviews.length ? '“'+html(reviews.at(-1).body)+'”' : 'No tenant reviews yet.'}</p></div>
    <a class="button ${tone === 'low' ? 'pale' : ''}" href="${profileUrl(l.id)}">View profile</a></article>`;
  }).join('');
  return `<div class="page"><div class="split breadcrumbs"><span><a href="#home">Home</a> ${icon('results','imgContainer')} Sample Directory ${icon('results','imgContainer')} <b>Search Results</b></span><span>Sample directory</span></div>
  <section class="card results-head"><div class="split"><div><h1>${query ? 'Results for “'+html(query)+'”' : 'Browse landlords'}</h1><p>${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'} found</p></div>
  <label class="sort-label">Sort: <select form="results-filters" name="sort">${selectOptions([['highest','Highest Rated'],['lowest','Lowest Rated'],['name','Name A–Z']],sort)}</select></label></div>
  <div class="result-actions">${query ? `<span>Filter:</span> <a class="pill" href="#results">${html(query)} ${icon('results','imgContainer1')}</a>` : ''}<a href="#home">New search</a> <a href="#add">Add a landlord</a></div></section>
  <div class="results-grid"><form class="card filters" id="results-filters" data-form="results-filters" data-query="${html(query)}"><div class="split"><h2>Filters</h2><a href="${resultsUrl(query)}">Reset</a></div>
  <fieldset><legend>Minimum Rating</legend>${[['4','4.0+ Stars'],['3','3.0+ Stars'],['0','All Ratings']].map(([v,label]) => `<label class="filter-option"><input type="radio" name="min" value="${v}" ${min===v ? 'checked' : ''}>${v==='0' ? '' : `<span class="stars" aria-hidden="true">${icon('results','imgIcon1').repeat(Number(v))}</span>`}<span>${label}</span><small>${inAreas.filter(({rating})=>v==='0'||rating>=Number(v)).length}</small></label>`).join('')}</fieldset>
  <fieldset><legend>Neighborhood</legend>${neighborhoods.map(a => `<label class="filter-option"><input type="checkbox" name="area" value="${html(a)}" ${areas.includes(a) ? 'checked' : ''}>${html(a)}</label>`).join('') || '<small>No neighborhoods to filter.</small>'}</fieldset>
  </form><section aria-label="Matching landlords">${cards || '<div class="card empty"><h2>No matching landlords</h2><p>Try another name or address, reset the filters, or add the landlord.</p><a class="button" href="#add">Add a landlord</a></div>'}</section></div></div>`;
}

function profileView(l, params) {
  const all = reviewsFor(l.id);
  const sort = params.get('sort') || 'recent';
  const property = params.get('property') || '';
  const year = params.get('year') || '';
  const voteCount = review => review.helpful + Number(state.votes.includes(review.id));
  const sorts = {recent:(a,b)=>b.date.localeCompare(a.date),highest:(a,b)=>b.overall-a.overall,lowest:(a,b)=>a.overall-b.overall,helpful:(a,b)=>voteCount(b)-voteCount(a)};
  const list = all.filter(r => (!property || r.property === property) && (!year || r.date.startsWith(year))).sort(sorts[sort] || sorts.recent);
  const pages = Math.max(1,Math.ceil(list.length/3));
  const page = Math.min(pages,Math.max(1,Number.parseInt(params.get('page'),10)||1));
  const link = (key,val) => {
    const next = new URLSearchParams(params);
    if (key !== 'page') next.delete('page');
    if (val) next.set(key,val); else next.delete(key);
    return profileUrl(l.id) + (next.size ? '?' + next : '');
  };
  const bars = categories.map(([key,,label]) => {
    const rating = average(all,key);
    return `<div><span>${label}</span><b>${score(rating)}</b> / 5 </div>`;
  }).join('');
  const cards = list.slice((page-1)*3,page*3).map(r => `<article class="card tenant-review"><div class="split"><span class="review-score ${r.overall < 2 ? 'red' : 'teal'}"><span class="stars" aria-hidden="true">${Array.from({length:5},(_,i)=>icon('profile',i<r.overall ? (r.overall<2?'imgIcon2':'imgIcon') : 'imgIcon1')).join('')}</span> <strong>${score(r.overall)}</strong><span class="sr"> out of 5</span></span><time datetime="${html(r.date)}">${dateLabel(r.date)}</time></div>
  <p class="review-meta">${r.sample ? 'Sample review · ' : ''}${html(r.status)} · ${html(r.property)}</p>${r.headline ? '<h3>'+html(r.headline)+'</h3>' : ''}<p class="review-body">${html(r.body)}</p>
  ${r.pros ? '<p><b>Pros</b> '+html(r.pros)+'</p>' : ''}${r.cons ? '<p><b>Cons</b> '+html(r.cons)+'</p>' : ''}
  <div class="split"><small>${voteCount(r)} tenants found this helpful</small><button class="text-button" data-action="helpful" data-id="${html(r.id)}" aria-pressed="${state.votes.includes(r.id)}">Helpful</button></div></article>`).join('');
  const years = [...new Set(all.map(r => r.date.slice(0,4)))].sort().reverse();
  return `<div class="page profile-page"><div class="breadcrumbs"><a href="#results">Sample Directory</a> ${icon('profile','imgContainer')} <span>${html(l.city)}</span> ${icon('profile','imgContainer')} <b>${html(l.short)}</b></div>
  <section class="card profile-hero"><div class="split"><div><h1>${html(l.name)}</h1><p class="location">${icon('profile','imgContainer1')}${html(l.area)} · ${html(l.address)}</p><p class="profile-score">${icon('profile','imgContainer2')} <strong>${score(average(all))}</strong> / 5.0 <span>· ${all.length} total reviews</span></p></div>
  <a class="button black" href="${reviewUrl(l.id)}">${icon('profile','imgContainer3')} Write a Review</a></div><div class="rating-bars">${bars}</div></section>
  <div class="profile-grid"><section aria-label="Tenant reviews">
  <form class="card controls split" id="profile-filters" data-form="profile-filters"><div class="sort-label">Sort: <span class="segments">${[['recent','Most Recent'],['highest','Highest'],['lowest','Lowest'],['helpful','Most Helpful']].map(([v,label])=>`<a href="${link('sort',v)}" ${sort===v?'aria-current="true"':''}>${label}</a>`).join('')}</span></div>
  <div class="control-selects"><select aria-label="Managed building" name="property">${selectOptions([['','All Managed Buildings ('+l.buildings.length+')'],...l.buildings.map(b=>[b,b])],property)}</select>
  <select aria-label="Review year" name="year">${selectOptions([['','All Review Years'],...years.map(y=>[y,y])],year)}</select></div></form>
  ${cards || '<div class="card empty"><h2>No reviews to show</h2><p>Change the filters or write the first review for this listing.</p></div>'}
  <div class="card pagination split"><span>Showing ${list.length ? Math.min(page*3,list.length) : 0} of ${list.length} tenant reviews</span><div>
  ${page>1?`<a class="button pale" href="${link('page',page-1)}">Previous</a>`:'<button class="button pale" disabled>Previous</button>'}
  ${page<pages?`<a class="button" href="${link('page',page+1)}">Next Page</a>`:'<button class="button" disabled>Next Page</button>'}</div></div></section>
  <aside class="card properties"><div class="split"><h2>Managed Properties</h2><small>${l.buildings.length} buildings</small></div>
  ${l.buildings.map(b=>`<a class="property split" href="${link('property',b)}"><span><b>${html(b)}</b><br>${html(l.city)}</span><b>${score(average(all.filter(r=>r.property===b)))} ★</b></a>`).join('')}
  <a class="button pale" href="${link('property','')}">View All ${l.buildings.length} Properties</a></aside></div></div>`;
}

function reviewView(l, draft = {}, editing = '') {
  const categoryRows = categories.map(([key,label,,labels]) =>
    `<fieldset class="category"><legend class="sr">${html(label)}</legend><span aria-hidden="true">${html(label)}</span><div class="category-options">${labels.map((option,i)=>`<label><input class="sr" type="radio" name="${key}" value="${i+1}" required ${Number(draft[key])===i+1?'checked':''}><span>${i+1} – ${html(option)}</span></label>`).join('')}</div></fieldset>`).join('');
  return `<div class="review-page"><div class="review-width"><header class="review-head"><h1>${editing ? 'Edit review for ' : 'Rate '}${html(l.short)}</h1>
  <p class="location">${icon('review','imgContainer')}${html(l.address)}, ${html(l.city)}</p><small>Your name is hidden on the review. Share your experience to help future renters.</small></header>
  <form class="card review-form" id="review-form" data-form="review" data-landlord="${html(l.id)}" data-editing="${html(editing)}">
  <fieldset class="overall"><legend>Overall Rating</legend><p>How would you rate your overall experience living here?</p>
  <div class="overall-options">${[1,2,3,4,5].map(v=>`<label><input class="sr" type="radio" name="overall" value="${v}" required ${Number(draft.overall)===v?'checked':''}><span class="sr">${v} ${v===1?'star':'stars'}</span><img class="icon" data-star="${v}" alt="" src="assets/review-${v<=Number(draft.overall)?'imgButton':'imgButton1'}.svg"></label>`).join('')} <output id="rating-value">${draft.overall ? score(Number(draft.overall)) : '—'}</output></div></fieldset>
  <h2>Rate by Category</h2>${categoryRows}
  <div class="two field-row"><label>Building or Unit<select required name="property">${selectOptions(l.buildings.map(b=>[b,b]),draft.property||l.buildings[0])}</select></label>
  <label>Rental Status<select required name="status">${selectOptions([['Current Tenant','Current Tenant'],['Former Tenant','Former Tenant']],draft.status||'Current Tenant')}</select></label></div>
  <fieldset class="recommend"><legend class="sr">Would you rent here again?</legend><div><b>Would you rent here again?</b><small>Would you recommend this place to a friend?</small></div>
  <div>${[['Yes','imgContainer1'],['No','imgContainer2']].map(([v,img])=>`<label><input class="sr" type="radio" name="recommend" value="${v}" ${draft.recommend===v?'checked':''}><span>${icon('review',img)} ${v}</span></label>`).join('')}</div></fieldset>
  <label class="field">Headline<input name="headline" value="${html(draft.headline)}" maxlength="100" required placeholder="Summarize your experience"></label>
  <label class="field"><span class="split">Your Review <small id="review-count">${(draft.body||'').length} / 1200 characters</small></span><textarea name="body" rows="5" maxlength="1200" required placeholder="What should a future renter know?">${html(draft.body)}</textarea></label>
  <div class="two field-row"><label class="teal">${icon('review','imgContainer3')} Pros<input name="pros" value="${html(draft.pros)}" maxlength="140" placeholder="What went well?"></label>
  <label class="red">${icon('review','imgContainer4')} Cons<input name="cons" value="${html(draft.cons)}" maxlength="140" placeholder="What could improve?"></label></div>
  
  <p id="form-message" class="message" role="status"></p><div class="split form-actions"><a href="${profileUrl(l.id)}">Cancel</a><div><button type="button" class="button pale" data-action="save-draft">Save Draft</button> <button class="button">${icon('review','imgContainer7')} ${editing?'Save Changes':'Submit Review'}</button></div></div></form></div></div>`;
}

function addView() {
  return `<div class="review-width inner"><h1>Add a landlord</h1><p>Add a missing listing to this browser’s directory.</p><form class="card simple-form" data-form="add">
  <label>Landlord or company name<input name="name" maxlength="100" required></label><label>Property address<input name="address" maxlength="120" required></label>
  <div class="two"><label>City and state<input name="city" maxlength="80" required></label><label>Neighborhood <small>(optional)</small><input name="neighborhood" maxlength="80"></label></div>
  <p class="message" id="form-message" role="status"></p><div class="split"><a href="#results">Cancel</a><button class="button">Add landlord</button></div></form></div>`;
}
function accountView(params) {
  const account = activeAccount();
  if (!account) return `<div class="review-width inner"><h1>Local review account</h1><p>Create or open a named profile to manage reviews in this browser.</p><form class="card simple-form" data-form="account" data-mode="${params.has('new')?'new':'open'}">
  <label>Profile name<input name="name" maxlength="60" required autocomplete="off"></label><p class="message" id="form-message" role="status"></p><div class="split">
  <a href="${params.has('new')?'#account':'#account?new=1'}">${params.has('new')?'Open an existing profile':'Create a profile'}</a><button class="button">${params.has('new')?'Create profile':'Open profile'}</button></div></form></div>`;
  return `<div class="review-width inner"><div class="split"><h1>My reviews</h1><button class="button black" data-action="logout">Log Out</button></div><p>Local profile for ${html(account.name)}</p>
  ${state.reviews.filter(r=>r.owner===account.id).map(r=>`<article class="card manage"><h2>${html(r.headline)}</h2><p><a href="${profileUrl(r.landlord)}">${html(landlordById(r.landlord)?.name)}</a> · ${score(r.overall)} / 5</p><div class="manage-actions"><a class="button pale" href="${reviewUrl(r.landlord)}?edit=${encodeURIComponent(r.id)}">Edit review</a> <button class="button pale" data-action="delete-review" data-id="${html(r.id)}">Delete review</button></div></article>`).join('') || '<p>No reviews yet. <a href="#review">Write a review</a></p>'}</div>`;
}
function chooseView() {
  return `<div class="review-width inner"><h1>Write a review</h1><p>Choose the landlord you rented from.</p><div class="card choose">${landlords().map(l=>`<a class="property split" href="${reviewUrl(l.id)}"><span><b>${html(l.name)}</b><br>${html(l.address)}, ${html(l.city)}</span><span>Review →</span></a>`).join('')}</div><p><a href="#add">Add a landlord</a></p></div>`;
}
const infoPages = {
  about:['About OpenLandlord','OpenLandlord helps prospective renters learn from current and former tenants before signing a lease. Browse sample listings, compare ratings, or try writing a review.'],
  guidelines:['Review Guidelines','Describe your own rental experience. Focus on facts such as maintenance response, communication, and deposit handling. Leave out personal contact details and lease documents.'],
  privacy:['Privacy','This classroom prototype stores profiles, reviews, drafts, and listings in your browser. Other visitors have their own copy of the sample directory.'],
  terms:['About the Sample Data','The directory is for demonstration and contains fictional listings and sample reviews. It does not use a municipal registry.'],
  contact:['Project Contact','OpenLandlord is an INST 630 class project. The prototype does not collect contact messages.']
};
