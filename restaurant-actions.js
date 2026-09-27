function bindUI(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{session.page=b.dataset.nav;session.activeOrderId=null;session.modal=null;renderApp()});
  const staffSel=document.querySelector('#staffSwitcher');
  if(staffSel) staffSel.onchange=e=>{session.currentStaffId=e.target.value;audit('Staff session changed',{staffId:e.target.value});saveDb();renderApp()};
  document.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{session.activeSection=b.dataset.section;renderApp()});
  document.querySelectorAll('[data-table]').forEach(b=>b.onclick=()=>openTable(b.dataset.table));
  document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{session.activeOrderId=b.dataset.order;renderApp()});
  document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{session.activeCategory=b.dataset.category;renderApp()});
  document.querySelectorAll('[data-menu-item]').forEach(b=>b.onclick=()=>{session.modal={type:'item',itemId:b.dataset.menuItem};renderApp()});
  document.querySelectorAll('[data-edit-menu]').forEach(b=>b.onclick=()=>{session.modal={type:'menuItem',itemId:b.dataset.editMenu};renderApp()});
  document.querySelectorAll('[data-receipt]').forEach(b=>b.onclick=()=>{session.modal={type:'receipt',orderId:b.dataset.receipt};renderApp()});
  document.querySelectorAll('[data-refund]').forEach(b=>b.onclick=()=>{session.modal={type:'refund',orderId:b.dataset.refund};renderApp()});
  document.querySelectorAll('[data-ticket-status]').forEach(b=>b.onclick=()=>updateTicket(b.dataset.ticketStatus,b.dataset.status));
  document.querySelectorAll('[data-item-inc]').forEach(b=>b.onclick=()=>changeItemQty(b.dataset.itemInc,1));
  document.querySelectorAll('[data-item-dec]').forEach(b=>b.onclick=()=>changeItemQty(b.dataset.itemDec,-1));
  document.querySelectorAll('[data-remove-item]').forEach(b=>b.onclick=()=>removeOrderItem(b.dataset.removeItem));
  document.querySelectorAll('[data-pay-method]').forEach(b=>b.onclick=()=>selectPaymentMethod(b.dataset.payMethod,b));
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>handleAction(b.dataset.action,b));
  const search=document.querySelector('#menuSearch'); if(search) search.oninput=e=>{session.menuSearch=e.target.value;renderApp()};
  bindForms();
}

function handleAction(action,el){
  if(action==='close-modal'){session.modal=null;return renderApp()}
  if(action==='new-order'){session.page='Floor & Orders';session.modal={type:'newOrder',orderType:'Takeaway'};return renderApp()}
  if(action==='new-takeaway'){session.modal={type:'newOrder',orderType:'Takeaway'};return renderApp()}
  if(action==='new-delivery'){session.modal={type:'newOrder',orderType:'Delivery'};return renderApp()}
  if(action==='back-floor'){session.activeOrderId=null;return renderApp()}
  if(action==='payment'){session.modal={type:'payment',orderId:session.activeOrderId};return renderApp()}
  if(action==='discount-order'){session.modal={type:'discount',orderId:session.activeOrderId};return renderApp()}
  if(action==='move-table'){session.modal={type:'move',orderId:session.activeOrderId};return renderApp()}
  if(action==='merge-order'){session.modal={type:'merge',orderId:session.activeOrderId};return renderApp()}
  if(action==='cancel-order')return cancelOrder(session.activeOrderId)
  if(action==='send-kitchen')return sendToKitchen(session.activeOrderId)
  if(action==='add-note')return addOrderNote()
  if(action==='record-waste'){session.modal={type:'waste'};return renderApp()}
  if(action==='stock-adjust'){session.modal={type:'adjust'};return renderApp()}
  if(action==='new-purchase'){session.modal={type:'purchase'};return renderApp()}
  if(action==='new-expense'){session.modal={type:'expense'};return renderApp()}
  if(action==='new-reservation'){session.modal={type:'reservation'};return renderApp()}
  if(action==='open-shift'){session.modal={type:'shift'};return renderApp()}
  if(action==='add-menu-item'){session.modal={type:'menuItem'};return renderApp()}
  if(action==='add-supplier'){session.modal={type:'supplier'};return renderApp()}
  if(action==='add-staff'){session.modal={type:'staff'};return renderApp()}
  if(action==='print-receipt'){window.print();return}
  if(action==='split-equal')return suggestSplit()
  if(action==='split-custom')return toast('Enter any partial amount above, choose payment type, and post it.','ok')
  if(action==='show-all-menu'){session.menuSearch='';return renderApp()}
  if(action==='reset-system'){
    if(confirm('Reset all restaurant demo data?')){resetDb();session.activeOrderId=null;session.modal=null;audit('System demo reset');saveDb();renderApp();toast('Demo reset')}
  }
}

