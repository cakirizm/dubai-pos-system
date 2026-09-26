const VAT_RATE = 0.05;
const money = n => new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED',minimumFractionDigits:2}).format(Number(n||0));
const uid = () => Math.random().toString(36).slice(2,10).toUpperCase();
const now = () => new Date().toISOString();

const seed = {
  business:{name:'Demo Trading LLC',trn:'100123456700003',branch:'Main Branch'},
  products:[
    {id:'P1',name:'Premium T-Shirt',sku:'TS-001',category:'Retail',price:84,cost:42,stock:24,lowStock:6},
    {id:'P2',name:'Classic Cap',sku:'CP-002',category:'Retail',price:52.5,cost:23,stock:18,lowStock:5},
    {id:'P3',name:'Water 500ml',sku:'WT-500',category:'Beverage',price:5.25,cost:1.5,stock:60,lowStock:12},
    {id:'P4',name:'Service Fee',sku:'SRV-001',category:'Service',price:157.5,cost:0,stock:9999,lowStock:0,nonStock:true}
  ],
  customers:[
    {id:'C1',name:'Walk-in Customer',phone:'',trn:''},
    {id:'C2',name:'Blue Coast Trading LLC',phone:'+971500000001',trn:'100987654300003'}
  ],
  sales:[],expenses:[],journals:[]
};

let state = load();
let ui = {page:'Dashboard',cart:[],customerId:'C1',search:'',receipt:null};
function load(){try{return JSON.parse(localStorage.getItem('nexpos-uae-v1'))||structuredClone(seed)}catch{return structuredClone(seed)}}
function save(){localStorage.setItem('nexpos-uae-v1',JSON.stringify(state));}
function setState(fn){state=fn(state);save();render();}
function toast(msg){let el=document.querySelector('.toast');if(el)el.remove();el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2200)}
function metrics(){const salesGross=state.sales.reduce((a,s)=>a+s.total,0),vat=state.sales.reduce((a,s)=>a+s.vat,0),cogs=state.sales.reduce((a,s)=>a+s.cogs,0),expenses=state.expenses.reduce((a,e)=>a+e.amount,0),grossProfit=salesGross-vat-cogs;return{salesGross,vat,cogs,expenses,grossProfit,netAfterExpenses:grossProfit-expenses,transactions:state.sales.length}}
function cartTotals(){const net=ui.cart.reduce((a,x)=>a+(x.price/(1+VAT_RATE))*x.qty,0),vat=ui.cart.reduce((a,x)=>a+(x.price-x.price/(1+VAT_RATE))*x.qty,0),cogs=ui.cart.reduce((a,x)=>a+x.cost*x.qty,0);return{net,vat,total:net+vat,cogs}}

const nav=['Dashboard','Sell','Products','Customers','Expenses','Accounting','Reports','Settings'];
function render(){
  const app=document.querySelector('#app');
  app.innerHTML=`<main class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brandMark">N</div><div><b>NEXPOS</b><span>UAE</span></div></div>
      <div class="businessMini"><small>BUSINESS</small><strong>${esc(state.business.name)}</strong><span>${esc(state.business.branch)}</span></div>
      <nav>${nav.map(n=>`<button data-nav="${n}" class="${ui.page===n?'active':''}"><span class="navdot"></span>${n}</button>`).join('')}</nav>
      <div class="sideFooter"><span class="statusDot"></span> Local demo · browser storage</div>
    </aside>
    <section class="content">
      <header class="topbar"><div><h1>${ui.page}</h1><p>${ui.page==='Dashboard'?'Your business at a glance':'UAE-native POS + accounting core'}</p></div><div class="topActions"><span class="datePill">${new Date().toLocaleDateString('en-AE',{day:'2-digit',month:'short',year:'numeric'})}</span><button class="primary" id="newSale">+ New Sale</button></div></header>
      ${pageView()}
    </section>
    ${ui.receipt?receiptModal(ui.receipt):''}
  </main>`;
  bindCommon();
  bindPage();
}

function pageView(){switch(ui.page){case'Dashboard':return dashboard();case'Sell':return sell();case'Products':return products();case'Customers':return customers();case'Expenses':return expenses();case'Accounting':return accounting();case'Reports':return reports();case'Settings':return settings();default:return dashboard()}}
function stat(label,value,meta=''){return `<div class="stat panel"><span>${label}</span><strong>${value}</strong>${meta?`<small>${meta}</small>`:''}</div>`}
function panelTitle(title,action=''){return `<div class="panelTitle"><h3>${title}</h3>${action?`<span>${action}</span>`:''}</div>`}
function empty(text){return `<div class="empty">${text}</div>`}

function dashboard(){const m=metrics(),low=state.products.filter(p=>!p.nonStock&&p.stock<=p.lowStock);return `<div class="pageGrid"><div class="stats4">
${stat('Gross Sales',money(m.salesGross),`${m.transactions} transactions`)}${stat('Gross Profit',money(m.grossProfit),'after COGS, before expenses')}${stat('VAT Collected',money(m.vat),'Output VAT')}${stat('Net After Expenses',money(m.netAfterExpenses),`${money(m.expenses)} expenses`)}</div>
<div class="twoCol"><div class="panel">${panelTitle('Recent Sales','LIVE')}${state.sales.length?`<div class="rows">${state.sales.slice(0,6).map(s=>`<div class="row"><div><b>${s.id}</b><span>${new Date(s.createdAt).toLocaleString('en-AE')}</span></div><div class="right"><b>${money(s.total)}</b><span>${s.paymentMethod}</span></div></div>`).join('')}</div>`:empty('No sales yet. Create your first sale.')}</div>
<div class="panel">${panelTitle('Inventory Alerts',`${low.length} low stock`)}${low.length?`<div class="rows">${low.map(p=>`<div class="row"><div><b>${esc(p.name)}</b><span>${esc(p.sku)}</span></div><div class="stockBadge">${p.stock} left</div></div>`).join('')}</div>`:empty('All stock levels look healthy.')}</div></div>
<div class="panel">${panelTitle('Accounting Control','DOUBLE-ENTRY')}<div class="controlStrip"><div><strong>${state.sales.length}</strong><span>Sales posted</span></div><div><strong>${state.journals.length}</strong><span>Journal entries</span></div><div><strong>${state.products.length}</strong><span>Products</span></div><div><strong>${state.customers.length}</strong><span>Customers</span></div></div></div></div>`}

