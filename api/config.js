export default function handler(request,response){
  response.setHeader('Cache-Control','no-store, max-age=0');
  var supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
  var supabaseAnonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
  var paddleClientToken=process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN||'';
  var prices={
    solo_monthly:process.env.PADDLE_PRICE_SOLO_MONTHLY||'',
    solo_annual:process.env.PADDLE_PRICE_SOLO_ANNUAL||'',
    studio_monthly:process.env.PADDLE_PRICE_STUDIO_MONTHLY||'',
    studio_annual:process.env.PADDLE_PRICE_STUDIO_ANNUAL||''
  };
  response.status(200).json({
    supabaseConfigured:Boolean(supabaseUrl&&supabaseAnonKey),
    supabaseUrl:supabaseUrl,
    supabaseAnonKey:supabaseAnonKey,
    paddleConfigured:Boolean(paddleClientToken&&Object.values(prices).every(Boolean)),
    paddleClientToken:paddleClientToken,
    paddleEnvironment:process.env.PADDLE_ENVIRONMENT==='sandbox'?'sandbox':'production',
    prices:prices
  });
}
