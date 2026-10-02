const button=document.querySelector('.menu');
const navigation=document.querySelector('#navigation');
button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);button.querySelector('span').textContent=open?'−':'＋';});
navigation.addEventListener('click',event=>{if(event.target.closest('a')){button.setAttribute('aria-expanded','false');navigation.classList.remove('open');button.querySelector('span').textContent='＋';}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navigation.classList.contains('open')){button.setAttribute('aria-expanded','false');navigation.classList.remove('open');button.querySelector('span').textContent='＋';button.focus();}});
