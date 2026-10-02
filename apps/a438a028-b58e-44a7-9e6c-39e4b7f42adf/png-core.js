/* Palette PNG — exact indexed PNG conversion. No canvas or color conversion. */
(function(root){
'use strict';
const LIMIT=256*1024*1024, MAX_PIXELS=50000000;
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
function crc32(a){let c=0xffffffff;for(const b of a)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function concat(parts){const n=parts.reduce((s,p)=>s+p.length,0);if(n>LIMIT)throw Error('データが256MBの上限を超えています。');const out=new Uint8Array(n);let pos=0;for(const p of parts){out.set(p,pos);pos+=p.length;}return out;}
function chunk(name,data=new Uint8Array()){const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);for(let i=0;i<4;i++)out[4+i]=name.charCodeAt(i);out.set(data,8);v.setUint32(data.length+8,crc32(out.subarray(4,data.length+8)));return out;}
async function streamTransform(data,decompress,max){
 const stream=new Blob([data]).stream().pipeThrough(decompress?new DecompressionStream('deflate'):new CompressionStream('deflate'));
 const reader=stream.getReader(),parts=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('展開サイズが上限を超えています。');}parts.push(value);}}finally{reader.releaseLock();}
 return concat(parts);
}
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
async function convert(buffer){
 const input=new Uint8Array(buffer);if(input.length<33||input.length>LIMIT)throw Error('PNGファイルが不正か、256MBを超えています。');
 const signature=[137,80,78,71,13,10,26,10];if(!signature.every((v,i)=>input[i]===v))throw Error('PNG形式ではありません。');
 const view=new DataView(input.buffer,input.byteOffset,input.byteLength),idats=[],meta=[];
 let width=0,height=0,depth=0,type=0,channels=0,palette=null,trans=null,ended=false,seen=false;
 const keep=new Set(['iCCP','sRGB','gAMA','cHRM','pHYs','tEXt','zTXt','iTXt','eXIf']);
 for(let pos=8;pos+12<=input.length;){
  const n=view.getUint32(pos);if(n>input.length-pos-12)throw Error('PNGチャンクが破損しています。');
  const name=String.fromCharCode(...input.subarray(pos+4,pos+8)),data=input.subarray(pos+8,pos+8+n);
  if(crc32(input.subarray(pos+4,pos+8+n))!==view.getUint32(pos+8+n))throw Error('CRC検証に失敗しました。ファイルが破損している可能性があります。');
  if(name==='IHDR'){
   if(seen||pos!==8||n!==13)throw Error('PNGヘッダーが不正です。');seen=true;width=view.getUint32(pos+8);height=view.getUint32(pos+12);depth=data[8];type=data[9];
   if(!width||!height||width*height>MAX_PIXELS)throw Error('画像は5,000万画素以内にしてください。');
   if(data[10]||data[11])throw Error('未対応の圧縮形式です。');if(data[12])throw Error('インターレースPNGは未対応です。通常のPNGで書き出してください。');
   if(depth===16)throw Error('16bit PNGは画質を保つため変換しません。');
   channels=({0:1,2:3,3:1,4:2,6:4})[type];
   if(!channels||!(depth===8||([0,3].includes(type)&&[1,2,4].includes(depth))))throw Error('未対応のPNG形式です。');
  }else if(!seen)throw Error('PNGヘッダーがありません。');
  else if(name==='acTL')throw Error('アニメーションPNGは変換しません。');
  else if(name==='iCCP'&&(type===0||type===4))throw Error('ICCプロファイル付きのグレースケールPNGは、色の見え方を保つため変換しません。元画像をご利用ください。');
  else if(name==='PLTE'){if(!n||n%3||n>768)throw Error('パレットが不正です。');palette=data;}
  else if(name==='tRNS')trans=data;
  else if(name==='IDAT')idats.push(data);
  else if(name==='IEND'){if(n)throw Error('終端チャンクが不正です。');ended=true;break;}
  else if(!(input[pos+4]&32))throw Error('未対応の必須チャンクがあります。');
  else if(keep.has(name))meta.push(input.subarray(pos,pos+n+12));
  pos+=n+12;
 }
 if(!ended||!idats.length||(type===3&&!palette))throw Error('PNGデータが不足しています。');
 if(trans&&((type===0&&trans.length!==2)||(type===2&&trans.length!==6)||(type===3&&trans.length>palette.length/3)||[4,6].includes(type)))throw Error('透過情報が不正です。');
 const row=Math.ceil(width*channels*depth/8),bpp=Math.ceil(channels*depth/8),size=(row+1)*height;
 if(size>LIMIT)throw Error('展開データが256MBを超えています。');
 let raw=await streamTransform(concat(idats),true,size);if(raw.length!==size)throw Error('PNGの展開サイズが一致しません。');
 const indices=new Uint8Array(width*height),colors=[],map=new Map();const transparent=[];
 if(trans&&type!==3)for(let i=0;i<trans.length;i+=2)transparent.push(trans[i]*256+trans[i+1]);
 for(let y=0;y<height;y++){
  const offset=y*(row+1)+1,filter=raw[offset-1];if(filter>4)throw Error('PNGフィルターが不正です。');
  for(let x=0;x<row;x++){const a=x>=bpp?raw[offset+x-bpp]:0,b=y?raw[offset+x-row-1]:0,c=y&&x>=bpp?raw[offset+x-row-1-bpp]:0;raw[offset+x]+=filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0;}
  for(let x=0;x<width;x++){
   let r=0,g=0,b=0,a=255;const p=offset+x*channels;
   if(type===0||type===3){const v=depth===8?raw[offset+x]:(raw[offset+Math.floor(x*depth/8)]>>>(8-depth-x*depth%8))&((1<<depth)-1);
    if(type===3){if(v>=palette.length/3)throw Error('パレット参照が不正です。');r=palette[v*3];g=palette[v*3+1];b=palette[v*3+2];if(trans&&v<trans.length)a=trans[v];}
    else {r=g=b=v*255/((1<<depth)-1);if(trans&&v===transparent[0])a=0;}
   }else if(type===2||type===6){r=raw[p];g=raw[p+1];b=raw[p+2];if(type===6)a=raw[p+3];else if(trans&&r===transparent[0]&&g===transparent[1]&&b===transparent[2])a=0;}
   else {r=g=b=raw[p];a=raw[p+1];}
   const key=((r<<24)|(g<<16)|(b<<8)|a)>>>0;let index=map.get(key);
   if(index===undefined){index=colors.length;if(index===256)throw Error('色と透明度が256種類を超えるため、減色せずスキップしました。');colors.push([r,g,b,a]);map.set(key,index);}
   indices[y*width+x]=index;
  }
 }
 raw=null;
 const bits=colors.length<=2?1:colors.length<=4?2:colors.length<=16?4:8,packed=Math.ceil(width*bits/8),scan=new Uint8Array((packed+1)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)scan[y*(packed+1)+1+Math.floor(x*bits/8)]|=indices[y*width+x]<<(8-bits-x*bits%8);
 const compressed=await streamTransform(scan,false,LIMIT),header=new Uint8Array(13),hv=new DataView(header.buffer);hv.setUint32(0,width);hv.setUint32(4,height);header[8]=bits;header[9]=3;
 const pal=new Uint8Array(colors.length*3),alpha=new Uint8Array(colors.length);let alphaLength=0;
 colors.forEach((c,i)=>{pal.set(c.slice(0,3),i*3);alpha[i]=c[3];if(c[3]!==255)alphaLength=i+1;});
 const parts=[new Uint8Array(signature),chunk('IHDR',header),...meta,chunk('PLTE',pal)];if(alphaLength)parts.push(chunk('tRNS',alpha.subarray(0,alphaLength)));parts.push(chunk('IDAT',compressed),chunk('IEND'));
 return {data:concat(parts),width,height,bits,colors:colors.length};
}
function makeZip(files){
 if(files.length>65535)throw Error('ZIPのファイル数が多すぎます。');const local=[],central=[];let offset=0,centralSize=0;
 for(const file of files){const name=new TextEncoder().encode(file.name),data=new Uint8Array(file.data),crc=crc32(data);if(name.length>65535)throw Error('ファイル名が長すぎます。');
  const h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);local.push(h,data);
  const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=h.length+data.length;centralSize+=c.length;
 }
 if(offset+centralSize>LIMIT)throw Error('ZIPが256MBを超えます。個別にダウンロードしてください。');
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/zip'});
}
root.PalettePNG={convert,crc32,makeZip};
})(globalThis);
