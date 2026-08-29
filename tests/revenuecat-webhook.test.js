import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {revenueCatEntitlementPatch,revenueCatPlan,verifyRevenueCatAuthorization,verifyRevenueCatSignature} from '../api/revenuecat-webhook.js';

test('accepts only the configured RevenueCat authorization value',function(){
  assert.equal(verifyRevenueCatAuthorization('Bearer correct','Bearer correct'),true);
  assert.equal(verifyRevenueCatAuthorization('Bearer wrong','Bearer correct'),false);
  assert.equal(verifyRevenueCatAuthorization('', ''),false);
});

test('verifies RevenueCat HMAC signatures over the raw payload',function(){
  var body=JSON.stringify({api_version:'1.0',event:{type:'INITIAL_PURCHASE'}});var secret='rc_test_secret';var timestamp=String(Math.floor(Date.now()/1000));
  var signature=createHmac('sha256',secret).update(timestamp+'.'+body,'utf8').digest('hex');
  assert.equal(verifyRevenueCatSignature(body,'t='+timestamp+',v1='+signature,secret),true);
  assert.equal(verifyRevenueCatSignature(body+' ','t='+timestamp+',v1='+signature,secret),false);
});

test('maps RevenueCat entitlements and products to QuoteCraft plans',function(){
  process.env.REVENUECAT_ENTITLEMENT_SOLO='quotecraft_solo';process.env.REVENUECAT_ENTITLEMENT_STUDIO='quotecraft_studio';
  assert.equal(revenueCatPlan(['quotecraft_solo'],'ignored'),'solo');
  assert.equal(revenueCatPlan(['quotecraft_studio'],'ignored'),'studio');
  assert.equal(revenueCatPlan([],'quotecraft_studio_monthly'),'studio');
});

test('grants verified purchases, retains canceled access until expiration, and revokes expired access',function(){
  assert.deepEqual(revenueCatEntitlementPatch({type:'INITIAL_PURCHASE',period_type:'NORMAL',entitlement_ids:['quotecraft_solo']}),{plan:'solo',subscription_status:'active'});
  assert.equal(revenueCatEntitlementPatch({type:'CANCELLATION',entitlement_ids:['quotecraft_studio']}),null);
  assert.deepEqual(revenueCatEntitlementPatch({type:'EXPIRATION',entitlement_ids:['quotecraft_studio']}),{plan:'free',subscription_status:'inactive'});
  assert.equal(revenueCatEntitlementPatch({type:'PRODUCT_CHANGE',entitlement_ids:['quotecraft_studio']}),null);
});