function bindForms(){
  const map={
    modifierForm:addConfiguredItem,
    newOrderForm:createOrder,
    paymentForm:recordPayment,
    discountForm:applyDiscount,
    moveForm:moveOrder,
    mergeForm:mergeOrder,
    refundForm:recordRefund,
    expenseForm:recordExpense,
    wasteForm:recordWaste,
    adjustForm:recordAdjustment,
    purchaseForm:recordPurchase,
    reservationForm:recordReservation,
    openShiftForm:openShift,
    closeShiftForm:closeShift,
    menuItemForm:saveMenuItem,
    supplierForm:addSupplier,
    staffForm:addStaff,
    businessForm:saveBusiness
  };
  Object.entries(map).forEach(([id,fn])=>{const f=document.querySelector('#'+id);if(f)f.onsubmit=e=>{e.preventDefault();fn(e.target)}});
}

function openTable(tableId){
  const existing=openOrderForTable(tableId);
  if(existing){session.page='Floor & Orders';session.activeOrderId=existing.id;return renderApp()}
  session.modal={type:'newOrder',orderType:'Dine-in',tableId}; renderApp();
}

function createOrder(form){
  const fd=new FormData(form);
  const type=fd.get('type')||'Dine-in',tableId=fd.get('tableId')||null;
  if(tableId&&openOrderForTable(tableId))return toast('This table already has an open order.','bad');
  const order={
    id:uid('ORD'),
    number:'R-'+String(db.orders.length+1).padStart(5,'0'),
    type,
    tableId,
    covers:Number(fd.get('covers')||1),
    customerName:fd.get('customerName')||'',
    customerId:'C1',
    waiterId:fd.get('waiterId')||session.currentStaffId,
    openedAt:now(),
    closedAt:null,
    status:'open',
    discount:0,
    discountReason:'',
    note:'',
    items:[]
  };
  db.orders.unshift(order);
  if(tableId){const t=table(tableId);if(t)t.status='occupied'}
  audit('Order opened',{orderId:order.id,number:order.number,type,tableId});
  saveDb();session.modal=null;session.page='Floor & Orders';session.activeOrderId=order.id;renderApp();toast(order.number+' opened');
}

function addConfiguredItem(form){
  const fd=new FormData(form),item=menuItem(fd.get('itemId'));if(!item)return;
  const mods=[];
  item.modifierGroupIds.forEach(gid=>{
    const g=db.modifiers.find(x=>x.id===gid); if(!g)return;
    fd.getAll('mod_'+gid).forEach(id=>{const o=g.options.find(x=>x.id===id);if(o)mods.push({groupId:gid,id:o.id,name:o.name,price:Number(o.price||0)})});
  });
  const missing=item.modifierGroupIds.map(id=>db.modifiers.find(x=>x.id===id)).find(g=>g?.required&&!mods.some(m=>m.groupId===g.id));
  if(missing)return toast('Choose '+missing.name+'.','bad');
  const order=orderById(session.activeOrderId);if(!order)return;
  const unitPrice=Number(item.price)+mods.reduce((a,m)=>a+m.price,0);
  order.items.push({id:uid('OI'),menuItemId:item.id,name:item.name,qty:1,unitPrice,modifiers:mods,note:fd.get('note')||'',sentAt:null});
  audit('Item added',{orderId:order.id,item:item.name});
  saveDb();session.modal=null;renderApp();
}

