(function(){
'use strict';
const dialog=document.getElementById('diary-viewer');
if(!dialog)return;
const image=dialog.querySelector('img'), stage=dialog.querySelector('.diary-image-stage');
const zoom=dialog.querySelector('.diary-zoom'), status=dialog.querySelector('[role="status"]');
let opener, original=false, ready=false, oldOverflow='';
function fit(){return Math.min(1,stage.clientWidth/image.naturalWidth,stage.clientHeight/image.naturalHeight);}
function render(){
 if(!ready)return;
 const scale=fit(), canZoom=scale<1;
 if(!canZoom)original=false;
 image.style.width=(image.naturalWidth*(original?1:scale))+'px';
 image.style.height=(image.naturalHeight*(original?1:scale))+'px';
 image.style.cursor=canZoom?(original?'zoom-out':'zoom-in'):'default';
 zoom.disabled=!canZoom;
 zoom.textContent=original?'全体表示に戻す':'原寸で表示';
 zoom.setAttribute('aria-pressed',String(original));
 status.textContent=canZoom?(original?'原寸表示：スクロールで移動できます':'画像をクリックすると原寸表示'):'原寸で表示しています';
}
function toggle(){if(!ready||fit()>=1)return;original=!original;render();stage.scrollTo(0,0);}
for(const button of document.querySelectorAll('.diary-photo')){
 button.addEventListener('click',()=>{
  opener=button;original=false;ready=false;zoom.disabled=true;
  image.hidden=true;image.style.width='';image.style.height='';
  image.alt=button.dataset.caption||'日記の画像';
  status.textContent='読み込み中…';
  oldOverflow=document.documentElement.style.overflow;
  document.documentElement.style.overflow='hidden';
  dialog.showModal();stage.scrollTo(0,0);
  image.src=button.dataset.full;
 });
}
image.addEventListener('load',()=>{if(!dialog.open)return;ready=true;image.hidden=false;render();});
image.addEventListener('error',()=>{if(dialog.open){ready=false;zoom.disabled=true;status.textContent='画像を読み込めませんでした。';}});
image.addEventListener('click',toggle);zoom.addEventListener('click',toggle);
dialog.querySelector('.diary-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog||event.target===stage)dialog.close();});
dialog.addEventListener('close',()=>{
 ready=false;image.removeAttribute('src');image.hidden=true;
 document.documentElement.style.overflow=oldOverflow;
 if(opener)opener.focus({preventScroll:true});
});
window.addEventListener('resize',()=>{if(dialog.open){render();stage.scrollTo(0,0);}});
})();