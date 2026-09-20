import {createHmac,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const COOKIE='__Host-caramelo-access';
export async function hashPassword(password) {
  const salt=randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;
}
export async function checkPassword(password,encoded) {
  if(typeof password!=='string' || password.length>128 || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded || ''))return false;
  const [salt,hash]=encoded.split(':');
  return timingSafeEqual(await scrypt(password,salt,64),Buffer.from(hash,'hex'));
}
const sign=(text,secret)=>createHmac('sha256',secret).update(text).digest('hex');
export function issueSession(secret,now=Date.now()) {
  const value=`${randomBytes(24).toString('hex')}.${now+8*3600000}`;
  return `${value}.${sign(value,secret)}`;
}
export function readSession(cookie,secret,now=Date.now()) {
  const token=cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
  if(!token || !/^[a-f0-9]{48}\.\d{13}\.[a-f0-9]{64}$/.test(token))return null;
  const [id,expires,signature]=token.split('.');
  if(Number(expires)<=now || Number(expires)>now+8*3600000)return null;
  return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(sign(`${id}.${expires}`,secret),'hex'))?id:null;
}
