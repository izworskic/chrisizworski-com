(function(){
  'use strict';
  const body=document.body;
  const region=body?.dataset?.shorefeelRegion;
  const slug=body?.dataset?.shorefeelSlug;
  if(!['us','ca'].includes(region)||!/^[a-z0-9-]{3,90}$/.test(slug||''))return;
  const $=id=>document.getElementById(id);
  const put=(id,value)=>{const n=$(id);if(n)n.textContent=value;};
  const isNumber=x=>typeof x==='number'&&Number.isFinite(x);
  const when=value=>{
    const date=new Date(value||'');
    if(!Number.isFinite(date.getTime()))return 'Source time unavailable';
    return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',
      hour:'2-digit',minute:'2-digit',hour12:false}).format(date)+' UTC';
  };
  function showLake(data){
    const v=data?.shorelineRealFeel,context=v?.lakeEffect;
    const text=context?.explanation;
    put('feel-lake-effect',v?.status==='forecast-based'&&typeof text==='string'
      ?context.label+'. '+text+
       ' This does not change the forecast apparent air temperature shown above.'
      :'Lake influence unavailable. The current air forecast does not establish how much warmer or cooler the sand is than the nearby town.');
  }
  function unavailable(reason){
    put('feel-value','No recent forecast');
    put('feel-secondary','No temperature inferred');
    put('feel-method','Weather data unavailable');
    put('feel-air','Unavailable');
    put('feel-wind','Unavailable');
    put('feel-when','Not verified');
    put('feel-guide',reason||'Current forecast could not be verified. Check the official weather and beach authorities.');
    put('feel-evidence','No current source-qualified local forecast was returned. Offshore lake temperatures and current swimming status are not inferred.');
    showLake(null);
    const report=$('shorefeel-live');if(report)report.dataset.status='unavailable';
  }
  function showUS(data){
    if(!isNumber(data.feelsLikeF)||!isNumber(data.airF)){
      return unavailable('The NWS forecast does not have a valid air comfort value.');
    }
    put('feel-value',Math.round(data.feelsLikeF)+'°F');
    put('feel-secondary','Modeled apparent air temperature');
    put('feel-method',data.method+' · National Weather Service');
    put('feel-air',Math.round(data.airF)+'°F forecast air');
    put('feel-wind',isNumber(data.windMph)?Math.round(data.windMph)+' mph'+
      (data.windFrom?' from '+data.windFrom:''):'Wind not reported');
    put('feel-when',when(data.asOf));
    put('feel-guide',data.guide||'A nearby forecast does not measure small changes beside the water.');
    showLake(data);
    put('feel-evidence','Nearby NWS land forecast, issued '+when(data.issuedAt)+
      '. The displayed apparent temperature reflects published wind chill or heat-index rules where appropriate. No on-sand air measurement, local water temperature, or observed beach-versus-inland correction is available.');
  }
  function showCA(data){
    if(!isNumber(data.apparentC)||!isNumber(data.temperatureC)){
      return unavailable('The ECCC forecast does not have a valid air comfort value.');
    }
    put('feel-value',Math.round(data.apparentC)+'°C');
    put('feel-secondary',Math.round(data.apparentC*9/5+32)+'°F modeled apparent air');
    put('feel-method',data.method+' · Environment Canada');
    put('feel-air',Math.round(data.temperatureC)+'°C forecast air');
    put('feel-wind',isNumber(data.windKmh)?Math.round(data.windKmh)+' km/h'+
      (data.windDirection?' from '+data.windDirection:''):'Wind not reported');
    put('feel-when',when(data.validAt)+(data.isUpcoming?' · upcoming':''));
    put('feel-guide',data.note||'Shoreline wind can change outside the nearby city forecast.');
    showLake(data);
    put('feel-evidence','ECCC hourly forecast for '+data.forecastPlace+
      ', about '+data.forecastDistanceKm+' km from this beach. Forecast issued '+
      when(data.forecastIssueAt)+'. This is not an on-sand measurement, a swimming-area water reading, or a calibrated shoreline cooling correction.');
  }
  const periodLabel=document.querySelector('.shore-metric:last-child span');
  if(periodLabel)periodLabel.textContent='Forecast hour (UTC)';
  const endpoint=region==='ca'?'/api/shorefeel-ca?beach=':'/api/shorefeel-us?beach=';
  fetch(endpoint+encodeURIComponent(slug),{
    headers:{Accept:'application/json'},signal:AbortSignal.timeout(10500)
  }).then(response=>{
    if(!response.ok)throw new Error('Weather service unavailable');
    return response.json();
  }).then(data=>{
    if(!data||data.beach!==slug||data.status!=='forecast-based')
      return unavailable(data?.reason||'Current weather source did not return a verified beach-area forecast.');
    if(region==='ca')showCA(data);else showUS(data);
    const report=$('shorefeel-live');if(report)report.dataset.status='forecast';
  }).catch(()=>unavailable('The weather service could not be reached. Official park and beach-advisory links remain available below.'));
})();
