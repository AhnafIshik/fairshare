(() => {
  "use strict";
  const STORE_KEY = "fairshare_demo_v1";
  const money = n => new Intl.NumberFormat("en-AU", {style:"currency",currency:"AUD"}).format(Number(n||0));
  const fmtDate = d => new Date(d+"T12:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
  const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const uid = () => Math.random().toString(36).slice(2,10);
  const colors = ["avatar-green","avatar-peach","avatar-purple","avatar-yellow","avatar-blue"];
  const icons = {"Groceries":"🛒","Food & dining":"🍜","Household supplies":"🧻","Transport":"🚗","Fuel":"⛽","Utilities":"💡","Cleaning":"🧽","Other":"✦","Electricity":"⚡","Gas":"♨","Water":"💧","Lawn mowing":"🌿","Internet":"⌁"};
  const initialState = () => ({
    house:{name:"The Green House",currency:"AUD",rent:1500,rentDate:"2026-10-29",members:5},
    members:[
      {id:"m1",name:"Ishik",email:"ishik@example.com",role:"Admin",initials:"IS"},
      {id:"m2",name:"Ariyan",email:"ariyan@example.com",role:"Member",initials:"AR"},
      {id:"m3",name:"Maya",email:"maya@example.com",role:"Member",initials:"MA"},
      {id:"m4",name:"Noah",email:"noah@example.com",role:"Member",initials:"NO"},
      {id:"m5",name:"Sofia",email:"sofia@example.com",role:"Member",initials:"SO"}
    ],
    expenses:[
      {id:"e1",description:"Weekly groceries",category:"Groceries",amount:86.4,payer:"m2",participants:["m1","m2","m3"],date:"2026-10-25",split:"equal"},
      {id:"e2",description:"Dinner at Thai place",category:"Food & dining",amount:72,payer:"m1",participants:["m1","m2","m4","m5"],date:"2026-10-23",split:"equal"},
      {id:"e3",description:"Dish soap & sponges",category:"Household supplies",amount:18.9,payer:"m3",participants:["m1","m2","m3","m4","m5"],date:"2026-10-21",split:"equal"},
      {id:"e4",description:"Shared fuel top-up",category:"Fuel",amount:64.2,payer:"m4",participants:["m1","m2","m4"],date:"2026-10-20",split:"equal"}
    ],
    bills:[
      {id:"b1",name:"Electricity",provider:"Energy Australia",amount:240,dueDate:"2026-11-05",period:"Oct–Nov",participants:["m1","m2","m3","m4","m5"],status:"Pending",category:"Electricity"},
      {id:"b2",name:"Internet",provider:"Home internet",amount:79.99,dueDate:"2026-11-02",period:"November",participants:["m1","m2","m3","m4","m5"],status:"Pending",category:"Internet"},
      {id:"b3",name:"Lawn mowing",provider:"Local gardener",amount:55,dueDate:"2026-10-30",period:"October",participants:["m1","m2","m3","m4","m5"],status:"Pending",category:"Lawn mowing"}
    ],
    vehicles:[
      {id:"v1",name:"Maya's Corolla",owner:"m3",efficiency:12,tank:60,fuelPrice:1.85,fuelType:"Petrol"},
      {id:"v2",name:"Noah's Mazda 3",owner:"m4",efficiency:15,tank:50,fuelPrice:1.91,fuelType:"Petrol"},
      {id:"v3",name:"Ariyan's SUV",owner:"m2",efficiency:10,tank:65,fuelPrice:1.88,fuelType:"Petrol"}
    ],
    trips:[{id:"t1",vehicle:"v1",driver:"m3",distance:63,participants:["m1","m2","m3","m4"],date:"2026-10-24",purpose:"Dinner trip",price:1.85,efficiency:12,tolls:0,parking:0}],
    tasks:[
      {id:"c1",name:"Clean kitchen",assignee:"m1",dueDate:"2026-10-28",frequency:"Weekly",done:false},
      {id:"c2",name:"Clean bathroom",assignee:"m2",dueDate:"2026-10-29",frequency:"Weekly",done:false},
      {id:"c3",name:"Vacuum common areas",assignee:"m3",dueDate:"2026-10-30",frequency:"Weekly",done:false},
      {id:"c4",name:"Take out rubbish",assignee:"m4",dueDate:"2026-10-27",frequency:"Twice weekly",done:true},
      {id:"c5",name:"Mop floors",assignee:"m5",dueDate:"2026-10-31",frequency:"Weekly",done:false}
    ],
    rentPaid:[],fuelPhotos:[],notifications:[]
  });
  let state = loadState();
  function loadState(){ try { const raw=localStorage.getItem(STORE_KEY); return raw?JSON.parse(raw):initialState(); } catch(e){return initialState();} }
  function save(){ localStorage.setItem(STORE_KEY,JSON.stringify(state)); }
  function member(id){ return state.members.find(m=>m.id===id)||{name:"Unknown",initials:"?",role:"Member"}; }
  function avatar(id, extra=""){ const m=member(id); const idx=Math.max(0,state.members.findIndex(x=>x.id===id)); return `<span class="avatar ${colors[idx%colors.length]} ${extra}">${esc(m.initials||m.name.slice(0,2).toUpperCase())}</span>`; }
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function splitAmounts(amount, participants, mode="equal", custom={}) {
    const ids=[...new Set(participants)];
    if(!ids.length) return {};
    const cents=Math.round(Number(amount)*100), result={};
    if(mode==="custom"){
      let remaining=cents;
      ids.forEach((id,i)=>{const v=i===ids.length-1?remaining:Math.round(Number(custom[id]||0)*100);result[id]=v;remaining-=v;});
      return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v/100]));
    }
    if(mode==="percent"){
      let used=0; ids.forEach((id,i)=>{const v=i===ids.length-1?cents-used:Math.round(cents*Number(custom[id]||0)/100);result[id]=v;used+=v;});
      return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v/100]));
    }
    const base=Math.floor(cents/ids.length), remainder=cents-base*ids.length;
    ids.forEach((id,i)=>result[id]=(base+(i<remainder?1:0))/100);
    return result;
  }
  function obligations(expense){ const shares=splitAmounts(expense.amount,expense.participants,expense.split||"equal",expense.custom||{}); return Object.entries(shares).filter(([id])=>id!==expense.payer).map(([id,amount])=>({from:id,to:expense.payer,amount})); }
  function balances(){
    const b=Object.fromEntries(state.members.map(m=>[m.id,0]));
    state.expenses.forEach(e=>obligations(e).forEach(o=>{b[o.from]-=o.amount;b[o.to]+=o.amount;}));
    state.trips.forEach(t=>{const cost=tripCost(t);const shares=splitAmounts(cost,t.participants);Object.entries(shares).forEach(([id,amt])=>{if(id!==t.driver){b[id]-=amt;b[t.driver]+=amt;}});});
    state.bills.forEach(x=>{if(x.status!=="Paid"){const shares=splitAmounts(x.amount,x.participants);Object.entries(shares).forEach(([id,amt])=>{if(id!==x.payer){b[id]-=amt;b[x.payer]+=amt;}});}});
    return b;
  }
  function tripCost(t){return Math.round(((Number(t.distance)/Number(t.efficiency))*Number(t.price)+Number(t.tolls||0)+Number(t.parking||0))*100)/100;}
  function sumExpenses(){return state.expenses.reduce((a,e)=>a+Number(e.amount),0)+state.trips.reduce((a,t)=>a+tripCost(t),0)+state.bills.reduce((a,b)=>a+Number(b.amount),0);}
  function nextDueRent(){return state.house.rentDate||todayISO();}
  function setText(id,text){const el=document.getElementById(id);if(el)el.textContent=text;}
  function render(){
    setText("houseNameSide",state.house.name); setText("expenseNavCount",state.expenses.length); setText("todayLabel",new Date().toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"}));
    const b=balances();setText("youOwe",money(Math.max(0,-(b.m1||0))));setText("owedToYou",money(Math.max(0,b.m1||0)));setText("totalExpenses",money(sumExpenses()));
    setText("nextRent",money(Number(state.house.rent)/Math.max(1,state.members.length)));setText("rentDueLabel",`Due ${new Date(nextDueRent()+"T12:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"short"})}`);
    renderRecent();renderUpcoming();renderMemberPreview();renderSnapshot();renderExpenses();renderBills();renderVehicles();renderTrips();renderTasks();renderMembers();renderHouseDetails();renderRent();renderSettings();
  }
  function renderRecent(){
    const list=[...state.expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
    document.getElementById("recentExpenses").innerHTML=list.length?list.map(e=>`<div class="expense-row"><div class="expense-icon">${icons[e.category]||"✦"}</div><div class="expense-info"><strong>${esc(e.description)}</strong><small>${esc(member(e.payer).name)} · ${fmtDate(e.date)}</small></div><div class="expense-amount"><strong>${money(e.amount)}</strong><small>${e.participants.length} people</small></div></div>`).join(""):`<div class="empty-state"><h3>No expenses yet</h3><p>Add a shared expense to get started.</p></div>`;
  }
  function renderUpcoming(){
    const entries=[];
    entries.push({date:nextDueRent(),title:"Rent contribution",sub:"Your fortnightly share",tag:"Upcoming",icon:"⌂"});
    state.bills.forEach(b=>entries.push({date:b.dueDate,title:b.name,sub:`${money(b.amount/b.participants.length)} per person`,tag:b.status,icon:icons[b.category]||"▤"}));
    state.tasks.filter(t=>!t.done).forEach(t=>entries.push({date:t.dueDate,title:t.name,sub:`Assigned to ${member(t.assignee).name}`,tag:"Task",icon:"✳"}));
    entries.sort((a,b)=>a.date.localeCompare(b.date));
    document.getElementById("upcomingList").innerHTML=entries.slice(0,4).map(x=>{const d=new Date(x.date+"T12:00:00");return `<div class="upcoming-item"><div class="calendar-icon"><small>${d.toLocaleDateString("en-AU",{month:"short"}).toUpperCase()}</small><strong>${d.getDate()}</strong></div><div class="upcoming-info"><strong>${esc(x.title)}</strong><small>${esc(x.sub)}</small></div><span class="task-status">${esc(x.tag)}</span></div>`;}).join("");
  }
  function renderMemberPreview(){document.getElementById("memberPreview").innerHTML=state.members.slice(0,5).map(m=>`<div class="member-mini">${avatar(m.id)}<strong>${esc(m.name.split(" ")[0])}</strong><small>${m.role==="Admin"?"Admin":"Member"}</small></div>`).join("");}
  function renderSnapshot(){
    const sums={};state.expenses.forEach(e=>sums[e.category]=(sums[e.category]||0)+Number(e.amount));
    const vals=Object.entries(sums).sort((a,b)=>b[1]-a[1]).slice(0,5), max=Math.max(1,...vals.map(x=>x[1]));
    document.getElementById("spendingSnapshot").innerHTML=vals.length?vals.map(([name,val])=>`<div class="spend-line"><span>${esc(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${val/max*100}%"></div></div><strong>${money(val)}</strong></div>`).join(""):`<p class="muted">Your spending snapshot will appear here.</p>`;
  }
  function renderExpenses(){
    const query=(document.getElementById("expenseSearch")?.value||"").toLowerCase(),filter=document.getElementById("expenseFilter")?.value||"all";
    const rows=[...state.expenses].sort((a,b)=>b.date.localeCompare(a.date)).filter(e=>(e.description+" "+member(e.payer).name+" "+e.category).toLowerCase().includes(query)&&(filter==="all"||e.category===filter));
    document.getElementById("expensesTable").innerHTML=rows.map(e=>`<tr><td><div class="table-expense"><div class="expense-icon">${icons[e.category]||"✦"}</div><div><strong>${esc(e.description)}</strong><small>${esc(e.category)}</small></div></div></td><td>${esc(member(e.payer).name)}</td><td><div class="member-stack">${e.participants.slice(0,4).map(id=>avatar(id,"stack-avatar")).join("")}${e.participants.length>4?`<span class="stack-avatar">+${e.participants.length-4}</span>`:""}</div></td><td>${fmtDate(e.date)}</td><td class="amount-cell">${money(e.amount)}</td><td><button class="row-action" data-expense-detail="${e.id}" aria-label="View expense details">···</button></td></tr>`).join("");
    document.getElementById("expensesEmpty").classList.toggle("hidden",rows.length>0);
  }
  function renderBills(){
    const outstanding=state.bills.filter(b=>b.status!=="Paid").reduce((s,b)=>s+Number(b.amount),0);
    setText("billTotal",money(outstanding));setText("rentTotal",money(state.house.rent));setText("rentShare",money(state.house.rent/Math.max(1,state.members.length)));
    document.getElementById("billsList").innerHTML=state.bills.length?state.bills.slice().sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map(b=>`<div class="bill-row"><div class="bill-symbol">${icons[b.category]||"▤"}</div><div class="bill-info"><strong>${esc(b.name)}</strong><small>${esc(b.provider||"Household bill")} · Due ${fmtDate(b.dueDate)} · ${esc(b.period||"")}</small></div><span class="badge ${b.status==="Paid"?"paid":(b.dueDate<todayISO()?"overdue":"")}">${esc(b.status==="Paid"?"Paid":b.dueDate<todayISO()?"Overdue":b.status)}</span><div class="bill-share"><strong>${money(b.amount)}</strong><small>${b.participants.length} people</small></div><button class="row-action" data-bill-detail="${b.id}" aria-label="Bill actions">···</button></div>`).join(""):`<div class="empty-state"><h3>No bills recorded</h3><p>Add your first household bill.</p></div>`;
  }
  function renderRent(){
    const d=new Date(nextDueRent()+"T12:00:00");
    document.getElementById("rentSchedule").innerHTML=`<div class="rent-date-icon"><small>${d.toLocaleDateString("en-AU",{month:"short"}).toUpperCase()}</small><strong>${d.getDate()}</strong></div><div class="rent-details"><strong>Fortnightly rent</strong><small>Reminder the day before · Due ${d.toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"short"})}</small><small>${state.members.length} household members · ${money(state.house.rent/state.members.length)} each if split equally</small></div><div class="rent-amount"><strong>${money(state.house.rent)}</strong><small>per fortnight</small></div>`;
  }
  function renderVehicles(){
    document.getElementById("vehicleCards").innerHTML=state.vehicles.length?state.vehicles.map(v=>`<article class="vehicle-card"><div class="vehicle-top"><div class="car-icon">🚙</div><span class="badge">Shared car</span></div><h3>${esc(v.name)}</h3><p>Owner: ${esc(member(v.owner).name)} · ${esc(v.fuelType)}</p><div class="vehicle-metrics"><div><small>FUEL EFFICIENCY</small><strong>${v.efficiency} km/L</strong></div><div><small>TANK CAPACITY</small><strong>${v.tank} L</strong></div></div><div class="vehicle-price"><span>Latest recorded fuel price</span><strong>${money(v.fuelPrice)}/L</strong></div><button class="text-btn" data-fuel-update="${v.id}" style="margin-top:12px;padding:0">Update fuel price + photo</button></article>`).join(""):`<div class="empty-state"><h3>No cars added</h3><p>Add a vehicle to start tracking trip costs.</p></div>`;
  }
  function renderTrips(){
    document.getElementById("tripsList").innerHTML=state.trips.length?state.trips.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>{const v=state.vehicles.find(x=>x.id===t.vehicle)||{name:"Vehicle"};return `<div class="trip-row"><div class="bill-symbol">🚗</div><div class="trip-info"><strong>${esc(t.purpose||"Shared trip")} · ${esc(v.name)}</strong><small>${fmtDate(t.date)} · ${t.participants.length} participants · ${t.distance} km · ${Number(t.distance/t.efficiency).toFixed(2)} L estimated</small></div><div class="trip-distance">${money(tripCost(t))}</div><button class="row-action" data-trip-detail="${t.id}" aria-label="Trip details">···</button></div>`;}).join(""):`<div class="empty-state"><h3>No trips recorded</h3><p>Record a trip to calculate an estimated fuel share.</p></div>`;
  }
  function renderTasks(){
    const tasks=state.tasks.slice().sort((a,b)=>Number(a.done)-Number(b.done)||a.dueDate.localeCompare(b.dueDate));
    setText("taskCount",`${tasks.filter(t=>!t.done).length} remaining`);
    document.getElementById("tasksList").innerHTML=tasks.length?tasks.map(t=>`<div class="task-card"><button class="task-check ${t.done?"checked":""}" data-toggle-task="${t.id}" aria-label="${t.done?"Mark incomplete":"Mark complete"}">${t.done?"✓":""}</button><div class="task-card-main"><strong style="${t.done?"text-decoration:line-through;color:#89948d":""}">${esc(t.name)}</strong><small>${esc(t.frequency)} · Due ${fmtDate(t.dueDate)}</small></div><div class="task-assignee">${avatar(t.assignee)}<span>${esc(member(t.assignee).name)}</span></div><span class="task-due ${t.done?"done":""}">${t.done?"Completed":t.dueDate<todayISO()?"Overdue":"Upcoming"}</span></div>`).join(""):`<div class="empty-state"><h3>No cleaning tasks</h3><p>Add a task to start your schedule.</p></div>`;
  }
  function renderMembers(){
    const b=balances();
    document.getElementById("memberGrid").innerHTML=state.members.map(m=>`<article class="member-card"><div class="member-card-top">${avatar(m.id)}<div><strong>${esc(m.name)}</strong><small>${esc(m.email||"Household member")}</small></div><span class="member-role">${m.role==="Admin"?"Admin":"Member"}</span></div><div class="member-balance"><span>Net balance</span><strong style="color:${(b[m.id]||0)<0?"#b15f49":"#47845c"}">${(b[m.id]||0)<0?"Owes ":"Owed "}${money(Math.abs(b[m.id]||0))}</strong></div></article>`).join("");
  }
  function renderHouseDetails(){document.getElementById("houseDetails").innerHTML=`<div class="detail-item"><small>HOUSEHOLD NAME</small><strong>${esc(state.house.name)}</strong></div><div class="detail-item"><small>HOUSEMATES</small><strong>${state.members.length} active members</strong></div><div class="detail-item"><small>CURRENCY</small><strong>${state.house.currency}</strong></div>`;}
  function renderSettings(){const f=document.getElementById("settingsForm");if(f){f.elements.houseName.value=state.house.name;f.elements.rent.value=state.house.rent;f.elements.rentDate.value=state.house.rentDate;}}
  function goto(page){
    document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
    document.querySelectorAll(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const names={dashboard:"Overview",expenses:"Expenses",bills:"Bills & rent",vehicles:"Cars & trips",cleaning:"Cleaning",housemates:"Housemates",settings:"Settings"};
    setText("pageTitle",names[page]||"Overview");document.getElementById("sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
  }
  document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>goto(b.dataset.page)));
  document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>goto(b.dataset.goto)));
  document.getElementById("mobileMenu").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
  document.getElementById("quickAddBtn").addEventListener("click",()=>openExpense());
  document.getElementById("addExpensePageBtn").addEventListener("click",()=>openExpense());
  document.getElementById("emptyAddExpense").addEventListener("click",()=>openExpense());
  document.getElementById("expenseSearch").addEventListener("input",renderExpenses);
  document.getElementById("expenseFilter").addEventListener("change",renderExpenses);
  document.getElementById("addBillBtn").addEventListener("click",()=>openBill());
  document.getElementById("addCarBtn").addEventListener("click",()=>openCar());
  document.getElementById("addTripBtn").addEventListener("click",()=>openTrip());
  document.getElementById("addTaskBtn").addEventListener("click",()=>openTask());
  document.getElementById("inviteBtn").addEventListener("click",()=>openMember());
  document.getElementById("editHouseBtn").addEventListener("click",()=>openHouseEdit());
  document.getElementById("editRentBtn").addEventListener("click",()=>openHouseEdit());
  document.getElementById("notificationsBtn").addEventListener("click",()=>toast("Demo notifications are not connected to email or push services."));
  document.getElementById("resetBtn").addEventListener("click",()=>confirmAction("Reset demo data?","This replaces all changes in this browser with the original sample household.",()=>{state=initialState();save();render();toast("Demo data reset.");}));
  document.getElementById("exportBtn").addEventListener("click",exportData);
  document.getElementById("settingsForm").addEventListener("submit",e=>{e.preventDefault();const f=e.currentTarget;state.house.name=f.elements.houseName.value.trim();state.house.rent=Number(f.elements.rent.value);state.house.rentDate=f.elements.rentDate.value;save();render();toast("Household settings saved.");});
  document.getElementById("closeModal").addEventListener("click",closeModal);
  document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
  document.addEventListener("click",e=>{
    const exp=e.target.closest("[data-expense-detail]");if(exp)expenseDetails(exp.dataset.expenseDetail);
    const bill=e.target.closest("[data-bill-detail]");if(bill)billActions(bill.dataset.billDetail);
    const task=e.target.closest("[data-toggle-task]");if(task){const t=state.tasks.find(x=>x.id===task.dataset.toggleTask);if(t){t.done=!t.done;save();render();toast(t.done?"Task marked complete.":"Task marked incomplete.");}}
    const fuel=e.target.closest("[data-fuel-update]");if(fuel)updateFuel(fuel.dataset.fuelUpdate);
    const trip=e.target.closest("[data-trip-detail]");if(trip)tripDetails(trip.dataset.tripDetail);
  });
  function openModal(title,eyebrow,body){setText("modalTitle",title);setText("modalEyebrow",eyebrow||"FAIRSHARE");document.getElementById("modalBody").innerHTML=body;document.getElementById("modalBackdrop").classList.remove("hidden");}
  function closeModal(){document.getElementById("modalBackdrop").classList.add("hidden");}
  function memberOptions(selected){return state.members.map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(m.name)}</option>`).join("");}
  function memberChecks(name,selected=state.members.map(m=>m.id)){return `<fieldset><legend>${name}</legend><div class="check-grid">${state.members.map(m=>`<label class="check-option"><input type="checkbox" name="participants" value="${m.id}" ${selected.includes(m.id)?"checked":""}> ${esc(m.name)}</label>`).join("")}</div></fieldset>`;}
  function openExpense(){
    openModal("Add an expense","SHARED EXPENSES",`<form class="modal-form" id="expenseForm"><label class="full">What was it for?<input name="description" required maxlength="100" placeholder="e.g. Weekly groceries"></label><label>Total amount ($)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00"></label><label>Category<select name="category">${["Groceries","Food & dining","Household supplies","Transport","Fuel","Utilities","Other"].map(x=>`<option>${x}</option>`).join("")}</select></label><label>Paid by<select name="payer">${memberOptions("m1")}</select></label><label>Date<input name="date" type="date" value="${todayISO()}" required></label>${memberChecks("Who should share this cost?",["m1","m2","m3"])}<div class="inline-note">Equal split is used by default. Custom splits can be added in a later version.</div><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Save expense</button></div></form>`);
    document.querySelector("[data-cancel]").onclick=closeModal;
    document.getElementById("expenseForm").onsubmit=e=>{e.preventDefault();const f=e.currentTarget,participants=[...f.querySelectorAll('[name="participants"]:checked')].map(x=>x.value);if(!participants.length){toast("Choose at least one person to share the expense.");return;}const amount=Number(f.elements.amount.value);if(!Number.isFinite(amount)||amount<=0){toast("Enter a valid amount.");return;}state.expenses.push({id:uid(),description:f.elements.description.value.trim(),category:f.elements.category.value,amount:Math.round(amount*100)/100,payer:f.elements.payer.value,participants,date:f.elements.date.value,split:"equal"});save();render();closeModal();goto("expenses");toast("Expense saved and shares calculated.");};
  }
  function openBill(){
    openModal("Add a household bill","BILLS & UTILITIES",`<form class="modal-form" id="billForm"><label>Bill type<select name="category">${["Electricity","Gas","Water","Lawn mowing","Cleaning","Internet","Other"].map(x=>`<option>${x}</option>`).join("")}</select></label><label>Provider<input name="provider" placeholder="e.g. Energy provider"></label><label class="full">Description<input name="name" required placeholder="e.g. October electricity"></label><label>Total bill ($)<input name="amount" type="number" min=".01" step=".01" required></label><label>Due date<input name="dueDate" type="date" required value="${todayISO()}"></label><label>Billing period<input name="period" placeholder="e.g. October–November"></label><label>Recorded by<select name="payer">${memberOptions("m1")}</select></label>${memberChecks("Who shares this bill?",state.members.map(m=>m.id))}<label class="full">Attach bill image (optional)<input name="photo" type="file" accept="image/*,.pdf"><span class="help">Demo limitation: attachment is not uploaded to a server.</span></label><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Save bill</button></div></form>`);
    document.querySelector("[data-cancel]").onclick=closeModal;
    document.getElementById("billForm").onsubmit=e=>{e.preventDefault();const f=e.currentTarget,participants=[...f.querySelectorAll('[name="participants"]:checked')].map(x=>x.value);if(!participants.length){toast("Choose at least one person.");return;}state.bills.push({id:uid(),name:f.elements.name.value.trim(),provider:f.elements.provider.value.trim(),amount:Math.round(Number(f.elements.amount.value)*100)/100,dueDate:f.elements.dueDate.value,period:f.elements.period.value,status:"Pending",participants,category:f.elements.category.value,payer:f.elements.payer.value});save();render();closeModal();toast("Bill added. Shares are calculated.");};
  }
  function openCar(){
    openModal("Add a vehicle","HOUSEHOLD VEHICLES",`<form class="modal-form" id="carForm"><label class="full">Vehicle name<input name="name" required placeholder="e.g. Maya's Corolla"></label><label>Owner<select name="owner">${memberOptions("m1")}</select></label><label>Fuel type<select name="fuelType"><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Other</option></select></label><label>Efficiency (km/L)<input name="efficiency" type="number" min=".1" step=".1" required placeholder="12"></label><label>Tank capacity (L)<input name="tank" type="number" min="1" step=".1" required placeholder="60"></label><label>Fuel price ($/L)<input name="fuelPrice" type="number" min=".01" step=".001" required placeholder="1.85"></label><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Add vehicle</button></div></form>`);
    document.querySelector("[data-cancel]").onclick=closeModal;
    document.getElementById("carForm").onsubmit=e=>{e.preventDefault();const f=e.currentTarget;state.vehicles.push({id:uid(),name:f.elements.name.value.trim(),owner:f.elements.owner.value,fuelType:f.elements.fuelType.value,efficiency:Number(f.elements.efficiency.value),tank:Number(f.elements.tank.value),fuelPrice:Number(f.elements.fuelPrice.value)});save();render();closeModal();toast("Vehicle added.");};
  }
  function openTrip(){
    if(!state.vehicles.length){toast("Add a vehicle before recording a trip.");return;}
    openModal("Record a car trip","FUEL COST SHARING",`<form class="modal-form" id="tripForm"><label class="full">Vehicle<select name="vehicle">${state.vehicles.map(v=>`<option value="${v.id}">${esc(v.name)} · ${v.efficiency} km/L · ${money(v.fuelPrice)}/L</option>`).join("")}</select></label><label>Driver / person receiving fuel cost<select name="driver">${memberOptions("m1")}</select></label><label>Total distance (km)<input name="distance" type="number" min=".1" step=".1" required placeholder="63"></label><label>Fuel price used ($/L)<input name="price" type="number" min=".01" step=".001" required value="${state.vehicles[0].fuelPrice}"></label><label>Date<input name="date" type="date" value="${todayISO()}" required></label><label>Purpose<input name="purpose" placeholder="e.g. Dinner trip"></label><label>Tolls ($)<input name="tolls" type="number" min="0" step=".01" value="0"></label><label>Parking ($)<input name="parking" type="number" min="0" step=".01" value="0"></label>${memberChecks("Who was on this trip?",state.members.slice(0,4).map(m=>m.id))}<div class="inline-note" id="tripEstimate">Select the vehicle and enter distance to calculate an estimate. This demo uses recorded fuel efficiency.</div><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Save trip</button></div></form>`);
    const f=document.getElementById("tripForm");const update=()=>{const v=state.vehicles.find(x=>x.id===f.elements.vehicle.value);if(!v)return;const price=Number(f.elements.price.value||v.fuelPrice),dist=Number(f.elements.distance.value||0),fuel=dist/v.efficiency,cost=fuel*price+Number(f.elements.tolls.value||0)+Number(f.elements.parking.value||0);setText("tripEstimate",`Estimated fuel: ${fuel.toFixed(2)} L · Estimated total: ${money(cost)}. Cost is split among selected participants.`);};f.elements.vehicle.onchange=()=>{const v=state.vehicles.find(x=>x.id===f.elements.vehicle.value);f.elements.price.value=v.fuelPrice;update();};["price","distance","tolls","parking"].forEach(k=>f.elements[k].addEventListener("input",update));document.querySelector("[data-cancel]").onclick=closeModal;update();
    f.onsubmit=e=>{e.preventDefault();const participants=[...f.querySelectorAll('[name="participants"]:checked')].map(x=>x.value),v=state.vehicles.find(x=>x.id===f.elements.vehicle.value);if(!participants.length){toast("Select at least one participant.");return;}if(!v||Number(f.elements.distance.value)<=0||Number(f.elements.price.value)<=0){toast("Check the vehicle, distance and fuel price.");return;}state.trips.push({id:uid(),vehicle:v.id,driver:f.elements.driver.value,distance:Number(f.elements.distance.value),participants,date:f.elements.date.value,purpose:f.elements.purpose.value.trim(),price:Number(f.elements.price.value),efficiency:Number(v.efficiency),tolls:Number(f.elements.tolls.value||0),parking:Number(f.elements.parking.value||0)});save();render();closeModal();goto("vehicles");toast("Trip saved with estimated fuel cost.");};
  }
  function openTask(){
    openModal("Add a cleaning task","HOUSEHOLD ROUTINE",`<form class="modal-form" id="taskForm"><label class="full">Task name<input name="name" required placeholder="e.g. Clean kitchen"></label><label>Assigned to<select name="assignee">${memberOptions("m1")}</select></label><label>Frequency<select name="frequency"><option>Weekly</option><option>Daily</option><option>Fortnightly</option><option>Monthly</option><option>Twice weekly</option></select></label><label class="full">Due date<input name="dueDate" type="date" required value="${todayISO()}"></label><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Create task</button></div></form>`);
    document.querySelector("[data-cancel]").onclick=closeModal;document.getElementById("taskForm").onsubmit=e=>{e.preventDefault();const f=e.currentTarget;state.tasks.push({id:uid(),name:f.elements.name.value.trim(),assignee:f.elements.assignee.value,frequency:f.elements.frequency.value,dueDate:f.elements.dueDate.value,done:false});save();render();closeModal();toast("Cleaning task created.");};
  }
  function openMember(){
    openModal("Invite a housemate","HOUSEHOLD MEMBERS",`<form class="modal-form" id="memberForm"><label>Name<input name="name" required placeholder="Full name"></label><label>Email<input name="email" type="email" required placeholder="name@example.com"></label><div class="inline-note">This prototype adds a local demo member only. It does not send a real invitation or create a separate login.</div><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Add demo member</button></div></form>`);
    document.querySelector("[data-cancel]").onclick=closeModal;document.getElementById("memberForm").onsubmit=e=>{e.preventDefault();const f=e.currentTarget,name=f.elements.name.value.trim();state.members.push({id:uid(),name,email:f.elements.email.value.trim(),role:"Member",initials:name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()});save();render();closeModal();toast("Demo member added to this browser.");};
  }
  function openHouseEdit(){
    openModal("Household & rent settings","HOUSEHOLD SETTINGS",`<form class="modal-form" id="houseForm"><label class="full">Household name<input name="name" required value="${esc(state.house.name)}"></label><label>Total rent per fortnight ($)<input name="rent" type="number" min="0" step=".01" required value="${state.house.rent}"></label><label>Next rent due date<input name="rentDate" type="date" required value="${state.house.rentDate}"></label><div class="inline-note">This demo displays the reminder schedule but does not send real timed notifications. Each member's equal rent share is calculated from the current member count.</div><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Save changes</button></div></form>`);
    document.querySelector("[data-cancel]").onclick=closeModal;document.getElementById("houseForm").onsubmit=e=>{e.preventDefault();const f=e.currentTarget;state.house.name=f.elements.name.value.trim();state.house.rent=Number(f.elements.rent.value);state.house.rentDate=f.elements.rentDate.value;save();render();closeModal();toast("Household details updated.");};
  }
  function updateFuel(id){
    const v=state.vehicles.find(x=>x.id===id);if(!v)return;
    openModal("Update fuel price","FUEL PRICE HISTORY",`<form class="modal-form" id="fuelForm"><label>Fuel price ($/L)<input name="price" type="number" min=".01" step=".001" required value="${v.fuelPrice}"></label><label>Observed date<input name="date" type="date" required value="${todayISO()}"></label><label class="full">Price display / receipt photo<input name="photo" type="file" accept="image/*"><span class="help">This local demo does not upload or persist image files.</span></label><div class="inline-note">Updating the price changes the vehicle's latest displayed price. Existing trip records keep the price used when they were recorded.</div><div class="modal-actions"><button type="button" class="outline-btn" data-cancel>Cancel</button><button class="primary-btn" type="submit">Save fuel price</button></div></form>`);
    document.querySelector("[data-cancel]").onclick=closeModal;document.getElementById("fuelForm").onsubmit=e=>{e.preventDefault();const f=e.currentTarget;v.fuelPrice=Number(f.elements.price.value);state.fuelPhotos.push({id:uid(),vehicle:id,price:v.fuelPrice,date:f.elements.date.value,recordedBy:"m1",photoName:f.elements.photo.files[0]?.name||null});save();render();closeModal();toast("Fuel price updated. Previous trip prices remain unchanged.");};
  }
  function expenseDetails(id){
    const e=state.expenses.find(x=>x.id===id);if(!e)return;const shares=splitAmounts(e.amount,e.participants,e.split||"equal",e.custom||{});
    openModal("Expense details","TRANSACTION BREAKDOWN",`<div class="detail-item"><small>DESCRIPTION</small><strong>${esc(e.description)}</strong></div><div class="details-grid" style="margin:16px 0"><div class="detail-item"><small>TOTAL</small><strong>${money(e.amount)}</strong></div><div class="detail-item"><small>PAID BY</small><strong>${esc(member(e.payer).name)}</strong></div><div class="detail-item"><small>DATE</small><strong>${fmtDate(e.date)}</strong></div></div><div class="bill-list">${Object.entries(shares).map(([id,amount])=>`<div class="bill-row">${avatar(id)}<div class="bill-info"><strong>${esc(member(id).name)}</strong><small>${id===e.payer?"Paid the original expense":"Share of expense"}</small></div><div class="bill-share"><strong>${money(amount)}</strong></div></div>`).join("")}</div><div class="modal-actions" style="margin-top:15px"><button class="danger-btn" id="deleteExpenseBtn">Delete demo expense</button><button class="primary-btn" id="detailCloseBtn">Close</button></div>`);
    document.getElementById("detailCloseBtn").onclick=closeModal;document.getElementById("deleteExpenseBtn").onclick=()=>confirmAction("Delete this expense?","This removes the demo transaction from this browser. This action cannot be undone.",()=>{state.expenses=state.expenses.filter(x=>x.id!==id);save();render();closeModal();toast("Expense deleted.");});
  }
  function billActions(id){
    const b=state.bills.find(x=>x.id===id);if(!b)return;
    openModal("Bill actions","HOUSEHOLD BILL",`<div class="detail-item"><small>BILL</small><strong>${esc(b.name)} · ${money(b.amount)}</strong></div><p class="muted">Due ${fmtDate(b.dueDate)} · ${b.participants.length} participants.</p><div class="modal-actions" style="margin-top:20px;justify-content:space-between"><button class="outline-btn" id="toggleBillStatus">${b.status==="Paid"?"Mark pending":"Mark paid"}</button><button class="danger-btn" id="deleteBillBtn">Delete bill</button><button class="primary-btn" id="billCloseBtn">Close</button></div>`);
    document.getElementById("billCloseBtn").onclick=closeModal;document.getElementById("toggleBillStatus").onclick=()=>{b.status=b.status==="Paid"?"Pending":"Paid";save();render();closeModal();toast(`Bill marked ${b.status.toLowerCase()}.`);};document.getElementById("deleteBillBtn").onclick=()=>confirmAction("Delete this bill?","This removes the demo bill from this browser.",()=>{state.bills=state.bills.filter(x=>x.id!==id);save();render();closeModal();toast("Bill deleted.");});
  }
  function tripDetails(id){
    const t=state.trips.find(x=>x.id===id);if(!t)return;const v=state.vehicles.find(x=>x.id===t.vehicle)||{name:"Vehicle"},cost=tripCost(t),shares=splitAmounts(cost,t.participants);
    openModal("Trip breakdown","ESTIMATED FUEL COST",`<div class="detail-item"><small>TRIP</small><strong>${esc(t.purpose||"Shared trip")} · ${esc(v.name)}</strong></div><div class="details-grid" style="margin:16px 0"><div class="detail-item"><small>DISTANCE</small><strong>${t.distance} km</strong></div><div class="detail-item"><small>FUEL USED</small><strong>${(t.distance/t.efficiency).toFixed(2)} L</strong></div><div class="detail-item"><small>ESTIMATED TOTAL</small><strong>${money(cost)}</strong></div></div><p class="muted">Efficiency: ${t.efficiency} km/L · Fuel price: ${money(t.price)}/L · Includes ${money(t.tolls)} tolls and ${money(t.parking)} parking.</p><div class="bill-list">${Object.entries(shares).map(([mid,amt])=>`<div class="bill-row">${avatar(mid)}<div class="bill-info"><strong>${esc(member(mid).name)}</strong><small>${mid===t.driver?"Driver / fuel reimbursement recipient":"Trip share"}</small></div><div class="bill-share"><strong>${money(amt)}</strong></div></div>`).join("")}</div><div class="modal-actions" style="margin-top:15px"><button class="primary-btn" id="tripCloseBtn">Close</button></div>`);
    document.getElementById("tripCloseBtn").onclick=closeModal;
  }
  function confirmAction(title,description,callback){
    openModal(title,"PLEASE CONFIRM",`<p class="muted" style="font-size:12px">${esc(description)}</p><div class="modal-actions" style="margin-top:20px"><button class="outline-btn" id="confirmNo">Cancel</button><button class="danger-btn" id="confirmYes">Confirm</button></div>`);
    document.getElementById("confirmNo").onclick=closeModal;document.getElementById("confirmYes").onclick=()=>callback();
  }
  function toast(message){const el=document.createElement("div");el.className="toast";el.textContent=message;document.getElementById("toastRegion").appendChild(el);setTimeout(()=>el.remove(),3500);}
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="fairshare-demo-data.json";a.click();URL.revokeObjectURL(url);toast("Demo data exported.");}
  render();
})();