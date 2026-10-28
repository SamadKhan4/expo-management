import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Building2, Users, UserCheck, QrCode, LogOut, Plus} from 'lucide-react';
import * as s from '../services/data';
import {Button, PageHeader, FormField, DataTable, StatusBadge, StatCard, Modal, ConfirmDialog} from '../components/common';
import Pass from '../components/Pass';

export function Exhibitors({refresh}) {
  const [edit,setEdit]=useState(null),[booth,setBooth]=useState(''),[error,setError]=useState('');
  return <><PageHeader title="Exhibitors" description="Participating companies, stall assignments and team entry."><Link className="btn" to="/exhibitor">Open exhibitor portal</Link></PageHeader>
    <div className="card"><DataTable rows={s.getExhibitors()} columns={[
      {label:'COMPANY',render:e=><div><b>{e.company}</b><small className="block">{e.name} · {e.email}</small></div>},
      {label:'EXPO',render:e=>s.getExpoById(e.expoId)?.name},
      {label:'STALL',render:e=>e.booth||'Awaiting assignment'},
      {label:'TEAM ENTRY',render:e=>{const members=s.getVisitors().filter(v=>v.exhibitorId===e.id&&v.status!=='Cancelled');return `${members.filter(v=>v.checkedIn).length} / ${members.length} checked in`;}},
      {label:'ACTION',render:e=><Button variant="secondary" onClick={()=>{setEdit(e);setBooth(e.booth);setError('');}}>Assign stall</Button>}
    ]}/></div>
    {edit&&<Modal title={`Stall assignment · ${edit.company}`} onClose={()=>setEdit(null)}><form onSubmit={e=>{e.preventDefault();try{s.assignExhibitorBooth(edit.id,booth);refresh();setEdit(null);}catch(err){setError(err.message);}}}><FormField label="Stall / booth number"><input value={booth} onChange={e=>setBooth(e.target.value)} placeholder="e.g. Hall A / A-12"/></FormField>{error&&<p role="alert" className="text-red-600 mt-3">{error}</p>}<Button className="mt-5">Save assignment</Button></form></Modal>}
  </>;
}

