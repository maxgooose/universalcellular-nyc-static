!function(){if(["HeadlessChrome","bot","Google Web Preview","facebookexternalhit","Google-Read-Aloud","Storebot-Google","Bytespider","SnapchatAds","meta-externalagent"].some(e=>navigator.userAgent.includes(e)))return;let e=()=>{let e=`
              self.onmessage = async (e) => {
                  try {
                      await fetch('https://register.boostymark.com/a/reg', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(e.data)
                      });
                  } catch(error) {
                  }
              };
          `,t=new Blob([e],{type:"application/javascript"});return new Worker(URL.createObjectURL(t))};!async function t(){let o=await new Promise(e=>{!function t(){let o=localStorage.getItem("_idy_cid");o?e(o):setTimeout(t,500)}()}),n=document.currentScript?.src||"",a=new URLSearchParams(n.split("?")[1]||""),r=a.get("shop")||"";r.includes("myshopify.com")||"undefined"==typeof Shopify||(r=Shopify.shop);let s=e();s.postMessage({shop:r,cid:o}),setTimeout(()=>s.terminate(),2e4)}()}();