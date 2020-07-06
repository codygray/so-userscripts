// ==UserScript==
// @name         Super Shotgun
// @description  Facilitates immediate, hassle-free removal of inappropriate questions by a moderator.
// @version      0.3.6
// @author       Cody Gray
// @homepage     https://github.com/codygray/so-userscripts
//
// @updateURL    https://github.com/codygray/so-userscripts/raw/master/SuperShotgun.user.js
// @downloadURL  https://github.com/codygray/so-userscripts/raw/master/SuperShotgun.user.js
//
// @include      https://*stackoverflow.com/*
// @include      https://*serverfault.com/*
// @include      https://*superuser.com/*
// @include      https://*askubuntu.com/*
// @include      https://*mathoverflow.net/*
// @include      https://*.stackexchange.com/*
//
// @exclude      *chat.*
// @exclude      *blog.*
// @exclude      https://stackoverflow.com/c/*
// ==/UserScript==

(function() {
   'use strict';

   // Moderator check
   if (typeof StackExchange == "undefined" || !StackExchange.options || !StackExchange.options.user || !StackExchange.options.user.isModerator) { return; }

   const fkey = StackExchange.options.user.fkey;
   const isMeta = (location.hostname == 'meta.stackoverflow.com' || (typeof StackExchange.options.site.parentUrl !== 'undefined'));

   function reloadPage()
   {
      location.reload(true);
   }

   function reloadWhenDone()
   {
      // Triggers when all ajax requests have completed
      $(document).ajaxStop(function()
      {
         // Stop subsequent calls
         $(this).off("ajaxStop");

         reloadPage();
      });
   }

   function voteOnPost(pid, voteId)
   {
      return new Promise(function(resolve, reject)
      {
         if (typeof pid === 'undefined' || pid === null) { reject(); return; }

         $.post({
                  url: `https://${location.hostname}/posts/${pid}/vote/${voteId}`,
                  data:
                  {
                     fkey: fkey
                  }
               })
         .done(resolve)
         .fail(reject);
      });
   }

   function downvotePost(pid) { return voteOnPost(pid, 3); }

   function deletePost(pid) { return voteOnPost(pid, 10); }

   function undeletePost(pid) { return voteOnPost(pid, 11); }

   // Close individual post
   // closeReasonId: 'NeedMoreFocus', 'SiteSpecific', 'NeedsDetailsOrClarity', 'OpinionBased', 'Duplicate'
   // if closeReasonId is 'SiteSpecific', then siteSpecificReasonId: 11-norepro, 13-nomcve, 16-toolrec, 3-custom
   function closeQuestion(pid, closeReasonId, siteSpecificReasonId, siteSpecificOtherText, duplicateId = null)
   {
      return new Promise(function(resolve, reject)
      {
         if (typeof pid === 'undefined' || pid === null) { reject(); return; }
         if (typeof closeReasonId === 'undefined' || closeReasonId === null) { reject(); return; }
         if (closeReasonId === 'SiteSpecific' && (typeof siteSpecificReasonId === 'undefined' || siteSpecificReasonId === null)) { reject(); return; }
         if (closeReasonId === 'Duplicate' && (typeof duplicateId === 'undefined' || duplicateId === null)) { reject(); return; }

         $.post({
                  url: `https://${location.hostname}/flags/questions/${pid}/close/add`,
                  data:
                  {
                     'fkey': fkey,
                     'closeReasonId': closeReasonId,
                     'duplicateOfQuestionId': (closeReasonId === 'Duplicate' ? duplicateId : null),
                     'siteSpecificCloseReasonId': (closeReasonId === 'Duplicate' ? null : siteSpecificReasonId),
                     'siteSpecificOtherText': siteSpecificOtherText,
                     //'offTopicOtherCommentId': '',
                     'originalSiteSpecificOtherText': 'I’m voting to close this question because ',
                  }
               })
         .done(resolve)
         .fail(reject);
      });
   }

   function closeQuestionAsOffTopic(pid, offTopicReasonId, offTopicOtherText = '')
   {
      return closeQuestion(pid, 'SiteSpecific', offTopicReasonId, offTopicOtherText);
   }

   function closeAndRemoveQuestionWithPrejudice(pid, closeReason, offTopicReasonId, offTopicOtherText = '')
   {
      return new Promise(function(resolve, reject)
      {
         if (typeof pid === 'undefined' || pid === null) { reject(); return; }

         closeQuestion(pid, closeReason, offTopicReasonId, offTopicOtherText).then(function()
         {
            downvotePost(pid).then(function()
            {
               deletePost(pid).then(resolve, reject).finally(reloadPage);
            }, reject)
         }, reject);
      });
   }

   function appendStyles()
   {
      const styles = `
<style>
#nuke-actions .nuke-button {
  display: inline;
  margin: 0 0.5em 0 0;
  padding: 0.3em 0.6em;
  font-size: 90%;
}
</style>
`;
        $('body').append(styles);
   }

   function insertNukeButtons()
   {
      const pid = $('.question').data('questionid');
      const qh = $('#question-header + .grid').first();
      if(qh.length == 0) return;

      qh.find('.grid--cell:last-child').addClass('mr16');

      const nukeActions = $(`
<div class="grid--cell ws-nowrap mb8" id="nuke-actions"><span class="fc-light mr2">Nuke As:&nbsp;</span>
${!isMeta ?
`<a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="4" title="General computer usage (e.g., Super User)" href="javascript:void(0);">User</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="7" title="Professional server administration (e.g., Server Fault)" href="javascript:void(0);">Server</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="3" data-reasontext="This question does not appear to be about programming within the scope defined in the [Help Center](https://stackoverflow.com/help/on-topic)." title="General off-topic" href="javascript:void(0);">Off-Topic</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="16" title="Soliciting recommendations for off-site resources" href="javascript:void(0);">Recommend</a>
`
:
`<a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="6" title="Not about Stack Overflow or the Stack Exchange network" href="javascript:void(0);">Not Meta</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="4" title="Does not appear to seek input and discussion from the community" href="javascript:void(0);">Not Constructive</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="5" title="Rendered obsolete by changes to the system or circumstances" href="javascript:void(0);">No Repro</a>
`
}
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="NeedsDetailsOrClarity" title="Unclear or requires additional details" href="javascript:void(0);">Unclear</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="NeedMoreFocus" title="Not a specific problem with enough detail to identify an adequate answer" href="javascript:void(0);">Too Broad</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OpinionBased" title="Primarily opinion-based" href="javascript:void(0);">Opinion</a>
 <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="SiteSpecific" data-reasonid="3" data-reasontext="This question is not written in English, and therefore does not meet the minimum requirements for Stack Overflow. All posts on this site are [required to be in English](https://meta.stackexchange.com/questions/13676/)." title="Not written in English" href="javascript:void(0);">Not English</a>
</div>`).appendTo(qh);

      nukeActions.one('click', 'a[data-reason]', function()
      {
         nukeActions.find('.nuke-button').attr("disabled", true);
         closeAndRemoveQuestionWithPrejudice(pid, this.dataset.reason, this.dataset.reasonid, this.dataset.reasontext);
      });
   }


   appendStyles();
   insertNukeButtons();
})();
