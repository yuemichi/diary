'use strict';
const $=id=>document.getElementById(id);let entries=[],busy=false,activeWorker=null,abortCurrent=null,stopping=false;
const supported=typeof CompressionStream!=='undefined'&&typeof DecompressionStream!=='undefined'&&typeof Worker!=='undefined';
if(!supported||location.protocol==='file:'){
 $('compat').hidden=false;$('compat').textContent=!supported?'このブラウザは必要な圧縮機能に対応していません。新しいSafari・Chrome・Firefoxで開いてください。':'このWeb版はGitHub PagesなどのHTTP/HTTPS上で開いてください。ファイルのダブルクリックでは変換用Workerが動作しません。';
}
function bytes(n){return n>=1e6?(n/1e6).toFixed(2)+' MB':(n/1e3).toFixed(1)+' KB';}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function render(){
 $('list').replaceChildren();$('empty').hidden=entries.length>0;
 for(const e of entries){
  const row=document.createElement('div');row.className='row '+(e.result?'done':e.state==='スキップ'?'failed':'');row.setAttribute('role','listitem');
  const icon=document.createElement('span');icon.className='file-icon';icon.textContent=e.result?'✓':'PNG';
  const info=document.createElement('div'),name=document.createElement('p'),detail=document.createElement('p');name.className='filename';name.textContent=e.file.name;detail.className='detail';detail.textContent=e.detail||bytes(e.file.size);info.append(name,detail);
  const actions=document.createElement('div');actions.className='row-actions';const state=document.createElement('span');state.className='state';state.textContent=e.state;actions.append(state);
  if(e.result){const save=document.createElement('button');save.className='secondary';save.textContent='保存';save.onclick=()=>download(new Blob([e.result.data],{type:'image/png'}),e.outputName);actions.append(save);}
  if(!busy){const remove=document.createElement('button');remove.className='quiet';remove.textContent='×';remove.setAttribute('aria-label',e.file.name+' を一覧から削除');remove.onclick=()=>{entries=entries.filter(x=>x!==e);render();};actions.append(remove);}
  row.append(icon,info,actions);$('list').append(row);
 }
 const results=entries.filter(e=>e.result),before=results.reduce((s,e)=>s+e.file.size,0),after=results.reduce((s,e)=>s+e.result.data.length,0);
 $('summary').textContent=results.length?`${results.length}枚：${bytes(before)} → ${bytes(after)}（${after<=before?'削減':'増加'} ${Math.abs(100*(1-after/before)).toFixed(1)}%）`:'';
 $('pick').disabled=busy;$('files').disabled=busy;$('skip').disabled=busy;$('clear').disabled=busy||!entries.length;$('convert').disabled=busy||!entries.some(e=>!e.result)||!supported||location.protocol==='file:';$('zip').disabled=busy||!results.length;$('stop').hidden=!busy;
}
function add(files){if(busy)return;let ignored=0;for(const file of files){if(!/\.png$/i.test(file.name)){ignored++;continue;}if(entries.some(e=>e.file.name===file.name&&e.file.size===file.size&&e.file.lastModified===file.lastModified))continue;entries.push({file,state:'待機中'});}$('status').textContent=`${entries.length}枚のPNG`+(ignored?`（PNG以外の${ignored}件は対象外）`:'');render();}
$('pick').onclick=()=>$('files').click();$('files').onchange=e=>{add(e.target.files);e.target.value='';};
let dragDepth=0;
$('drop').ondragenter=e=>{e.preventDefault();dragDepth++;if(!busy)$('drop').classList.add('over');};
$('drop').ondragover=e=>e.preventDefault();$('drop').ondragleave=()=>{if(--dragDepth<=0){dragDepth=0;$('drop').classList.remove('over');}};
$('drop').ondrop=e=>{e.preventDefault();dragDepth=0;$('drop').classList.remove('over');add(e.dataTransfer.files);};
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>e.preventDefault());
$('clear').onclick=()=>{entries=[];$('status').textContent='PNGを追加してください';$('progress').hidden=true;render();};
function runWorker(buffer){return new Promise((resolve,reject)=>{
 const worker=new Worker('./worker.js');activeWorker=worker;
 function finish(){worker.terminate();activeWorker=null;abortCurrent=null;}
 abortCurrent=()=>{finish();reject(new Error('停止しました。再度変換できます。'));};
 worker.onmessage=({data})=>{finish();data.ok?resolve(data):reject(new Error(data.error));};
 worker.onerror=()=>{finish();reject(new Error('変換処理を開始・実行できませんでした。HTTP/HTTPS上で開き、画像が大きい場合は枚数やサイズを減らしてください。'));};
 worker.postMessage(buffer,[buffer]);
});}
$('stop').onclick=()=>{stopping=true;if(abortCurrent)abortCurrent();};
$('convert').onclick=async()=>{
 if(busy)return;busy=true;stopping=false;const pending=entries.filter(e=>!e.result),skip=$('skip').checked;let done=0;
 const names=new Set(entries.filter(e=>e.result).map(e=>e.outputName.toLowerCase()));
 $('progress').max=pending.length;$('progress').value=0;$('progress').hidden=false;render();
 try{for(const e of pending){
  if(stopping)break;e.state='変換中';e.detail='画素を保持して変換しています…';$('status').textContent=`${done+1} / ${pending.length}枚を変換中`;render();
  try{
   if(e.file.size>256*1024*1024)throw Error('ファイルが256MBを超えています。');
   const buffer=await e.file.arrayBuffer();if(stopping){e.state='待機中';e.detail='';break;}
   const result=await runWorker(buffer);
   if(skip&&result.data.length>=e.file.size){e.state='スキップ';e.detail=`容量が減りません：${bytes(e.file.size)} → ${bytes(result.data.length)}`;}
   else{
    const held=entries.reduce((s,x)=>s+(x.result?.data.length||0),0);if(held+result.data.length>200*1024*1024)throw Error('結果の保持上限200MBに達しました。保存後に一覧をクリアして分けて処理してください。');
    const stem=e.file.name.replace(/\.png$/i,'')+'_palette';let name=stem+'.png',n=2;while(names.has(name.toLowerCase())){name=stem+'_'+n+'.png';n++;}names.add(name.toLowerCase());e.outputName=name;e.result=result;e.state='完了';
    e.detail=`${result.width} × ${result.height} · ${result.colors}種類 / ${result.bits}bit · ${bytes(e.file.size)} → ${bytes(result.data.length)}`;
   }
  }catch(error){e.state=stopping?'待機中':'スキップ';e.detail=error.message||'変換できませんでした。';}
  done++;$('progress').value=done;render();
 }}finally{busy=false;$('status').textContent=stopping?'停止しました。結果は引き続き保存できます。':`完了：${entries.filter(e=>e.result).length}枚をダウンロードできます`;render();}
};
$('zip').onclick=()=>{try{const files=entries.filter(e=>e.result).map(e=>({name:e.outputName,data:e.result.data}));download(PalettePNG.makeZip(files),'PalettePNG.zip');}catch(error){$('status').textContent=error.message;}};
render();
