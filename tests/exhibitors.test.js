import test from 'node:test';
import assert from 'node:assert/strict';
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
globalThis.window={dispatchEvent:()=>{}};
const s=await import('../src/services/data.js');

test('exhibitor signup, login, own team passes and gate entry',async()=>{
  s.resetDemo();
  const expo=s.getExpos()[0],employee=s.getEmployees()[0].id;
  const details={company:'Acme Booths',name:'Company Owner',email:'owner@acme.test',phone:'+919111111111',expoId:expo.id,password:'secure-demo-123'};
  await assert.rejects(s.createExhibitorAccount({...details,password:'short'}),/at least 8/);
  const account=await s.createExhibitorAccount(details);
  assert.equal(s.getCurrentExhibitor().id,account.id);
  assert.equal(s.getExhibitorMembers().length,1);
  assert.equal(s.getVisitorById(account.leadVisitorId).type,'Exhibitor');
  assert.ok(!store.get('expoflow-v1').includes(details.password));
  await assert.rejects(s.createExhibitorAccount(details),/already has/);
  const member=s.addExhibitorMember({name:'Team Member',email:'team@acme.test',phone:'+919222222222',expoId:'forged',exhibitorId:'forged',type:'VIP'});
  assert.equal(member.expoId,expo.id);
  assert.equal(member.exhibitorId,account.id);
  assert.equal(member.type,'Exhibitor');
  assert.match(await s.generateQRCode(member.id),/^data:image\/png/);
  assert.equal(s.checkInScannedQR(`EXPO:${member.token}`,expo.id,'Gate A',employee).status,'Success');
  assert.equal(s.getExhibitorMembers().find(v=>v.id===member.id).checkedIn,true);
  assert.equal(s.checkInScannedQR(member.token,expo.id,'Gate A',employee).status,'Already Checked In');
  assert.equal(s.getVisitorCheckInHistory(member.id).length,1);
  s.assignExhibitorBooth(account.id,'A-12');
  assert.equal(s.getCurrentExhibitor().booth,'A-12');
  s.logoutExhibitor();
  assert.equal(s.getCurrentExhibitor(),null);
  assert.throws(()=>s.getExhibitorMembers(),/log in/);
  await assert.rejects(s.loginExhibitor(details.email,'incorrect'),/incorrect/);
  await s.loginExhibitor('OWNER@ACME.TEST',details.password);
  assert.equal(s.getCurrentExhibitor().id,account.id);
  const other=await s.createExhibitorAccount({...details,company:'Other Company',email:'other@company.test',phone:'+919333333333'});
  assert.equal(s.getExhibitorMembers().length,1);
  assert.throws(()=>s.cancelExhibitorMember(member.id),/not found/);
  assert.throws(()=>s.cancelExhibitorMember(other.leadVisitorId),/primary contact/);
  assert.throws(()=>s.assignExhibitorBooth(other.id,'a-12'),/already assigned/);
  await s.loginExhibitor(details.email,details.password);
  s.cancelExhibitorMember(member.id);
  assert.equal(s.verifyQRCode(member.token,expo.id).status,'Cancelled Registration');
});

test('existing browser data without exhibitors migrates without losing records',()=>{
  s.resetDemo();
  assert.equal(s.getExhibitors().length,0);
  assert.equal(s.getVisitors().length,30);
  assert.equal(s.getCurrentExhibitor(),null);
});

test('stall visits count separately per exhibitor and reject duplicates and wrong expos',async()=>{
  s.resetDemo();
  const expo=s.getExpos()[0],employee=s.getEmployees()[0].id;
  const account=await s.createExhibitorAccount({company:'Stall Company',name:'Stall Owner',email:'stall@test.com',phone:'+919444444444',expoId:expo.id,password:'stall-password'});
  s.assignExhibitorBooth(account.id,'B-12');
  const visitor=s.getVisitors().find(v=>v.expoId===expo.id&&v.status!=='Cancelled'&&v.checkedIn);
  const gateCount=s.getCheckInHistory().length;
  assert.equal(s.getStallCheckInReport()[0].checkins,0);
  assert.equal(s.checkInAtStall(visitor.token,s.getExpos()[1].id,account.id,employee).status,'Invalid stall');
  assert.equal(s.checkInAtStall(visitor.token,expo.id,account.id,employee).status,'Success');
  assert.equal(s.checkInAtStall(visitor.token,expo.id,account.id,employee).status,'Already Checked In');
  assert.equal(s.getStallCheckInReport(expo.id)[0].checkins,1);
  assert.equal(s.getStallCheckInReport(s.getExpos()[1].id).length,0);
  assert.equal(s.getCheckInHistory().length,gateCount);
  const other=s.getVisitors().find(v=>v.expoId!==expo.id&&v.status!=='Cancelled');
  assert.equal(s.checkInAtStall(other.token,expo.id,account.id,employee).status,'Wrong Expo');
  assert.equal(s.getStallCheckInReport()[0].checkins,1);
});

test('organisers can be assigned and edited with duplicate and event validation',()=>{
  s.resetDemo();
  const details={name:'Event Owner',company:'CIS Events',email:'owner@cis.test',phone:'+919999999999',expoId:s.getExpos()[0].id};
  const organiser=s.saveOrganiser(details);
  assert.equal(s.getOrganisers().length,1);
  assert.throws(()=>s.saveOrganiser(details),/already assigned/);
  s.saveOrganiser({...organiser,name:'Updated Owner'});
  assert.equal(s.getOrganisers()[0].name,'Updated Owner');
  assert.throws(()=>s.saveOrganiser({...details,expoId:'missing'}),/Select an event/);
  assert.throws(()=>s.saveOrganiser({...details,email:'invalid'}),/valid email/);
  assert.deepEqual(s.REGISTRATION_TYPES.slice(0,3),['Event Management','Organiser','Exhibitor']);
});
