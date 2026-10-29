import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {Plus,Pencil} from 'lucide-react';
import * as s from '../services/data';
import {Button,PageHeader,DataTable,FilterBar,SearchInput} from '../components/common';
import {RecordForm} from './Management';
import toast from 'react-hot-toast';
export default function Organisers({refresh}){
  const [edit,setEdit]=useState(null),[query,setQuery]=useState('');
  const fields=[['name','Contact name'],['company','Organisation'],['email','Email address','email'],['phone','Mobile number','tel'],['expoId','Event','select',[{value:'',label:'Select event'},...s.getExpos().map(e=>({value:e.id,label:e.name}))]]];
  const rows=s.getOrganisers().filter(o=>`${o.name} ${o.company} ${o.email}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title="Organisers" description="Manage event organisers and their event assignments."><Link className="btn secondary" to="/organisers/dashboard">Open dashboard</Link><Button onClick={()=>setEdit({name:'',company:'',email:'',phone:'',expoId:s.getExpos()[0]?.id||''})}><Plus size={16}/>Add organiser</Button></PageHeader><div className="card"><FilterBar><SearchInput value={query} onChange={setQuery} placeholder="Search organisers"/></FilterBar><DataTable rows={rows} columns={[{label:'ORGANISER',key:'name'},{label:'ORGANISATION',key:'company'},{label:'EVENT',render:o=>s.getExpoById(o.expoId)?.name},{label:'EMAIL',key:'email'},{label:'PHONE',key:'phone'},{label:'ACTION',render:o=><div className="flex gap-2"><Link className="btn secondary" to={`/organisers/dashboard?organiser=${o.id}`}>Dashboard</Link><Button variant="ghost" aria-label="Edit organiser" onClick={()=>setEdit(o)}><Pencil size={16}/></Button></div>}]}/></div>{edit&&<RecordForm title={edit.id?'Edit organiser':'Add organiser'} fields={fields} initial={edit} onClose={()=>setEdit(null)} onSave={d=>{s.saveOrganiser(d);setEdit(null);refresh();toast.success('Organiser saved');}}/>}</>;
}
