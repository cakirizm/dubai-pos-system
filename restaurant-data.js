const VAT_RATE = 0.05;
const LS_KEY = 'nexpos-restaurant-uae-v2';
const money = n => new Intl.NumberFormat('en-AE',{style:'currency',currency:'AED',minimumFractionDigits:2}).format(Number(n||0));
const uid = p => `${p}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
const now = () => new Date().toISOString();
const clone = x => JSON.parse(JSON.stringify(x));

const seedRestaurant = {
  business:{
    name:'NEXPOS Demo Restaurant LLC',
    branch:'Dubai Marina',
    trn:'100123456700003',
    currency:'AED',
    vatRate:5,
    address:'Dubai, United Arab Emirates',
    phone:'+971 4 000 0000'
  },
  sections:[
    {id:'SEC1',name:'Main Hall'},
    {id:'SEC2',name:'Terrace'},
    {id:'SEC3',name:'VIP'}
  ],
  tables:[
    {id:'T1',name:'T01',sectionId:'SEC1',seats:2,status:'available'},
    {id:'T2',name:'T02',sectionId:'SEC1',seats:4,status:'available'},
    {id:'T3',name:'T03',sectionId:'SEC1',seats:4,status:'available'},
    {id:'T4',name:'T04',sectionId:'SEC1',seats:6,status:'available'},
    {id:'T5',name:'T05',sectionId:'SEC1',seats:2,status:'available'},
    {id:'T6',name:'T06',sectionId:'SEC2',seats:4,status:'available'},
    {id:'T7',name:'T07',sectionId:'SEC2',seats:4,status:'available'},
    {id:'T8',name:'T08',sectionId:'SEC2',seats:2,status:'available'},
    {id:'T9',name:'VIP 1',sectionId:'SEC3',seats:8,status:'available'},
    {id:'T10',name:'VIP 2',sectionId:'SEC3',seats:10,status:'available'}
  ],
  stations:[
    {id:'ST1',name:'Kitchen',kind:'food'},
    {id:'ST2',name:'Bar',kind:'drink'},
    {id:'ST3',name:'Dessert',kind:'dessert'}
  ],
  menuCategories:[
    {id:'MC1',name:'Starters',sort:1},
    {id:'MC2',name:'Burgers',sort:2},
    {id:'MC3',name:'Mains',sort:3},
    {id:'MC4',name:'Drinks',sort:4},
    {id:'MC5',name:'Desserts',sort:5}
  ],
  modifiers:[
    {id:'MG1',name:'Burger Cooking',required:true,max:1,options:[
      {id:'M1',name:'Medium',price:0},{id:'M2',name:'Medium Well',price:0},{id:'M3',name:'Well Done',price:0}
    ]},
    {id:'MG2',name:'Burger Extras',required:false,max:4,options:[
      {id:'M4',name:'Extra Cheese',price:4},{id:'M5',name:'Jalapeño',price:3},{id:'M6',name:'Avocado',price:6},{id:'M7',name:'No Onion',price:0}
    ]},
    {id:'MG3',name:'Drink Size',required:true,max:1,options:[
      {id:'M8',name:'Regular',price:0},{id:'M9',name:'Large',price:4}
    ]}
  ],
  ingredients:[
    {id:'I1',name:'Beef Patty',unit:'g',stock:24000,reorder:6000,costPerUnit:0.048},
    {id:'I2',name:'Burger Bun',unit:'pc',stock:110,reorder:30,costPerUnit:1.4},
    {id:'I3',name:'Cheddar Slice',unit:'pc',stock:180,reorder:40,costPerUnit:0.85},
    {id:'I4',name:'French Fries',unit:'g',stock:18000,reorder:5000,costPerUnit:0.018},
    {id:'I5',name:'Chicken Breast',unit:'g',stock:16000,reorder:4000,costPerUnit:0.036},
    {id:'I6',name:'Rice',unit:'g',stock:22000,reorder:6000,costPerUnit:0.008},
    {id:'I7',name:'Cola Syrup',unit:'ml',stock:18000,reorder:4000,costPerUnit:0.006},
    {id:'I8',name:'Sparkling Water',unit:'ml',stock:50000,reorder:10000,costPerUnit:0.002},
    {id:'I9',name:'Chocolate Cake Slice',unit:'pc',stock:28,reorder:8,costPerUnit:7.5},
    {id:'I10',name:'Mixed Greens',unit:'g',stock:7000,reorder:1500,costPerUnit:0.022}
  ],
  menuItems:[
    {id:'P1',name:'Classic Burger',categoryId:'MC2',stationId:'ST1',price:42,active:true,modifierGroupIds:['MG1','MG2'],recipe:[{ingredientId:'I1',qty:180},{ingredientId:'I2',qty:1},{ingredientId:'I3',qty:1},{ingredientId:'I4',qty:150}]},
    {id:'P2',name:'Double Burger',categoryId:'MC2',stationId:'ST1',price:55,active:true,modifierGroupIds:['MG1','MG2'],recipe:[{ingredientId:'I1',qty:300},{ingredientId:'I2',qty:1},{ingredientId:'I3',qty:2},{ingredientId:'I4',qty:150}]},
    {id:'P3',name:'Grilled Chicken & Rice',categoryId:'MC3',stationId:'ST1',price:48,active:true,modifierGroupIds:[],recipe:[{ingredientId:'I5',qty:220},{ingredientId:'I6',qty:180},{ingredientId:'I10',qty:60}]},
    {id:'P4',name:'House Salad',categoryId:'MC1',stationId:'ST1',price:28,active:true,modifierGroupIds:[],recipe:[{ingredientId:'I10',qty:180}]},
    {id:'P5',name:'Cola',categoryId:'MC4',stationId:'ST2',price:12,active:true,modifierGroupIds:['MG3'],recipe:[{ingredientId:'I7',qty:180},{ingredientId:'I8',qty:220}]},
    {id:'P6',name:'Sparkling Water',categoryId:'MC4',stationId:'ST2',price:14,active:true,modifierGroupIds:[],recipe:[{ingredientId:'I8',qty:500}]},
    {id:'P7',name:'Chocolate Cake',categoryId:'MC5',stationId:'ST3',price:26,active:true,modifierGroupIds:[],recipe:[{ingredientId:'I9',qty:1}]}
  ],
  staff:[
    {id:'S1',name:'Mehmet',role:'Owner',pin:'1111',active:true},
    {id:'S2',name:'Ahmed',role:'Manager',pin:'2222',active:true},
    {id:'S3',name:'Sara',role:'Waiter',pin:'3333',active:true},
    {id:'S4',name:'Omar',role:'Cashier',pin:'4444',active:true},
    {id:'S5',name:'Ravi',role:'Kitchen',pin:'5555',active:true}
  ],
  suppliers:[
    {id:'SUP1',name:'Fresh Foods Trading LLC',phone:'+971500000010',trn:'100000000000111'},
    {id:'SUP2',name:'Beverage Source LLC',phone:'+971500000020',trn:'100000000000222'}
  ],
  customers:[
    {id:'C1',name:'Walk-in Customer',phone:'',trn:''},
    {id:'C2',name:'Marina Office LLC',phone:'+971500000050',trn:'100000000000333'}
  ],
  reservations:[
    {id:'R1',name:'Ali',phone:'+971500001111',covers:4,tableId:'T3',date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'20:30',status:'confirmed',notes:'Birthday'}
  ],
  orders:[],
  kitchenTickets:[],
  payments:[],
  refunds:[],
  purchases:[],
  wastes:[],
  stockAdjustments:[],
  expenses:[],
  shifts:[],
  journals:[],
  audit:[]
};

let db = loadDb();
let session = {
  page:'Dashboard',
  activeSection:'SEC1',
  activeOrderId:null,
  activeCategory:'MC2',
  menuSearch:'',
  currentStaffId:'S2',
  modal:null,
  toast:null
};

function loadDb(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : clone(seedRestaurant);
  }catch(e){
    return clone(seedRestaurant);
  }
}
function saveDb(){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }
function resetDb(){ db = clone(seedRestaurant); saveDb(); }
function audit(action,meta={}){
  db.audit.unshift({id:uid('AU'),at:now(),staffId:session.currentStaffId,action,meta});
  db.audit = db.audit.slice(0,300);
}
function menuItem(id){return db.menuItems.find(x=>x.id===id)}
function ingredient(id){return db.ingredients.find(x=>x.id===id)}
function table(id){return db.tables.find(x=>x.id===id)}
function staff(id){return db.staff.find(x=>x.id===id)}
function customer(id){return db.customers.find(x=>x.id===id)}
function orderById(id){return db.orders.find(x=>x.id===id)}
function openOrderForTable(tableId){return db.orders.find(o=>o.tableId===tableId && !['paid','cancelled'].includes(o.status))}
function activeShift(){return db.shifts.find(s=>s.staffId===session.currentStaffId && !s.closedAt)}
function orderTotals(order){
  const grossNet = order.items.reduce((sum,i)=>sum + i.unitPrice*i.qty/(1+VAT_RATE),0);
  const grossVat = order.items.reduce((sum,i)=>sum + (i.unitPrice*i.qty - i.unitPrice*i.qty/(1+VAT_RATE)),0);
  const gross = grossNet+grossVat;
  const discount = Math.min(gross,Math.max(0,Number(order.discount||0)));
  const discountNet = discount/(1+VAT_RATE);
  const discountVat = discount-discountNet;
  const net = Math.max(0,grossNet-discountNet);
  const vat = Math.max(0,grossVat-discountVat);
  const total = net+vat;
  const paid = db.payments.filter(p=>p.orderId===order.id).reduce((a,p)=>a+p.amount,0);
  return {net,vat,gross,discount,discountNet,discountVat,total,paid,due:Math.max(0,total-paid)};
}
function recipeCost(item){
  return item.recipe.reduce((sum,r)=> {
    const ing=ingredient(r.ingredientId); return sum + (ing?ing.costPerUnit*r.qty:0);
  },0);
}
function itemCost(orderItem){
  const item=menuItem(orderItem.menuItemId);
  return item ? recipeCost(item)*orderItem.qty : 0;
}
function orderCost(order){return order.items.reduce((a,i)=>a+itemCost(i),0)}
function deductRecipe(orderItem){
  const item=menuItem(orderItem.menuItemId); if(!item)return;
  item.recipe.forEach(r=>{
    const ing=ingredient(r.ingredientId);
    if(ing) ing.stock = Math.max(0, Number(ing.stock)-Number(r.qty)*Number(orderItem.qty));
  });
}
function restoreRecipe(orderItem){
  const item=menuItem(orderItem.menuItemId); if(!item)return;
  item.recipe.forEach(r=>{
    const ing=ingredient(r.ingredientId);
    if(ing) ing.stock = Number(ing.stock)+Number(r.qty)*Number(orderItem.qty);
  });
}
function postJournal(source,description,rows){
  db.journals.unshift({id:uid('JE'),date:now(),source,description,rows});
}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function val(form,name){return new FormData(form).get(name)}
function nval(form,name){return Number(new FormData(form).get(name)||0)}
