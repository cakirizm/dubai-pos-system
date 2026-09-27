const NAV = ['Dashboard','Floor & Orders','KDS','Menu','Inventory','Purchasing','Sales & Refunds','Expenses','Reservations','Staff & Shifts','Reports','Accounting','Settings'];

function toast(msg,type='ok'){
  const old=document.querySelector('.toast'); if(old) old.remove();
  const el=document.createElement('div'); el.className='toast '+type; el.textContent=msg;
  document.body.appendChild(el); setTimeout(()=>el.remove(),2300);
}
function fmtTime(iso){return iso?new Date(iso).toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'}):'—'}
function minutesSince(iso){return iso?Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/60000)):0}
function stat(label,value,sub=''){return `<div class="stat"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`}
function empty(msg){return `<div class="empty">${msg}</div>`}
function pageTitle(title,sub,action=''){return `<div class="pageTitle"><div><h1>${title}</h1><p>${sub}</p></div>${action}</div>`}
function badge(text,kind='neutral'){return `<span class="badge ${kind}">${text}</span>`}

function renderApp(){
  const root=document.querySelector('#app');
  root.innerHTML=`<main class="appShell">
    <aside class="sidebar">
      <div class="brand"><div class="brandMark">N</div><div><b>NEXPOS</b><span>RESTAURANT UAE</span></div></div>
      <div class="venue"><small>VENUE</small><b>${esc(db.business.name)}</b><span>${esc(db.business.branch)}</span></div>
      <nav>${NAV.map(n=>`<button data-nav="${n}" class="${session.page===n?'active':''}"><span></span>${n}</button>`).join('')}</nav>
      <div class="staffBox"><small>LOGGED IN</small><b>${esc(staff(session.currentStaffId)?.name||'Unknown')}</b><span>${esc(staff(session.currentStaffId)?.role||'')}</span></div>
    </aside>
    <section class="workspace">
      <header class="topbar">
        <div class="live"><i></i> Live restaurant</div>
        <div class="topActions">
          <button class="ghost" data-action="open-shift">Shift</button>
          <select id="staffSwitcher">${db.staff.filter(s=>s.active).map(s=>`<option value="${s.id}" ${s.id===session.currentStaffId?'selected':''}>${esc(s.name)} · ${esc(s.role)}</option>`).join('')}</select>
          <button class="primary" data-action="new-order">+ New Order</button>
        </div>
      </header>
      <div class="page">${currentView()}</div>
    </section>
    <div id="modalRoot">${modalView()}</div>
  </main>`;
  bindUI();
}
function currentView(){
  switch(session.page){
    case'Dashboard':return viewDashboard();
    case'Floor & Orders':return viewFloor();
    case'KDS':return viewKDS();
    case'Menu':return viewMenu();
    case'Inventory':return viewInventory();
    case'Purchasing':return viewPurchasing();
    case'Sales & Refunds':return viewSales();
    case'Expenses':return viewExpenses();
    case'Reservations':return viewReservations();
    case'Staff & Shifts':return viewStaff();
    case'Reports':return viewReports();
    case'Accounting':return viewAccounting();
    case'Settings':return viewSettings();
    default:return viewDashboard();
  }
}
function todayPayments(){const d=new Date().toISOString().slice(0,10);return db.payments.filter(p=>p.createdAt.slice(0,10)===d)}
function todayPaidOrders(){const ids=new Set(todayPayments().map(p=>p.orderId));return db.orders.filter(o=>ids.has(o.id))}
function viewDashboard(){
  const pays=todayPayments(), paid=todayPaidOrders();
  const sales=pays.reduce((a,p)=>a+p.amount,0);
  const open=db.orders.filter(o=>!['paid','cancelled'].includes(o.status));
  const covers=paid.reduce((a,o)=>a+Number(o.covers||0),0);
  const cost=paid.reduce((a,o)=>a+orderCost(o),0);
  const avg=paid.length?sales/paid.length:0;
  const waste=db.wastes.reduce((a,w)=>a+(w.cost||0),0);
  const stationCounts=db.kitchenTickets.filter(t=>!['served','cancelled'].includes(t.status)).reduce((a,t)=>(a[t.stationId]=(a[t.stationId]||0)+1,a),{});
  return `${pageTitle('Restaurant Dashboard','Today’s service, kitchen, cash and stock in one place')}
  <div class="statsGrid">
    ${stat('Net Sales',money(sales),paid.length+' paid orders')}
    ${stat('Open Orders',open.length,open.reduce((a,o)=>a+Number(o.covers||0),0)+' active covers')}
    ${stat('Average Ticket',money(avg),covers+' served covers')}
    ${stat('Food Cost',sales?((cost/sales)*100).toFixed(1)+'%':'0.0%',money(cost)+' theoretical')}
    ${stat('Waste Cost',money(waste),db.wastes.length+' waste entries')}
  </div>
  <div class="grid2">
    <section class="panel">
      <div class="panelHead"><h3>Live Floor</h3><button class="link" data-nav="Floor & Orders">Open floor</button></div>
      <div class="miniTables">${db.tables.map(t=>{const o=openOrderForTable(t.id);const total=o?orderTotals(o).total:0;return `<button data-table="${t.id}" class="${o?'occupied':'free'}"><b>${esc(t.name)}</b><span>${o?money(total):'Available'}</span></button>`}).join('')}</div>
    </section>
    <section class="panel">
      <div class="panelHead"><h3>Kitchen Load</h3><button class="link" data-nav="KDS">Open KDS</button></div>
      <div class="stationCards">${db.stations.map(s=>`<div><span>${esc(s.name)}</span><strong>${stationCounts[s.id]||0}</strong><small>active tickets</small></div>`).join('')}</div>
      <div class="alertList">${db.ingredients.filter(i=>i.stock<=i.reorder).slice(0,5).map(i=>`<div><span>Low stock · ${esc(i.name)}</span><b>${i.stock} ${esc(i.unit)}</b></div>`).join('')||'<div><span>Inventory</span><b>Healthy</b></div>'}</div>
    </section>
  </div>
  <section class="panel">
    <div class="panelHead"><h3>Recent Activity</h3><span>Audit trail</span></div>
    <div class="activity">${db.audit.slice(0,8).map(a=>`<div><span>${fmtTime(a.at)}</span><b>${esc(a.action)}</b><small>${esc(staff(a.staffId)?.name||'System')}</small></div>`).join('')||empty('No activity yet.')}</div>
  </section>`;
}
function viewFloor(){
  const sec=session.activeSection;
  const activeOrder=session.activeOrderId?orderById(session.activeOrderId):null;
  if(activeOrder) return viewOrder(activeOrder);
  return `${pageTitle('Floor & Orders','Tables, dine-in, takeaway and delivery',
    '<div class="segButtons"><button data-action="new-takeaway">Takeaway</button><button data-action="new-delivery">Delivery</button></div>')}
  <div class="sectionTabs">${db.sections.map(s=>`<button data-section="${s.id}" class="${sec===s.id?'active':''}">${esc(s.name)}</button>`).join('')}</div>
  <div class="floorGrid">${db.tables.filter(t=>t.sectionId===sec).map(t=>{
    const o=openOrderForTable(t.id), res=db.reservations.find(r=>r.tableId===t.id&&r.status==='confirmed'&&r.date===new Date().toISOString().slice(0,10));
    const totals=o?orderTotals(o):null;
    return `<button class="tableCard ${o?'occupied':res?'reserved':'available'}" data-table="${t.id}">
      <div><b>${esc(t.name)}</b><span>${t.seats} seats</span></div>
      ${o?`<strong>${money(totals.total)}</strong><small>${o.covers} covers · ${minutesSince(o.openedAt)}m</small>`:res?`<strong>${esc(res.time)}</strong><small>${esc(res.name)} · ${res.covers} guests</small>`:'<strong>Available</strong><small>Tap to open</small>'}
    </button>`
  }).join('')}</div>
  <section class="panel channelPanel">
    <div class="panelHead"><h3>Non-table Orders</h3><span>Takeaway & delivery</span></div>
    <div class="orderRows">${db.orders.filter(o=>!o.tableId&&!['paid','cancelled'].includes(o.status)).map(orderRow).join('')||empty('No active takeaway or delivery orders.')}</div>
  </section>`;
}
function orderRow(o){const t=orderTotals(o);return `<button class="orderRow" data-order="${o.id}"><div><b>${esc(o.number)}</b><span>${esc(o.type)} · ${esc(o.customerName||'Walk-in')}</span></div><div><strong>${money(t.total)}</strong><small>${esc(o.status)}</small></div></button>`}
function viewOrder(order){
  const totals=orderTotals(order), tableObj=order.tableId?table(order.tableId):null;
  const filtered=db.menuItems.filter(i=>i.active&&i.categoryId===session.activeCategory&&i.name.toLowerCase().includes(session.menuSearch.toLowerCase()));
  const sent=order.items.filter(i=>i.sentAt), unsent=order.items.filter(i=>!i.sentAt);
  return `<div class="orderHeader">
    <button class="backBtn" data-action="back-floor">← Floor</button>
    <div><h1>${tableObj?esc(tableObj.name):esc(order.type)} <span>${esc(order.number)}</span></h1><p>${order.covers||1} covers · ${esc(staff(order.waiterId)?.name||'')}</p></div>
    <div class="orderHeaderActions"><button class="ghost" data-action="move-table">Move</button><button class="ghost" data-action="merge-order">Merge</button><button class="ghost" data-action="discount-order">Discount</button><button class="ghost dangerText" data-action="cancel-order">Void</button><button class="primary" data-action="payment">Payment ${money(totals.due)}</button></div>
  </div>
  <div class="orderLayout">
    <section class="menuPane">
      <div class="menuTools"><input id="menuSearch" placeholder="Search menu…" value="${esc(session.menuSearch)}"><button data-action="show-all-menu">All</button></div>
      <div class="categoryTabs">${db.menuCategories.map(c=>`<button data-category="${c.id}" class="${session.activeCategory===c.id?'active':''}">${esc(c.name)}</button>`).join('')}</div>
      <div class="menuGrid">${filtered.map(i=>`<button class="menuItem" data-menu-item="${i.id}"><span>${esc(db.menuCategories.find(c=>c.id===i.categoryId)?.name||'')}</span><b>${esc(i.name)}</b><strong>${money(i.price)}</strong><small>${esc(db.stations.find(s=>s.id===i.stationId)?.name||'')}</small></button>`).join('')||empty('No menu items in this category.')}</div>
    </section>
    <aside class="checkPane">
      <div class="checkTitle"><div><h3>Current Check</h3><span>${order.items.reduce((a,i)=>a+i.qty,0)} items</span></div><button data-action="add-note">Note</button></div>
      <div class="checkItems">${order.items.map(i=>`<div class="checkItem ${i.sentAt?'sent':''}">
        <div class="qtyBox"><button data-item-dec="${i.id}" ${i.sentAt?'disabled':''}>−</button><b>${i.qty}</b><button data-item-inc="${i.id}" ${i.sentAt?'disabled':''}>+</button></div>
        <div class="checkInfo"><b>${esc(i.name)}</b><span>${(i.modifiers||[]).map(m=>esc(m.name)).join(' · ')}</span>${i.note?`<small>Note: ${esc(i.note)}</small>`:''}</div>
        <strong>${money(i.unitPrice*i.qty)}</strong>
        ${!i.sentAt?`<button class="remove" data-remove-item="${i.id}">×</button>`:''}
      </div>`).join('')||empty('Add an item from the menu.')}</div>
      <div class="sendBar">${unsent.length?`<button class="sendKitchen" data-action="send-kitchen">SEND ${unsent.length} ITEM(S) TO KITCHEN</button>`:`<div class="sentStatus">${sent.length?'All items sent to kitchen':'No items yet'}</div>`}</div>
      <div class="checkTotals"><div><span>Net</span><b>${money(totals.net)}</b></div><div><span>VAT 5%</span><b>${money(totals.vat)}</b></div>${totals.discount?`<div class="discountLine"><span>Discount</span><b>− ${money(totals.discount)}</b></div>`:''}<div class="totalLine"><span>Total</span><b>${money(totals.total)}</b></div><div><span>Paid</span><b>${money(totals.paid)}</b></div><div class="dueLine"><span>Due</span><b>${money(totals.due)}</b></div></div>
    </aside>
  </div>`;
}
function viewKDS(){
  return `${pageTitle('Kitchen Display System','Live tickets by preparation station')}
  <div class="kdsStations">${db.stations.map(st=>{
    const tickets=db.kitchenTickets.filter(t=>t.stationId===st.id&&!['served','cancelled'].includes(t.status));
    return `<section class="kdsCol"><div class="kdsHead"><h3>${esc(st.name)}</h3><span>${tickets.length} tickets</span></div>
      <div class="tickets">${tickets.sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).map(t=>ticketCard(t)).join('')||empty('No active tickets')}</div></section>`
  }).join('')}</div>`;
}
function ticketCard(t){
  const o=orderById(t.orderId), mins=minutesSince(t.createdAt), urgency=mins>=20?'late':mins>=10?'warn':'ok';
  const label=o?.tableId?table(o.tableId)?.name:o?.type;
  return `<article class="ticket ${urgency}">
    <header><div><b>${esc(label||'Order')}</b><span>${esc(o?.number||'')}</span></div><strong>${mins}m</strong></header>
    <div class="ticketItems">${t.items.map(i=>`<div><b>${i.qty} × ${esc(i.name)}</b><span>${(i.modifiers||[]).map(m=>esc(m.name)).join(' · ')}</span>${i.note?`<small>${esc(i.note)}</small>`:''}</div>`).join('')}</div>
    <footer>${t.status==='new'?'<button data-ticket-status="'+t.id+'" data-status="preparing">START</button>':t.status==='preparing'?'<button data-ticket-status="'+t.id+'" data-status="ready">READY</button>':'<button data-ticket-status="'+t.id+'" data-status="served">SERVED</button>'}<span>${esc(t.status.toUpperCase())}</span></footer>
  </article>`;
}
function viewMenu(){
  return `${pageTitle('Menu Management','Categories, prices, preparation stations, modifiers and recipes','<button class="primary" data-action="add-menu-item">+ Menu Item</button>')}
  <div class="grid2">
    <section class="panel"><div class="panelHead"><h3>Menu Items</h3><span>${db.menuItems.length} items</span></div>
      <div class="menuAdmin">${db.menuItems.map(i=>`<button data-edit-menu="${i.id}"><div><b>${esc(i.name)}</b><span>${esc(db.menuCategories.find(c=>c.id===i.categoryId)?.name||'')} · ${esc(db.stations.find(s=>s.id===i.stationId)?.name||'')}</span></div><div><strong>${money(i.price)}</strong><small>Cost ${money(recipeCost(i))}</small></div></button>`).join('')}</div>
    </section>
    <section class="panel"><div class="panelHead"><h3>Modifier Groups</h3><button class="link" data-action="add-modifier">Add group</button></div>
      <div class="modifierAdmin">${db.modifiers.map(g=>`<div><div><b>${esc(g.name)}</b><span>${g.required?'Required':'Optional'} · max ${g.max}</span></div><p>${g.options.map(o=>esc(o.name)+(o.price?' +'+money(o.price):'')).join(' · ')}</p></div>`).join('')}</div>
    </section>
  </div>`;
}
function viewInventory(){
  const value=db.ingredients.reduce((a,i)=>a+i.stock*i.costPerUnit,0);
  return `${pageTitle('Inventory','Ingredient stock, theoretical usage, adjustments and waste','<div class="segButtons"><button data-action="stock-adjust">Adjust Stock</button><button class="primary" data-action="record-waste">Record Waste</button></div>')}
  <div class="statsGrid three">${stat('Inventory Value',money(value),db.ingredients.length+' ingredients')}${stat('Low Stock',db.ingredients.filter(i=>i.stock<=i.reorder).length,'at or below reorder level')}${stat('Waste',money(db.wastes.reduce((a,w)=>a+(w.cost||0),0)),db.wastes.length+' entries')}</div>
  <section class="panel"><div class="panelHead"><h3>Ingredients</h3><span>Live stock</span></div>
  <table><thead><tr><th>Ingredient</th><th>On Hand</th><th>Reorder</th><th>Unit Cost</th><th>Value</th><th>Status</th></tr></thead><tbody>${db.ingredients.map(i=>`<tr><td><b>${esc(i.name)}</b></td><td>${Number(i.stock).toFixed(i.unit==='pc'?0:1)} ${esc(i.unit)}</td><td>${i.reorder} ${esc(i.unit)}</td><td>${money(i.costPerUnit)}</td><td>${money(i.stock*i.costPerUnit)}</td><td>${i.stock<=i.reorder?badge('Low','bad'):badge('OK','good')}</td></tr>`).join('')}</tbody></table></section>
  <div class="grid2">
    <section class="panel"><div class="panelHead"><h3>Recent Waste</h3><span>Cost leakage</span></div><div class="simpleRows">${db.wastes.slice(0,8).map(w=>`<div><span>${esc(ingredient(w.ingredientId)?.name||'')}</span><b>${w.qty} ${esc(ingredient(w.ingredientId)?.unit||'')} · ${money(w.cost)}</b><small>${esc(w.reason)} · ${fmtTime(w.createdAt)}</small></div>`).join('')||empty('No waste recorded.')}</div></section>
    <section class="panel"><div class="panelHead"><h3>Stock Adjustments</h3><span>Count corrections</span></div><div class="simpleRows">${db.stockAdjustments.slice(0,8).map(a=>`<div><span>${esc(ingredient(a.ingredientId)?.name||'')}</span><b>${a.delta>0?'+':''}${a.delta} ${esc(ingredient(a.ingredientId)?.unit||'')}</b><small>${esc(a.reason)} · ${fmtTime(a.createdAt)}</small></div>`).join('')||empty('No stock adjustments.')}</div></section>
  </div>`;
}
function viewPurchasing(){
  return `${pageTitle('Purchasing','Suppliers, ingredient receipts and purchase accounting','<button class="primary" data-action="new-purchase">+ Receive Purchase</button>')}
  <div class="grid2">
    <section class="panel"><div class="panelHead"><h3>Suppliers</h3><button class="link" data-action="add-supplier">Add supplier</button></div>
      <div class="simpleRows">${db.suppliers.map(s=>`<div><span>${esc(s.name)}</span><b>${esc(s.phone)}</b><small>TRN ${esc(s.trn||'—')}</small></div>`).join('')}</div>
    </section>
    <section class="panel"><div class="panelHead"><h3>Purchase Receipts</h3><span>${db.purchases.length} receipts</span></div>
      <div class="simpleRows">${db.purchases.slice(0,12).map(p=>`<div><span>${esc(db.suppliers.find(s=>s.id===p.supplierId)?.name||'Supplier')}</span><b>${money(p.total)}</b><small>${p.items.length} lines · ${new Date(p.createdAt).toLocaleDateString('en-AE')}</small></div>`).join('')||empty('No purchases yet.')}</div>
    </section>
  </div>`;
}
function viewReservations(){
  const today=new Date().toISOString().slice(0,10);
  return `${pageTitle('Reservations','Guest bookings, table assignment and notes','<button class="primary" data-action="new-reservation">+ Reservation</button>')}
  <section class="panel"><div class="panelHead"><h3>Bookings</h3><span>${db.reservations.filter(r=>r.date>=today).length} upcoming</span></div>
    <table><thead><tr><th>Date</th><th>Time</th><th>Guest</th><th>Covers</th><th>Table</th><th>Status</th><th>Notes</th></tr></thead><tbody>${db.reservations.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.time)}</td><td><b>${esc(r.name)}</b><small>${esc(r.phone)}</small></td><td>${r.covers}</td><td>${esc(table(r.tableId)?.name||'Unassigned')}</td><td>${badge(r.status,r.status==='confirmed'?'good':'neutral')}</td><td>${esc(r.notes||'')}</td></tr>`).join('')}</tbody></table>
  </section>`;
}
function viewStaff(){
  const current=activeShift();
  return `${pageTitle('Staff & Shifts','Roles, cashier sessions and accountability','<button class="primary" data-action="add-staff">+ Staff</button>')}
  <div class="statsGrid three">${stat('Active Staff',db.staff.filter(s=>s.active).length,'configured users')}${stat('Open Shifts',db.shifts.filter(s=>!s.closedAt).length,'currently active')}${stat('Your Shift',current?'OPEN':'CLOSED',current?('since '+fmtTime(current.openedAt)):'open before cashiering')}</div>
  <div class="grid2">
    <section class="panel"><div class="panelHead"><h3>Team</h3><span>PIN protected roles</span></div><div class="staffGrid">${db.staff.map(s=>`<div><div class="avatar">${esc(s.name.slice(0,1))}</div><b>${esc(s.name)}</b><span>${esc(s.role)}</span>${s.active?badge('Active','good'):badge('Inactive','bad')}</div>`).join('')}</div></section>
    <section class="panel"><div class="panelHead"><h3>Shift History</h3><span>Cash control</span></div><div class="simpleRows">${db.shifts.slice(0,10).map(s=>`<div><span>${esc(staff(s.staffId)?.name||'')}</span><b>${s.closedAt?'Closed':'Open'} · ${money(s.openingCash)}</b><small>${fmtTime(s.openedAt)} → ${s.closedAt?fmtTime(s.closedAt):'now'}${s.cashDifference!=null?' · diff '+money(s.cashDifference):''}</small></div>`).join('')||empty('No shifts yet.')}</div></section>
  </div>`;
}
function viewReports(){
  const paid=db.orders.filter(o=>o.status==='paid');
  const sales=paid.reduce((a,o)=>a+orderTotals(o).total,0);
  const byType={},byItem={},byWaiter={},byPay={};
  paid.forEach(o=>{byType[o.type]=(byType[o.type]||0)+orderTotals(o).total;byWaiter[o.waiterId]=(byWaiter[o.waiterId]||0)+orderTotals(o).total;o.items.forEach(i=>byItem[i.name]=(byItem[i.name]||0)+i.qty)});
  db.payments.forEach(p=>byPay[p.method]=(byPay[p.method]||0)+p.amount);
  return `${pageTitle('Reports','Sales, channel, payment, item and staff performance')}
  <div class="statsGrid three">${stat('Recorded Sales',money(sales),paid.length+' paid orders')}${stat('Theoretical Food Cost',money(paid.reduce((a,o)=>a+orderCost(o),0)),'recipe based')}${stat('Gross Margin',sales?(((sales-paid.reduce((a,o)=>a+orderCost(o),0))/sales)*100).toFixed(1)+'%':'0.0%','before operating expenses')}</div>
  <div class="grid2">
    ${reportBox('Sales by Channel',Object.entries(byType).map(([k,v])=>[k,money(v)]))}
    ${reportBox('Payments',Object.entries(byPay).map(([k,v])=>[k,money(v)]))}
    ${reportBox('Top Items',Object.entries(byItem).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>[k,v+' sold']))}
    ${reportBox('Sales by Waiter',Object.entries(byWaiter).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[staff(k)?.name||k,money(v)]))}
  </div>`;
}
function reportBox(title,rows){return `<section class="panel"><div class="panelHead"><h3>${title}</h3></div><div class="reportRows">${rows.map(r=>`<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')||empty('No data yet.')}</div></section>`}
function viewAccounting(){
  const balances={};db.journals.forEach(j=>j.rows.forEach(r=>balances[r.account]=(balances[r.account]||0)+(r.debit||0)-(r.credit||0)));
  return `${pageTitle('Accounting','Automatic double-entry posting from restaurant operations')}
  <div class="grid2">
    <section class="panel"><div class="panelHead"><h3>Trial Balance</h3><span>Live</span></div><table><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${Object.entries(balances).sort().map(([a,b])=>`<tr><td>${esc(a)}</td><td class="num">${b>0?money(b):'—'}</td><td class="num">${b<0?money(-b):'—'}</td></tr>`).join('')}</tbody></table></section>
    <section class="panel"><div class="panelHead"><h3>Journal Entries</h3><span>${db.journals.length}</span></div><div class="journalList">${db.journals.slice(0,20).map(j=>`<details><summary><div><b>${esc(j.source)}</b><span>${esc(j.description)}</span></div><small>${fmtTime(j.date)}</small></summary>${j.rows.map(r=>`<div><span>${esc(r.account)}</span><b>${r.debit?'Dr '+money(r.debit):'Cr '+money(r.credit)}</b></div>`).join('')}</details>`).join('')||empty('Transactions will post journals automatically.')}</div></section>
  </div>`;
}
function viewSettings(){
  return `${pageTitle('Settings','Restaurant identity, tax settings and system controls')}
  <div class="grid2">
    <form class="panel form" id="businessForm"><h3>Business</h3>
      <label>Legal / Trade Name<input name="name" value="${esc(db.business.name)}"></label>
      <label>Branch<input name="branch" value="${esc(db.business.branch)}"></label>
      <label>TRN<input name="trn" value="${esc(db.business.trn)}"></label>
      <label>Address<input name="address" value="${esc(db.business.address)}"></label>
      <label>Phone<input name="phone" value="${esc(db.business.phone)}"></label>
      <label>VAT Rate<input value="5%" disabled></label>
      <button class="primary">Save Settings</button>
    </form>
    <section class="panel settingsPanel"><h3>System Controls</h3><p>This version runs in browser storage for product validation. Production deployment should use authenticated multi-tenant cloud storage, branch permissions, secure backups and payment/KDS device integrations.</p><button class="danger" data-action="reset-system">Reset Demo Data</button><div class="systemInfo"><span>Mode</span><b>Restaurant</b><span>Currency</span><b>AED</b><span>VAT</span><b>5%</b><span>Audit entries</span><b>${db.audit.length}</b></div></section>
  </div>`;
}

function viewSales(){
  const paid=db.orders.filter(o=>o.status==='paid').sort((a,b)=>new Date(b.closedAt)-new Date(a.closedAt));
  return `${pageTitle('Sales & Refunds','Paid checks, tax invoice reprints and controlled refunds')}
  <section class="panel"><div class="panelHead"><h3>Paid Orders</h3><span>${paid.length} checks</span></div>
    <table><thead><tr><th>Check</th><th>Closed</th><th>Channel</th><th>Table / Guest</th><th>Total</th><th>Refunded</th><th>Actions</th></tr></thead><tbody>
    ${paid.map(o=>{const t=orderTotals(o),ref=db.refunds.filter(r=>r.orderId===o.id).reduce((a,r)=>a+r.amount,0);return `<tr><td><b>${esc(o.number)}</b></td><td>${new Date(o.closedAt).toLocaleString('en-AE')}</td><td>${esc(o.type)}</td><td>${esc(o.tableId?table(o.tableId)?.name:(o.customerName||'Walk-in'))}</td><td>${money(t.total)}</td><td>${money(ref)}</td><td><div class="tableActions"><button data-receipt="${o.id}">Receipt</button><button data-refund="${o.id}" ${ref>=t.total-.01?'disabled':''}>Refund</button></div></td></tr>`}).join('')}
    </tbody></table>
  </section>`;
}
function viewExpenses(){
  const total=db.expenses.reduce((a,e)=>a+e.amount,0);
  return `${pageTitle('Expenses','Operating expenses and cash-out controls','<button class="primary" data-action="new-expense">+ Expense</button>')}
  <div class="statsGrid three">${stat('Total Expenses',money(total),db.expenses.length+' entries')}${stat('Cash Expenses',money(db.expenses.filter(e=>e.paymentMethod==='Cash').reduce((a,e)=>a+e.amount,0)),'affects shift cash')}${stat('Other Expenses',money(db.expenses.filter(e=>e.paymentMethod!=='Cash').reduce((a,e)=>a+e.amount,0)),'bank / card')}</div>
  <section class="panel"><div class="panelHead"><h3>Expense Ledger</h3><span>Double-entry posted</span></div><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Payment</th><th>Amount</th></tr></thead><tbody>${db.expenses.map(e=>`<tr><td>${new Date(e.createdAt).toLocaleString('en-AE')}</td><td><b>${esc(e.description)}</b></td><td>${esc(e.category)}</td><td>${esc(e.paymentMethod)}</td><td>${money(e.amount)}</td></tr>`).join('')}</tbody></table></section>`;
}

function modalView(){
  if(!session.modal)return'';
  const m=session.modal;
  if(m.type==='item')return modifierModal(m.itemId);
  if(m.type==='payment')return paymentModal(m.orderId);
  if(m.type==='newOrder')return newOrderModal(m.orderType,m.tableId);
  if(m.type==='discount')return discountModal(m.orderId);
  if(m.type==='move')return moveModal(m.orderId);
  if(m.type==='merge')return mergeModal(m.orderId);
  if(m.type==='refund')return refundModal(m.orderId);
  if(m.type==='expense')return expenseModal();
  if(m.type==='waste')return wasteModal();
  if(m.type==='adjust')return adjustModal();
  if(m.type==='purchase')return purchaseModal();
  if(m.type==='reservation')return reservationModal();
  if(m.type==='shift')return shiftModal();
  if(m.type==='receipt')return receiptModal(m.orderId);
  if(m.type==='menuItem')return menuItemModal(m.itemId);
  if(m.type==='supplier')return supplierModal();
  if(m.type==='staff')return staffModal();
  return'';
}
function modalShell(title,body,wide=false){return `<div class="overlay"><div class="modal ${wide?'wide':''}"><button class="modalX" data-action="close-modal">×</button><h2>${title}</h2>${body}</div></div>`}
function modifierModal(itemId){
  const item=menuItem(itemId);if(!item)return'';
  return modalShell(esc(item.name),`<form id="modifierForm"><input type="hidden" name="itemId" value="${item.id}"><div class="modifierGroups">${item.modifierGroupIds.map(id=>{const g=db.modifiers.find(x=>x.id===id);return `<fieldset><legend>${esc(g.name)} ${g.required?'<em>Required</em>':''}</legend>${g.options.map(o=>`<label class="option"><input type="${g.max===1?'radio':'checkbox'}" name="mod_${g.id}" value="${o.id}" ${g.required&&g.max===1&&o===g.options[0]?'checked':''}><span>${esc(o.name)}</span><b>${o.price?'+'+money(o.price):'Included'}</b></label>`).join('')}</fieldset>`}).join('')}</div><label class="field">Item note<input name="note" placeholder="No salt, allergy note…"></label><button class="primary full">Add to order · ${money(item.price)}</button></form>`,true)
}
function paymentModal(orderId){
  const o=orderById(orderId),t=orderTotals(o);
  const paid=db.payments.filter(p=>p.orderId===orderId);
  return modalShell('Payment',`<div class="amountDue"><span>Amount Due</span><strong>${money(t.due)}</strong></div>
  <form id="paymentForm"><input type="hidden" name="orderId" value="${o.id}"><label class="field">Amount<input name="amount" type="number" min="0.01" step="0.01" max="${t.due.toFixed(2)}" value="${t.due.toFixed(2)}"></label>
  <div class="paymentMethods">${['Cash','Card','Bank Transfer','Other'].map(x=>`<button type="button" data-pay-method="${x}">${x}</button>`).join('')}</div><input type="hidden" name="method" value="Card"><button class="primary full">Record Payment</button></form>
  <div class="paidList">${paid.map(p=>`<div><span>${esc(p.method)}</span><b>${money(p.amount)}</b></div>`).join('')}</div>
  <div class="splitActions"><button data-action="split-equal">Split equally</button><button data-action="split-custom">Partial payment supported</button></div>`)
}
function newOrderModal(type='Dine-in',tableId=''){
  return modalShell('Open '+type+' Order',`<form id="newOrderForm"><input type="hidden" name="type" value="${esc(type)}"><input type="hidden" name="tableId" value="${esc(tableId||'')}">
  <label class="field">Covers<input name="covers" type="number" min="1" value="${tableId?2:1}"></label>
  ${!tableId?`<label class="field">Customer / reference<input name="customerName" placeholder="Guest name or delivery reference"></label>`:''}
  <label class="field">Waiter<select name="waiterId">${db.staff.filter(s=>['Waiter','Manager','Owner'].includes(s.role)).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
  <button class="primary full">Open Order</button></form>`)
}
function discountModal(orderId){return modalShell('Apply Discount',`<form id="discountForm"><input type="hidden" name="orderId" value="${orderId}"><label class="field">Discount AED<input name="amount" type="number" step="0.01" min="0"></label><label class="field">Reason<input name="reason" required placeholder="Manager comp, promotion…"></label><button class="primary full">Apply Discount</button></form>`)}

function mergeModal(orderId){
  const o=orderById(orderId),targets=db.orders.filter(x=>x.id!==orderId&&!['paid','cancelled'].includes(x.status));
  return modalShell('Merge Orders',`<form id="mergeForm"><input type="hidden" name="orderId" value="${orderId}"><label class="field">Merge into open order<select name="targetOrderId">${targets.map(x=>`<option value="${x.id}">${esc(x.number)} · ${esc(x.tableId?table(x.tableId)?.name:x.type)} · ${money(orderTotals(x).total)}</option>`).join('')}</select></label><p class="hint">Items, kitchen tickets and payments remain auditable. Source order will be marked merged.</p><button class="primary full" ${targets.length?'':'disabled'}>Merge Orders</button></form>`)
}
function refundModal(orderId){
  const o=orderById(orderId),t=orderTotals(o),already=db.refunds.filter(r=>r.orderId===orderId).reduce((a,r)=>a+r.amount,0),max=Math.max(0,t.total-already);
  return modalShell('Refund '+esc(o.number),`<form id="refundForm"><input type="hidden" name="orderId" value="${orderId}"><div class="amountDue"><span>Refundable balance</span><strong>${money(max)}</strong></div><label class="field">Refund amount<input name="amount" type="number" min="0.01" max="${max.toFixed(2)}" step="0.01" value="${max.toFixed(2)}"></label><label class="field">Method<select name="method"><option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Other</option></select></label><label class="field">Reason<input name="reason" required placeholder="Customer return, billing correction…"></label><button class="primary full">Post Refund</button></form>`)
}
function expenseModal(){
  return modalShell('Record Expense',`<form id="expenseForm"><label class="field">Description<input name="description" required></label><label class="field">Category<select name="category"><option>Rent</option><option>Utilities</option><option>Marketing</option><option>Transport</option><option>Cleaning</option><option>Repairs</option><option>Staff</option><option>General</option></select></label><label class="field">Amount incl. VAT<input name="amount" type="number" min="0.01" step="0.01" required></label><label class="field">Payment method<select name="paymentMethod"><option>Cash</option><option>Card</option><option>Bank</option></select></label><label class="field">Supplier / note<input name="note"></label><button class="primary full">Post Expense</button></form>`)
}

function moveModal(orderId){return modalShell('Move Table',`<form id="moveForm"><input type="hidden" name="orderId" value="${orderId}"><label class="field">New table<select name="tableId">${db.tables.filter(t=>!openOrderForTable(t.id)).map(t=>`<option value="${t.id}">${esc(t.name)} · ${esc(db.sections.find(s=>s.id===t.sectionId)?.name||'')}</option>`).join('')}</select></label><button class="primary full">Move Order</button></form>`)}
function wasteModal(){return modalShell('Record Waste',`<form id="wasteForm"><label class="field">Ingredient<select name="ingredientId">${db.ingredients.map(i=>`<option value="${i.id}">${esc(i.name)} · ${i.stock} ${esc(i.unit)}</option>`).join('')}</select></label><label class="field">Quantity<input name="qty" type="number" step="0.01" required></label><label class="field">Reason<select name="reason"><option>Spoilage</option><option>Preparation Waste</option><option>Damaged</option><option>Staff Meal</option><option>Complimentary</option><option>Other</option></select></label><button class="primary full">Record Waste</button></form>`)}
function adjustModal(){return modalShell('Stock Adjustment',`<form id="adjustForm"><label class="field">Ingredient<select name="ingredientId">${db.ingredients.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('')}</select></label><label class="field">Actual stock count<input name="actual" type="number" step="0.01" required></label><label class="field">Reason<input name="reason" value="Stock count"></label><button class="primary full">Post Adjustment</button></form>`)}
function purchaseModal(){return modalShell('Receive Purchase',`<form id="purchaseForm"><label class="field">Supplier<select name="supplierId">${db.suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label class="field">Ingredient<select name="ingredientId">${db.ingredients.map(i=>`<option value="${i.id}">${esc(i.name)} · ${esc(i.unit)}</option>`).join('')}</select></label><label class="field">Quantity<input name="qty" type="number" step="0.01" required></label><label class="field">Total purchase cost incl. VAT<input name="total" type="number" step="0.01" required></label><label class="field">Supplier invoice no.<input name="invoiceNo"></label><button class="primary full">Receive & Post</button></form>`)}
function reservationModal(){return modalShell('New Reservation',`<form id="reservationForm"><label class="field">Guest name<input name="name" required></label><label class="field">Phone<input name="phone"></label><label class="field">Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label class="field">Time<input name="time" type="time" value="20:00"></label><label class="field">Covers<input name="covers" type="number" min="1" value="2"></label><label class="field">Table<select name="tableId">${db.tables.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><label class="field">Notes<input name="notes"></label><button class="primary full">Save Reservation</button></form>`)}
function shiftModal(){
  const sh=activeShift();
  return modalShell(sh?'Close Shift':'Open Shift',sh?`<form id="closeShiftForm"><div class="amountDue"><span>Expected cash</span><strong>${money(expectedCashForShift(sh))}</strong></div><label class="field">Actual cash counted<input name="actualCash" type="number" step="0.01" required></label><button class="primary full">Close Shift</button></form>`:`<form id="openShiftForm"><label class="field">Opening cash float<input name="openingCash" type="number" step="0.01" value="500"></label><button class="primary full">Open Shift</button></form>`)
}
function receiptModal(orderId){
  const o=orderById(orderId),t=orderTotals(o),c=o.customerId?customer(o.customerId):null;
  return modalShell('Tax Invoice',`<div class="receipt" id="printArea"><header><b>${esc(db.business.name)}</b><span>${esc(db.business.branch)}</span><span>TRN ${esc(db.business.trn)}</span><h3>TAX INVOICE</h3><small>${esc(o.number)} · ${new Date(o.closedAt||o.openedAt).toLocaleString('en-AE')}</small></header>${c&&c.id!=='C1'?'<div class="receiptCustomer"><span>'+esc(c.name)+'</span><small>TRN '+esc(c.trn||'')+'</small></div>':''}<div class="receiptLines">${o.items.map(i=>`<div><span>${i.qty} × ${esc(i.name)}</span><b>${money(i.unitPrice*i.qty)}</b></div>`).join('')}</div><footer><div><span>Net</span><b>${money(t.net)}</b></div><div><span>VAT 5%</span><b>${money(t.vat)}</b></div>${t.discount?'<div><span>Discount</span><b>− '+money(t.discount)+'</b></div>':''}<div class="grand"><span>Total</span><b>${money(t.total)}</b></div></footer></div><button class="primary full noPrint" data-action="print-receipt">Print Receipt</button>`)
}
function menuItemModal(itemId){
  const i=itemId?menuItem(itemId):null;
  const recipeMap=Object.fromEntries((i?.recipe||[]).map(r=>[r.ingredientId,r.qty]));
  return modalShell(i?'Edit Menu Item':'Add Menu Item',`<form id="menuItemForm"><input type="hidden" name="itemId" value="${i?.id||''}"><label class="field">Name<input name="name" value="${esc(i?.name||'')}" required></label><label class="field">Category<select name="categoryId">${db.menuCategories.map(c=>`<option value="${c.id}" ${i?.categoryId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label class="field">Kitchen station<select name="stationId">${db.stations.map(s=>`<option value="${s.id}" ${i?.stationId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label><label class="field">Price incl. VAT<input name="price" type="number" step="0.01" value="${i?.price||''}" required></label>
  <div class="recipeEditor"><h4>Recipe</h4>${db.ingredients.map(x=>`<label><span>${esc(x.name)} <small>${esc(x.unit)}</small></span><input name="recipe_${x.id}" type="number" min="0" step="0.01" value="${recipeMap[x.id]||''}" placeholder="0"></label>`).join('')}</div>
  <div class="recipeEditor"><h4>Modifier Groups</h4>${db.modifiers.map(g=>`<label class="checkLine"><input type="checkbox" name="modifierGroupIds" value="${g.id}" ${i?.modifierGroupIds?.includes(g.id)?'checked':''}><span>${esc(g.name)}</span></label>`).join('')}</div>
  <button class="primary full">Save Menu Item</button></form>`,true)
}
function supplierModal(){return modalShell('Add Supplier',`<form id="supplierForm"><label class="field">Supplier name<input name="name" required></label><label class="field">Phone<input name="phone"></label><label class="field">TRN<input name="trn"></label><button class="primary full">Add Supplier</button></form>`)}
function staffModal(){return modalShell('Add Staff',`<form id="staffForm"><label class="field">Name<input name="name" required></label><label class="field">Role<select name="role"><option>Waiter</option><option>Cashier</option><option>Kitchen</option><option>Manager</option><option>Owner</option></select></label><label class="field">PIN<input name="pin" inputmode="numeric" maxlength="6" required></label><button class="primary full">Add Staff</button></form>`)}
function expectedCashForShift(sh){
  const cash=db.payments.filter(p=>p.method==='Cash'&&new Date(p.createdAt)>=new Date(sh.openedAt)).reduce((a,p)=>a+p.amount,0);
  const cashExp=db.expenses.filter(e=>e.paymentMethod==='Cash'&&new Date(e.createdAt)>=new Date(sh.openedAt)).reduce((a,e)=>a+e.amount,0);
  return sh.openingCash+cash-cashExp;
}
