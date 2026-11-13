'use strict';

const main = document.querySelector('main');
let current = { page:'home',id:'',params:new URLSearchParams() };
let flash = '';

function render({focus = false, scroll = false} = {}) {
  const [path, query] = location.hash.slice(1).split('?');
  const [page, encodedId] = (path || 'home').split('/');
  let id;
  try { id = decodeURIComponent(encodedId || ''); } catch { id = ''; }
  const params = new URLSearchParams(query);
  const landlord = landlordById(id);
  current = {page,id,params};
  let body;
  if (page === 'home') body = homeView();
  else if (page === 'results') body = resultsView(params);
  else if (page === 'profile' && landlord) body = profileView(landlord,params);
  else if (page === 'review' && landlord) {
    const edit = state.reviews.find(r => r.id === params.get('edit') && r.landlord === id && r.owner && r.owner === state.active);
    body = reviewView(landlord,edit || state.drafts[draftKey(id)] || {},edit?.id || '');
  } else if (page === 'review' && !id) body = chooseView();
  else if (page === 'add') body = addView();
  else if (page === 'account') body = accountView(params);
  else if (Object.hasOwn(infoPages,page)) {
    const [title,copy] = infoPages[page];
    body = `<div class="review-width inner"><h1>${title}</h1><p>${copy}</p><a class="button" href="#home">Return to Home</a></div>`;
  } else body = '<div class="review-width inner"><h1>Page not found</h1><a class="button" href="#results">Browse landlords</a></div>';
  main.innerHTML = (flash ? '<p class="flash" role="status">'+html(flash)+'</p>' : '') + body;
  flash = '';
  const heading = main.querySelector('h1');
  document.title = page === 'home' ? 'OpenLandlord' : heading.textContent + ' | OpenLandlord';
  document.querySelector('#account-link').textContent = activeAccount() ? 'My Reviews' : 'Log In';
  if (scroll) window.scrollTo(0,0);
  if (focus) main.focus({preventScroll:true});
}
const navigate = url => { if (location.hash === url) render(); else location.hash = url; };
const message = text => { const el = document.querySelector('#form-message'); if (el) el.textContent = text; };
const draftKey = id => (state.active || 'guest') + ':' + id;
const saveFailure = 'This browser could not save the change. Check your browser storage settings and try again.';
function formValues(form) {
  const values = {};
  for (const [name, value] of new FormData(form)) {
    values[name] = value.trim();
  }
  return values;
}
document.querySelector('#skip').addEventListener('click', event => { event.preventDefault(); main.focus(); });
window.addEventListener('hashchange', event => {
  const prev = new URL(event.oldURL).hash.split('?')[0];
  const next = new URL(event.newURL).hash.split('?')[0];
  const changedPage = prev !== next;
  render({focus:changedPage,scroll:changedPage});
});
main.addEventListener('submit', event => {
  const form = event.target;
  event.preventDefault();
  const data = formValues(form);
  if (form.dataset.form === 'search') {
    if (normalize(data.query)) navigate(resultsUrl(data.query));
    else {
      const input = form.querySelector('input');
      input.setCustomValidity('Enter a landlord name or property address.');
      input.reportValidity();
    }
  }
  if (form.dataset.form === 'add') {
    if (!data.name || !data.address || !data.city) return message('Enter a name, address, and city.');
    const same = landlords().find(l => normalize(l.name) === normalize(data.name) && normalize(l.address) === normalize(data.address) && normalize(l.city) === normalize(data.city));
    if (same) return message('This landlord and property are already listed. Search the directory to find the profile.');
    const id = makeId();
    if (!changeState(next => next.landlords.push({...data,id,short:data.name,area:data.city,buildings:[data.address]}))) return message(saveFailure);
    flash = 'Landlord added to your local directory.';
    navigate(profileUrl(id));
  }
  if (form.dataset.form === 'account') {
    if (!data.name) return message('Enter a profile name.');
    let account = state.accounts.find(a => normalize(a.name) === normalize(data.name));
    if (form.dataset.mode === 'new' && account) return message('This profile name already exists. Open the existing profile instead.');
    if (form.dataset.mode === 'open' && !account) return message('No local profile matches that name.');
    if (!account) account = {id:makeId(),name:data.name};
    if (!changeState(next => {
      if (!next.accounts.some(a => a.id === account.id)) next.accounts.push(account);
      next.active = account.id;
    })) return message(saveFailure);
    navigate('#account');
  }
  if (form.dataset.form === 'review') {
    const l = landlordById(form.dataset.landlord);
    const old = state.reviews.find(r => r.id === form.dataset.editing && r.landlord === l.id && r.owner && r.owner === state.active);
    if (form.dataset.editing && !old) return message('Open your local profile to edit this review.');
    const invalidReview = 'Choose all five ratings and enter a headline and review.';
    const validRatings = ['1', '2', '3', '4', '5'];
    const ratingFields = ['overall'];
    for (const category of categories) {
      ratingFields.push(category[0]);
    }
    for (const name of ratingFields) {
      if (!validRatings.includes(data[name])) return message(invalidReview);
      data[name] = Number(data[name]);
    }

    const validBuilding = l.buildings.includes(data.property);
    const validStatus = ['Current Tenant', 'Former Tenant'].includes(data.status);
    if (!validBuilding || !validStatus || !data.headline || !data.body || data.body.length > 1200) {
      return message(invalidReview);
    }

    const record = {
      ...data,
      landlord: l.id,
      id: old?.id || makeId(),
      date: old?.date || new Date().toISOString(),
      owner: activeAccount()?.id || null,
      helpful: old?.helpful || 0
    };
    if (!changeState(next => {
      if (old) {
        const index = next.reviews.findIndex(review => review.id === old.id);
        next.reviews[index] = record;
      } else {
        next.reviews.push(record);
      }
      delete next.drafts[draftKey(l.id)];
    })) return message(saveFailure);
    flash = old ? 'Review updated.' : 'Review saved to this browser.';
    navigate(profileUrl(l.id));
  }
});
main.addEventListener('input', event => {
  if (event.target.name === 'query') event.target.setCustomValidity('');
  if (event.target.name === 'body') document.querySelector('#review-count').textContent = event.target.value.length + ' / 1200 characters';
});
main.addEventListener('change', event => {
  const field = event.target;
  const form = field.form;
  if (!form) return;
  if (form.dataset.form === 'results-filters') {
    const data = new FormData(form);
    const params = new URLSearchParams();
    if (form.dataset.query) params.set('q',form.dataset.query);
    if (data.get('min') !== '0') params.set('min',data.get('min'));
    if (data.get('sort') !== 'highest') params.set('sort',data.get('sort'));
    data.getAll('area').forEach(area=>params.append('area',area));
    navigate('#results' + (params.size ? '?' + params : ''));
  }
  if (form.dataset.form === 'profile-filters') {
    const params = new URLSearchParams(current.params);
    params.delete('page');
    if (field.value) params.set(field.name,field.value); else params.delete(field.name);
    navigate(profileUrl(current.id) + (params.size ? '?' + params : ''));
  }
  if (field.name === 'overall') {
    document.querySelector('#rating-value').textContent = score(Number(field.value));
    document.querySelectorAll('[data-star]').forEach(star => {
      star.src = 'assets/review-' + (Number(star.dataset.star) <= Number(field.value) ? 'imgButton' : 'imgButton1') + '.svg';
    });
  }
});
main.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const {action,id} = button.dataset;
  if (action === 'save-draft') {
    const key = draftKey(button.form.dataset.landlord);
    message(changeState(next => { next.drafts[key] = formValues(button.form); }) ? 'Draft saved in this browser.' : saveFailure);
  }
  if (action === 'helpful') {
    if (changeState(next => { next.votes = next.votes.includes(id) ? next.votes.filter(v => v !== id) : [...next.votes,id]; })) {
      render();
      main.querySelector('[data-id="' + CSS.escape(id) + '"]')?.focus();
    }
  }
  if (action === 'logout' && changeState(next=>{next.active=null;})) render({focus:true});
  if (action === 'delete-review' && activeAccount() && state.reviews.some(r => r.id === id && r.owner === state.active) && confirm('Delete this review?')) {
    if (changeState(next=>{next.reviews=next.reviews.filter(r=>r.id!==id);next.votes=next.votes.filter(v=>v!==id);})) {
      flash = 'Review deleted.';
      render({focus:true});
    }
  }
});
render();
