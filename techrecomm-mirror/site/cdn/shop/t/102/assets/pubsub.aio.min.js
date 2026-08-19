/*
Generated time: November 4, 2025 21:58
This file was created by the app developer. Feel free to contact the original developer with any questions. It was minified (compressed) by AVADA. AVADA do NOT own this script.
*/
let subscribers={};function subscribe(s,r){return void 0===subscribers[s]&&(subscribers[s]=[]),subscribers[s]=[...subscribers[s],r],function(){subscribers[s]=subscribers[s].filter(s=>s!==r)}}function publish(s,r){return subscribers[s]?(s=subscribers[s].map(s=>s(r)),Promise.all(s)):Promise.resolve()}