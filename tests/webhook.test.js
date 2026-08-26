import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {planFromPriceId,verifyPaddleSignature} from '../api/paddle-webhook.js';

test('accepts a current valid Paddle signature',function(){
  var body=JSON.stringify({event_type:'subscription.updated'});var secret='pdl_test_secret';var timestamp=String(Math.floor(Date.now()/1000));
  var signature=createHmac('sha256',secret).update(timestamp+':'+body,'utf8').digest('hex');
  assert.equal(verifyPaddleSignature(body,'ts='+timestamp+';h1='+signature,secret),true);
});

test('rejects a tampered Paddle payload',function(){
  var body='{"ok":true}';var secret='pdl_test_secret';var timestamp=String(Math.floor(Date.now()/1000));
  var signature=createHmac('sha256',secret).update(timestamp+':'+body,'utf8').digest('hex');
  assert.equal(verifyPaddleSignature('{"ok":false}','ts='+timestamp+';h1='+signature,secret),false);
});

test('maps configured Paddle prices to protected plans',function(){
  process.env.PADDLE_PRICE_SOLO_MONTHLY='pri_solo';process.env.PADDLE_PRICE_STUDIO_ANNUAL='pri_studio';
  assert.equal(planFromPriceId('pri_solo'),'solo');assert.equal(planFromPriceId('pri_studio'),'studio');assert.equal(planFromPriceId('unknown'),'free');
});
