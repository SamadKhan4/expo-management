import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Users,UserCheck,Clock,Building2,Download,ScanLine} from 'lucide-react';
import * as s from '../services/data';
import {PageHeader,StatCard,DataTable,StatusBadge,Button} from '../components/common';
import {StallCheckInChart} from './Analytics';
export default function OrganiserDashboard(){
  const [params,setParams]=useSearchParams();
  const organisers=s.getOrganisers(),organiser=organisers.find(o=>o.id===params.get('organiser'));
  const [selectedEvent,setEvent]=useState(s.getExpos()[0]?.id||'');
  const expoId=organiser?.expoId||selectedEvent,expo=s.getExpoById(expoId);
  const [,setDatasetVersion]=useState(0);
  useEffect(()=>{if(s.ensureOrganiserPresentationData(expoId))setDatasetVersion(v=>v+1);},[expoId]);
  if(!expo)return <><PageHeader title="Organiser dashboard" description="Create an event to view its dashboard."/><Link className="btn" to="/expos">Manage events</Link></>;
  const {visitors,active,entries,exhibitors,stallRows,arrived,rate}=s.getOrganiserDashboardData(expoId);
  const checkedInIds=new Set(entries.map(c=>c.visitorId));
  const recent=[...visitors].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);
  return <><PageHeader title="Organiser dashboard" description={organiser?`${organiser.name} - ${organiser.company}`:'Event operations at a glance'}><Link className="btn secondary" to="/organisers">Organisers</Link><Button variant="secondary" onClick={()=>s.exportVisitorsCSV({expoId})}><Download size={16}/>Export visitors</Button><Link className="btn" to="/scanner"><ScanLine size={16}/>Open scanner</Link></PageHeader>
    <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end"><label className="field flex-1 min-w-48">Organiser<select value={organiser?.id||''} onChange={e=>setParams(e.target.value?{organiser:e.target.value}:{})}><option value="">Event overview</option>{organisers.map(o=><option key={o.id} value={o.id}>{o.name} - {o.company}</option>)}</select></label><label className="field flex-1 min-w-48">Assigned event<select value={expoId} disabled={!!organiser} onChange={e=>setEvent(e.target.value)}>{s.getExpos().filter(e=>!organiser||e.id===organiser.expoId).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>
    <div className="banner"><div><span className="eyebrow text-indigo-200">EVENT OPERATIONS</span><h2>{expo.name}</h2><p>{expo.venue} - {new Date(expo.start).toLocaleDateString()} to {new Date(expo.end).toLocaleDateString()}</p></div><StatusBadge>{expo.status}</StatusBadge></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"><StatCard title="Registrations" value={active.length} icon={Users} foot={`${visitors.length-active.length} cancelled registrations`}/><StatCard title="Checked in" value={arrived} icon={UserCheck} foot={`${rate}% attendance`}/><StatCard title="Awaiting arrival" value={active.length-arrived} icon={Clock} foot="Active passes pending entry"/><StatCard title="Exhibitors" value={exhibitors.length} icon={Building2} foot={`${exhibitors.filter(e=>e.booth).length} stalls assigned`}/></div>
    <div className="grid lg:grid-cols-2 gap-6"><section className="card p-6"><h2>Attendance progress</h2><div className="flex justify-between text-sm mt-5 mb-3"><span className="text-slate-500">Registered visitors checked in</span><b>{rate}%</b></div><div role="progressbar" aria-label="Attendance" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} className="h-3 rounded-full bg-indigo-50 overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${rate}%`}}/></div><p className="text-xs text-slate-500 mt-4">{active.length} registrations / {expo.capacity.toLocaleString()} event capacity</p></section><section className="card p-6"><h2>Gate activity</h2>{[...new Set(['Gate A','Gate B','Gate C',...entries.map(c=>c.gate)])].map(g=><div key={g} className="flex justify-between border-b last:border-0 py-3 text-sm"><span className="text-slate-500">{g}</span><b>{entries.filter(c=>c.gate===g).length} check-ins</b></div>)}</section></div>
    <StallCheckInChart key={expoId} expoId={expoId} reportRows={stallRows}/>
    <div className="grid lg:grid-cols-2 gap-6 mt-6"><section className="card"><div className="section-head"><h2>Recent registrations</h2></div><DataTable rows={recent} columns={[{label:'NAME',key:'name'},{label:'TYPE',key:'type'},{label:'STATUS',render:v=><StatusBadge>{v.status==='Cancelled'?'Cancelled':checkedInIds.has(v.id)?'Success':'Pending'}</StatusBadge>}]}/></section><section className="card"><div className="section-head"><h2>Recent gate check-ins</h2></div><DataTable rows={[...entries].sort((a,b)=>b.time.localeCompare(a.time)).slice(0,6)} columns={[{label:'VISITOR',render:c=>s.getVisitorById(c.visitorId)?.name||'Visitor'},{label:'GATE',key:'gate'},{label:'TIME',render:c=>new Date(c.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}]}/></section></div>
    <section className="card mt-6"><div className="section-head"><h2>Exhibitors &amp; stalls ({exhibitors.length})</h2></div><DataTable rows={exhibitors} columns={[{label:'COMPANY',key:'company'},{label:'CONTACT',key:'name'},{label:'STALL',render:e=>e.booth||'Awaiting assignment'},{label:'STALL CHECK-INS',render:e=>stallRows.find(r=>r.id===e.id)?.checkins||0}]}/></section>
  </>;
}
