var $ = function (i) { return document.getElementById(i); };
function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
var FLOW = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"], ALL = FLOW.concat(["Cancelled"]);
var KEY = "orderdesk_v1", S, me = null;

// ---------- permissions (UI-level only; see README for real security) ----------
var CAN = {
  admin:   { add: 1, cancel: 1, del: 1, exp: 1, team: 1 },
  manager: { add: 1, cancel: 1, exp: 1 },
  staff:   {}
};
function can(a) { return me && CAN[me.role][a]; }

// ---------- storage ----------
function seed() {
  var cu = [["Anika Rao", "919876500001"], ["Vikram Shah", "919876500002"], ["Neha Iyer", "919876500003"], ["Arjun Das", "919876500004"],
            ["Sara Khan", "919876500005"], ["Rahul Sen", "919876500006"], ["Pooja Nair", "919876500007"], ["Imran Ali", "919876500008"]];
  var it = ["Cotton kurta x2", "Wireless earbuds", "Face serum", "Desk lamp", "Running shoes", "Tote bag x3", "Tea sampler", "Yoga mat"];
  var am = [1299, 2499, 899, 1599, 3299, 1197, 649, 1099], orders = [];
  for (var i = 0; i < 14; i++) {
    var c = cu[(i * 5) % 8], st = i == 5 ? "Cancelled" : i < 9 ? "Delivered" : i < 11 ? "Shipped" : i < 12 ? "Packed" : i < 13 ? "Confirmed" : "Placed";
    var d = new Date(Date.now() - (14 - i) * 864e5).toISOString();
    orders.push({ id: "ORD-" + (1001 + i), cust: c[0], phone: c[1], items: it[i % 8], amount: am[i % 8], status: st, date: d,
      log: [{ s: "Placed", t: d, by: "System" }].concat(st == "Placed" ? [] : [{ s: st, t: d, by: "System" }]) });
  }
  return { orders: orders, notes: [], auto: true,
    users: [{ name: "Asha", role: "admin", pin: "1111" }, { name: "Dev", role: "manager", pin: "2222" }, { name: "Mira", role: "staff", pin: "3333" }] };
}
function load() { try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!S || !S.orders) S = seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
load();

