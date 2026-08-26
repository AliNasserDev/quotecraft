import {createHmac,timingSafeEqual} from 'node:crypto';

export const config={api:{bodyParser:false}};

function readRawBody(request){
  return new Promise(function(resolve,reject){
    var chunks=[];request.on('data',function(chunk){chunks.push(Buffer.from(chunk))});request.on('end',function(){resolve(Buffer.concat(chunks).toString('utf8'))});request.on('error',reject);
  });
}

export function verifyPaddleSignature(rawBody,header,secret){
  if(!header||!secret)return false;
  var parts=String(header).split(';').reduce(function(acc,item){var index=item.indexOf('=');if(index>0)acc[item.slice(0,index)]=item.slice(index+1);return acc},{});
  if(!parts.ts||!parts.h1)return false;
  var age=Math.abs(Math.floor(Date.now()/1000)-Number(parts.ts));
  if(!Number.isFinite(age)||age>300)return false;
  var expected=createHmac('sha256',secret).update(parts.ts+':'+rawBody,'utf8').digest('hex');
  var expectedBuffer=Buffer.from(expected,'utf8');var actualBuffer=Buffer.from(parts.h1,'utf8');
  return expectedBuffer.length===actualBuffer.length&&timingSafeEqual(expectedBuffer,actualBuffer);
}

export function planFromPriceId(priceId){
  var map={};
  [process.env.PADDLE_PRICE_SOLO_MONTHLY,process.env.PADDLE_PRICE_SOLO_ANNUAL].filter(Boolean).forEach(function(id){map[id]='solo'});
  [process.env.PADDLE_PRICE_STUDIO_MONTHLY,process.env.PADDLE_PRICE_STUDIO_ANNUAL].filter(Boolean).forEach(function(id){map[id]='studio'});
  return map[priceId]||'free';
}

function extractPriceId(data){
  var items=data&&data.items;if(Array.isArray(items)&&items[0])return items[0].price&&items[0].price.id?items[0].price.id:(items[0].price_id||'');
  return '';
}

async function updateProfile(userId,patch){
  var url=process.env.NEXT_PUBLIC_SUPABASE_URL;var serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!serviceKey)throw new Error('Supabase service configuration is missing');
  var response=await fetch(url+'/rest/v1/profiles?id=eq.'+encodeURIComponent(userId),{method:'PATCH',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(patch)});
  if(!response.ok)throw new Error('Supabase profile update failed: '+await response.text());
}

export default async function handler(request,response){
  if(request.method!=='POST')return response.status(405).json({error:'Method not allowed'});
  try{
    var rawBody=await readRawBody(request);var signature=request.headers['paddle-signature'];var secret=process.env.PADDLE_WEBHOOK_SECRET;
    if(!verifyPaddleSignature(rawBody,signature,secret))return response.status(401).json({error:'Invalid webhook signature'});
    var event=JSON.parse(rawBody);var data=event.data||{};var custom=data.custom_data||{};var userId=custom.supabase_user_id;
    var handledEvents=['subscription.created','subscription.activated','subscription.updated','subscription.resumed','subscription.canceled','subscription.paused'];
    if(!handledEvents.includes(event.event_type))return response.status(200).json({received:true,ignored:'Event does not change entitlements'});
    if(!userId)return response.status(200).json({received:true,ignored:'No QuoteCraft user ID'});
    var activeStatuses=['active','trialing'];var eventType=event.event_type||'';var status=data.status||'';var plan=planFromPriceId(extractPriceId(data));
    if(eventType==='subscription.canceled'||eventType==='subscription.paused'||eventType==='subscription.expired'||!activeStatuses.includes(status))plan='free';
    var patch={plan:plan,subscription_status:status||eventType,paddle_customer_id:data.customer_id||null,paddle_subscription_id:data.id&&String(data.id).startsWith('sub_')?data.id:null,subscription_ends_at:data.current_billing_period&&data.current_billing_period.ends_at?data.current_billing_period.ends_at:null,updated_at:new Date().toISOString()};
    await updateProfile(userId,patch);
    return response.status(200).json({received:true});
  }catch(error){console.error('Paddle webhook failed',error);return response.status(500).json({error:'Webhook processing failed'});}
}