function changeItemQty(itemId,delta){
  const order=orderById(session.activeOrderId),line=order?.items.find(i=>i.id===itemId);
  if(!line||line.sentAt)return;
  line.qty=Math.max(1,line.qty+delta);saveDb();renderApp();
}
function removeOrderItem(itemId){
  const order=orderById(session.activeOrderId),line=order?.items.find(i=>i.id===itemId);if(!line||line.sentAt)return;
  order.items=order.items.filter(i=>i.id!==itemId);audit('Unsent item removed',{orderId:order.id,item:line.name});saveDb();renderApp();
}
function addOrderNote(){
  const order=orderById(session.activeOrderId);if(!order)return;
  const note=prompt('Order note',order.note||''); if(note===null)return;
  order.note=note;audit('Order note changed',{orderId:order.id});saveDb();renderApp();
}

function sendToKitchen(orderId){
  const order=orderById(orderId);if(!order)return;
  const unsent=order.items.filter(i=>!i.sentAt);if(!unsent.length)return toast('No unsent items.','bad');
  const sentAt=now();
  unsent.forEach(i=>{i.sentAt=sentAt;deductRecipe(i)});
  db.stations.forEach(st=>{
    const lines=unsent.filter(i=>menuItem(i.menuItemId)?.stationId===st.id);
    if(lines.length)db.kitchenTickets.push({id:uid('KT'),orderId:order.id,stationId:st.id,createdAt:sentAt,status:'new',items:clone(lines)});
  });
  order.status='sent';
  audit('Order sent to kitchen',{orderId:order.id,items:unsent.length});
  saveDb();renderApp();toast(unsent.length+' item(s) sent to kitchen');
}

function updateTicket(ticketId,status){
  const ticket=db.kitchenTickets.find(t=>t.id===ticketId);if(!ticket)return;
  ticket.status=status;ticket.updatedAt=now();
  const siblings=db.kitchenTickets.filter(t=>t.orderId===ticket.orderId&&!['cancelled'].includes(t.status));
  const order=orderById(ticket.orderId);
  if(order){
    if(siblings.length&&siblings.every(t=>t.status==='ready'||t.status==='served'))order.status='ready';
    if(siblings.length&&siblings.every(t=>t.status==='served'))order.status='served';
  }
  audit('Kitchen ticket '+status,{ticketId,orderId:ticket.orderId});
  saveDb();renderApp();
}

function selectPaymentMethod(method,button){
  const f=document.querySelector('#paymentForm');if(!f)return;
  f.querySelector('[name="method"]').value=method;
  document.querySelectorAll('[data-pay-method]').forEach(x=>x.classList.remove('selected'));button.classList.add('selected');
}
function suggestSplit(){
  const f=document.querySelector('#paymentForm'),o=orderById(f?.querySelector('[name="orderId"]')?.value);if(!f||!o)return;
  const covers=Math.max(1,Number(o.covers||1)),due=orderTotals(o).due;
  f.querySelector('[name="amount"]').value=(due/covers).toFixed(2);
  toast('Set to one of '+covers+' equal shares.');
}
function recordPayment(form){
  const fd=new FormData(form),order=orderById(fd.get('orderId'));if(!order)return;
  const totals=orderTotals(order),amount=Math.min(Number(fd.get('amount')||0),totals.due),method=fd.get('method')||'Card';
  if(amount<=0)return toast('Enter a payment amount.','bad');
  db.payments.push({id:uid('PAY'),orderId:order.id,amount,method,createdAt:now(),staffId:session.currentStaffId});
  audit('Payment recorded',{orderId:order.id,amount,method});
  const after=orderTotals(order);
  if(after.due<=0.009)closePaidOrder(order);
  saveDb();
  if(order.status==='paid'){session.modal={type:'receipt',orderId:order.id};session.activeOrderId=null}
  else session.modal={type:'payment',orderId:order.id};
  renderApp();toast(method+' payment '+money(amount));
}