export default function ExhibitorPortal(){
  const [account,setAccount]=useState(s.getCurrentExhibitor),[mode,setMode]=useState('login'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[version,setVersion]=useState(0);
  const [pass,setPass]=useState(null),[adding,setAdding]=useState(false),[cancel,setCancel]=useState(null);
  const refresh=()=>setVersion(v=>v+1);
  useEffect(()=>{const update=()=>{setAccount(s.getCurrentExhibitor());refresh();};window.addEventListener('expo-change',update);return()=>window.removeEventListener('expo-change',update);},[]);
  async function authenticate(event){
    event.preventDefault();setError('');setBusy(true);
    const d=Object.fromEntries(new FormData(event.currentTarget));
    try{const result=mode==='login'?await s.loginExhibitor(d.email,d.password):await s.createExhibitorAccount({...d,consent:d.consent==='on'});setAccount(result);}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  const members=account?s.getExhibitorMembers():[],expo=account?s.getExpoById(account.expoId):null;
  return <div className="min-h-screen"><header className="topbar print:hidden"><Link className="font-bold text-xl text-indigo-600" to="/exhibitor">expoflow <span className="text-sm font-normal text-slate-500">Exhibitor portal</span></Link><span className="demo-tag">DEMO MODE</span>{account&&<Button variant="secondary" onClick={()=>{s.logoutExhibitor();setAccount(null);setPass(null);setAdding(false);setCancel(null);setError('');}}><LogOut size={16}/>Log out</Button>}</header>
    <main className="!max-w-6xl">
      {!account?<div className="max-w-xl mx-auto my-8"><div className="icon-box mb-3"><Building2 size={25}/></div><h1>{mode==='login'?'Welcome, exhibitors':'Register your company'}</h1><p className="text-slate-500 mb-6">Manage your stall team, access QR entry passes and track arrivals.</p>
        <form className="card p-6" onSubmit={authenticate} key={mode}><div className="space-y-4">
          {mode==='signup'&&<><FormField label="Company name"><input name="company" required autoComplete="organization"/></FormField><FormField label="Primary contact name"><input name="name" required autoComplete="name"/></FormField><FormField label="Mobile with country code"><input name="phone" type="tel" required placeholder="+91…" autoComplete="tel"/></FormField><FormField label="Participating expo"><select name="expoId" required defaultValue=""><option value="" disabled>Select expo</option>{s.getExpos().filter(e=>e.status==='Published').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></FormField></>}
          <FormField label="Email address"><input name="email" type="email" required autoComplete="username"/></FormField><FormField label="Password"><input name="password" type="password" required minLength={mode==='signup'?8:undefined} autoComplete={mode==='login'?'current-password':'new-password'}/></FormField>
          {mode==='signup'&&<label className="flex gap-2 items-center text-xs text-slate-500"><input name="consent" type="checkbox"/>Allow event-related messages</label>}
          {error&&<p role="alert" className="text-red-600 text-sm">{error}</p>}<Button className="w-full" disabled={busy}>{busy?'Please wait…':mode==='login'?'Log in':'Create exhibitor account'}</Button>
        </div></form><Button className="mt-3" variant="ghost" disabled={busy} onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login'?'New exhibitor? Register your company':'Already registered? Log in'}</Button>
        <p className="text-xs text-slate-400 mt-5">Demo accounts and passes are saved in this browser. Use this same browser to try gate scanning. Login is required again after a page reload.</p>
      </div>:<><PageHeader title={account.company} description={`${expo?.name||'Expo'} · Exhibitor workspace`}><Button onClick={()=>{setAdding(true);setError('');}}><Plus size={16}/>Add team member</Button></PageHeader>
        <div className="banner"><div><span className="eyebrow text-indigo-200">YOUR EXHIBITION SPACE</span><h2>{account.booth?`Stall ${account.booth}`:'Stall assignment pending'}</h2><p>{expo?.venue} · {expo&&new Date(expo.start).toLocaleDateString()} · {expo?.status}</p></div><Button onClick={()=>setPass(account.leadVisitorId)}><QrCode size={17}/>My entry pass</Button></div>
        <div className="grid sm:grid-cols-3 gap-5 mb-6"><StatCard title="Team passes" value={members.filter(v=>v.status!=='Cancelled').length} icon={Users} foot="Active exhibitor registrations"/><StatCard title="Checked in" value={members.filter(v=>v.checkedIn).length} icon={UserCheck} foot="Entry recorded by gate staff"/><StatCard title="Stall" value={account.booth||'Pending'} icon={Building2} foot="Assigned by the organizer"/></div>
        <div className="card"><div className="section-head"><h2>Team members & entry passes</h2></div><DataTable rows={members} columns={[
          {label:'TEAM MEMBER',render:v=><div><b>{v.name}</b><small className="block">{v.email}{v.id===account.leadVisitorId?' · Primary contact':''}</small></div>},
          {label:'PASS',key:'registrationId'},
          {label:'ENTRY',render:v=><><StatusBadge>{v.status==='Cancelled'?'Cancelled':v.checkedIn?'Success':'Pending'}</StatusBadge>{s.getVisitorCheckInHistory(v.id).slice(0,1).map(c=><small className="block" key={c.id}>{c.gate} · {new Date(c.time).toLocaleString()}</small>)}</>},
          {label:'ACTIONS',render:v=><div className="flex gap-2"><Button variant="secondary" disabled={v.status==='Cancelled'} onClick={()=>setPass(v.id)}><QrCode size={15}/>QR pass</Button>{v.id!==account.leadVisitorId&&v.status!=='Cancelled'&&<Button variant="ghost" onClick={()=>{setCancel(v.id);setError('');}}>Cancel pass</Button>}</div>}
        ]}/></div><p className="text-xs text-slate-500 mt-4">Each team member has an individual QR pass. Present it at the gate; entry status updates after scanning.</p>
        {adding&&<Modal title="Add exhibitor team member" onClose={()=>setAdding(false)}><form onSubmit={e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{s.addExhibitorMember({...d,consent:d.consent==='on'});setAdding(false);}catch(err){setError(err.message);}}}><div className="space-y-4"><FormField label="Full name"><input name="name" required/></FormField><FormField label="Email"><input name="email" type="email" required/></FormField><FormField label="Mobile with country code"><input name="phone" type="tel" required placeholder="+91…"/></FormField><label className="flex gap-2 text-xs"><input name="consent" type="checkbox"/>Consent to event-related messages</label>{error&&<p role="alert" className="text-red-600">{error}</p>}<Button>Create team QR pass</Button></div></form></Modal>}
        {cancel&&<ConfirmDialog title="Cancel team pass?" message={error||'This QR pass will no longer allow entry.'} onClose={()=>setCancel(null)} onConfirm={()=>{try{s.cancelExhibitorMember(cancel);setCancel(null);}catch(err){setError(err.message);}}}/>}
        {pass&&<Pass id={pass} exhibitor onClose={()=>setPass(null)} refresh={refresh}/>}
      </>}
    </main></div>;
}
