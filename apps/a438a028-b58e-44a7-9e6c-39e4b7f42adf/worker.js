importScripts('./png-core.js');
self.onmessage=async ({data})=>{
 try {const result=await PalettePNG.convert(data);self.postMessage({ok:true,...result},[result.data.buffer]);}
 catch(error){self.postMessage({ok:false,error:error.message||'変換できませんでした。'});}
};