function closePaidOrder(order){
  if(order.status==='paid')return;
  order.status='paid';order.closedAt=now();
  if(order.tableId){const t=table(order.tableId);if(t)t.status='available'}
  const totals=orderTotals(order);
  const payments=db.payments.filter(p=>p.orderId===order.id);
  const paymentRows=payments.map(p=>({account:p.method==='Cash'?'Cash on Hand':p.method==='Card'?'Card Clearing':p.method==='Bank Transfer'?'Bank':'Other Clearing',debit:p.amount,credit:0}));
  const cost=orderCost(order);
  postJournal(order.number,'Restaurant sale '+order.number,[
    ...paymentRows,
    {account:'Food & Beverage Sales',debit:0,credit:totals.net-totals.discount/(1+VAT_RATE)},
    {account:'VAT Output Payable',debit:0,credit:Math.max(0,totals.total-(totals.net-totals.discount/(1+VAT_RATE)))},
    {account:'Cost of Goods Sold',debit:cost,credit:0},
    {account:'Inventory',debit:0,credit:cost}
  ]);
  audit('Order closed and posted',{orderId:order.id,total:totals.total});
}


function cancelOrder(orderId){
  const o=orderById(orderId);if(!o||['paid','cancelled'].includes(o.status))return;
  const reason=prompt('Void reason');if(!reason)return;
  const sent=o.items.filter(i=>i.sentAt);
  sent.forEach(restoreRecipe);
  db.kitchenTickets.filter(t=>t.orderId===o.id&&!['served','cancelled'].includes(t.status)).forEach(t=>t.status='cancelled');
  o.status='cancelled';o.closedAt=now();o.cancelReason=reason;
  if(o.tableId){const t=table(o.tableId);if(t)t.status='available'}
  audit('Order voided',{orderId:o.id,reason});
  saveDb();session.activeOrderId=null;renderApp();toast('Order voided','bad');
}
function mergeOrder(form){
  const fd=new FormData(form),source=orderById(fd.get('orderId')),target=orderById(fd.get('targetOrderId'));
  if(!source||!target||source.id===target.id)return;
  source.items.forEach(i=>target.items.push(i));
  db.kitchenTickets.filter(t=>t.orderId===source.id).forEach(t=>t.orderId=target.id);
  db.payments.filter(p=>p.orderId===source.id).forEach(p=>p.orderId=target.id);
  target.covers=Number(target.covers||0)+Number(source.covers||0);
  if(source.note)target.note=[target.note,source.note].filter(Boolean).join(' | ');
  source.status='merged';source.closedAt=now();source.mergedInto=target.id;
  if(source.tableId){const t=table(source.tableId);if(t)t.status='available'}
  audit('Orders merged',{sourceOrderId:source.id,targetOrderId:target.id});
  saveDb();session.modal=null;session.activeOrderId=target.id;renderApp();toast('Orders merged');
}
function recordRefund(form){
  const fd=new FormData(form),o=orderById(fd.get('orderId'));if(!o||o.status!=='paid')return;
  const original=orderTotals(o).total,already=db.refunds.filter(r=>r.orderId===o.id).reduce((a,r)=>a+r.amount,0);
  const amount=Math.min(Number(fd.get('amount')||0),Math.max(0,original-already));if(amount<=0)return toast('Nothing left to refund.','bad');
  const method=fd.get('method')||'Card',reason=fd.get('reason')||'Refund';
  const ref={id:uid('REF'),orderId:o.id,amount,method,reason,createdAt:now(),staffId:session.currentStaffId};db.refunds.unshift(ref);
  const vat=amount-(amount/(1+VAT_RATE)),net=amount-vat;
  const creditAccount=method==='Cash'?'Cash on Hand':method==='Card'?'Card Clearing':method==='Bank Transfer'?'Bank':'Other Clearing';
  postJournal(ref.id,'Sales refund '+o.number,[{account:'Sales Returns',debit:net,credit:0},{account:'VAT Output Payable',debit:vat,credit:0},{account:creditAccount,debit:0,credit:amount}]);
  audit('Refund posted',{orderId:o.id,amount,method,reason});saveDb();session.modal=null;renderApp();toast('Refund posted');
}
function recordExpense(form){
  const fd=new FormData(form),amount=Number(fd.get('amount')||0);if(amount<=0)return;
  const paymentMethod=fd.get('paymentMethod')||'Cash',net=amount/(1+VAT_RATE),vat=amount-net;
  const e={id:uid('EXP'),createdAt:now(),description:fd.get('description'),category:fd.get('category'),amount,net,vat,paymentMethod,note:fd.get('note')||'',staffId:session.currentStaffId};
  db.expenses.unshift(e);
  const payAccount=paymentMethod==='Cash'?'Cash on Hand':paymentMethod==='Bank'?'Bank':'Card Clearing';
  postJournal(e.id,'Expense '+e.description,[{account:'Expense - '+e.category,debit:net,credit:0},{account:'VAT Input Recoverable',debit:vat,credit:0},{account:payAccount,debit:0,credit:amount}]);
  audit('Expense posted',{expenseId:e.id,amount,category:e.category});saveDb();session.modal=null;renderApp();toast('Expense posted');
}

