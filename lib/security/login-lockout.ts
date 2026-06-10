const MAX_ATTEMPTS=5;
const LOCKOUT_MS=15*60*1000;
interface Attempts{count:number;since:number;lockedUntil?:number;}
const storeKey=(e:string)=>'login_attempts_'+e.toLowerCase();
export function recordFailedAttempt(email:string){if(typeof window==='undefined')return{locked:false,remaining:MAX_ATTEMPTS};const raw=localStorage.getItem(storeKey(email));const data:Attempts=raw?JSON.parse(raw):{count:0,since:Date.now()};if(Date.now()-data.since>LOCKOUT_MS){data.count=0;data.since=Date.now();delete data.lockedUntil;}data.count++;if(data.count>=MAX_ATTEMPTS)data.lockedUntil=Date.now()+LOCKOUT_MS;localStorage.setItem(storeKey(email),JSON.stringify(data));return{locked:data.count>=MAX_ATTEMPTS,remaining:Math.max(0,MAX_ATTEMPTS-data.count)};}
export function clearAttempts(email:string){if(typeof window!=='undefined')localStorage.removeItem(storeKey(email));}
export function checkLockout(email:string){if(typeof window==='undefined')return{locked:false,remainingMs:0};const raw=localStorage.getItem(storeKey(email));if(!raw)return{locked:false,remainingMs:0};const data:Attempts=JSON.parse(raw);if(data.lockedUntil&&Date.now()<data.lockedUntil)return{locked:true,remainingMs:data.lockedUntil-Date.now()};return{locked:false,remainingMs:0};}
