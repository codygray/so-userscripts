// ==UserScript==
// @name          Vote invalidation report
// @description   Render a report of the outcome of vote analysis / invalidation and allow for quick and precise mod-messaging / suspension
// @author        Shog9
// @namespace     https://gist.github.com/Shog9/93f630a57636d66d4d3bfb84b4b8c71d/raw/
// @version       0.2
// @include       http*://stackoverflow.com/admin/cm-message/*
// @include       http*://*.stackoverflow.com/admin/cm-message/*
// @include       http*://dev.stackoverflow.com/admin/cm-message/*
// @include       http*://askubuntu.com/admin/cm-message/*
// @include       http*://superuser.com/admin/cm-message/*
// @include       http*://serverfault.com/admin/cm-message/*
// @include       http*://mathoverflow.net/admin/cm-message/*
// @include       http*://*.stackexchange.com/admin/cm-message/*
// @exclude       http*://chat.*.com/*
// ==/UserScript==

// this serves only to avoid embarassing mistakes caused by inadvertently loading this script onto a page that isn't a Stack Exchange page
var isSEsite = false;
for (var s of document.querySelectorAll("script")) isSEsite = isSEsite||/StackExchange\.ready\(/.test(s.textContent);

// don't bother running this if the user isn't a moderator on the current site
if (!isSEsite || typeof StackExchange === "undefined" || !StackExchange.options.user.isModerator)
{
   return;
}

function with_jquery(f)
{
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.textContent = "if (window.jQuery) (" + f.toString() + ")(window.jQuery)" + "\n\n//# sourceURL=" + encodeURI(GM_info.script.namespace.replace(/\/?$/, "/")) + encodeURIComponent(GM_info.script.name); // make this easier to debug;
  document.body.appendChild(script);
}


with_jquery(function()
{
window.virInit = init;
function init()
{
   var userDataRegex = /\s*RING INFO\s*\n(.+)\s*/;
   $(".msg-body pre code").each(function()
   {
      try
      {
         let compressed = $(this).html().match(userDataRegex)[1];
         let json = LZString.decompressFromBase64(compressed);
         let results = JSON.parse(json, function(k, v)
            {
               if ( /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d\d\d)?Z$/.test(v) ) return new Date(v);
               return v;
            });
         if ( results.users && results.connections )
         {
            let container = $("<div></div>");
            $(this).closest("pre").replaceWith(container);
            RenderUsersTable(results, container);
         }
      }
      catch(e) {}
   });
}

function RenderUsersTable(results, container)
{
   var table = $(`<table class='sorter user-selection-context'>
         <thead><tr>
            <th>User</th>
            <th>Votes cast</th>
            <th>...to ring</th>
            <th>%</th>
            <th>Votes received</th>
            <th>...from ring</th>
            <th>%</th>
            <th>Last Seen</th>
            <th>Last ring vote</th>
            <th>Last Messaged</th>
            <th>Last Suspended</th>
         </tr></thead>
      <tbody></tbody></table>`);
   var tbody = table.find("tbody");
   for (let user of results.users)
   {
      if ( !user.InVotingRing ) continue;

      let tr = $("<tr></tr>")
         .appendTo(tbody)
         .data('user-id', user.UserId)
         .data('user-name', user.DisplayName);

      let userInfo = $(`
      <td>
         <div class="user-info">
            <div class="user-gravatar32"><a href="/users/${user.UserId}"><div class="gravatar-wrapper-32"><img src="${user.ProfileImage}" alt="" width="32" height="32"></div></a></div>
            <div class="user-details">
               <input type="checkbox" class="select-user" style="float:right" checked='checked'>
               <a href="/users/${user.UserId}">${user.DisplayName}</a>
               <div class="-flair">
                  <span class="reputation-score" title="reputation score " dir="ltr">${user.Reputation}</span>
               </div>
            </div>
            <div style="text-align:right">${user.RealName}</div>
            <div style="text-align:right">${user.Email}</div>
         </div>
      </td>
      `);
      tr.append(userInfo);

      tr.append($('<td></td>').text(user.UpvotesCast));
      tr.append($('<td class="votes-to-ring"></td>'));
      tr.append($('<td class="percent-to-ring"></td>'));
      tr.append($('<td></td>').text(user.UpvotesReceived));
      tr.append($('<td class="votes-from-ring"></td>'));
      tr.append($('<td class="percent-from-ring"></td>'));
      tr.append($('<td></td>').append(renderDate(user.LastAccessDate)));
      tr.append($('<td class="last-ring-vote"></td>'));
      tr.append($('<td class="messaged"></td>').append(renderDate(user.LastMessaged)));
      tr.append($('<td class="suspended"></td>').append(renderDate(user.LastSuspended)));
   }

   table.appendTo(container)
      .on('click', 'tr>td.messaged', function(e)
      {
         e.preventDefault();
         var userId = $(this).closest("tr").data('user-id');
         var userName = $(this).closest("tr").data('user-name');
         if (!confirm("Send targeted votes message to " + userName + "?")) return;

         var lastMessaged = $(".relativetime", this).attr("title");
         var messageTd = $(this).closest("td");
         messageTd.html("messaging<img src='//sstatic.net/img/progress-dots.gif'>");
         AddModMessage(userId, "targeted votes", lastMessaged, false)
            .then(s => messageTd.empty().append($("<span>messaged.</span>").attr("title", s)),
                  e => messageTd.empty().append($("<span>error</span>").attr("title", e)));
      })
      .on('click', 'tr>td.suspended', function(e)
      {
         e.preventDefault();
         var userId = $(this).closest("tr").data('user-id');
         var userName = $(this).closest("tr").data('user-name');
         if (!confirm("Suspend and send sockpuppet message to " + userName + "?")) return;

         var lastMessaged = $(".relativetime", this).attr("title");
         var messageTd = $(this).closest("td");
         messageTd.html("messaging<img src='//sstatic.net/img/progress-dots.gif'>");
         AddModMessage(userId, "sockpuppet upvoting", lastMessaged, true)
            .then(s => messageTd.empty().append($("<span>messaged.</span>").attr("title", s)),
                  e => messageTd.empty().append($("<span>error</span>").attr("title", e)));
      })
      .find("tr>td.messaged,tr>td.suspended")
         .css({borderBottom:'1px dotted green',cursor:'pointer'}).end()
      .on("user-selection:changed", function(e, selectedUsers)
      {
         e.stopPropagation();
         UpdateRingStats();
      });

   UpdateRingStats();

   function UpdateRingStats()
   {
      var selectedUsers = GetSelectedUsers(table);
      tbody.find("tr").each(function()
      {
         var row = $(this);
         var userId = row.data('user-id');
         if ( selectedUsers.includes(userId) )
         {
            var userInfo = results.users.find(u => u.UserId==userId);

            var votesFromRing = results.connections
               .filter(u => u.User2Id==userId && selectedUsers.includes(u.User1Id));
            var numFrom = votesFromRing.reduce( (a, conn) => a+conn.VotesToTarget, 0);
            var numInvalidatedFrom = votesFromRing.reduce( (a, conn) => a+conn.InvalidatedVotesToTarget, 0);
            var pctFrom = numFrom*100/userInfo.UpvotesReceived;

            var votesToRing = results.connections
               .filter(u => u.User1Id==userId && selectedUsers.includes(u.User2Id));
            var numTo = votesToRing.reduce( (a, conn) => a+conn.VotesToTarget, 0);
            var numInvalidatedTo = votesToRing.reduce( (a, conn) => a+conn.InvalidatedVotesToTarget, 0);
            var pctTo = numTo*100/userInfo.UpvotesCast;

            var lastRingVote = Math.max(votesFromRing.reduce( (a, conn) => Math.max(a,conn.LastVoteToTarget), 0),
               votesToRing.reduce( (a, conn) => Math.max(a,conn.LastVoteToTarget), 0))||null;

            row.find("td.votes-to-ring").empty().append($(`<span> ${numTo} <span title='invalidated'>(${numInvalidatedTo})</span></span>`));
            row.find("td.percent-to-ring")
               .text( userInfo.UpvotesCast ? Math.round(pctTo) : '-' )
               .css("background-color", pctTo >= 20 || numTo >= 20 ? "#f88" : "#fff");
            row.find("td.votes-from-ring").empty().append($(`<span> ${numFrom} <span title='invalidated'>(${numInvalidatedFrom})</span></span>`));
            row.find("td.percent-from-ring")
               .text( userInfo.UpvotesReceived ? Math.round(pctFrom) : '-')
               .css("background-color", pctFrom >= 20 || numFrom >= 20 ? "#f88" : "#fff");
            row.find("td.last-ring-vote").empty().append(renderDate(lastRingVote));
         }
         else
         {
            row.find("td.votes-to-ring").text( '-' );
            row.find("td.percent-to-ring").text( '-' );
            row.find("td.votes-from-ring").text( '-' );
            row.find("td.percent-from-ring").text( '-' );
            row.find("td.last-ring-vote").text( '-' );
         }
      });
   }

}

   $("#content").on("click", ".user-selection-context .user-info", function(e)
   {
      if ( e.ctrlKey || e.shiftKey || e.altKey )
         return;

      var context = $(this).closest(".user-selection-context");

      var wasChecked = $(".select-user", this).prop("checked");
      if ( $(e.target).is(".select-user") )
         wasChecked = !wasChecked;
      else
         e.preventDefault();

      var clickedUserId = +$("a[href*='/users/']", this).attr("href").match(/\d+/)[0];

      var selectedUsers = context.find(".select-user:checked").next("a[href*='/users/']")
         .map(function() { return +this.href.match(/\d+/)[0]; })
         .toArray();

      if ( !wasChecked )
         selectedUsers.push(clickedUserId);
      selectedUsers = unique(selectedUsers);
      if ( wasChecked )
         selectedUsers = selectedUsers.filter(uid => uid != clickedUserId);

      context.find(".select-user").prop("checked", function()
         {
            var userId = +$(this).closest(".user-info").find("a[href*='/users/']").attr("href").match(/\d+/)[0];
            return selectedUsers.includes(userId);
         });

      context.trigger("user-selection:changed", [selectedUsers]);
   });

   function GetSelectedUsers(context)
   {
      var selectedUsers = context.find(".select-user:checked").next("a[href*='/users/']")
         .map(function() { return +this.href.match(/\d+/)[0]; })
         .toArray();

      return unique(selectedUsers);
   }

   function renderDate(val)
   {
      val = new Date(val);
      return val.getTime() === 0 ? $("<i>null</i>") : $("<span title='" + formatISODate(val) + "' class='relativetime'>")
         .text(formatDate(new Date(val)));
   }
   function formatISODate(date)
   {
      return date.toJSON().replace(/\.\d+Z/, 'Z');
   }

   function formatDate(date)
   {
      // mostly stolen from SE.com
      var delta = (((new Date()).getTime() - date.getTime()) / 1000);

      if (delta < 2) {
         return 'just now';
      }
      if (delta < 60) {
         return Math.floor(delta) + ' secs ago';
      }
      if (delta < 120) {
         return '1 min ago';
      }
      if (delta < 3600) {
         return Math.floor(delta / 60) + ' mins ago';
      }
      if (delta < 7200) {
         return '1 hour ago';
      }
      if (delta < 86400) {
         return Math.floor(delta / 3600) + ' hours ago';
      }
      if (delta < 172800) {
         return 'yesterday';
      }
      if (delta < 259200) {
         return '2 days ago';
      }
      return date.toLocaleString(undefined, {month: "short", timeZone: "UTC"})
         + ' ' + date.toLocaleString(undefined, {day: "2-digit", timeZone: "UTC"})
         + ( delta > 31536000 ? ' \'' + date.toLocaleString(undefined, {year: "2-digit", timeZone: "UTC"}) : '')
         + ' at'
         + ' ' + date.toLocaleString(undefined, {minute: "2-digit", hour: "2-digit", hour12: false, timeZone: "UTC"});
   }

   function AddModMessage(userId, message, lastMessaged, suspend)
   {
      return GetSuspensionParameters(userId)
         .then(function(params)
         {
            if ( new Date(params.lastMessageDate*1000).getTime() > (new Date(lastMessaged).getTime()||0) )
               return $.Deferred().reject("user has already been contacted since " + (new Date(params.lastMessageDate*1000)).toISOString() + " - visit their profile for details");

            return GetModMessages(userId)
               .then(function(messages)
               {
                  if ( !messages[message] || !messages[message].text)
                     return $.Deferred().reject("message template '" + message + "' not available.");
                  if ( /{todo}/.test(messages[message].text) )
                     return $.Deferred().reject("message template '" + message + "' has todo sections - send manually.");

                  var days = params.suspensionDays||7;
                  var messageText = messages[message].text;
                  if ( suspend )
                     messageText = messageText.replace("{optionalSuspensionAutoMessage}", params.suspensionReplacement.replace('\$days\$', days));
                  else
                     messageText = messageText.replace("{optionalSuspensionAutoMessage}", '');

                  if ( !suspend && /{suspensionDurationDays}/.test(messageText) )
                     return $.Deferred().reject("message template '" + message + "' requires a suspension, but none was specified.");
                  else
                     messageText =  messageText.replace("{suspensionDurationDays}", days);

                  return $.post("/users/message/save", {userId: userId,
                        lastMessageDate: params.lastMessageDate,
                        email: true,
                        'post-text': messageText,
                        suspendDays: days,
                        'suspend-choice': days,
                        suspendUser: suspend,
                        templateName: message,
                        templateEdited: false,
                        suspendReason: messages[message].reason,
                        fkey: StackExchange.options.user.fkey }).then(function(result)
                     {
                        var messageSentDom = $(new DOMParser().parseFromString(result, "text/html"));
                        return messageSentDom.find("#mainbar .revision-comment:first").text();
                     });
               });
         });
   }

   function GetModMessages(userId)
   {
      return $.get("/admin/contact-user/template-popup/" + userId)
         .then(function(result)
         {
            var modMessages = {};
            var modMessagesDom = $(new DOMParser().parseFromString(result, "text/html"));
            modMessagesDom.find(".action-list label .action-name")
               .each(function()
               {
                  var message = $(this).closest("li").find("input[name='mod-template']").attr("value"),
                        id = $(this).closest("li").find("input[name='mod-template']").attr("id"),
                        reason = modMessagesDom.find("#" + id + "-reason").attr("value");
                  modMessages[$(this).text()] = { text: message, reason: reason };
               });
            return modMessages;
         });
   }

   function GetSuspensionParameters(userId)
   {
      return $.get("/users/message/create/" + userId)
         .then(function(result)
         {
            var mmCreateDom = $(new DOMParser().parseFromString(result, "text/html"));
            return { lastMessageDate: mmCreateDom.find("#lastMessageDate").attr("value"),
               suspensionReplacement: mmCreateDom.find("#autoSuspendMessage").attr("value"),
               suspensionDays: +$("input[name=suspend-choice]:checked").val()
            };
         });
   }


   // From Christian Landgren, http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array/15868720#15868720
   // respectably fast even on large arrays
   // REMEMBER THAT IT RETURNS A SORTED ARRAY!
   function unique(arr)
   {
      return arr.slice() // slice makes copy of array before sorting it
         .sort(function(a,b){ return a > b ? 1 : a < b ? -1 : 0; })
         .reduce(function(a,b)
         {
            if (a.slice(-1)[0] !== b) // slice(-1)[0] means last item in array without removing it (like .pop())
               a.push(b);
            return a;
         },[]); // this empty array becomes the starting value for a
   }

   // handy little compression routine, credit Pieroxy: https://github.com/pieroxy/lz-string/
   var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);

init();

});