// ---------- helpers ----------
function money(n) { return "₹" + Number(n).toLocaleString("en-IN"); }
function day(iso) { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
function phone(p) { var d = String(p).replace(/\D/g, ""); return d.length == 10 ? "91" + d : d; }
function badge(s) { return '<span class="badge s-' + s + '">' + s + '</span>'; }
function waLink(ph, msg) { return "https://wa.me/" + ph + "?text=" + encodeURIComponent(msg); }

// ---------- login ----------
function fillUsers() { $("lu").innerHTML = S.users.map(function (u, i) { return '<option value="' + i + '">' + esc(u.name) + ' (' + u.role + ')</option>'; }).join(""); }
fillUsers();
$("lf").onsubmit = function (e) {
  e.preventDefault();
  var u = S.users[$("lu").value];
  if (!u || u.pin !== $("lp").value) { $("le").textContent = "Wrong PIN."; return; }
  me = u; $("le").textContent = ""; $("lp").value = "";
  $("login").hidden = true; $("app").hidden = false;
  $("who").textContent = u.name + " · " + u.role;
  $("teamTab").hidden = !can("team"); $("add").hidden = !can("add"); $("exp").hidden = !can("exp");
  showTab("orders"); renderAll();
};
$("out").onclick = function () { me = null; $("app").hidden = true; $("login").hidden = false; };

// ---------- tabs ----------
function showTab(t) {
  ["orders", "customers", "notes", "team"].forEach(function (id) { $(id).hidden = id != t; });
  Array.prototype.forEach.call($("tabs").children, function (b) { b.setAttribute("aria-pressed", b.dataset.t == t); });
  renderAll();
}
Array.prototype.forEach.call($("tabs").children, function (b) { b.onclick = function () { showTab(b.dataset.t); }; });

// ---------- orders ----------
$("fs").innerHTML = '<option value="">All statuses</option>' + ALL.map(function (s) { return '<option>' + s + '</option>'; }).join("");
function filtered() {
  var q = $("q").value.toLowerCase(), f = $("fs").value;
  return S.orders.filter(function (o) {
    return (!f || o.status == f) && (!q || (o.id + o.cust + o.phone + o.items).toLowerCase().indexOf(q) > -1);
  }).sort(function (a, b) { return b.date.localeCompare(a.date); });
}
function renderStats() {
  var live = S.orders.filter(function (o) { return o.status != "Cancelled"; });
  var rev = live.reduce(function (a, o) { return a + o.amount; }, 0);
  var open = live.filter(function (o) { return o.status != "Delivered"; }).length;
  var cards = [[S.orders.length, "Total orders"], [money(rev), "Revenue (excl. cancelled)"], [open, "In progress"],
               [S.orders.filter(function (o) { return o.status == "Delivered"; }).length, "Delivered"]];
  $("stats").innerHTML = cards.map(function (c) { return '<div class="stat"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>'; }).join("");
}
function renderOrders() {
  renderStats();
  var rows = filtered().map(function (o) {
    var opts = (can("cancel") ? ALL : FLOW).map(function (s) { return '<option' + (s == o.status ? " selected" : "") + '>' + s + '</option>'; }).join("");
    var locked = o.status == "Cancelled" || o.status == "Delivered";
    return '<tr><td><button class="link" data-o="' + o.id + '">' + o.id + '</button></td><td>' + day(o.date) +
      '</td><td><button class="link" data-c="' + o.phone + '">' + esc(o.cust) + '</button></td><td>' + esc(o.items) +
      '</td><td>' + money(o.amount) + '</td><td>' + (locked ? badge(o.status) :
      '<select data-s="' + o.id + '" aria-label="Status for ' + o.id + '">' + opts + '</select>') + '</td><td>' +
      (can("del") ? '<button class="link" data-d="' + o.id + '" aria-label="Delete ' + o.id + '">Delete</button>' : "") + '</td></tr>';
  }).join("");
  $("ot").innerHTML = "<tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr>" +
    (rows || '<tr><td colspan="7">No orders match.</td></tr>');
}
$("ot").onclick = function (e) {
  var b = e.target; if (b.dataset.o) openOrder(b.dataset.o); if (b.dataset.c) openCustomer(b.dataset.c);
  if (b.dataset.d && confirm("Delete " + b.dataset.d + "?")) { S.orders = S.orders.filter(function (o) { return o.id != b.dataset.d; }); save(); renderAll(); }
};
$("ot").onchange = function (e) { if (e.target.dataset.s) setStatus(e.target.dataset.s, e.target.value); };
function setStatus(id, s) {
  var o = S.orders.filter(function (o) { return o.id == id; })[0];
  if (!o || o.status == s) return;
  if (s == "Cancelled" && !can("cancel")) return;
  o.status = s; o.log.push({ s: s, t: new Date().toISOString(), by: me.name });
  if (S.auto) {
    var msg = "Hi " + o.cust.split(" ")[0] + ", your order " + o.id + " is now " + s + "." + (s == "Shipped" ? " It is on the way." : s == "Delivered" ? " Thank you for shopping with us!" : "");
    S.notes.unshift({ t: new Date().toISOString(), order: o.id, to: o.cust, phone: o.phone, msg: msg });
    S.notes = S.notes.slice(0, 100);
  }
  save(); renderAll();
}
$("q").oninput = renderOrders; $("fs").onchange = renderOrders;

// ---------- new order ----------
$("add").onclick = function () { $("of").reset(); $("od").showModal(); };
$("oc").onclick = function () { $("od").close(); };
$("of").onsubmit = function (e) {
  e.preventDefault();
  var ph = phone($("op").value);
  if (ph.length < 11) { alert("Enter a valid phone number."); return; }
  var n = S.orders.reduce(function (m, o) { return Math.max(m, +o.id.slice(4)); }, 1000) + 1, now = new Date().toISOString();
  S.orders.push({ id: "ORD-" + n, cust: $("on").value.trim(), phone: ph, items: $("oi").value.trim(), amount: +$("oa").value, status: "Placed", date: now, log: [{ s: "Placed", t: now, by: me.name }] });
  save(); $("od").close(); renderAll();
};

// ---------- customers ----------
function customers() {
  var m = {};
  S.orders.forEach(function (o) {
    var c = m[o.phone] || (m[o.phone] = { name: o.cust, phone: o.phone, n: 0, spent: 0, last: o.date, first: o.date, list: [] });
    c.list.push(o);
    if (o.status != "Cancelled") { c.n++; c.spent += o.amount; }
    if (o.date > c.last) c.last = o.date; if (o.date < c.first) c.first = o.date;
  });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.spent - a.spent; });
}
function renderCustomers() {
  var cs = customers(), rep = cs.filter(function (c) { return c.n >= 2; }).length;
  var top = cs[0];
  $("cstats").innerHTML = [[cs.length, "Customers"], [rep, "Repeat buyers"], [cs.length ? Math.round(rep / cs.length * 100) + "%" : "0%", "Repeat rate"],
    [top ? esc(top.name) : "-", "Top spender"]].map(function (c) { return '<div class="stat"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>'; }).join("");
  $("ct").innerHTML = "<tr><th>Customer</th><th>Orders</th><th>Total spent</th><th>Last order</th><th></th></tr>" + cs.map(function (c) {
    return '<tr><td><button class="link" data-c="' + c.phone + '">' + esc(c.name) + '</button><br><small>' + esc(c.phone) + '</small></td><td>' + c.n +
      '</td><td>' + money(c.spent) + '</td><td>' + day(c.last) + '</td><td>' + (c.n >= 2 ? '<span class="badge s-Repeat">Repeat buyer</span>' : "") + '</td></tr>';
  }).join("");
}
$("ct").onclick = function (e) { if (e.target.dataset.c) openCustomer(e.target.dataset.c); };
function openCustomer(ph) {
  var c = customers().filter(function (c) { return c.phone == ph; })[0]; if (!c) return;
  $("cdc").innerHTML = '<h2>' + esc(c.name) + (c.n >= 2 ? ' <span class="badge s-Repeat">Repeat buyer</span>' : "") + '</h2><p class="hint">' + esc(c.phone) +
    '</p><p><b>' + c.n + '</b> orders · <b>' + money(c.spent) + '</b> spent · avg <b>' + money(c.n ? Math.round(c.spent / c.n) : 0) + '</b><br>Customer since ' + day(c.first) + '</p><ul class="tl">' +
    c.list.sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (o) { return '<li>' + o.id + ' · ' + esc(o.items) + ' · ' + money(o.amount) + ' ' + badge(o.status) + '</li>'; }).join("") +
    '</ul><p><a class="btn" target="_blank" rel="noopener" href="' + waLink(c.phone, "Hi " + c.name.split(" ")[0] + ", ") + '">Message on WhatsApp</a></p>';
  $("cd").showModal();
}
function openOrder(id) {
  var o = S.orders.filter(function (o) { return o.id == id; })[0]; if (!o) return;
  $("cdc").innerHTML = '<h2>' + o.id + ' ' + badge(o.status) + '</h2><p>' + esc(o.cust) + ' · ' + esc(o.phone) + '<br>' + esc(o.items) + ' · <b>' + money(o.amount) + '</b></p><ul class="tl">' +
    o.log.map(function (l) { return '<li>' + badge(l.s) + ' <small>' + new Date(l.t).toLocaleString("en-IN") + ' by ' + esc(l.by) + '</small></li>'; }).join("") + '</ul>';
  $("cd").showModal();
}
$("cx").onclick = function () { $("cd").close(); };

