import {createHmac,timingSafeEqual} from 'node:crypto';

export const config={api:{bodyParser:false}};

function readRawBody(request){
  return new Promise(function(resolve,reject){var chunks=[];request.on('data',function(chunk){chunks.push(Buffer.from(chunk))});request.on('end',function(){resolve(Buffer.concat(chunks).toString('utf8'))});request.on('error',reject)});
}

function safeEqual(actual,expected){
  var actualBuffer=Buffer.from(String(actual||''),'utf8');var expectedBuffer=Buffer.from(String(expected||''),'utf8');
  return actualBuffer.length===expectedBuffer.length&&timingSafeEqual(actualBuffer,expectedBuffer);
}

export function verifyRevenueCatAuthorization(actual,expected){return Boolean(expected)&&safeEqual(actual,expected)}

export function verifyRevenueCatSignature(rawBody,header,secret){
  if(!header||!secret)return false;
  var parts=String(header).split(',').reduce(function(result,item){var pair=item.trim().split('=');if(pair.length===2)result[pair[0]]=pair[1];return result},{});
  if(!parts.t||!parts.v1)return false;
  var timestamp=Number(parts.t);var age=Math.abs(Math.floor(Date.now()/1000)-timestamp);if(!Number.isFinite(timestamp)||age>300)return false;
  var expected=createHmac('sha256',secret).update(parts.t+'.'+rawBody,'utf8').digest('hex');return safeEqual(parts.v1,expected);
}

export function revenueCatPlan(entitlementIds,productId){
  var values=(Array.isArray(entitlementIds)?entitlementIds:[]).map(function(value){return String(value).toLowerCase()});var product=String(productId||'').toLowerCase();
  var studio=String(process.env.REVENUECAT_ENTITLEMENT_STUDIO||'quotecraft_studio').toLowerCase();var solo=String(process.env.REVENUECAT_ENTITLEMENT_SOLO||'quotecraft_solo').toLowerCase();
  if(values.includes(studio)||values.includes('studio')||product.includes('studio'))return'studio';
  if(values.includes(solo)||values.includes('solo')||product.includes('solo'))return'solo';
  return'free';
}

export function revenueCatEntitlementPatch(event){
  var type=String(event&&event.type||'').toUpperCase();var plan=revenueCatPlan(event&&event.entitlement_ids,event&&event.product_id);var active=['INITIAL_PURCHASE','RENEWAL','UNCANCELLATION','SUBSCRIPTION_EXTENDED','REFUND_REVERSED','TEMPORARY_ENTITLEMENT_GRANT','PURCHASE_REDEEMED'];
  if(type==='EXPIRATION')return{plan:'free',subscription_status:'inactive'};
  if(type==='CANCELLATION'||type==='BILLING_ISSUE'||type==='SUBSCRIPTION_PAUSED')return null;
  if(!active.includes(type)||plan==='free')return null;
  return{plan:plan,subscription_status:event.period_type==='TRIAL'?'trialing':'active'};
}

function isUuid(value){return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value||'')}

async function updateProfile(userId,patch){
  var url=process.env.NEXT_PUBLIC_SUPABASE_URL;var serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!serviceKey)throw new Error('Supabase service configuration is missing');
  var result=await fetch(url+'/rest/v1/profiles?id=eq.'+encodeURIComponent(userId),{method:'PATCH',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(patch)});if(!result.ok)throw new Error('Supabase profile update failed: '+await result.text());
}

export default async function handler(request,response){
  if(request.method!=='POST')return response.status(405).json({error:'Method not allowed'});
  try{
    var rawBody=await readRawBody(request);var authorization=request.headers.authorization;var signature=request.headers['x-revenuecat-webhook-signature'];
    if(!verifyRevenueCatAuthorization(authorization,process.env.REVENUECAT_WEBHOOK_AUTHORIZATION))return response.status(401).json({error:'Invalid authorization'});
    if(!verifyRevenueCatSignature(rawBody,signature,process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET))return response.status(401).json({error:'Invalid webhook signature'});
    var payload=JSON.parse(rawBody);var event=payload.event||{};var userId=event.app_user_id;var entitlementPatch=revenueCatEntitlementPatch(event);
    if(!isUuid(userId))return response.status(200).json({received:true,ignored:'App User ID is not a QuoteCraft user'});
    if(!entitlementPatch)return response.status(200).json({received:true,ignored:'Event does not change QuoteCraft entitlements'});
    var patch=Object.assign({},entitlementPatch,{subscription_ends_at:event.expiration_at_ms?new Date(event.expiration_at_ms).toISOString():null,revenuecat_store:event.store||null,revenuecat_product_id:event.product_id||null,revenuecat_environment:event.environment||null,revenuecat_last_event:event.type||null,updated_at:new Date().toISOString()});
    await updateProfile(userId,patch);return response.status(200).json({received:true});
  }catch(error){console.error('RevenueCat webhook failed',error);return response.status(500).json({error:'Webhook processing failed'})}
}
