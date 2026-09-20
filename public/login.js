const form=document.querySelector('#login-form');
const button=form.querySelector('button');
const error=document.querySelector('#login-error');
form.addEventListener('submit',async event=>{
  event.preventDefault(); if(button.disabled)return;
  button.disabled=true;button.textContent='REVISANDO LA LISTA…';error.hidden=true;
  try {
    const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:form.elements.password.value}),signal:AbortSignal.timeout(12000)});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error || 'No pudimos abrir la puerta.');
    form.reset();location.replace('/');
  } catch(e) {error.textContent=e.name==='TimeoutError'?'La puerta está tardando. Probá de nuevo.':e.message;error.hidden=false;}
  finally{button.disabled=false;button.textContent='ESTOY EN LA LISTA ↗';}
});
