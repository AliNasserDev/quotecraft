import {Capacitor} from '@capacitor/core';

(function(){
  'use strict';

  var byId=function(id){return document.getElementById(id)};
  var NativePurchases=null,WebPurchases=null,ErrorCode=null,LogLevel=null;
  var fields=['business','currency','number','email','client','project','scope','discount','tax','deposit','validDays','paymentLink','note','status','accentColor'];
  var plans={
    free:{name:'Free',maxCloudQuotes:3,customColor:false,paymentLinks:false,removeBranding:false,brandProfiles:0},
    solo:{name:'Solo',maxCloudQuotes:Infinity,customColor:true,paymentLinks:true,removeBranding:true,brandProfiles:0},
    studio:{name:'Studio',maxCloudQuotes:Infinity,customColor:true,paymentLinks:true,removeBranding:true,brandProfiles:5}
  };
  var state={items:[],currentId:null,user:null,profile:null,profilePlan:'free',plan:'free',cloudQuotes:[],brands:[],client:null,config:null,paddleReady:false,billing:'monthly',revenueCat:null,revenueCatReady:false,revenueCatMode:'off',revenueCatUserId:null,revenueCatPlan:'free',revenueCatOfferings:null,revenueCatCustomerInfo:null};
  var nativePlatform=Capacitor.isNativePlatform();
  var starter=[
    {id:makeId(),name:'Visual direction & moodboard',qty:1,rate:650},
    {id:makeId(),name:'Logo refinement',qty:1,rate:1150},
    {id:makeId(),name:'Brand guidelines & asset handoff',qty:1,rate:600}
  ];

  function makeId(){return globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(16).slice(2)}
  function isUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value||'')}
  function safeNumber(value,min,max){var n=Number(value);min=min===undefined?0:min;max=max===undefined?Infinity:max;return Math.min(max,Math.max(min,Number.isFinite(n)?n:0))}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]})}
  function entitlement(){return plans[state.plan]||plans.free}
  function planRank(plan){return{free:0,solo:1,studio:2}[plan]||0}
  function planFromRevenueCat(customerInfo){var active=customerInfo&&customerInfo.entitlements&&customerInfo.entitlements.active?customerInfo.entitlements.active:{};var keys=Object.keys(active).map(function(key){return key.toLowerCase()});var studio=(state.config&&state.config.revenueCatEntitlements&&state.config.revenueCatEntitlements.studio||'quotecraft_studio').toLowerCase();var solo=(state.config&&state.config.revenueCatEntitlements&&state.config.revenueCatEntitlements.solo||'quotecraft_solo').toLowerCase();if(keys.includes(studio)||keys.includes('studio'))return'studio';if(keys.includes(solo)||keys.includes('solo'))return'solo';return'free'}
  function reconcilePlan(){state.plan=planRank(state.revenueCatPlan)>planRank(state.profilePlan)?state.revenueCatPlan:state.profilePlan;renderAccount();applyEntitlements()}
  function money(value,currencyOverride){var amount=Number(value||0);var currency=currencyOverride||byId('currency').value||'USD';var decimals=Number.isInteger(amount)?0:2;try{return new Intl.NumberFormat('en',{style:'currency',currency:currency,minimumFractionDigits:decimals,maximumFractionDigits:2}).format(amount)}catch(error){return currency+' '+amount.toFixed(decimals)}}

  function renderItems(){
    byId('items').querySelectorAll('.service-row').forEach(function(row){row.remove()});
    state.items.forEach(function(item){
      var row=document.createElement('div');row.className='item-row service-row';row.dataset.id=item.id;
      row.innerHTML='<input class="item-name" aria-label="Service description" value="'+escapeHtml(item.name)+'" placeholder="Service description"><input class="item-qty" aria-label="Quantity" type="number" min="0" step="1" value="'+item.qty+'"><input class="item-rate" aria-label="Rate" type="number" min="0" step=".01" value="'+item.rate+'"><span class="item-total">'+money(item.qty*item.rate)+'</span><button class="button icon danger remove-item" type="button" aria-label="Remove service">×</button>';
      byId('items').appendChild(row);
    });
  }

  function syncItems(){state.items=Array.from(document.querySelectorAll('.service-row')).map(function(row){return{id:row.dataset.id,name:row.querySelector('.item-name').value,qty:safeNumber(row.querySelector('.item-qty').value),rate:safeNumber(row.querySelector('.item-rate').value)}})}
  function totals(){var subtotal=state.items.reduce(function(sum,item){return sum+item.qty*item.rate},0);var discountRate=safeNumber(byId('discount').value,0,100);var taxRate=safeNumber(byId('tax').value,0,100);var discount=subtotal*discountRate/100;var tax=(subtotal-discount)*taxRate/100;var total=subtotal-discount+tax;var depositRate=safeNumber(byId('deposit').value,0,100);return{subtotal:subtotal,discountRate:discountRate,discount:discount,taxRate:taxRate,tax:tax,total:total,depositRate:depositRate,deposit:total*depositRate/100}}

  function update(){
    syncItems();
    var access=entitlement();
    var business=byId('business').value.trim()||'Your business';
    var accent=access.customColor&&/^#[0-9a-f]{6}$/i.test(byId('accentColor').value)?byId('accentColor').value:'#174c36';
    document.documentElement.style.setProperty('--brand-accent',accent);byId('accentValue').textContent=accent;
    byId('outLogo').textContent=business.charAt(0).toUpperCase();byId('outBusiness').textContent=business;byId('outEmail').textContent=byId('email').value.trim()||'your@email.com';byId('outNumber').textContent=byId('number').value.trim()||'—';byId('outDate').textContent=new Intl.DateTimeFormat('en',{day:'numeric',month:'short',year:'numeric'}).format(new Date());byId('outProject').textContent=byId('project').value.trim()||'Untitled project';byId('outClient').textContent=byId('client').value.trim()||'Your client';byId('outScope').textContent=byId('scope').value.trim()||'Project scope to be confirmed.';byId('outNote').textContent=byId('note').value.trim();byId('outValidDays').textContent=Math.max(1,Number(byId('validDays').value)||14);byId('outStatus').textContent=byId('status').value;
    byId('outItems').innerHTML=state.items.length?state.items.map(function(item){return '<tr><td>'+escapeHtml(item.name||'Service')+'</td><td>'+item.qty+'</td><td>'+money(item.rate)+'</td><td>'+money(item.qty*item.rate)+'</td></tr>'}).join(''):'<tr><td>No services added</td><td>—</td><td>—</td><td>—</td></tr>';
    var sum=totals();byId('outSubtotal').textContent=money(sum.subtotal);byId('discountLabel').textContent='Discount ('+sum.discountRate+'%)';byId('outDiscount').textContent='−'+money(sum.discount);byId('discountLine').hidden=sum.discountRate===0;byId('taxLabel').textContent='Tax ('+sum.taxRate+'%)';byId('outTax').textContent=money(sum.tax);byId('taxLine').hidden=sum.taxRate===0;byId('outTotal').textContent=money(sum.total);byId('outDepositPercent').textContent=sum.depositRate+'%';byId('outDeposit').textContent=money(sum.deposit);
    var link=byId('paymentLink').value.trim();var valid=access.paymentLinks&&/^https?:\/\//i.test(link);byId('outPayment').hidden=!valid;byId('outPayment').href=valid?link:'#';byId('poweredBy').hidden=access.removeBranding;
    document.querySelectorAll('.item-total').forEach(function(el,i){if(state.items[i])el.textContent=money(state.items[i].qty*state.items[i].rate)});
  }

  function serialize(){
    syncItems();var data={};fields.forEach(function(id){data[id]=byId(id).value});
    var id=state.currentId;if(!isUuid(id))id=makeId();
    data.id=id;data.items=state.items;data.updatedAt=new Date().toISOString();data.total=totals().total;return data;
  }
  function getLocalQuotes(){try{return JSON.parse(localStorage.getItem('quotecraft-quotes')||'[]')}catch(error){return[]}}
  function setLocalQuotes(quotes){localStorage.setItem('quotecraft-quotes',JSON.stringify(quotes));renderSaved()}
  function activeQuotes(){return state.user?state.cloudQuotes:getLocalQuotes()}

  async function saveQuote(event){
    if(event)event.preventDefault();var quote=serialize();state.currentId=quote.id;
    if(!state.user||!state.client){
      var local=getLocalQuotes();var localIndex=local.findIndex(function(item){return item.id===quote.id});if(localIndex>=0)local[localIndex]=quote;else local.unshift(quote);setLocalQuotes(local);showToast(localIndex>=0?'Quote updated on this device':'Quote saved on this device');return;
    }
    var existing=state.cloudQuotes.some(function(item){return item.id===quote.id});
    if(!existing&&Number.isFinite(entitlement().maxCloudQuotes)&&state.cloudQuotes.length>=entitlement().maxCloudQuotes){openPricing();showToast('Free includes 3 cloud quotes — choose a plan to keep growing');return}
    setSaveBusy(true);
    var payload={id:quote.id,user_id:state.user.id,payload:quote,total:quote.total,currency:quote.currency,updated_at:quote.updatedAt};
    var result=await state.client.from('quotes').upsert(payload,{onConflict:'id'});
    setSaveBusy(false);
    if(result.error){if(/row-level|policy/i.test(result.error.message||'')){openPricing();showToast('Your plan limit stopped this save');}else showToast('Cloud save failed: '+result.error.message);return}
    await loadCloudQuotes();showToast(existing?'Quote updated in your cloud':'Quote saved to your cloud');
  }

  function setSaveBusy(busy){byId('saveButton').disabled=busy;byId('saveButton').textContent=busy?'Saving…':'Save quote'}
  function loadQuoteFromList(id){var quote=activeQuotes().find(function(item){return item.id===id});if(!quote)return;fields.forEach(function(field){if(quote[field]!==undefined)byId(field).value=quote[field]});state.items=Array.isArray(quote.items)?quote.items:[];state.currentId=quote.id;renderItems();update();closeDrawer();showToast('Saved quote loaded');window.scrollTo({top:0,behavior:'smooth'})}
  async function deleteQuote(id){
    if(state.user&&state.client){var result=await state.client.from('quotes').delete().eq('id',id);if(result.error){showToast('Could not delete quote');return}await loadCloudQuotes();}
    else setLocalQuotes(getLocalQuotes().filter(function(item){return item.id!==id}));
    if(state.currentId===id)state.currentId=null;showToast('Saved quote removed');
  }

  function renderSaved(){
    var saved=activeQuotes();byId('savedCount').textContent=saved.length;
    byId('storageLabel').textContent=state.user?'Private cloud library':'On this device';
    var max=entitlement().maxCloudQuotes;
    byId('quoteLimit').textContent=state.user?(Number.isFinite(max)?saved.length+' of '+max+' cloud quotes used · Upgrade for unlimited':'Unlimited cloud quotes · '+entitlement().name+' plan'):'Local saves remain in this browser. Sign in for private cloud sync.';
    byId('accountUsage').textContent=state.user?(Number.isFinite(max)?saved.length+' of '+max+' quotes':saved.length+' quotes · unlimited'):'—';
    if(!saved.length){byId('savedList').innerHTML='<div class="saved-empty"><strong>No saved quotes yet</strong><br><span>Save this quote and it will appear here.</span></div>';return}
    byId('savedList').innerHTML=saved.map(function(q){return '<article class="saved-card"><div class="saved-top"><div><h3>'+escapeHtml(q.project||'Untitled project')+'</h3><p>'+escapeHtml(q.client||'No client')+' · '+escapeHtml(q.number||'No number')+'</p></div><div class="saved-amount">'+money(q.total,q.currency)+'</div></div><p style="margin-top:7px">Updated '+new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(q.updatedAt))+'</p><div class="saved-actions"><button class="button small primary load-quote" data-id="'+q.id+'" type="button">Open</button><button class="button small ghost delete-quote danger" data-id="'+q.id+'" type="button">Delete</button></div></article>'}).join('');
  }

  function quoteText(){var sum=totals();var lines=state.items.map(function(item){return '• '+(item.name||'Service')+' — '+item.qty+' × '+money(item.rate)+' = '+money(item.qty*item.rate)}).join('\n');var payment=entitlement().paymentLinks&&/^https?:\/\//i.test(byId('paymentLink').value.trim())?'\nPay deposit: '+byId('paymentLink').value.trim():'';return ['PROJECT QUOTE '+byId('number').value.trim(),byId('project').value.trim()||'Untitled project','Prepared for '+(byId('client').value.trim()||'Your client'),' ',byId('scope').value.trim(),' ',lines,' ','Total: '+money(sum.total),sum.depositRate+'% deposit to begin: '+money(sum.deposit),'Valid for '+(byId('validDays').value||14)+' days.'+payment,' ',byId('note').value.trim(),' ',byId('business').value.trim()+' · '+byId('email').value.trim()].join('\n')}
  function copyQuote(){update();var text=quoteText();if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){showToast('Quote copied — ready to send')}).catch(function(){fallbackCopy(text)})}else fallbackCopy(text)}
  function fallbackCopy(text){var area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();showToast('Quote copied — ready to send')}
  function newQuote(){state.currentId=null;byId('number').value='QC-'+String(Math.floor(1000+Math.random()*9000));byId('client').value='';byId('project').value='';byId('scope').value='';byId('paymentLink').value='';byId('status').value='Draft';state.items=[{id:makeId(),name:'',qty:1,rate:0}];renderItems();update();showToast('Fresh quote ready')}

  async function loadCloudQuotes(){if(!state.client||!state.user)return;var result=await state.client.from('quotes').select('id,payload,total,currency,updated_at').order('updated_at',{ascending:false});if(result.error){showToast('Cloud library unavailable');return}state.cloudQuotes=(result.data||[]).map(function(row){return Object.assign({},row.payload,{id:row.id,total:row.total,currency:row.currency,updatedAt:row.updated_at})});renderSaved()}
  async function loadProfile(){if(!state.client||!state.user)return;var result=await state.client.from('profiles').select('plan,subscription_status,paddle_customer_id').eq('id',state.user.id).single();state.profile=result.data||{plan:'free',subscription_status:'inactive'};var paidActive=['active','trialing'].includes(state.profile.subscription_status);state.profilePlan=paidActive&&plans[state.profile.plan]?state.profile.plan:'free';reconcilePlan()}
  async function loadBrands(){if(!state.client||!state.user||state.plan!=='studio')return;var result=await state.client.from('brand_profiles').select('*').order('created_at',{ascending:true});state.brands=result.data||[];renderBrands()}

  function applyEntitlements(){
    var access=entitlement();byId('planPill').textContent=access.name;byId('accountPlan').textContent=access.name;
    byId('accentColor').disabled=!access.customColor;byId('accentField').classList.toggle('locked',!access.customColor);
    byId('paymentLink').disabled=!access.paymentLinks;byId('paymentField').classList.toggle('locked',!access.paymentLinks);
    byId('brandPresetButton').classList.toggle('locked-control',!access.brandProfiles);
    byId('saveHelp').textContent=state.user?'Saved privately to your QuoteCraft cloud.':'Saved locally until you sign in.';
    update();renderSaved();
  }

  function renderAccount(){
    var signedIn=!!state.user;byId('signedOutAccount').hidden=signedIn;byId('signedInAccount').hidden=!signedIn;byId('launchNote').hidden=signedIn;
    byId('avatarInitial').textContent=signedIn?(state.user.email||'?').charAt(0).toUpperCase():'?';
    if(signedIn){byId('accountEmail').textContent=state.user.email||'';var platformConfigured=state.config&&(nativePlatform?state.config.revenueCatAndroidConfigured:state.config.revenueCatWebConfigured);var status=state.revenueCatReady?'Connected · '+(nativePlatform?'Android SDK':'Web SDK'):(state.revenueCatMode==='error'?'Connection failed':(platformConfigured?'Connecting…':'Setup pending'));byId('revenueCatStatus').textContent=status;byId('restorePurchasesButton').hidden=!nativePlatform}
  }

  function revenueCatPackages(){var current=state.revenueCatOfferings&&state.revenueCatOfferings.current;return current&&Array.isArray(current.availablePackages)?current.availablePackages:[]}
  function revenueCatPackage(plan,interval){var wanted=plan+'_'+interval;var packages=revenueCatPackages();return packages.find(function(item){return String(item.identifier||'').toLowerCase()===wanted})||packages.find(function(item){var product=item.product||item.webBillingProduct||{};var productId=String(product.identifier||product.id||'').toLowerCase();return productId.includes(plan)&&productId.includes(interval==='annual'?'annual':'monthly')})||null}
  async function refreshRevenueCat(customerInfo){
    if(!state.revenueCatReady)return;
    try{
      if(!customerInfo){if(nativePlatform){customerInfo=(await NativePurchases.getCustomerInfo()).customerInfo}else customerInfo=await state.revenueCat.getCustomerInfo()}
      state.revenueCatCustomerInfo=customerInfo;state.revenueCatPlan=planFromRevenueCat(customerInfo);
      state.revenueCatOfferings=nativePlatform?await NativePurchases.getOfferings():await state.revenueCat.getOfferings();
      reconcilePlan();
    }catch(error){console.warn('RevenueCat refresh failed',error);renderAccount()}
  }
  async function configureRevenueCat(user){
    var platformConfigured=state.config&&(nativePlatform?state.config.revenueCatAndroidConfigured:state.config.revenueCatWebConfigured);
    if(!user||!platformConfigured){state.revenueCatReady=false;state.revenueCatMode='off';state.revenueCatPlan='free';renderAccount();return}
    try{
      if(nativePlatform){
        var nativeModule=await import('@revenuecat/purchases-capacitor');NativePurchases=nativeModule.Purchases;
        var nativeKey=state.config.revenueCatAndroidApiKey;if(!nativeKey)throw new Error('RevenueCat Android key is missing');
        var configured=await NativePurchases.isConfigured();
        if(!configured.isConfigured)await NativePurchases.configure({apiKey:nativeKey,appUserID:user.id});else if(state.revenueCatUserId!==user.id)await NativePurchases.logIn({appUserID:user.id});
        state.revenueCatMode='native';
      }else{
        var webModule=await import('@revenuecat/purchases-js');WebPurchases=webModule.Purchases;ErrorCode=webModule.ErrorCode;LogLevel=webModule.LogLevel;
        var webKey=state.config.revenueCatWebApiKey;if(!webKey)throw new Error('RevenueCat web key is missing');
        WebPurchases.setLogLevel(location.hostname==='localhost'?LogLevel.Debug:LogLevel.Error);
        if(!WebPurchases.isConfigured())state.revenueCat=WebPurchases.configure({apiKey:webKey,appUserId:user.id});else{state.revenueCat=WebPurchases.getSharedInstance();if(state.revenueCat.getAppUserId()!==user.id)await state.revenueCat.changeUser(user.id)}
        state.revenueCatMode='web';
      }
      state.revenueCatUserId=user.id;state.revenueCatReady=true;await refreshRevenueCat();
    }catch(error){state.revenueCatReady=false;state.revenueCatMode='error';console.warn('RevenueCat setup failed',error);renderAccount()}
  }

  async function configureServices(){
    var configUrl=nativePlatform?'https://quotecraft-rose.vercel.app/api/config':'/api/config';
    try{var response=await fetch(configUrl,{cache:'no-store'});if(!response.ok)throw new Error('Configuration unavailable');state.config=await response.json()}catch(error){state.config={supabaseConfigured:false,paddleConfigured:false,revenueCatConfigured:false,prices:{}}}
    if(state.config.supabaseConfigured&&window.supabase){
      state.client=window.supabase.createClient(state.config.supabaseUrl,state.config.supabaseAnonKey);
      var sessionResult=await state.client.auth.getSession();await handleSession(sessionResult.data.session);
      state.client.auth.onAuthStateChange(function(event,session){setTimeout(function(){handleSession(session)},0)});
    }else{
      byId('launchNote').querySelector('div').innerHTML='<strong>Cloud accounts are staged.</strong> The free backend connection is the remaining activation step; local saving still works.';
      byId('saveHelp').textContent='Cloud backend pending — saves remain safely on this device.';
    }
    if(state.config.paddleConfigured&&window.Paddle){if(state.config.paddleEnvironment==='sandbox')window.Paddle.Environment.set('sandbox');window.Paddle.Initialize({token:state.config.paddleClientToken});state.paddleReady=true}
  }

  async function handleSession(session){
    state.user=session&&session.user?session.user:null;state.cloudQuotes=[];state.profile=null;state.profilePlan='free';state.revenueCatPlan='free';state.plan='free';renderAccount();
    if(state.user){await Promise.all([loadProfile(),loadCloudQuotes(),configureRevenueCat(state.user)]);if(state.plan==='studio')await loadBrands()}else{state.revenueCatReady=false;applyEntitlements();renderSaved()}
  }

  async function signIn(event){
    event.preventDefault();if(!state.client){byId('authStatus').textContent='Cloud sign-in is coded but needs the Supabase project connection.';return}
    byId('authStatus').textContent='Signing in…';var result=await state.client.auth.signInWithPassword({email:byId('authEmail').value.trim(),password:byId('authPassword').value});
    if(result.error){byId('authStatus').textContent=result.error.message;return}byId('authStatus').textContent='Signed in.';closeModals();showToast('Welcome back — cloud sync is on');
  }

  async function signUp(){
    if(!state.client){byId('authStatus').textContent='Cloud sign-up is coded but needs the Supabase project connection.';return}
    if(!byId('authEmail').reportValidity()||!byId('authPassword').reportValidity())return;
    byId('authStatus').textContent='Creating your account…';var result=await state.client.auth.signUp({email:byId('authEmail').value.trim(),password:byId('authPassword').value,options:{emailRedirectTo:location.origin}});
    if(result.error){byId('authStatus').textContent=result.error.message;return}byId('authStatus').textContent=result.data.session?'Account created — cloud sync is on.':'Check your email to confirm the account, then sign in.';if(result.data.session){closeModals();showToast('Free account created')}
  }

  async function signOut(){if(nativePlatform&&state.revenueCatReady){try{await NativePurchases.logOut()}catch(error){console.warn('RevenueCat logout failed',error)}}if(state.client)await state.client.auth.signOut();closeModals();showToast('Signed out — local mode is active')}

  function openModal(id){closeModals();var modal=byId(id);modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
  function closeModals(){document.querySelectorAll('.modal-shell.open').forEach(function(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')});document.body.classList.remove('modal-open')}
  function openAuth(){openModal('authModal');setTimeout(function(){byId('authEmail').focus()},50)}
  function openPricing(){openModal('pricingModal')}
  function openAccount(){openModal('accountModal')}
  function openDrawer(){byId('savedDrawer').classList.add('open');byId('savedDrawer').setAttribute('aria-hidden','false')}
  function closeDrawer(){byId('savedDrawer').classList.remove('open');byId('savedDrawer').setAttribute('aria-hidden','true')}

  function setBilling(interval){state.billing=interval;document.querySelectorAll('[data-billing]').forEach(function(button){button.classList.toggle('active',button.dataset.billing===interval)});document.querySelectorAll('[data-monthly][data-annual]').forEach(function(el){el.textContent=el.dataset[interval]})}
  async function choosePlan(plan){
    if(plan==='free'){if(!state.user){closeModals();openAuth()}else{closeModals();showToast('You are already on '+entitlement().name)}return}
    if(!state.user){closeModals();openAuth();byId('authStatus').textContent='Create your free account first, then checkout will attach to it.';return}
    if(state.revenueCatReady){
      var rcPackage=revenueCatPackage(plan,state.billing);if(!rcPackage){showToast('RevenueCat offering needs the '+plan+' '+state.billing+' package');return}
      try{
        var purchaseResult=nativePlatform?await NativePurchases.purchasePackage({aPackage:rcPackage}):await state.revenueCat.purchase({rcPackage:rcPackage,customerEmail:state.user.email,showDiscountCodeField:true});
        await refreshRevenueCat(purchaseResult.customerInfo);closeModals();showToast('Purchase verified by RevenueCat — '+entitlement().name+' is active');setTimeout(loadProfile,1200);return;
      }catch(error){var cancelled=error&&((ErrorCode&&error.errorCode===ErrorCode.UserCancelledError)||error.userCancelled);if(!cancelled){console.warn('RevenueCat purchase failed',error);showToast('Purchase could not be completed — please try again')}return}
    }
    var priceId=state.config&&state.config.prices?state.config.prices[plan+'_'+state.billing]:'';
    if(!state.paddleReady||!priceId){showToast('Paddle onboarding is the last step before paid checkout goes live');return}
    window.Paddle.Checkout.open({items:[{priceId:priceId,quantity:1}],customer:{email:state.user.email},customData:{supabase_user_id:state.user.id,quotecraft_plan:plan},settings:{displayMode:'overlay',theme:'light',locale:'en',successUrl:location.origin+'/?checkout=success'}});
  }

  async function restorePurchases(){if(!state.user||!state.revenueCatReady){showToast('Sign in after RevenueCat setup to restore purchases');return}try{var result=nativePlatform?await NativePurchases.restorePurchases():{customerInfo:await state.revenueCat.getCustomerInfo()};await refreshRevenueCat(result.customerInfo);showToast(state.revenueCatPlan==='free'?'No active purchase found':'Purchases restored — '+entitlement().name+' is active')}catch(error){showToast('Could not restore purchases')}}

  async function openBrands(){if(entitlement().brandProfiles<1){openPricing();showToast('Reusable brands are special to Studio');return}await loadBrands();openModal('brandModal')}
  function renderBrands(){if(!state.brands.length){byId('brandList').innerHTML='<div class="saved-empty"><strong>No brand profiles yet</strong><br><span>Save the identity currently in the editor.</span></div>';return}byId('brandList').innerHTML=state.brands.map(function(brand){return '<article class="brand-card"><span class="brand-swatch" style="background:'+escapeHtml(brand.accent_color)+'"></span><div class="brand-card-info"><strong>'+escapeHtml(brand.name)+'</strong><span>'+escapeHtml(brand.email||'No email')+'</span></div><button class="button small ghost apply-brand" data-id="'+brand.id+'" type="button">Apply</button><button class="button small ghost danger delete-brand" data-id="'+brand.id+'" type="button">Delete</button></article>'}).join('')}
  async function saveBrand(){if(!state.client||state.plan!=='studio')return;if(state.brands.length>=entitlement().brandProfiles){showToast('Studio includes up to 5 brand profiles');return}var result=await state.client.from('brand_profiles').insert({user_id:state.user.id,name:byId('business').value.trim()||'My brand',email:byId('email').value.trim(),currency:byId('currency').value,accent_color:byId('accentColor').value});if(result.error){showToast('Could not save this brand');return}await loadBrands();showToast('Brand profile saved')}
  function applyBrand(id){var brand=state.brands.find(function(item){return item.id===id});if(!brand)return;byId('business').value=brand.name;byId('email').value=brand.email||'';byId('currency').value=brand.currency||'USD';byId('accentColor').value=brand.accent_color||'#174c36';update();closeModals();showToast('Brand applied')}
  async function deleteBrand(id){var result=await state.client.from('brand_profiles').delete().eq('id',id);if(result.error){showToast('Could not delete brand');return}await loadBrands();showToast('Brand removed')}

  var toastTimer;function showToast(message){clearTimeout(toastTimer);byId('toast').textContent=message;byId('toast').classList.add('show');toastTimer=setTimeout(function(){byId('toast').classList.remove('show')},3000)}

  function bindEvents(){
    byId('quoteForm').addEventListener('input',update);byId('quoteForm').addEventListener('change',update);byId('quoteForm').addEventListener('submit',saveQuote);
    byId('addItem').addEventListener('click',function(){syncItems();state.items.push({id:makeId(),name:'',qty:1,rate:0});renderItems();update();var input=document.querySelector('.service-row:last-child .item-name');if(input)input.focus()});
    byId('items').addEventListener('click',function(event){var button=event.target.closest('.remove-item');if(!button)return;if(state.items.length===1){showToast('Keep at least one service');return}syncItems();var id=button.closest('.service-row').dataset.id;state.items=state.items.filter(function(item){return item.id!==id});renderItems();update()});
    byId('copyButton').addEventListener('click',copyQuote);byId('printButton').addEventListener('click',function(){window.print()});byId('savedButton').addEventListener('click',openDrawer);byId('newButton').addEventListener('click',newQuote);byId('pricingButton').addEventListener('click',openPricing);byId('accountButton').addEventListener('click',openAccount);byId('brandPresetButton').addEventListener('click',openBrands);
    document.querySelectorAll('[data-close-drawer]').forEach(function(item){item.addEventListener('click',closeDrawer)});document.querySelectorAll('[data-close-modal]').forEach(function(item){item.addEventListener('click',closeModals)});document.querySelectorAll('[data-open-auth]').forEach(function(item){item.addEventListener('click',function(){closeModals();openAuth()})});document.querySelectorAll('[data-open-pricing]').forEach(function(item){item.addEventListener('click',function(){closeModals();openPricing()})});
    document.querySelectorAll('[data-billing]').forEach(function(item){item.addEventListener('click',function(){setBilling(item.dataset.billing)})});document.querySelectorAll('[data-choose-plan]').forEach(function(item){item.addEventListener('click',function(){choosePlan(item.dataset.choosePlan)})});
    byId('authForm').addEventListener('submit',signIn);byId('signUpButton').addEventListener('click',signUp);byId('signOutButton').addEventListener('click',signOut);byId('restorePurchasesButton').addEventListener('click',restorePurchases);byId('saveBrandButton').addEventListener('click',saveBrand);
    byId('savedList').addEventListener('click',function(event){var load=event.target.closest('.load-quote');var remove=event.target.closest('.delete-quote');if(load)loadQuoteFromList(load.dataset.id);if(remove)deleteQuote(remove.dataset.id)});
    byId('brandList').addEventListener('click',function(event){var apply=event.target.closest('.apply-brand');var remove=event.target.closest('.delete-brand');if(apply)applyBrand(apply.dataset.id);if(remove)deleteBrand(remove.dataset.id)});
    byId('accentField').addEventListener('click',function(){if(!entitlement().customColor){openPricing();showToast('Custom color is included in Solo and Studio')}});byId('paymentField').addEventListener('click',function(){if(!entitlement().paymentLinks){openPricing();showToast('Client payment buttons are included in Solo and Studio')}});
    document.addEventListener('keydown',function(event){if(event.key==='Escape'){closeDrawer();closeModals()}});
  }

  state.items=starter;bindEvents();renderItems();renderAccount();applyEntitlements();renderSaved();configureServices();
  if(new URLSearchParams(location.search).get('checkout')==='success'){history.replaceState({},'',location.pathname);showToast('Payment received — your plan will unlock after secure verification')}
})();
