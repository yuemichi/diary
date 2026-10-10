(function(){
'use strict';
const d=JSON.parse(document.getElementById('data').textContent),audio=document.querySelector('audio'),c=document.querySelector('canvas'),ctx=c.getContext('2d');
const stage=document.querySelector('.stage'),scene=document.querySelector('.scene'),lyrics=document.querySelector('.lyrics'),status=document.querySelector('.status');
const play=document.querySelector('.play'),seek=document.querySelector('.seek'),clock=document.querySelector('.clock');
let frames=null,raf=0,visible=true,ended=false,showWaveform=d.includeWaveform!==false&&d.showWaveform!==false;
const waveButton=document.querySelector('.wave-toggle');
const zero=new Float32Array(128),tau=Math.PI*2,w=900,h=506.25;
const clamp=x=>Math.max(-1,Math.min(1,x));
function initWaves(){if(d.includeWaveform===false||frames)return;const raw=atob(window.LINER_WAVES||''),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);frames=new DataView(bytes.buffer);}
function wave(time){if(!frames||time<0||time>=d.duration)return zero;const n=frames.byteLength/256;if(!n)return zero;const p=time*30,i=Math.min(Math.floor(p),n-1),j=Math.min(i+1,n-1),m=p-Math.floor(p),a=new Float32Array(128);for(let k=0;k<128;k++)a[k]=((1-m)*frames.getInt16((i*128+k)*2,true)+m*frames.getInt16((j*128+k)*2,true))/32767;return a;}
function values(age=0){return Array.from(wave(audio.currentTime-age),v=>clamp(v*d.sensitivity));}
function sample(a,f){const x=(f-Math.floor(f))*a.length,i=Math.floor(x),m=x-i;return a[i%a.length]*(1-m)+a[(i+1)%a.length]*m;}
function stroke(points,opacity=1,closed=false,width=d.width,color=d.accent){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));if(closed)ctx.closePath();ctx.globalAlpha=Math.max(0,Math.min(1,opacity));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.globalAlpha=1;}
function polar(r,a){return [w/2+Math.cos(a)*r,h/2+Math.sin(a)*r];}
function white(amount){const rgb=d.accent.slice(1).match(/../g).map(x=>parseInt(x,16));return 'rgb('+rgb.map(v=>Math.round(v+(255-v)*amount)).join(',')+')';}
function draw(){
 if(!showWaveform){syncScene();return;}
 const t=audio.currentTime,phase=t*d.motionSpeed,turn=t*d.rotationSpeed,history=d.trailLength,extent=h,mid=h/2;
 ctx.clearRect(0,0,w,h);ctx.lineJoin='round';ctx.lineCap='round';const a=values();
 if(d.mode==='wave'){stroke([[54,mid],[846,mid]],.4,false,.75,d.line);stroke(a.map((v,i)=>[54+i/127*792,mid-v*h*.28]));}
 else if(d.mode==='bars'){a.forEach((v,i)=>{const amount=Math.abs(v),half=Math.max(.6,amount*h*.25),x=54+i/127*792;stroke([[x,mid-half],[x,mid+half]],1,false,d.width,white(amount*.55));});}
 else if(d.mode==='circle'){const r=extent*.24;stroke(Array.from({length:384},(_,i)=>polar(r*(1+sample(a,i/384)*.32),i/384*tau-Math.PI/2)),1,true);}
 else if(d.mode==='radialBars'){ctx.lineCap='butt';const r=extent*.25;a.forEach((v,i)=>{const angle=i/128*tau-Math.PI/2,amount=Math.abs(v);stroke([polar(r,angle),polar(r+Math.max(1.5,amount*extent*.18),angle)],1,false,Math.max(1,d.width*2),white(amount*.275));});stroke(Array.from({length:256},(_,i)=>polar(r,i/256*tau)),.35,true,.75);}
 else if(d.mode==='tunnel'){for(let j=0;j<28;j++){const depth=(j+(phase*.35)%1)/28,r=extent*.025*Math.pow(35,depth),a=values((1-depth)*history);stroke(Array.from({length:256},(_,i)=>{const f=i/256;return polar(r*(1+sample(a,f)*.24),f*tau+turn+(1-depth)*.3);}),(.15+depth*.8)*Math.min(1,depth*8)*Math.min(1,(1-depth)*8),true);}}
 else if(d.mode==='ribbon'){const n=history===0?1:32;for(let j=n-1;j>=0;j--){const depth=j/Math.max(1,n-1),a=values(depth*history);stroke(a.map((v,i)=>{const f=i/127;return [40+f*(w-80),h*.42+depth*extent*.23-v*extent*.22+Math.sin(f*tau+phase*.5)*extent*.025*depth];}),.85*Math.pow(1-depth*.95,1.5));}}
 else if(d.mode==='flower'){const n=history===0?1:16;for(let j=n-1;j>=0;j--){const depth=j/Math.max(1,n-1),age=depth*history,a=values(age),energy=Math.sqrt(a.reduce((n,v)=>n+v*v,0)/128);stroke(Array.from({length:512},(_,i)=>{const f=i/512,angle=f*tau,r=extent*(.025+energy*.32)*(.3+.7*Math.abs(Math.cos(angle*4+(t-age)*d.motionSpeed*.22)));return polar(r*(1+sample(a,f+.125)*.4),angle+turn-age*d.rotationSpeed+sample(a,f)*.6);}),.9*Math.pow(1-depth*.92,1.6),true);}}
 else if(d.mode==='terrain'){for(let j=0;j<44;j++){const depth=(j+(phase*.8)%1)/44,p=.12+depth*depth*.95,a=values((1-depth)*history);stroke(a.map((v,i)=>[w/2+(i/127-.5)*w*1.6*p,h*.28+depth*depth*h*.67-Math.abs(v)*extent*.3*p]),(.1+depth*.8)*Math.min(1,depth*12)*Math.min(1,(1-depth)*12));}}
 else if(d.mode==='kaleidoscope'){const n=history===0?1:12;for(let j=n-1;j>=0;j--){const depth=j/Math.max(1,n-1),a=values(depth*history);stroke(Array.from({length:512},(_,i)=>{const f=i/512,local=(f*8)%1,m=local<.5?local*2:(1-local)*2,r=extent*(.12+depth*.28)*(.8+.2*Math.cos(m*Math.PI))+sample(a,m*.49)*extent*.09;return polar(Math.max(extent*.015,r),f*tau+turn+Math.sin(phase*.25)*depth*.12);}),.8-depth*.55,true);}}
 syncScene();
}
function syncScene(){
 const t=audio.currentTime;
 const cue=d.lyrics.filter(q=>q.start<=t&&t<q.end).sort((a,b)=>b.start-a.start)[0];const text=cue?cue.text:'';if(lyrics.textContent!==text)lyrics.textContent=text;
 const bg=d.images.filter(q=>q.start<=t).sort((a,b)=>b.start-a.start)[0];const src=bg?bg.file:'';if(scene.dataset.bg!==src){scene.dataset.bg=src;scene.style.backgroundImage=src?'url("'+src+'")':'none';}
 updateControls();
}
function stamp(s){return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');}
function updateControls(){const duration=Number.isFinite(audio.duration)?audio.duration:d.duration;seek.max=duration;seek.value=audio.currentTime;clock.textContent=stamp(audio.currentTime)+' / '+stamp(duration);play.textContent=audio.paused?'再生':'一時停止';}
let lastFrame = -Infinity;
function tick(now){raf=0;if(now-lastFrame>=1000/30-1){draw();lastFrame=now;}if(showWaveform&&!audio.paused&&!document.hidden&&visible)raf=requestAnimationFrame(tick);}
function start(){if(showWaveform&&!raf&&!audio.paused&&!document.hidden&&visible)raf=requestAnimationFrame(tick);}
play.addEventListener('click',async()=>{if(!audio.paused){audio.pause();return;}try{if(showWaveform)initWaves();if(ended){audio.currentTime=0;ended=false;}await audio.play();status.textContent='';}catch(e){status.textContent='再生できませんでした。音声形式やファイルをご確認ください。';}});
seek.addEventListener('input',()=>{if(showWaveform)initWaves();audio.currentTime=Number(seek.value);ended=false;draw();});
function waveState(){
 waveButton.hidden=d.includeWaveform===false;waveButton.disabled=d.includeWaveform===false;
 waveButton.textContent=showWaveform?'波形 ON':'波形 OFF';
 waveButton.setAttribute('aria-pressed',String(showWaveform));
 waveButton.setAttribute('aria-label',showWaveform?'波形を非表示にする':'波形を表示する');
}
waveButton.addEventListener('click',()=>{
 if(d.includeWaveform===false)return;
 showWaveform=!showWaveform;waveState();cancelAnimationFrame(raf);raf=0;
 if(showWaveform){initWaves();draw();start();}
 else{ctx.clearRect(0,0,w,h);syncScene();}
});
waveState();
audio.addEventListener('timeupdate',()=>{if(!showWaveform)syncScene();});
audio.addEventListener('play',()=>{document.querySelectorAll('audio').forEach(a=>{if(a!==audio)a.pause();});start();updateControls();});
audio.addEventListener('pause',()=>{cancelAnimationFrame(raf);raf=0;draw();});
audio.addEventListener('ended',()=>{ended=true;updateControls();});
audio.addEventListener('loadedmetadata',updateControls);audio.addEventListener('seeked',draw);
audio.addEventListener('error',()=>status.textContent='音声を読み込めませんでした。');
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);raf=0;start();});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;}else start();}).observe(stage);
function resize(){const scale=stage.clientWidth/w;scene.style.transform='scale('+scale+')';const ratio=Math.min(devicePixelRatio||1,2);c.width=Math.round(stage.clientWidth*ratio);c.height=Math.round(stage.clientWidth*ratio*h/w);ctx.setTransform(c.width/w,0,0,c.height/h,0,0);draw();}
new ResizeObserver(resize).observe(stage);
const grain=document.querySelector('.grain'),gc=grain.getContext('2d');grain.width=256;grain.height=256;let seed=19537;const noise=gc.createImageData(256,256);for(let i=0;i<noise.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise.data[i]=noise.data[i+1]=noise.data[i+2]=seed>>>24;noise.data[i+3]=255;}gc.putImageData(noise,0,0);
document.querySelector('.title').textContent=d.title;document.querySelector('.date').textContent=d.date;document.querySelector('.date').style.top=d.title.trim()?'60px':'24px';document.querySelector('.author').textContent=d.author;
document.documentElement.style.setProperty('--accent',d.accent);scene.style.backgroundColor=d.background;scene.style.color=d.accent;lyrics.style.color=d.lyricColor;lyrics.style.fontSize=d.lyricSize+'px';document.querySelector('.author').style.color=d.line;
audio.src=d.audio;resize();
})();