// A single lifecycle owns permission requests, preview, and cleanup.
export function cameraErrorMessage(error) {
  const detail = `${error?.name || ''} ${error?.message || error || ''}`;
  if (/NotAllowed|PermissionDenied|permission denied/i.test(detail)) return 'Camera permission blocked. Click the camera / site settings icon beside the address bar, set Camera to Allow, then retry. Also check your device camera privacy settings.';
  if (/NotFound|DevicesNotFound|no camera/i.test(detail)) return 'No camera found. Connect a webcam or use a device with a camera, then retry.';
  if (/NotReadable|TrackStart|Could not start|in use/i.test(detail)) return 'Camera could not open. Close other apps or tabs using it, then retry.';
  if (/Overconstrained|ConstraintNotSatisfied/i.test(detail)) return 'The selected camera is unavailable. Select the default camera and retry.';
  if (/SecurityError|secure context|HTTPS/i.test(detail)) return 'Camera access requires HTTPS or localhost. Open this app on localhost on this computer, or use an HTTPS address on your phone.';
  return `Unable to start the camera. ${error?.message || String(error)}. Retry or use manual registration lookup.`;
}
export function createScannerController(load = () => import('html5-qrcode'), environment = () => ({secure:window.isSecureContext,media:navigator.mediaDevices})) {
  let session = null;
  async function dispose(current) {
    if (!current.instance) return;
    const instance = current.instance;
    current.instance = null;
    try { if (instance.isScanning) await instance.stop(); }
    finally { instance.clear(); }
  }
  function start(cameraId,onScan,onDevices=()=>{}) {
    if (session) return Promise.reject(new Error('Scanner is already starting or running.'));
    const env = environment();
    if (!env.secure) return Promise.reject(new Error('Camera requires a secure context: HTTPS or localhost.'));
    if (!env.media?.getUserMedia) return Promise.reject(new Error('Camera API is unavailable in this browser. Open the app in Chrome, Edge or Safari.'));
    const current = {cancelled:false,instance:null,task:null};
    session = current;
    current.task = (async()=>{
      try {
        const {Html5Qrcode} = await load();
        if(current.cancelled) return [];
        // Enumerating first requests permission and releases the temporary stream
        // before the scanner takes exclusive ownership of the chosen camera.
        const devices = await Html5Qrcode.getCameras();
        if(current.cancelled) return [];
        if(!devices.length) throw new Error('No camera found');
        onDevices(devices);
        const selected = devices.find(d=>d.id===cameraId) || devices.find(d=>/back|rear|environment/i.test(d.label)) || devices[0];
        current.instance = new Html5Qrcode('qr-reader');
        await current.instance.start(selected.id,{
          fps:8,
          qrbox:(width,height)=>{const size=Math.min(230,Math.floor(Math.min(width,height)*.75));return {width:size,height:size};}
        },text=>{if(!current.cancelled)onScan(text);},()=>{});
        if(current.cancelled){await dispose(current);return [];}
        return devices;
      } catch(error) {
        try {await dispose(current);} catch {}
        throw error;
      } finally {
        if((current.cancelled || !current.instance) && session===current) session=null;
      }
    })();
    return current.task;
  }
  async function stop() {
    const current=session;
    if(!current) return;
    current.cancelled=true;
    try {await current.task;} catch {}
    try {await dispose(current);} finally {if(session===current)session=null;}
  }
  return {start,stop};
}
const controller=createScannerController();
export const startQRScanner=controller.start;
export const stopQRScanner=controller.stop;
export const resetScannerState=stopQRScanner;
export const handleQRScan=(text,verify,expoId)=>verify(text,expoId);
