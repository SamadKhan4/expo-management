import {getCurrentExhibitor,getExhibitorLeads,getExpoById} from './data.js';
export async function buildLeadsWorkbook(leads,company,event){
  const {default:ExcelJS}=await import('exceljs');
  const workbook=new ExcelJS.Workbook();
  workbook.creator='cis events';
  for(const temperature of ['Hot','Cold']){
    const sheet=workbook.addWorksheet(`${temperature} Leads`);
    sheet.columns=[{header:'Name',key:'name',width:25},{header:'Email',key:'email',width:32},{header:'Phone',key:'phone',width:22},{header:'Company',key:'company',width:28},{header:'Job title',key:'jobTitle',width:24},{header:'Registration ID',key:'registrationId',width:24},{header:'Lead type',key:'temperature',width:16},{header:'Exhibitor',key:'exhibitor',width:28},{header:'Event',key:'event',width:32},{header:'First scanned (UTC)',key:'createdAt',width:28},{header:'Updated (UTC)',key:'updatedAt',width:28}];
    for(const lead of leads.filter(l=>l.temperature===temperature)){
      const v=lead.visitor||{};
      sheet.addRow({name:String(v.name||''),email:String(v.email||''),phone:String(v.phone||''),company:String(v.company||''),jobTitle:String(v.jobTitle||''),registrationId:String(v.registrationId||''),temperature:`${temperature} Lead`,exhibitor:company,event,createdAt:lead.createdAt,updatedAt:lead.updatedAt});
    }
    sheet.views=[{state:'frozen',ySplit:1}];
    sheet.autoFilter={from:'A1',to:'K1'};
    sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
    sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:temperature==='Hot'?'FFEA580C':'FF2563EB'}};
    sheet.getColumn('phone').numFmt='@';
  }
  return workbook.xlsx.writeBuffer();
}
export async function downloadExhibitorLeads(){
  const account=getCurrentExhibitor();
  if(!account)throw Error('Please log in to your exhibitor account.');
  const buffer=await buildLeadsWorkbook(getExhibitorLeads(),account.company,getExpoById(account.expoId)?.name||'');
  const url=URL.createObjectURL(new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const link=document.createElement('a');link.href=url;link.download=`${account.company.replace(/[^a-z0-9-]/gi,'-')}-leads.xlsx`;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
