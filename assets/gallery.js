(function(){
'use strict';
const dialog=document.getElementById('photo-viewer');
const image=document.getElementById('full-photo');
const caption=document.getElementById('photo-caption');
const article=document.getElementById('photo-article');
const status=document.getElementById('photo-status');
let opener;
for(const button of document.querySelectorAll('.photo-tile')){
 button.addEventListener('click',()=>{
  opener=button;caption.textContent=button.dataset.caption;
  article.href=button.dataset.entry;status.textContent='読み込み中…';
  image.alt=button.dataset.caption||'日記の写真';
  image.src=button.dataset.full;
  dialog.showModal();
 });
}
image.addEventListener('load',()=>{status.textContent='';});
image.addEventListener('error',()=>{if(image.hasAttribute('src'))status.textContent='画像を読み込めませんでした。';});
document.getElementById('photo-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{image.removeAttribute('src');if(opener)opener.focus();});
})();