function applyDiscount(form){
  const fd=new FormData(form),o=orderById(fd.get('orderId'));if(!o)return;
  const amount=Math.max(0,Number(fd.get('amount')||0));o.discount=amount;o.discountReason=fd.get('reason')||'';
  audit('Discount applied',{orderId:o.id,amount,reason:o.discountReason});saveDb();session.modal=null;renderApp();toast('Discount applied');
}
function moveOrder(form){
  const fd=new FormData(form),o=orderById(fd.get('orderId'));if(!o)return;
  const newTable=fd.get('tableId');if(openOrderForTable(newTable))return toast('Target table is occupied.','bad');
  if(o.tableId){const old=table(o.tableId);if(old)old.status='available'}
  o.tableId=newTable;const t=table(newTable);if(t)t.status='occupied';
  audit('Table moved',{orderId:o.id,tableId:newTable});saveDb();session.modal=null;renderApp();toast('Order moved');
}

function recordWaste(form){
  const fd=new FormData(form),ing=ingredient(fd.get('ingredientId')),qty=Number(fd.get('qty')||0);if(!ing||qty<=0)return;
  const used=Math.min(qty,ing.stock),cost=used*ing.costPerUnit;ing.stock-=used;
  const w={id:uid('W'),ingredientId:ing.id,qty:used,cost,reason:fd.get('reason')||'Other',createdAt:now(),staffId:session.currentStaffId};
  db.wastes.unshift(w);postJournal(w.id,'Inventory waste '+ing.name,[{account:'Waste Expense',debit:cost,credit:0},{account:'Inventory',debit:0,credit:cost}]);
  audit('Waste recorded',{ingredientId:ing.id,qty:used,cost});saveDb();session.modal=null;renderApp();toast('Waste recorded');
}
function recordAdjustment(form){
  const fd=new FormData(form),ing=ingredient(fd.get('ingredientId')),actual=Number(fd.get('actual'));if(!ing||Number.isNaN(actual))return;
  const before=Number(ing.stock),delta=actual-before,value=Math.abs(delta)*ing.costPerUnit;ing.stock=actual;
  const a={id:uid('ADJ'),ingredientId:ing.id,before,actual,delta,reason:fd.get('reason')||'Stock count',createdAt:now(),staffId:session.currentStaffId};db.stockAdjustments.unshift(a);
  if(delta>0)postJournal(a.id,'Positive stock adjustment '+ing.name,[{account:'Inventory',debit:value,credit:0},{account:'Inventory Gain',debit:0,credit:value}]);
  if(delta<0)postJournal(a.id,'Negative stock adjustment '+ing.name,[{account:'Inventory Adjustment Loss',debit:value,credit:0},{account:'Inventory',debit:0,credit:value}]);
  audit('Stock adjusted',{ingredientId:ing.id,delta});saveDb();session.modal=null;renderApp();toast('Stock adjusted');
}
function recordPurchase(form){
  const fd=new FormData(form),ing=ingredient(fd.get('ingredientId')),qty=Number(fd.get('qty')||0),total=Number(fd.get('total')||0);if(!ing||qty<=0||total<=0)return;
  const net=total/(1+VAT_RATE),vat=total-net;
  ing.stock+=qty;ing.costPerUnit=net/qty;
  const p={id:uid('PUR'),supplierId:fd.get('supplierId'),invoiceNo:fd.get('invoiceNo')||'',createdAt:now(),total,net,vat,items:[{ingredientId:ing.id,qty,net}]};db.purchases.unshift(p);
  postJournal(p.id,'Purchase receipt '+(p.invoiceNo||p.id),[{account:'Inventory',debit:net,credit:0},{account:'VAT Input Recoverable',debit:vat,credit:0},{account:'Accounts Payable',debit:0,credit:total}]);
  audit('Purchase received',{purchaseId:p.id,ingredientId:ing.id,qty,total});saveDb();session.modal=null;renderApp();toast('Purchase received');
}
function recordReservation(form){
  const fd=new FormData(form);db.reservations.push({id:uid('RES'),name:fd.get('name'),phone:fd.get('phone')||'',date:fd.get('date'),time:fd.get('time'),covers:Number(fd.get('covers')||1),tableId:fd.get('tableId'),status:'confirmed',notes:fd.get('notes')||''});
  audit('Reservation created',{guest:fd.get('name'),date:fd.get('date'),time:fd.get('time')});saveDb();session.modal=null;renderApp();toast('Reservation saved');
}