function sell(){const t=cartTotals(),list=state.products.filter(p=>`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(ui.search.toLowerCase()));return `<div class="sellLayout"><div class="catalog panel"><div class="catalogTop"><input class="search" id="search" value="${escAttr(ui.search)}" placeholder="Search product, SKU or category…"><span>${list.length} items</span></div><div class="productGrid">${list.map(p=>`<button class="productCard" data-product="${p.id}"><div class="productIcon">${esc(p.name.slice(0,1))}</div><b>${esc(p.name)}</b><span>${esc(p.sku)} · ${esc(p.category)}</span><div><strong>${money(p.price)}</strong><small>${p.nonStock?'Service':`${p.stock} in stock`}</small></div></button>`).join('')}</div></div>
<div class="cart panel"><h3>Current Sale</h3><label>Customer<select id="customerSel">${state.customers.map(c=>`<option value="${c.id}" ${c.id===ui.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="cartItems">${ui.cart.length?ui.cart.map(x=>`<div class="cartItem"><div class="grow"><b>${esc(x.name)}</b><span>${money(x.price)} each</span></div><div class="qty"><button data-qty="${x.id}" data-d="-1">−</button><b>${x.qty}</b><button data-qty="${x.id}" data-d="1">+</button></div><strong>${money(x.price*x.qty)}</strong></div>`).join(''):empty('Tap an item to add it to this sale.')}</div><div class="totals"><div><span>Subtotal</span><b>${money(t.net)}</b></div><div><span>VAT 5%</span><b>${money(t.vat)}</b></div><div class="grand"><span>Total</span><b>${money(t.total)}</b></div></div><button class="payBtn" id="payBtn" ${ui.cart.length?'':'disabled'}>Charge ${money(t.total)}</button></div></div>`}

function products(){return `<div class="twoCol wideLeft"><div class="panel">${panelTitle('Products & Inventory',`${state.products.length} items`)}<table><thead><tr><th>Product</th><th>SKU</th><th>Sell</th><th>Cost</th><th>Stock</th><th>Margin</th></tr></thead><tbody>${state.products.map(p=>`<tr><td><b>${esc(p.name)}</b><small>${esc(p.category)}</small></td><td>${esc(p.sku)}</td><td>${money(p.price)}</td><td>${money(p.cost)}</td><td>${p.nonStock?'—':p.stock}</td><td>${p.cost?Math.round((p.price/1.05-p.cost)/(p.price/1.05)*100):100}%</td></tr>`).join('')}</tbody></table></div><form class="panel form" id="productForm"><h3>Add Product</h3><label>Product name<input name="name" required></label><label>SKU / Barcode<input name="sku"></label><label>Price incl. VAT<input name="price" type="number" step="0.01" required></label><label>Cost<input name="cost" type="number" step="0.01"></label><label>Opening stock<input name="stock" type="number" step="1"></label><label>Category<select name="category"><option>Retail</option><option>Food</option><option>Beverage</option><option>Service</option><option>Other</option></select></label><button class="primary">Add Product</button></form></div>`}

function customers(){return `<div class="twoCol wideLeft"><div class="panel">${panelTitle('Customers',`${state.customers.length} records`)}<div class="rows">${state.customers.map(c=>`<div class="row"><div><b>${esc(c.name)}</b><span>${esc(c.phone||'No phone')}</span></div><div class="right"><b>${esc(c.trn||'Consumer')}</b><span>${c.trn?'Business customer':'B2C'}</span></div></div>`).join('')}</div></div><form class="panel form" id="customerForm"><h3>Add Customer</h3><label>Name<input name="name" required></label><label>Phone<input name="phone"></label><label>TRN (optional)<input name="trn"></label><button class="primary">Add Customer</button></form></div>`}

function expenses(){return `<div class="twoCol wideLeft"><div class="panel">${panelTitle('Expenses',money(state.expenses.reduce((a,e)=>a+e.amount,0)))}${state.expenses.length?`<div class="rows">${state.expenses.map(e=>`<div class="row"><div><b>${esc(e.description)}</b><span>${esc(e.category)} · ${new Date(e.createdAt).toLocaleDateString('en-AE')}</span></div><div class="right"><b>${money(e.amount)}</b><span>${esc(e.paymentMethod)}</span></div></div>`).join('')}</div>`:empty('No expenses recorded yet.')}</div><form class="panel form" id="expenseForm"><h3>Record Expense</h3><label>Description<input name="description" required></label><label>Category<select name="category"><option>General</option><option>Rent</option><option>Utilities</option><option>Marketing</option><option>Transport</option><option>Supplies</option></select></label><label>Amount AED<input name="amount" type="number" step="0.01" required></label><label>Payment<select name="paymentMethod"><option>Cash</option><option>Bank</option><option>Card</option></select></label><button class="primary">Post Expense</button></form></div>`}

