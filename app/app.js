'use strict';
const DB_NAME = 'wny-auto-rentals';
const DB_VERSION = 1;
const STORE = 'state';
let state;
let view = 'dashboard';
let selectedRental = '';
let dbPromise;

const $ = function (s) { return document.querySelector(s); };
const clone = function (x) { return JSON.parse(JSON.stringify(x)); };
const uid = function () { return window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); };
const today = function () { return new Date().toISOString().slice(0, 10); };
const money = function (c) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(c) || 0) / 100); };
const cents = function (x) { var n = String(x || '').replace(/[$,]/g, '').trim(); return n ? Math.round(Number(n) * 100) : 0; };
const fmtDate = function (d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; };
const addDays = function (d, n) { var x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const diffDays = function (a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); };
const esc = function (v) { return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; }); };
const val = function (form, name) { return new FormData(form).get(name) || ''; };
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function initialState() {
  var vehicles = [
    ['MGR7670', '', 'Toyota', 'Camry', 0, 'available'],
    ['MGR7671', '', 'Toyota', 'Corolla', 26500, 'rented'],
    ['MHV2116', '', 'Volkswagen', 'Passat', 29200, 'rented'],
    ['MHV2117', '', 'Honda', 'Civic Hybrid', 30000, 'rented'],
    ['MHV2167', '', 'Honda', 'HR-V', 30000, 'rented'],
    ['MHV3875', '', 'Honda', 'Odyssey', 31500, 'rented'],
    ['MHV2119', '', 'Toyota', 'Prius', 27000, 'rented'],
    ['MHV9366', '2019', 'Honda', 'Civic', 38000, 'rented']
  ].map(function (v) {
    return { id: uid(), plate: v[0], year: v[1], make: v[2], model: v[3], weeklyRate: v[4], ownership: 'partnership', status: v[5], vin: '', mileage: '', insuranceExpiry: '', registrationExpiry: '', notes: '', archived: false };
  });
  return { meta: { schema: 1, datasetId: uid(), revision: 0, nextReceipt: 1 }, vehicles: vehicles, renters: [], rentals: [], payments: [], audit: [], archived: [], credits: [] };
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve) {
    if (!window.indexedDB) return resolve(null);
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { resolve(null); };
  });
  return dbPromise;
}
async function loadState() {
  var db = await openDb();
  if (db) {
    var value = await new Promise(function (resolve) {
      var req = db.transaction(STORE, 'readonly').objectStore(STORE).get('state');
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
    });
    if (value) return value;
  }
  try { return JSON.parse(localStorage.getItem(DB_NAME)) || initialState(); } catch (e) { return initialState(); }
}
async function saveState() {
  var data = clone(state);
  var db = await openDb();
  if (db) await new Promise(function (resolve) {
    var req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, 'state');
    req.onsuccess = resolve; req.onerror = resolve;
  });
  try { localStorage.setItem(DB_NAME, JSON.stringify(data)); } catch (e) {}
}
async function commit(action) {
  state.meta.revision += 1;
  state.audit.push({ id: uid(), action: action || 'update', at: new Date().toISOString(), revision: state.meta.revision });
  await saveState();
  render();
}
function find(type, id) { return (state[type] || []).find(function (x) { return x.id === id; }); }
function vehicleName(id) { var v = find('vehicles', id); return v ? [v.plate, v.year, v.make, v.model].filter(Boolean).join(' ') : 'Unknown vehicle'; }
function renterName(id) { var r = find('renters', id); return r ? r.name : 'Unknown renter'; }
function rentalName(id) { var r = find('rentals', id); return r ? renterName(r.renterId) + ' · ' + vehicleName(r.vehicleId) : 'Unknown rental'; }
function activeVehicles() { return state.vehicles.filter(function (x) { return !x.archived; }); }
function activeRentals() { return state.rentals.filter(function (x) { return !x.archived && x.status === 'active'; }); }
function nextDue(start, weekday) {
  var delta = (Number(weekday) - new Date(start + 'T12:00:00').getDay() + 7) % 7;
  return addDays(start, delta);
}
function periods(rental, asOf) {
  asOf = asOf || today();
  var result = [], start = rental.startDate, firstDue = nextDue(rental.startDate, rental.dueWeekday), i = 0;
  var stop = rental.endDate || asOf;
  while (start <= stop && i < 520) {
    var rate = rental.weeklyCents;
    if (rental.rateHistory && rental.rateHistory.length) {
      var candidates = rental.rateHistory.filter(function (x) { return x.effectiveDate <= start; }).sort(function (a, b) { return a.effectiveDate.localeCompare(b.effectiveDate); });
      if (candidates.length) rate = candidates[candidates.length - 1].weeklyCents;
    }
    result.push({ key: rental.id + '|' + start, start: start, due: addDays(firstDue, i * 7), end: addDays(start, 6), rent: rate });
    start = addDays(start, 7); i++;
  }
  return result;
}
function paymentAllocations(rental, ps, payments) {
  var paid = {}, paidAt = {}, fallback = payments.filter(function (p) { return !p.voided; }).sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
  ps.forEach(function (p) { paid[p.key] = 0; });
  fallback.forEach(function (pay) {
    var remaining = pay.amountCents;
    if (pay.allocation && pay.allocation.periods) {
      Object.keys(pay.allocation.periods).forEach(function (key) {
        var amount = Number(pay.allocation.periods[key].rentCents || 0);
        if (paid[key] !== undefined) {
          paid[key] += amount;
          if (paid[key] >= ps.find(function (p) { return p.key === key; }).rent && !paidAt[key]) paidAt[key] = pay.date;
        }
      });
    } else {
      ps.forEach(function (p) {
        if (!remaining) return;
        var take = Math.min(remaining, Math.max(0, p.rent - paid[p.key]));
        paid[p.key] += take; remaining -= take;
        if (paid[p.key] >= p.rent && !paidAt[p.key]) paidAt[p.key] = pay.date;
      });
    }
  });
  return { paid: paid, paidAt: paidAt };
}
function ledger(rental, asOf) {
  asOf = asOf || today();
  var ps = periods(rental, asOf);
  var payments = state.payments.filter(function (p) { return p.rentalId === rental.id && !p.voided; });
  var alloc = paymentAllocations(rental, ps, payments);
  var result = ps.map(function (p) {
    var rentPaid = alloc.paid[p.key] || 0;
    var end = alloc.paidAt[p.key] || asOf;
    var startLate = addDays(p.due, 3);
    var days = Math.max(0, diffDays(startLate, end) + 1);
    var feeAccrued = Math.min(p.rent, days * 2000);
    var feesPaid = payments.reduce(function (n, x) { return n + Number(x.allocation && x.allocation.periods && x.allocation.periods[p.key] ? x.allocation.periods[p.key].lateFeeCents || 0 : 0); }, 0);
    var lateFee = Math.max(0, feeAccrued - feesPaid);
    return { key: p.key, start: p.start, due: p.due, end: p.end, rent: p.rent, paid: rentPaid, owed: Math.max(0, p.rent - rentPaid), feeAccrued: feeAccrued, lateFee: lateFee, daysLate: Math.max(0, diffDays(startLate, asOf)) };
  });
  var credit = state.payments.filter(function (p) { return p.rentalId === rental.id && !p.voided; }).reduce(function (n, p) { return n + Number(p.allocation ? p.allocation.creditCents || 0 : 0); }, 0);
  return { periods: result, credit: credit };
}
function allBalances() {
  var rows = [];
  activeRentals().forEach(function (rental) {
    ledger(rental).periods.forEach(function (p) {
      if (p.owed > 0 || p.lateFee > 0) rows.push(Object.assign({}, p, { rental: rental, total: p.owed + p.lateFee }));
    });
  });
  return rows;
}
function allocatePayment(rental, amount, date) {
  var before = ledger(rental, date), left = amount, allocation = { periods: {}, creditCents: 0 };
  before.periods.forEach(function (p) {
    if (!left) return;
    var take = Math.min(left, p.owed);
    if (take) { allocation.periods[p.key] = { rentCents: take, lateFeeCents: 0 }; left -= take; }
  });
  before.periods.forEach(function (p) {
    if (!left) return;
    var take = Math.min(left, p.lateFee);
    if (take) { allocation.periods[p.key] = allocation.periods[p.key] || { rentCents: 0, lateFeeCents: 0 }; allocation.periods[p.key].lateFeeCents = take; left -= take; }
  });
  allocation.creditCents = left;
  return allocation;
}
function nav() {
  var items = [['dashboard', 'Home'], ['late', 'Late Payments'], ['payment', 'Log Payment'], ['renters', 'Renters'], ['vehicles', 'Vehicles'], ['rentals', 'Rentals'], ['backup', 'Backup / Export']];
  $('#nav').innerHTML = items.map(function (x) { return '<button class="' + (view === x[0] ? 'active' : '') + '" data-view="' + x[0] + '">' + x[1] + '</button>'; }).join('');
}
function render() {
  nav();
  var html = view === 'dashboard' ? dashboardPage() : view === 'late' ? latePage() : view === 'payment' ? paymentPage() : view === 'renters' ? rentersPage() : view === 'vehicles' ? vehiclesPage() : view === 'rentals' ? rentalsPage() : backupPage();
  $('#app').innerHTML = html;
  bind();
}
function dashboardPage() {
  var vehicles = activeVehicles(), active = activeRentals().length, rented = vehicles.filter(function (v) { return v.status === 'rented'; }).length;
  var lateTotal = allBalances().reduce(function (n, x) { return n + x.total; }, 0);
  return '<div class="topbar"><div><h2>Good morning</h2><div class="hint">Your local management home</div></div><span class="pill good">Data stored on this device</span></div>' +
    '<div class="grid"><div class="card"><div class="label">Vehicles</div><div class="metric">' + vehicles.length + '</div><div class="hint">' + rented + ' marked rented</div></div>' +
    '<div class="card"><div class="label">Active rentals</div><div class="metric">' + active + '</div><div class="hint">Current agreements</div></div>' +
    '<div class="card"><div class="label">Late balance</div><div class="metric">' + money(lateTotal) + '</div><div class="hint">Rent + late fees</div></div>' +
    '<div class="card"><div class="label">Next receipt</div><div class="metric">#' + state.meta.nextReceipt + '</div><div class="hint">Sequential numbering</div></div></div>' +
    alerts() + '<section class="section"><h3>Start here</h3><div class="grid">' +
    '<div class="card"><h3>Late payments</h3><p class="hint">See who owes money and log a payment quickly.</p><button data-view="late">Open late payments</button></div>' +
    '<div class="card"><h3>Record a payment</h3><p class="hint">Create a PDF receipt and copyable message.</p><button data-view="payment">Log payment</button></div>' +
    '<div class="card"><h3>Manage fleet</h3><p class="hint">Review partnership vehicles and statuses.</p><button data-view="vehicles">View vehicles</button></div>' +
    '<div class="card"><h3>Protect your data</h3><p class="hint">Make an encrypted backup before entering real records.</p><button data-view="backup">Backup / export</button></div></div></section>';
}
function alerts() {
  var items = [], now = today();
  state.vehicles.filter(function (x) { return !x.archived; }).forEach(function (v) {
    [['Insurance', v.insuranceExpiry], ['Registration', v.registrationExpiry]].forEach(function (pair) { if (pair[1] && diffDays(now, pair[1]) <= 30) items.push(pair[0] + ': ' + vehicleName(v.id) + ' (' + fmtDate(pair[1]) + ')'); });
  });
  state.renters.filter(function (x) { return !x.archived; }).forEach(function (r) {
    if (r.licenseExpiry && diffDays(now, r.licenseExpiry) <= 30) items.push('License: ' + r.name + ' (' + fmtDate(r.licenseExpiry) + ')');
    if (r.insuranceExpiry && diffDays(now, r.insuranceExpiry) <= 30) items.push('Renter insurance: ' + r.name + ' (' + fmtDate(r.insuranceExpiry) + ')');
    if ((r.backgroundStatus || 'not checked') !== 'passed') items.push('Background check: ' + r.name + ' (' + (r.backgroundStatus || 'not checked') + ')');
  });
  return items.length ? '<div class="notice"><strong>Attention needed</strong><ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : '<div class="notice good"><strong>No current alerts.</strong> Add renter records to track documents and background checks.</div>';
}
function latePage() {
  var rows = allBalances().filter(function (x) { return x.due < today() || x.owed > 0; }).sort(function (a, b) { return a.due.localeCompare(b.due); });
  var body = rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Renter / vehicle</th><th>Due</th><th>Days late</th><th>Rent owed</th><th>Late fee</th><th>Total</th><th></th></tr></thead><tbody>' +
    rows.map(function (x) { return '<tr><td><strong>' + esc(renterName(x.rental.renterId)) + '</strong><br><span class="hint">' + esc(vehicleName(x.rental.vehicleId)) + '</span></td><td>' + fmtDate(x.due) + '</td><td>' + (x.daysLate ? '<span class="pill bad">' + x.daysLate + ' days</span>' : '—') + '</td><td class="amount">' + money(x.owed) + '</td><td class="amount">' + money(x.lateFee) + '</td><td class="amount"><strong>' + money(x.total) + '</strong></td><td><button class="small" data-pay-rental="' + x.rental.id + '">Log payment</button></td></tr>'; }).join('') +
    '</tbody></table></div>' : '<div class="card empty">No late balances yet. Add active renters and rentals, or log a payment from the quick action.</div>';
  return '<div class="topbar"><div><h2>Late payments</h2><div class="hint">As of ' + fmtDate(today()) + '. Three-day grace period, then $20/day.</div></div><button data-view="payment">Log payment</button></div>' + body;
}
function paymentPage() {
  return '<div class="topbar"><div><h2>Log a payment</h2><div class="hint">Fast entry creates an immutable payment and receipt.</div></div></div><div class="card form-card"><form id="payment-form"><div class="form-grid">' +
    '<div class="field full"><label>Rental</label><select name="rentalId" required><option value="">Choose renter and vehicle</option>' + activeRentals().map(function (r) { return '<option value="' + r.id + '" ' + (selectedRental === r.id ? 'selected' : '') + '>' + esc(renterName(r.renterId) + ' · ' + vehicleName(r.vehicleId)) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label>Payment date</label><input type="date" name="date" value="' + today() + '" required></div><div class="field"><label>Amount received</label><input inputmode="decimal" name="amount" placeholder="0.00" required></div>' +
    '<div class="field"><label>Method</label><select name="method"><option>Cash</option><option>Zelle</option><option>Cash App</option><option>Other</option></select></div><div class="field"><label>Reference</label><input name="reference" placeholder="Transaction or note"></div>' +
    '<div class="field full"><label>Note</label><textarea name="note" placeholder="Optional note"></textarea></div></div><div class="form-actions"><button>Save payment + receipt</button><button type="button" class="secondary" data-view="late">Cancel</button></div></form></div>';
}
function rentersPage() {
  var rows = state.renters.filter(function (x) { return !x.archived; });
  return '<div class="topbar"><div><h2>Renters</h2><div class="hint">Manual records only; no external background-check service.</div></div><button data-action="new-renter">Add renter</button></div>' +
    (rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Phone</th><th>License</th><th>Background check</th><th>Active rentals</th><th></th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td><strong>' + esc(r.name) + '</strong><br><span class="hint">' + esc(r.email || r.address || '') + '</span></td><td>' + esc(r.phone) + '</td><td>' + (r.licenseExpiry ? fmtDate(r.licenseExpiry) : '—') + '</td><td><span class="pill ' + (r.backgroundStatus === 'passed' ? 'good' : r.backgroundStatus === 'failed' ? 'bad' : 'warn') + '">' + esc(r.backgroundStatus || 'not checked') + '</span></td><td>' + activeRentals().filter(function (x) { return x.renterId === r.id; }).length + '</td><td><button class="small secondary" data-edit-renter="' + r.id + '">Edit</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card empty">No renters yet. Add the people currently renting your vehicles.</div>') + '<div id="renter-modal"></div>';
}
function renterForm(id) {
  var r = id ? find('renters', id) : null;
  r = r || { name: '', phone: '', email: '', address: '', licenseNumber: '', licenseExpiry: '', insuranceCarrier: '', insurancePolicy: '', insuranceExpiry: '', emergencyContact: '', backgroundStatus: 'not checked', backgroundDate: '', backgroundNotes: '', notes: '' };
  return '<div class="card form-card"><h3>' + (id ? 'Edit' : 'Add') + ' renter</h3><form id="renter-form" data-id="' + (id || '') + '"><div class="form-grid">' +
    field('Name', 'name', r.name, true) + field('Phone', 'phone', r.phone, true) + field('Email', 'email', r.email) + field('License number', 'licenseNumber', r.licenseNumber) + field('License expiry', 'licenseExpiry', r.licenseExpiry, false, 'date') + field('Renter insurance expiry', 'insuranceExpiry', r.insuranceExpiry, false, 'date') +
    '<div class="field full"><label>Address</label><input name="address" value="' + esc(r.address) + '"></div>' + field('Insurance carrier', 'insuranceCarrier', r.insuranceCarrier) + field('Policy number', 'insurancePolicy', r.insurancePolicy) + field('Emergency contact', 'emergencyContact', r.emergencyContact) +
    '<div class="field"><label>Background check</label><select name="backgroundStatus">' + ['not checked', 'pending', 'passed', 'failed'].map(function (x) { return '<option ' + (r.backgroundStatus === x ? 'selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
    field('Check date', 'backgroundDate', r.backgroundDate, false, 'date') + textareaField('Background notes', 'backgroundNotes', r.backgroundNotes) + textareaField('Notes', 'notes', r.notes) +
    '</div><div class="form-actions"><button>Save renter</button><button type="button" class="secondary" data-close-form="renter">Cancel</button></div></form></div>';
}
function field(label, name, value, required, type) { return '<div class="field"><label>' + label + '</label><input type="' + (type || 'text') + '" name="' + name + '" value="' + esc(value) + '"' + (required ? ' required' : '') + '></div>'; }
function textareaField(label, name, value) { return '<div class="field full"><label>' + label + '</label><textarea name="' + name + '">' + esc(value) + '</textarea></div>'; }
function vehiclesPage() {
  var rows = activeVehicles();
  return '<div class="topbar"><div><h2>Fleet</h2><div class="hint">Partnership vehicles in the first release.</div></div><button data-action="new-vehicle">Add vehicle</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Vehicle</th><th>Plate</th><th>Weekly rate</th><th>Status</th><th>Documents</th><th></th></tr></thead><tbody>' +
    rows.map(function (v) { return '<tr><td><strong>' + esc([v.year, v.make, v.model].filter(Boolean).join(' ')) + '</strong><br><span class="hint">' + esc(v.ownership) + '</span></td><td>' + esc(v.plate) + '</td><td class="amount">' + (v.weeklyRate ? money(v.weeklyRate) : 'Not rented') + '</td><td><span class="pill ' + (v.status === 'rented' ? 'warn' : v.status === 'out of service' ? 'bad' : 'good') + '">' + esc(v.status) + '</span></td><td>' + (v.insuranceExpiry || v.registrationExpiry ? fmtDate(v.insuranceExpiry) + ' / ' + fmtDate(v.registrationExpiry) : 'Not entered') + '</td><td><button class="small secondary" data-edit-vehicle="' + v.id + '">Edit</button></td></tr>'; }).join('') +
    '</tbody></table></div><div id="vehicle-modal"></div>';
}
function vehicleForm(id) {
  var v = id ? find('vehicles', id) : null;
  v = v || { year: '', make: '', model: '', plate: '', vin: '', mileage: '', ownership: 'partnership', status: 'available', weeklyRate: 0, insuranceExpiry: '', registrationExpiry: '', notes: '' };
  return '<div class="card form-card"><h3>' + (id ? 'Edit' : 'Add') + ' vehicle</h3><form id="vehicle-form" data-id="' + (id || '') + '"><div class="form-grid">' +
    field('Year', 'year', v.year) + field('Make', 'make', v.make, true) + field('Model', 'model', v.model, true) + field('Plate', 'plate', v.plate, true) + field('VIN', 'vin', v.vin) + field('Mileage', 'mileage', v.mileage) +
    '<div class="field"><label>Ownership</label><select name="ownership"><option value="partnership"' + (v.ownership === 'partnership' ? ' selected' : '') + '>Partnership</option><option value="personal"' + (v.ownership === 'personal' ? ' selected' : '') + '>Personal</option></select></div>' +
    '<div class="field"><label>Status</label><select name="status">' + ['available', 'rented', 'out of service'].map(function (x) { return '<option' + (v.status === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
    field('Weekly rate', 'weeklyRate', v.weeklyRate ? (v.weeklyRate / 100).toFixed(2) : '') + field('Insurance expiry', 'insuranceExpiry', v.insuranceExpiry, false, 'date') + field('Registration expiry', 'registrationExpiry', v.registrationExpiry, false, 'date') + textareaField('Notes', 'notes', v.notes) +
    '</div><div class="form-actions"><button>Save vehicle</button><button type="button" class="secondary" data-close-form="vehicle">Cancel</button></div></form></div>';
}
function rentalsPage() {
  var rows = state.rentals.filter(function (x) { return !x.archived; });
  return '<div class="topbar"><div><h2>Rentals</h2><div class="hint">Weekly billing; “monthly” is a discounted weekly rate.</div></div><button data-action="new-rental">Add rental</button></div>' +
    (rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Renter</th><th>Vehicle</th><th>Start</th><th>Weekly rate</th><th>Due weekday</th><th>Status</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + esc(renterName(r.renterId)) + '</td><td>' + esc(vehicleName(r.vehicleId)) + '</td><td>' + fmtDate(r.startDate) + '</td><td class="amount">' + money(r.weeklyCents) + '</td><td>' + weekdays[r.dueWeekday] + '</td><td><span class="pill ' + (r.status === 'active' ? 'good' : 'warn') + '">' + esc(r.status) + '</span></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="card empty">No rentals yet. Add renters first, then create a rental.</div>') + '<div id="rental-modal"></div>';
}
function rentalForm() {
  return '<div class="card form-card"><h3>Add rental</h3><form id="rental-form"><div class="form-grid"><div class="field"><label>Renter</label><select name="renterId" required><option value="">Choose renter</option>' + state.renters.filter(function (x) { return !x.archived; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div><div class="field"><label>Vehicle</label><select name="vehicleId" required><option value="">Choose vehicle</option>' + activeVehicles().map(function (x) { return '<option value="' + x.id + '">' + esc(vehicleName(x.id)) + '</option>'; }).join('') + '</select></div>' +
    field('Start date', 'startDate', today(), true, 'date') + field('Weekly rate', 'weeklyRate', '', true) + '<div class="field"><label>Due weekday</label><select name="dueWeekday">' + weekdays.map(function (x, i) { return '<option value="' + i + '">' + x + '</option>'; }).join('') + '</select></div><div class="field"><label>Billing label</label><select name="billingLabel"><option>weekly</option><option>monthly discount</option></select></div>' +
    field('Deposit amount', 'deposit', '300.00') + '<div class="field"><label>Deposit status</label><select name="depositStatus"><option>unpaid</option><option>paid</option></select></div>' + textareaField('Notes', 'notes', '') + '</div><div class="form-actions"><button>Activate rental</button><button type="button" class="secondary" data-close-form="rental">Cancel</button></div></form></div>';
}
function backupPage() {
  return '<div class="topbar"><div><h2>Backup / Export</h2><div class="hint">Encrypted backups are the durable copy of your local data.</div></div></div><div class="grid"><div class="card"><h3>Encrypted backup</h3><p class="hint">Download a password-protected complete data file.</p><button data-action="backup">Backup now</button></div><div class="card"><h3>Import backup</h3><p class="hint">Import a laptop working copy or restore a backup.</p><input type="file" id="import-file" accept=".wny,.json"></div><div class="card"><h3>CSV export</h3><p class="hint">Download every record, including archived history.</p><button data-action="csv">Export all CSV</button></div><div class="card"><h3>Dataset status</h3><p class="hint">Revision <strong>' + state.meta.revision + '</strong><br>Next receipt <strong>#' + state.meta.nextReceipt + '</strong><br>Records <strong>' + (state.vehicles.length + state.renters.length + state.rentals.length + state.payments.length) + '</strong></p></div></div><div class="notice">Keep the backup password somewhere separate from the backup file. If it is lost, an encrypted backup cannot be recovered.</div>';
}
function bind() {
  document.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { view = b.dataset.view; selectedRental = ''; render(); }; });
  document.querySelectorAll('[data-pay-rental]').forEach(function (b) { b.onclick = function () { selectedRental = b.dataset.payRental; view = 'payment'; render(); }; });
  document.querySelectorAll('[data-action="new-renter"]').forEach(function (b) { b.onclick = function () { $('#renter-modal').innerHTML = renterForm(); bind(); }; });
  document.querySelectorAll('[data-action="new-vehicle"]').forEach(function (b) { b.onclick = function () { $('#vehicle-modal').innerHTML = vehicleForm(); bind(); }; });
  document.querySelectorAll('[data-action="new-rental"]').forEach(function (b) { b.onclick = function () { $('#rental-modal').innerHTML = rentalForm(); bind(); }; });
  document.querySelectorAll('[data-edit-renter]').forEach(function (b) { b.onclick = function () { $('#renter-modal').innerHTML = renterForm(b.dataset.editRenter); bind(); }; });
  document.querySelectorAll('[data-edit-vehicle]').forEach(function (b) { b.onclick = function () { $('#vehicle-modal').innerHTML = vehicleForm(b.dataset.editVehicle); bind(); }; });
  document.querySelectorAll('[data-close-form]').forEach(function (b) { b.onclick = function () { var e = document.getElementById(b.dataset.closeForm + '-modal'); if (e) e.innerHTML = ''; }; });
  if ($('#renter-form')) $('#renter-form').onsubmit = saveRenter;
  if ($('#vehicle-form')) $('#vehicle-form').onsubmit = saveVehicle;
  if ($('#rental-form')) $('#rental-form').onsubmit = saveRental;
  if ($('#payment-form')) $('#payment-form').onsubmit = savePayment;
  if ($('#import-file')) $('#import-file').onchange = function (e) { importFile(e.target.files[0]); };
  document.querySelectorAll('[data-action="backup"]').forEach(function (b) { b.onclick = backup; });
  document.querySelectorAll('[data-action="csv"]').forEach(function (b) { b.onclick = csvExport; });
}
async function saveRenter(e) {
  e.preventDefault();
  var form = e.target, id = form.dataset.id, data = Object.fromEntries(new FormData(form).entries());
  if (id) Object.assign(find('renters', id), data); else state.renters.push(Object.assign({ id: uid(), archived: false }, data));
  await commit(id ? 'edit renter' : 'add renter'); view = 'renters'; render();
}
async function saveVehicle(e) {
  e.preventDefault();
  var form = e.target, id = form.dataset.id, data = Object.fromEntries(new FormData(form).entries());
  data.weeklyRate = cents(data.weeklyRate);
  if (id) Object.assign(find('vehicles', id), data); else state.vehicles.push(Object.assign({ id: uid(), archived: false }, data));
  await commit(id ? 'edit vehicle' : 'add vehicle'); view = 'vehicles'; render();
}
async function saveRental(e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(e.target).entries());
  if (state.rentals.some(function (r) { return r.status === 'active' && !r.archived && r.vehicleId === data.vehicleId; })) return alert('This vehicle already has an active rental. End it before assigning it again.');
  if (state.rentals.some(function (r) { return r.status === 'active' && !r.archived && r.renterId === data.renterId; }) && !confirm('This renter already has an active vehicle. Continue anyway?')) return;
  var rate = cents(data.weeklyRate);
  state.rentals.push({ id: uid(), renterId: data.renterId, vehicleId: data.vehicleId, startDate: data.startDate, endDate: '', weeklyCents: rate, billingLabel: data.billingLabel, dueWeekday: Number(data.dueWeekday), rateHistory: [{ effectiveDate: data.startDate, weeklyCents: rate }], depositCents: cents(data.deposit), depositStatus: data.depositStatus, status: 'active', notes: data.notes, archived: false });
  var vehicle = find('vehicles', data.vehicleId); if (vehicle) vehicle.status = 'rented';
  await commit('add rental'); view = 'rentals'; render();
}
function allocationSummary(a) {
  var rent = 0, fee = 0;
  Object.keys((a && a.periods) || {}).forEach(function (k) { rent += Number(a.periods[k].rentCents || 0); fee += Number(a.periods[k].lateFeeCents || 0); });
  return { rent: rent, fee: fee, credit: Number(a && a.creditCents || 0) };
}
async function savePayment(e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(e.target).entries()), rental = find('rentals', data.rentalId), amount = cents(data.amount);
  if (!rental || amount <= 0) return alert('Choose a rental and enter an amount greater than zero.');
  var allocation = allocatePayment(rental, amount, data.date);
  var payment = { id: uid(), rentalId: rental.id, date: data.date, amountCents: amount, method: data.method, reference: data.reference, note: data.note, allocation: allocation, receiptNumber: state.meta.nextReceipt, voided: false, createdAt: new Date().toISOString() };
  state.meta.nextReceipt += 1; state.payments.push(payment);
  await commit('add payment'); showReceipt(payment); selectedRental = '';
}
function receiptText(p) {
  var s = allocationSummary(p.allocation), rental = find('rentals', p.rentalId);
  return 'WNY Auto Rentals\nReceipt #' + p.receiptNumber + '\nRenter: ' + renterName(rental.renterId) + '\nVehicle: ' + vehicleName(rental.vehicleId) + '\nPayment date: ' + fmtDate(p.date) + '\nAmount received: ' + money(p.amountCents) + '\nMethod: ' + p.method + (p.reference ? ' · ' + p.reference : '') + '\nRent applied: ' + money(s.rent) + '\nLate fees applied: ' + money(s.fee) + '\nCredit: ' + money(s.credit) + '\nThank you.';
}
function showReceipt(p) {
  var s = allocationSummary(p.allocation), rental = find('rentals', p.rentalId), w = window.open('', '_blank', 'width=700,height=800');
  if (w) {
    w.document.write('<!doctype html><title>Receipt #' + p.receiptNumber + '</title><style>body{font:16px system-ui;max-width:620px;margin:40px auto;color:#172b3d}h1{margin-bottom:3px}hr{border:0;border-top:1px solid #ddd;margin:24px 0}.row{display:flex;justify-content:space-between;padding:8px 0}.total{font-size:22px;font-weight:bold}</style><h1>WNY Auto Rentals</h1><div>Payment receipt #' + p.receiptNumber + '</div><hr><div class="row"><span>Renter</span><strong>' + esc(renterName(rental.renterId)) + '</strong></div><div class="row"><span>Vehicle</span><strong>' + esc(vehicleName(rental.vehicleId)) + '</strong></div><div class="row"><span>Date</span><strong>' + fmtDate(p.date) + '</strong></div><div class="row"><span>Method</span><strong>' + esc(p.method) + '</strong></div><hr><div class="row"><span>Amount received</span><strong class="total">' + money(p.amountCents) + '</strong></div><div class="row"><span>Rent applied</span><strong>' + money(s.rent) + '</strong></div><div class="row"><span>Late fees applied</span><strong>' + money(s.fee) + '</strong></div><div class="row"><span>Credit</span><strong>' + money(s.credit) + '</strong></div><hr><p>Private payment record. Please retain this receipt.</p><script>setTimeout(function(){print();},250)<\/script>');
    w.document.close();
  }
  var box = document.createElement('div'); box.className = 'notice good'; box.innerHTML = '<strong>Payment saved as receipt #' + p.receiptNumber + '.</strong><br><button class="small" id="copy-receipt">Copy text receipt</button> <button class="small secondary" id="close-receipt">Done</button>'; $('#app').prepend(box);
  $('#copy-receipt').onclick = async function () { try { await navigator.clipboard.writeText(receiptText(p)); this.textContent = 'Copied'; } catch (e) { alert(receiptText(p)); } };
  $('#close-receipt').onclick = function () { box.remove(); };
  view = 'late';
}
function b64(bytes) { var s = ''; bytes.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s); }
function ub64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
async function deriveKey(password, salt) {
  var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 210000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
function download(name, data, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: type })); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); }
async function encryptedBackup(password) {
  var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await deriveKey(password, salt);
  var payload = clone(state); payload.meta = Object.assign({}, payload.meta, { exportedAt: new Date().toISOString(), sourceRevision: state.meta.revision });
  var enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return JSON.stringify({ format: 'WNY-AUTO-RENTALS', version: 1, datasetId: state.meta.datasetId, revision: state.meta.revision, salt: b64(salt), iv: b64(iv), payload: b64(new Uint8Array(enc)) }, null, 2);
}
async function backup() {
  var password = prompt('Create a password for this encrypted backup:'); if (!password) return;
  download('wny-backup-' + today() + '.wny', await encryptedBackup(password), 'application/json');
  alert('Encrypted backup downloaded. Keep the password separate from the file.');
}
async function importFile(file) {
  if (!file) return;
  try {
    var raw = JSON.parse(await file.text()), password = prompt('Enter the backup password:'); if (!password) return;
    var key = await deriveKey(password, ub64(raw.salt)), plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(raw.iv) }, key, ub64(raw.payload));
    var incoming = JSON.parse(new TextDecoder().decode(plain));
    if (!incoming.meta || !incoming.meta.datasetId) throw new Error('Invalid dataset');
    if (incoming.meta.datasetId === state.meta.datasetId && incoming.meta.sourceRevision !== state.meta.revision) {
      if (!confirm('This file is from an older revision. Download a recovery backup of current data and continue?')) return;
      var recoveryPassword = prompt('Password for the recovery backup:'); if (recoveryPassword) download('wny-recovery-' + today() + '.wny', await encryptedBackup(recoveryPassword), 'application/json');
    }
    if (!confirm('Replace this device data with the imported file?')) return;
    state = incoming; await saveState(); render(); alert('Import complete.');
  } catch (e) { alert('Import failed. Check the password and file, then try again.'); }
}
function csvExport() {
  var rows = [['entity', 'id', 'data']];
  ['vehicles', 'renters', 'rentals', 'payments', 'audit'].forEach(function (type) { (state[type] || []).forEach(function (x) { rows.push([type, x.id, JSON.stringify(x)]); }); });
  var csv = rows.map(function (row) { return row.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
  download('wny-all-records-' + today() + '.csv', csv, 'text/csv');
}
(async function () {
  state = await loadState();
  if (!state || !state.meta) state = initialState();
  render();
})();
