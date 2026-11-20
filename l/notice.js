// Local display of user-supplied records, not a live feed or an approval notification.
// Relative times were supplied at this fixed instant. Never reset ages on page load.
(()=>{'use strict';
 const suppliedAt=Date.parse('2026-10-29T03:52:58Z');
 const records=[['臺北市','陳*華',50,2],['高雄市','林*豪',200,4],['臺中市','黃*婷',80,5],['新北市','張*偉',150,7],['桃園市','李*傑',30,8],['臺南市','吳*玲',120,10],['新竹市','劉*宇',45,12],['彰化縣','王*志',60,14],['屏東縣','楊*雅',90,15],['苗栗縣','蔡*明',100,1]];
 const card=document.querySelector('.application-notice'),calculator=document.getElementById('calculator'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let index=0,timer,started=false;
 function ageLabel(createdAt){const minutes=Math.floor((Date.now()-createdAt)/60000);if(minutes<0)return'已完成申請';if(minutes<1)return'剛剛完成申請';if(minutes<60)return minutes+'分鐘前完成申請';if(minutes<1440)return Math.floor(minutes/60)+'小時前完成申請';return Math.floor(minutes/1440)+'天前完成申請';}
 function hide(){card.classList.remove('is-visible');}
 function allowed(){return!document.hidden&&!calculator.hidden;}
 function show(){if(!allowed())return;const [city,name,amount,minutesAgo]=records[index],createdAt=suppliedAt-minutesAgo*60000;document.getElementById('notice-city').textContent=city;document.getElementById('notice-name').textContent=name;document.getElementById('notice-amount').textContent=amount;const time=document.getElementById('notice-time');time.textContent=ageLabel(createdAt);time.title=new Date(createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'});card.classList.add('is-visible');timer=setTimeout(()=>{hide();index=(index+1)%records.length;if(!reduced.matches)timer=setTimeout(show,2600);},4200);}
 function restart(){clearTimeout(timer);hide();if(allowed()){if(reduced.matches&&started)return;started=true;timer=setTimeout(show,900);}}
 document.addEventListener('visibilitychange',restart);new MutationObserver(restart).observe(calculator,{attributes:true,attributeFilter:['hidden']});reduced.addEventListener('change',restart);window.addEventListener('pagehide',()=>{clearTimeout(timer);hide();});window.addEventListener('pageshow',restart);restart();
})();
