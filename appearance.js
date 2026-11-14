(function(){
'use strict';
const root=document.getElementById('appearance-palette');
if(!root)return;
const colors=(root.dataset.colors||'').split(',').filter(c=>/^#[0-9a-f]{6}$/i.test(c));
if(!colors.length)return;
function change(event){
 const row=event.target.closest('.row');
 if(!row||row.contains(event.relatedTarget))return;
 const previous=row.style.getPropertyValue('--hover-color');
 const choices=colors.filter(c=>c!==previous);
 const pool=choices.length?choices:colors;
 row.style.setProperty('--hover-color',pool[Math.floor(Math.random()*pool.length)]);
}
document.addEventListener('pointerover',change);
document.addEventListener('focusin',change);
})();