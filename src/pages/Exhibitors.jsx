import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Building2, LogOut} from 'lucide-react';
import * as s from '../services/data';
import {Button, PageHeader, FormField, DataTable, Modal} from '../components/common';
import ExhibitorLeads from '../components/ExhibitorLeads';
import logo from '../logo1.png';

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
  const refresh=()=>setVersion(v=>v+1);
  useEffect(()=>{const update=()=>{setAccount(s.getCurrentExhibitor());refresh();};window.addEventListener('expo-change',update);return()=>window.removeEventListener('expo-change',update);},[]);
  useEffect(()=>{if(account&&s.ensureExhibitorPresentationLeads())refresh();},[account?.id]);
  async function authenticate(event){
    event.preventDefault();setError('');setBusy(true);
    const d=Object.fromEntries(new FormData(event.currentTarget));
    try{const result=mode==='login'?await s.loginExhibitor(d.email,d.password):await s.createExhibitorAccount({...d,consent:d.consent==='on'});setAccount(result);}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  const expo=account?s.getExpoById(account.expoId):null;
  return <div className="min-h-screen"><header className="topbar print:hidden"><Link className="flex items-center gap-3 font-bold text-xl text-indigo-600" to="/exhibitor"><img src={logo} alt="cis event & expertience logo" className="company-logo company-logo-compact"/><span className="text-sm font-normal text-slate-500">Exhibitor portal</span></Link>{account&&<Button variant="secondary" onClick={()=>{s.logoutExhibitor();setAccount(null);setError('');}}><LogOut size={16}/>Log out</Button>}</header>
    <main className="!max-w-6xl">
      {!account?<div className="max-w-xl mx-auto my-8"><div className="icon-box mb-3"><Building2 size={25}/></div><h1>{mode==='login'?'Welcome, exhibitors':'Register your company'}</h1><p className="text-slate-500 mb-6">Scan visitor QR passes and manage your Hot and Cold leads.</p>
        <form className="card p-6" onSubmit={authenticate} key={mode}><div className="space-y-4">
          {mode==='signup'&&<><FormField label="Company name"><input name="company" required autoComplete="organization"/></FormField><FormField label="Primary contact name"><input name="name" required autoComplete="name"/></FormField><FormField label="Mobile with country code"><input name="phone" type="tel" required placeholder="+91…" autoComplete="tel"/></FormField><FormField label="Participating expo"><select name="expoId" required defaultValue=""><option value="" disabled>Select expo</option>{s.getExpos().filter(e=>e.status==='Published').map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></FormField></>}
          <FormField label="Email address"><input name="email" type="email" required autoComplete="username"/></FormField><FormField label="Password"><input name="password" type="password" required minLength={mode==='signup'?8:undefined} autoComplete={mode==='login'?'current-password':'new-password'}/></FormField>
          {mode==='signup'&&<label className="flex gap-2 items-center text-xs text-slate-500"><input name="consent" type="checkbox"/>Allow event-related messages</label>}
          {error&&<p role="alert" className="text-red-600 text-sm">{error}</p>}<Button className="w-full" disabled={busy}>{busy?'Please wait…':mode==='login'?'Log in':'Create exhibitor account'}</Button>
        </div></form><Button className="mt-3" variant="ghost" disabled={busy} onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login'?'New exhibitor? Register your company':'Already registered? Log in'}</Button>
        <p className="text-xs text-slate-400 mt-5">Exhibitor accounts and passes are saved in this browser. Use this same browser to try gate scanning. Login is required again after a page reload.</p>
      </div>:<><PageHeader title={account.company} description={`${expo?.name||'Expo'}${account.booth?` - Stall ${account.booth}`:''}`}/>
        <ExhibitorLeads key={account.id} refresh={refresh}/>
      </>}
    </main></div>;
}