// ---------- notifications ----------
$("auto").checked = !!S.auto;
$("auto").onchange = function () { S.auto = $("auto").checked; save(); };
function renderNotes() {
  $("nl").innerHTML = S.notes.length ? S.notes.map(function (n) {
    return '<div class="note"><div>' + esc(n.msg) + '<small>' + esc(n.to) + ' · ' + new Date(n.t).toLocaleString("en-IN") + '</small></div><a class="btn" target="_blank" rel="noopener" href="' +
      waLink(n.phone, n.msg) + '">Send on WhatsApp</a></div>';
  }).join("") : '<p class="hint">No messages yet. Change an order status to create one.</p>';
}

// ---------- team ----------
function renderTeam() {
  $("tt").innerHTML = "<tr><th>Name</th><th>Role</th><th></th></tr>" + S.users.map(function (u, i) {
    return '<tr><td>' + esc(u.name) + '</td><td><select data-u="' + i + '" aria-label="Role for ' + esc(u.name) + '">' + ["staff", "manager", "admin"].map(function (r) { return '<option' + (r == u.role ? " selected" : "") + '>' + r + '</option>'; }).join("") +
      '</select></td><td>' + (u === me ? "You" : '<button class="link" data-x="' + i + '">Remove</button>') + '</td></tr>';
  }).join("");
}
$("tt").onchange = function (e) {
  if (e.target.dataset.u == null) return;
  var u = S.users[e.target.dataset.u];
  if (u === me && e.target.value != "admin") { alert("You can't remove your own admin access."); renderTeam(); return; }
  u.role = e.target.value; save();
};
$("tt").onclick = function (e) { var i = e.target.dataset.x; if (i != null && confirm("Remove this user?")) { S.users.splice(i, 1); save(); renderTeam(); fillUsers(); } };
$("tf").onsubmit = function (e) {
  e.preventDefault();
  S.users.push({ name: $("tn").value.trim(), pin: $("tp").value, role: $("tr").value });
  $("tf").reset(); save(); renderTeam(); fillUsers();
};

// ---------- export ----------
$("exp").onclick = function () {
  if (!can("exp")) return;
  var q = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
  var rows = [["Order ID", "Date", "Customer", "Phone", "Items", "Amount", "Status"]].concat(filtered().map(function (o) {
    return [o.id, o.date.slice(0, 10), o.cust, o.phone, o.items, o.amount, o.status];
  }));
  var csv = "\ufeff" + rows.map(function (r) { return r.map(q).join(","); }).join("\r\n");
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "orders-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
};

function renderAll() { renderOrders(); renderCustomers(); renderNotes(); if (can("team")) renderTeam(); }
