import {Html5Qrcode} from 'html5-qrcode';
let scanner=null;
export async function startQRScanner(camera,onScan){if(scanner)throw Error('Scanner already running.');scanner=new Html5Qrcode('qr-reader');try{await scanner.start(camera||{facingMode:'environment'},{fps:8,qrbox:{width:230,height:230}},onScan,()=>{});return await Html5Qrcode.getCameras();}catch(e){try{scanner.clear();}catch{}scanner=null;throw e;}}
export async function stopQRScanner(){const s=scanner;scanner=null;if(s){if(s.isScanning)await s.stop();s.clear();}}
export const resetScannerState=stopQRScanner;
export const handleQRScan=(text,verify,expoId)=>verify(text,expoId);
