// Ignore rapid duplicate camera callbacks; allow another QR immediately.
export function createScanGuard(cooldown=2500,clock=Date.now){
  let previous=null;
  return {accept(text){const time=clock();if(previous?.text===text&&time-previous.time<cooldown)return false;previous={text,time};return true;},reset(){previous=null;}};
}
