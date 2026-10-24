/* Preserve the originating winter using only already-authored record links. */
(() => {
 const season=new URL(location.href).searchParams.get('season');
 if(!/^\d{4}-\d{2}$/.test(season||''))return;
 const record=document.querySelector('[data-record-link][data-season="'+season+'"]');
 const back=document.querySelector('[data-profile-return]');
 if(record&&back)back.href=record.href;
})();
