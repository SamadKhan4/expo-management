import QRCode from 'qrcode';
const KEY='expoflow-v1';
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
export function seed(){const t=Date.now();const expos=[['Future Tech Expo','TECH26','Published','BIEC, Bengaluru'],['Design & Build Summit','DB26','Draft','Jio World, Mumbai'],['Green Energy Forum','GE26','Completed','Pragati Maidan, Delhi']].map(([name,code,status,venue],i)=>({id:uid(),name,code,status,venue,address:venue,description:'Connect with industry leaders, discover new ideas, and build meaningful partnerships.',start:new Date(t-86400000).toISOString().slice(0,16),end:new Date(t+86400000*3).toISOString().slice(0,16),capacity:20000,image:''}));const names=['Aarav Sharma','Priya Patel','Rohan Mehta','Ananya Singh','Vikram Rao','Ishita Shah','Arjun Nair','Diya Kapoor','Kabir Das','Meera Iyer','Aditya Verma','Sara Khan','Dev Malhotra','Nisha Gupta','Rahul Jain','Tara Menon','Karan Sethi','Aisha Ali','Neel Joshi','Riya Desai','Sahil Kumar','Pooja Reddy','Varun Bhat','Sana Sheikh','Yash Agarwal','Ira Sen','Aman Roy','Zoya Mir','Om Kulkarni','Eva Thomas'];const employees=[{id:uid(),name:'Alex Morgan',email:'alex@example.com',employeeId:'EMP-001',role:'Admin',expoId:expos[0].id,gate:'Gate A',active:true},{id:uid(),name:'Priya Nair',email:'priya@example.com',employeeId:'EMP-002',role:'Gate Staff',expoId:expos[0].id,gate:'Gate B',active:true}];const visitors=names.map((name,i)=>({id:uid(),registrationId:`REG-${String(i+1001)}`,name,email:`visitor${i+1}@example.com`,phone:`+91987654${String(i).padStart(4,'0')}`,company:['Acme Technologies','Studio North','Nexus Labs','Vertex Industries'][i%4],jobTitle:'Manager',expoId:expos[i%3].id,type:['Visitor','VIP','Exhibitor','Staff'][i%4],notes:'',consent:i%5!==0,status:i%11===0?'Cancelled':'Confirmed',token:uid()+uid(),createdAt:new Date(t-(i%7)*86400000).toISOString(),checkedIn:i%3===0&&i%11!==0}));const checkins=visitors.filter(v=>v.checkedIn).map(v=>({id:uid(),visitorId:v.id,expoId:v.expoId,time:now(),gate:'Gate A',employeeId:employees[0].id,status:'Success'}));return {expos,visitors,employees,checkins,deliveries:visitors.filter(v=>v.consent).map(v=>({id:uid(),visitorId:v.id,channel:'Email',status:'Simulated Sent',time:now()}))};}
let memory;
export function db(){if(memory)return memory;try{const d=JSON.parse(localStorage.getItem(KEY));if(!d||!['expos','visitors','employees','checkins','deliveries'].every(k=>Array.isArray(d[k])))throw Error();memory=d;}catch{memory=seed();localStorage.setItem(KEY,JSON.stringify(memory));}return memory;}
function save(){localStorage.setItem(KEY,JSON.stringify(db()));window.dispatchEvent(new Event('expo-change'));}
export const getExhibitors=()=>db().exhibitors||=[];
let exhibitorSession;
export const getCurrentExhibitor=()=>getExhibitors().find(e=>e.id===exhibitorSession)||null;
export function logoutExhibitor(){exhibitorSession=undefined;}
async function passwordDigest(password,salt){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
  return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function createExhibitorAccount(d){
  if(!d.company?.trim())throw Error('Company name is required.');
  if(typeof d.password!=='string'||d.password.length<8)throw Error('Use a password with at least 8 characters.');
  const email=d.email?.trim().toLowerCase();
  if(getExhibitors().some(e=>e.email===email))throw Error('This email already has an exhibitor account. Please log in.');
  const salt=uid(),digest=await passwordDigest(d.password,salt);
  // Recheck after hashing so simultaneous submissions cannot create duplicate accounts.
  if(getExhibitors().some(e=>e.email===email))throw Error('This email already has an exhibitor account. Please log in.');
  const member={name:d.name?.trim(),email,phone:d.phone,company:d.company.trim(),expoId:d.expoId,type:'Exhibitor',consent:!!d.consent};
  validateVisitor(member);
  const account={id:uid(),name:member.name,email,company:member.company,expoId:d.expoId,booth:'',salt,passwordDigest:digest,createdAt:now()};
  const visitor=registerVisitor({...member,exhibitorId:account.id});
  account.leadVisitorId=visitor.id;
  getExhibitors().push(account);exhibitorSession=account.id;save();return account;
}
export async function loginExhibitor(email,password){
  const account=getExhibitors().find(e=>e.email===email.trim().toLowerCase());
  if(!account||await passwordDigest(password,account.salt)!==account.passwordDigest)throw Error('Email or password is incorrect.');
  exhibitorSession=account.id;return account;
}
function requireExhibitor(){const account=getCurrentExhibitor();if(!account)throw Error('Please log in to your exhibitor account.');return account;}
export function getExhibitorMembers(){const account=requireExhibitor();return getVisitors().filter(v=>v.exhibitorId===account.id);}
export function addExhibitorMember(d){const account=requireExhibitor();return registerVisitor({name:d.name,email:d.email,phone:d.phone,consent:!!d.consent,company:account.company,expoId:account.expoId,type:'Exhibitor',exhibitorId:account.id});}
export function cancelExhibitorMember(id){const account=requireExhibitor();if(id===account.leadVisitorId)throw Error('The primary contact pass cannot be cancelled here.');if(!getExhibitorMembers().some(v=>v.id===id))throw Error('Team member not found.');cancelRegistration(id);}
export function assignExhibitorBooth(id,booth){const account=getExhibitors().find(e=>e.id===id);if(!account)throw Error('Exhibitor not found.');const value=booth.trim();if(value&&getExhibitors().some(e=>e.id!==id&&e.expoId===account.expoId&&e.booth.toLowerCase()===value.toLowerCase()))throw Error('This stall is already assigned in this expo.');account.booth=value;save();}
export function resetDemo(){memory=seed();save();}
export const getExpos=()=>db().expos;
export const getExpoById=id=>getExpos().find(x=>x.id===id);
function validateExpo(d,id){if(!d.name?.trim()||!d.venue?.trim()||!d.code?.trim())throw Error('Name, code and venue are required.');if(!d.start||!d.end||new Date(d.end)<=new Date(d.start))throw Error('End must be after start.');if(!Number.isInteger(+d.capacity)||+d.capacity<1)throw Error('Capacity must be a positive integer.');if(getExpos().some(e=>e.id!==id&&e.code.toLowerCase()===d.code.trim().toLowerCase()))throw Error('Expo code already exists.');}
export function createExpo(d){validateExpo(d);const e={...d,id:uid(),code:d.code.trim(),capacity:+d.capacity};db().expos.push(e);save();return e;}
export function updateExpo(id,d){const e=getExpoById(id);validateExpo({...e,...d},id);Object.assign(e,d,{capacity:+(d.capacity??e.capacity)});save();return e;}
export const changeExpoStatus=(id,status)=>updateExpo(id,{status});
export function deleteExpo(id){if(db().visitors.some(v=>v.expoId===id))throw Error('This expo has registrations. Cancel or retain it to preserve history.');db().expos=db().expos.filter(e=>e.id!==id);save();}
export const getExpoRegistrationCount=id=>db().visitors.filter(v=>v.expoId===id&&v.status!=='Cancelled').length;
const phone=x=>String(x||'').replace(/\D/g,'');
export const checkDuplicateVisitor=(expoId,email,p,id)=>db().visitors.some(v=>v.id!==id&&v.status!=='Cancelled'&&v.expoId===expoId&&(v.email.trim().toLowerCase()===email.trim().toLowerCase()||phone(v.phone)===phone(p)));
export function getVisitors(f={}){return db().visitors.filter(v=>(!f.query||[v.name,v.email,v.phone,v.registrationId].some(s=>s.toLowerCase().includes(f.query.toLowerCase())))&&(!f.expoId||v.expoId===f.expoId)&&(!f.type||v.type===f.type)&&(!f.status||v.status===f.status)&&(!f.checkin||(f.checkin==='Checked in')===v.checkedIn));}
export const searchVisitors=query=>getVisitors({query});
export const getVisitorById=id=>db().visitors.find(v=>v.id===id);
export const getVisitorRegistrationCount=getExpoRegistrationCount;
function validateVisitor(d,id){if(!d.name?.trim())throw Error('Full name is required.');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw Error('Enter a valid email.');if(!/^\+\d[\d\s()-]{7,18}$/.test(d.phone)||phone(d.phone).length<8||phone(d.phone).length>15)throw Error('Enter a valid phone with country code.');const e=getExpoById(d.expoId);if(!e)throw Error('Select an expo.');if(!id&&e.status!=='Published')throw Error('Registration is available for published expos only.');if(checkDuplicateVisitor(d.expoId,d.email,d.phone,id))throw Error('Email or phone is already registered for this expo.');if(!id&&getExpoRegistrationCount(d.expoId)>=e.capacity)throw Error('This expo is at capacity.');}
export function registerVisitor(d){validateVisitor(d);const v={...d,id:uid(),registrationId:`REG-${uid().slice(0,8).toUpperCase()}`,token:uid()+uid(),status:'Confirmed',checkedIn:false,createdAt:now()};db().visitors.unshift(v);save();return v;}
export function updateVisitor(id,d){const v=getVisitorById(id);const allowed=Object.fromEntries(Object.entries(d).filter(([k])=>['name','email','phone','company','jobTitle','notes','consent','type'].includes(k)));validateVisitor({...v,...allowed},id);Object.assign(v,allowed);save();return v;}
export function cancelRegistration(id){getVisitorById(id).status='Cancelled';save();}
export const getQRPass=id=>({visitor:getVisitorById(id),expo:getExpoById(getVisitorById(id).expoId)});
export const generateQRCode=id=>QRCode.toDataURL('EXPO:'+getVisitorById(id).token,{width:360,margin:2});
export async function downloadQRPass(id){const {visitor:v,expo:e}=getQRPass(id);const qr=await generateQRCode(id);const c=document.createElement('canvas');c.width=700;c.height=880;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,700,880);ctx.fillStyle='#17213a';ctx.font='bold 28px sans-serif';ctx.fillText(e.name,40,70);ctx.font='24px sans-serif';ctx.fillText(v.name,40,120);ctx.font='18px sans-serif';[v.registrationId,e.venue,new Date(e.start).toLocaleString(),v.status].forEach((s,i)=>ctx.fillText(s,40,165+i*35));const img=new Image();img.src=qr;await img.decode();ctx.drawImage(img,170,330,360,360);download(c.toDataURL(),'pass-'+v.registrationId+'.png');}
export function printQRPass(){window.print();}
export function regenerateQRToken(id){getVisitorById(id).token=uid()+uid();save();}
export function verifyQRCode(raw,expoId){const token=raw.replace(/^EXPO:/,'');const v=db().visitors.find(v=>v.token===token);if(!v)return {status:'Invalid QR',message:'The token is invalid or has been replaced.'};if(v.expoId!==expoId)return {status:'Wrong Expo',visitor:v};if(v.status==='Cancelled')return {status:'Cancelled Registration',visitor:v};if(v.checkedIn){const checkin=getVisitorCheckInHistory(v.id).sort((a,b)=>b.time.localeCompare(a.time))[0];return {status:'Already Checked In',visitor:v,checkin,message:'Already scanned. This visitor has already checked in. Duplicate entry was not recorded.'};}const e=getExpoById(expoId);if(e.status!=='Published'||Date.now()<+new Date(e.start)||Date.now()>+new Date(e.end))return {status:'Expo Not Currently Accepting Entries',visitor:v};return {status:'Valid Registration',visitor:v};}
export function lookupRegistration(q){return db().visitors.find(v=>v.registrationId.toLowerCase()===q.trim().toLowerCase()||v.token===q.replace(/^EXPO:/,''));}
export function confirmEntry(token,expoId,gate,employeeId){const r=verifyQRCode(token,expoId);if(r.status!=='Valid Registration')throw Error(r.status);if(!gate||!employeeId)throw Error('Select a gate and employee.');r.visitor.checkedIn=true;const c={id:uid(),visitorId:r.visitor.id,expoId,gate,employeeId,time:now(),status:'Success'};db().checkins.unshift(c);save();return c;}
export function getCheckInHistory(f={}){return db().checkins.filter(c=>(!f.expoId||c.expoId===f.expoId)&&(!f.gate||c.gate===f.gate)&&(!f.employeeId||c.employeeId===f.employeeId)&&(!f.status||c.status===f.status)&&(!f.from||c.time.slice(0,10)>=f.from)&&(!f.to||c.time.slice(0,10)<=f.to)&&(!f.query||`${getVisitorById(c.visitorId)?.name} ${getVisitorById(c.visitorId)?.registrationId}`.toLowerCase().includes(f.query.toLowerCase())));}
export const getCheckInById=id=>db().checkins.find(c=>c.id===id);
export const getVisitorCheckInHistory=id=>db().checkins.filter(c=>c.visitorId===id);
export const getEmployees=()=>db().employees;
export function createEmployee(d){if(!d.name?.trim()||!/^\S+@\S+\.\S+$/.test(d.email)||!d.employeeId?.trim())throw Error('Name, valid email and employee ID required.');if(getEmployees().some(e=>e.employeeId===d.employeeId))throw Error('Employee ID already exists.');const e={...d,id:uid(),active:true};db().employees.push(e);save();return e;}
export function updateEmployee(id,d){Object.assign(getEmployees().find(e=>e.id===id),d);save();}
export const deactivateEmployee=id=>updateEmployee(id,{active:false});
export const assignEmployeeToExpo=(id,expoId)=>updateEmployee(id,{expoId});
export const assignEmployeeToGate=(id,gate)=>updateEmployee(id,{gate});
export function simulateDelivery(id,channel){const v=getVisitorById(id);if(!v.consent)throw Error('Messaging consent has not been provided.');const d={id:uid(),visitorId:id,channel,status:Math.random()<.15?'Failed':'Simulated Sent',time:now()};db().deliveries.unshift(d);save();return d;}
export const sendEmailQR=id=>simulateDelivery(id,'Email');
export const sendWhatsAppQR=id=>simulateDelivery(id,'WhatsApp');
export const retryDelivery=simulateDelivery;
export const getDeliveryStatus=id=>db().deliveries.filter(d=>d.visitorId===id);
export const getDashboardStats=()=>({expos:db().expos.length,visitors:db().visitors.length,checkedIn:db().visitors.filter(v=>v.checkedIn).length,pending:db().visitors.filter(v=>!v.checkedIn&&v.status!=='Cancelled').length});
export const getExpoReport=id=>({name:getExpoById(id).name,registrations:db().visitors.filter(v=>v.expoId===id).length,checkins:db().checkins.filter(c=>c.expoId===id).length});
export const getRegistrationReport=getVisitors;
export const getCheckInReport=getCheckInHistory;
export function csv(rows){return rows.map(row=>row.map(x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n');}
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
function exportCSV(rows,name){const u=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8;'}));download(u,name);setTimeout(()=>URL.revokeObjectURL(u),1000);}
export const exportVisitorsCSV=f=>exportCSV([['Name','Registration ID','Email','Phone','Expo','Type','Status','Checked in'],...getVisitors(f).map(v=>[v.name,v.registrationId,v.email,v.phone,getExpoById(v.expoId)?.name,v.type,v.status,v.checkedIn])],'visitors.csv');
export const exportCheckInHistoryCSV=f=>exportCSV([['Visitor','Registration ID','Expo','Time','Gate','Employee','Status'],...getCheckInHistory(f).map(c=>[getVisitorById(c.visitorId)?.name,getVisitorById(c.visitorId)?.registrationId,getExpoById(c.expoId)?.name,c.time,c.gate,getEmployees().find(e=>e.id===c.employeeId)?.name,c.status])],'checkins.csv');

// Camera scans verify and record entry in the same synchronous service operation.
export function checkInScannedQR(text,expoId,gate,employeeId){
  const result=verifyQRCode(text,expoId);
  if(result.status!=='Valid Registration')return result;
  const checkin=confirmEntry(result.visitor.token,expoId,gate,employeeId);
  return {status:'Success',visitor:result.visitor,checkin,message:'Checked in automatically. Entry recorded successfully.'};
}