function openShift(form){
  if(activeShift())return toast('A shift is already open.','bad');
  const opening=Number(new FormData(form).get('openingCash')||0);
  db.shifts.unshift({id:uid('SH'),staffId:session.currentStaffId,openedAt:now(),closedAt:null,openingCash:opening,actualCash:null,cashDifference:null});
  audit('Shift opened',{openingCash:opening});saveDb();session.modal=null;renderApp();toast('Shift opened');
}
function closeShift(form){
  const sh=activeShift();if(!sh)return;
  const actual=Number(new FormData(form).get('actualCash')||0),expected=expectedCashForShift(sh);
  sh.actualCash=actual;sh.expectedCash=expected;sh.cashDifference=actual-expected;sh.closedAt=now();
  audit('Shift closed',{expected,actual,difference:sh.cashDifference});saveDb();session.modal=null;renderApp();toast('Shift closed · diff '+money(sh.cashDifference),Math.abs(sh.cashDifference)>.01?'bad':'ok');
}

function saveMenuItem(form){
  const fd=new FormData(form),id=fd.get('itemId'),existing=id?menuItem(id):null;
  const recipe=db.ingredients.map(x=>({ingredientId:x.id,qty:Number(fd.get('recipe_'+x.id)||0)})).filter(x=>x.qty>0);
  const modifierGroupIds=fd.getAll('modifierGroupIds');
  if(existing){
    existing.name=fd.get('name');existing.categoryId=fd.get('categoryId');existing.stationId=fd.get('stationId');existing.price=Number(fd.get('price')||0);existing.recipe=recipe;existing.modifierGroupIds=modifierGroupIds;
    audit('Menu item updated',{itemId:existing.id,recipeLines:recipe.length});
  }else{
    const i={id:uid('P'),name:fd.get('name'),categoryId:fd.get('categoryId'),stationId:fd.get('stationId'),price:Number(fd.get('price')||0),active:true,modifierGroupIds,recipe};
    db.menuItems.push(i);audit('Menu item created',{itemId:i.id,recipeLines:recipe.length});
  }
  saveDb();session.modal=null;renderApp();toast('Menu and recipe saved');
}
function addSupplier(form){
  const fd=new FormData(form);db.suppliers.push({id:uid('SUP'),name:fd.get('name'),phone:fd.get('phone')||'',trn:fd.get('trn')||''});
  audit('Supplier added',{name:fd.get('name')});saveDb();session.modal=null;renderApp();toast('Supplier added');
}
function addStaff(form){
  const fd=new FormData(form);db.staff.push({id:uid('S'),name:fd.get('name'),role:fd.get('role'),pin:fd.get('pin'),active:true});
  audit('Staff added',{name:fd.get('name'),role:fd.get('role')});saveDb();session.modal=null;renderApp();toast('Staff added');
}
function saveBusiness(form){
  const fd=new FormData(form);['name','branch','trn','address','phone'].forEach(k=>db.business[k]=fd.get(k)||'');
  audit('Business settings updated');saveDb();renderApp();toast('Settings saved');
}

setInterval(()=>{if(session.page==='KDS')renderApp()},30000);
renderApp();
