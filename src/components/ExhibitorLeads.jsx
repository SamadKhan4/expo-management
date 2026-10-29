import React,{useEffect,useRef,useState} from 'react';
import {Camera,Square,Download,Flame,Snowflake,ScanLine} from 'lucide-react';
import * as s from '../services/data';
import * as camera from '../services/scannerService';
import {createScanGuard} from '../services/scanGuard';
import {downloadExhibitorLeads} from '../services/leadExport';
import {Button,Modal,FormField,StatCard} from './common';
import toast from 'react-hot-toast';
export default function ExhibitorLeads({refresh}){
  const [running,setRunning]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(null),[query,setQuery]=useState(''),[exporting,setExporting]=useState(false),[devices,setDevices]=useState([]),[device,setDevice]=useState('');
  const alive=useRef(true),popup=useRef(null),starting=useRef(false),guard=useRef(createScanGuard());
  const leads=s.getExhibitorLeads();
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;camera.stopQRScanner().catch(()=>{});};},[]);
  function inspect(raw,manual=false){
    if(!alive.current||popup.current)return;
    if(!manual&&!guard.current.accept(raw))return;
    try{
      let token=raw;
      if(manual){const v=s.lookupRegistration(raw.trim());if(!v)throw Error('Registration not found.');token=`EXPO:${v.token}`;}
      const visitor=s.verifyExhibitorLeadQR(token);
      const existing=s.getExhibitorLeads().find(l=>l.visitorId===visitor.id);
      const next={visitor,token,temperature:existing?.temperature};
      popup.current=next;setPending(next);setError('');
    }catch(err){setError(err.message);}
  }
  async function start(){
    if(starting.current||running)return;
    starting.current=true;setBusy(true);setError('');guard.current.reset();
    try{await camera.startQRScanner(device,text=>inspect(text),list=>{if(alive.current)setDevices(list);});if(alive.current)setRunning(true);}
    catch(err){if(alive.current)setError(camera.cameraErrorMessage(err));}
    finally{starting.current=false;if(alive.current)setBusy(false);}
  }
  async function stop(){setBusy(true);try{await camera.stopQRScanner();if(alive.current)setRunning(false);}catch(err){if(alive.current)setError(camera.cameraErrorMessage(err));}finally{if(alive.current)setBusy(false);}}
  function close(){popup.current=null;setPending(null);}
  function classify(temperature){
    try{s.saveExhibitorLead(popup.current.token,temperature);close();setQuery('');refresh();toast.success(`Saved to ${temperature} Leads`);}catch(err){setError(err.message);close();}
  }
  async function exportLeads(){setExporting(true);try{await downloadExhibitorLeads();}catch(err){toast.error(err.message);}finally{if(alive.current)setExporting(false);}}
  const hot=leads.filter(l=>l.temperature==='Hot').length,cold=leads.filter(l=>l.temperature==='Cold').length;
  return <section className="mb-6"><div className="grid sm:grid-cols-3 gap-5 mb-6"><StatCard title="Total scans" value={leads.length} icon={ScanLine} foot="Unique visitors classified"/><StatCard title="Hot Leads" value={hot} icon={Flame} foot="Visitors marked as hot leads"/><StatCard title="Cold Leads" value={cold} icon={Snowflake} foot="Visitors marked as cold leads"/></div><div className="flex flex-wrap justify-between items-center gap-3 mb-4"><div><h2>Visitor leads</h2><p className="text-sm text-slate-500 mt-1">Scan a visitor pass and choose Hot Lead or Cold Lead.</p></div><Button variant="secondary" disabled={exporting||!leads.length} onClick={exportLeads}><Download size={16}/>{exporting?'Preparing Excel...':'Download Excel'}</Button></div>
    <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 mb-6"><div className="card p-5"><h2 className="mb-4">Visitor QR scanner</h2><div className="scanner-frame"><div id="qr-reader"/>{!running&&<div className="scanner-placeholder"><ScanLine size={48}/><p className="mt-3 text-sm">{busy?'Allow camera access in your browser':'Scan visitor QR passes here'}</p></div>}</div><div className="flex gap-2 mt-4"><Button disabled={running||busy} onClick={start}><Camera size={16}/>{busy?'Please wait...':'Start scanner'}</Button><Button variant="secondary" disabled={!running||busy} onClick={stop}><Square size={16}/>Stop</Button></div>{devices.length>1&&<FormField label="Camera"><select value={device} disabled={running||busy} onChange={e=>setDevice(e.target.value)}><option value="">Rear camera (default)</option>{devices.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></FormField>}</div>
    <div className="card p-5 h-fit"><h2>Manual visitor lookup</h2><p className="text-sm text-slate-500 mt-2 mb-4">Enter a registration ID or QR token if a camera is unavailable.</p><form onSubmit={e=>{e.preventDefault();inspect(query,true);}}><FormField label="Registration ID / QR token"><input required value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. REG-1002"/></FormField><Button className="mt-4">Find visitor</Button></form><p className="text-xs text-slate-500 mt-5">Only valid passes for your event can be saved. Repeat scans update the existing lead. Camera access requires HTTPS or localhost.</p>{error&&<p role="alert" className="text-sm text-red-600 mt-4">{error}</p>}</div></div>
    <div className="grid md:grid-cols-2 gap-6">{['Hot','Cold'].map(temperature=>{const rows=leads.filter(l=>l.temperature===temperature),Icon=temperature==='Hot'?Flame:Snowflake;return <div className="card" key={temperature}><div className={`section-head ${temperature==='Hot'?'bg-orange-50 text-orange-700':'bg-blue-50 text-blue-700'}`}><h2 className="flex items-center gap-2"><Icon size={18}/>{temperature} Leads</h2><b>{rows.length}</b></div><div className="p-4 max-h-96 overflow-auto">{rows.length?rows.map(lead=><article key={lead.id} className="border-b last:border-0 py-4 first:pt-0"><div className="flex gap-3 justify-between"><div className="min-w-0"><b>{lead.visitor?.name||'Visitor'}</b><p className="text-xs text-slate-500 mt-1">{lead.visitor?.company}</p></div><Button variant="ghost" onClick={()=>inspect(`EXPO:${lead.visitor?.token}`,true)}>Change type</Button></div><p className="text-xs mt-2 break-all">{lead.visitor?.email}</p><p className="text-xs text-slate-500 mt-1">{lead.visitor?.phone}</p><p className="text-xs text-slate-400 mt-2">{new Date(lead.updatedAt).toLocaleString()}</p></article>):<p className="text-sm text-slate-400 py-6 text-center">No {temperature.toLowerCase()} leads yet.</p>}</div></div>;})}</div>
    {pending&&<Modal title="Classify visitor lead" onClose={close}><h2>{pending.visitor.name}</h2><p className="text-sm text-slate-500 mt-2">{pending.visitor.company}</p><p className="text-sm mt-3 break-all">{pending.visitor.email}</p><p className="text-sm mt-1">{pending.visitor.phone}</p>{pending.temperature&&<p className="text-xs text-slate-500 mt-3">Currently in {pending.temperature} Leads. Choose a type to update it.</p>}<div className="grid grid-cols-2 gap-3 mt-6"><Button className="!bg-orange-600 hover:!bg-orange-700" onClick={()=>classify('Hot')}><Flame size={18}/>Hot Lead</Button><Button className="!bg-blue-600 hover:!bg-blue-700" onClick={()=>classify('Cold')}><Snowflake size={18}/>Cold Lead</Button></div></Modal>}
  </section>;
}
