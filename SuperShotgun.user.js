// ==UserScript==
// @name         Super Shotgun
// @description  Facilitates immediate, hassle-free removal of inappropriate questions by a moderator.
// @author       Cody Gray
// @version      1.1
// @homepageURL  https://github.com/codygray/so-userscripts
// @updateURL    https://github.com/codygray/so-userscripts/raw/master/SuperShotgun.user.js
// @downloadURL  https://github.com/codygray/so-userscripts/raw/master/SuperShotgun.user.js
// @supportURL   https://github.com/codygray/so-userscripts/issues
// @icon         https://raw.githubusercontent.com/codygray/so-userscripts/master/SuperShotgun.png
// @icon64       https://raw.githubusercontent.com/codygray/so-userscripts/master/SuperShotgun64.png
//
// @match        *://*.stackoverflow.com/questions/*
// @match        *://*.stackexchange.com/questions/*
// @match        *://*.stackapps.com/questions/*
// @match        *://*.superuser.com/questions/*
// @match        *://*.serverfault.com/questions/*
// @match        *://*.askubuntu.com/questions/*
// @match        *://*.mathoverflow.net/questions/*
//
// @run-at       document-end
// ==/UserScript==
/* eslint-disable no-multi-spaces */
/* global $:readonly              */  // SO/SE sites always provides jQuery, free-of-charge
/* global StackExchange:readonly  */  // this global object always exists on SO/SE domains

(function() {
   'use strict';

   const IS_META = (typeof StackExchange.options.site.parentUrl !== 'undefined');
   const IS_SO   = location.hostname === 'stackoverflow.com';
   const IS_MSO  = location.hostname === 'meta.stackoverflow.com' && IS_META;
   const IS_MOD  = StackExchange.options.user.isModerator;
   const FKEY    = StackExchange.options.user.fkey;

   if ((typeof StackExchange === 'undefined') || !FKEY)  { return; }


   function reloadPage()
   {
      location.reload();
      return true;
   }

   function reloadWhenComplete()
   {
      // Triggers when all ajax requests have completed
      $(document).ajaxStop(function()
      {
         // Stop subsequent calls
         $(this).off("ajaxStop");

         reloadPage();
      });
   }

   async function reloadPost(postID)
   {
      if (postID && StackExchange?.realtime?.reloadPosts)
      {
         const result = await StackExchange.realtime.reloadPosts(postID);
         if (result)
         {
            return true;
         }
      }
      return reloadPage();
   }


   async function voteOnPost(postID, voteID)
   {
      if (!postID)
      {
         throw new Error('The required "postID" parameter is missing.');
      }

      if (!voteID)
      {
         throw new Error('The required "voteID" parameter is missing.');
      }

      await Promise.resolve($.post({
                                     url:  `${location.origin}/posts/${postID}/vote/${voteID}`,
                                     data:
                                     {
                                       fkey: FKEY,
                                     },
                                   }));

      return true;
   }

   async function downvotePost(postID)  { return voteOnPost(postID,  3); }

   async function deletePost(postID)    { return voteOnPost(postID, 10); }

   async function undeletePost(postID)  { return voteOnPost(postID, 11); }


   // The 'closeReason' parameter must be one of:
   //   - 'Duplicate'
   //   - 'NeedsDetailsOrClarity'
   //   - 'NeedMoreFocus'
   //   - 'OpinionBased'
   //   - 'SiteSpecific'
   // If the 'closeReason' parameter is 'SiteSpecific', then the 'siteSpecificReason' parameter
   // must be a numeric ID corresponding to one of the site-specific reasons.
   async function closeQuestion(questionID,
                                closeReason,
                                siteSpecificReason    = null,
                                siteSpecificOtherText = null,
                                duplicateID           = null)
   {
      if (!questionID)
      {
         throw new Error('The required "questionID" parameter is missing.');
      }

      if (!closeReason)
      {
         throw new Error('The required "closeReason" parameter is missing.');
      }

      if (closeReason === 'OffTopic')
      {
         // OffTopic has been replaced with SiteSpecific.
         closeReason = 'SiteSpecific';
      }

      if ((closeReason === 'SiteSpecific') && !siteSpecificReason)
      {
         throw new Error('The required "siteSpecificReason" parameter is missing.');
      }

      if ((closeReason === 'Duplicate') && !duplicateID)
      {
         throw new Error('The required "duplicateID" parameter is missing.');
      }

      console.log(`%c Closing question #${questionID} as ${closeReason}, reason ${siteSpecificReason} (${siteSpecificOtherText}).`,
                  'font-weight: bold');

      await Promise.resolve($.post({
                                     url:  `${location.origin}/flags/questions/${questionID}/close/add`,
                                     data:
                                     {
                                       fkey:                           FKEY,
                                       closeReasonId:                  closeReason,
                                       duplicateOfQuestionId:          (closeReason === 'Duplicate'   ) ? duplicateID           : null,
                                       siteSpecificCloseReasonId:      (closeReason === 'SiteSpecific') ? siteSpecificReason    : null,
                                       siteSpecificOtherText:          (closeReason === 'SiteSpecific') ? siteSpecificOtherText : null,
                                       originalSiteSpecificOtherText: 'I\u2019m voting to close this question because ',
                                     },
                                   }));

      return true;
   }

   async function closeQuestionAsDuplicate(questionID, duplicateID)
   {
      return closeQuestion(questionID, 'Duplicate', null, null, duplicateID);
   }

   async function closeQuestionAsUnclear(questionID)
   {
      return closeQuestion(questionID, 'NeedsDetailsOrClarity', null, null, null);
   }

   async function closeQuestionAsUnfocused(questionID)
   {
      return closeQuestion(questionID, 'NeedMoreFocus', null, null, null);
   }

   async function closeQuestionAsOpinionBased(questionID)
   {
      return closeQuestion(questionID, 'OpinionBased', null, null, null);
   }

   async function closeQuestionAsOffTopic(questionID, reasonID, reasonText = '')
   {
      return closeQuestion(questionID, 'SiteSpecific', reasonID, reasonText, null);
   }


   async function nukeQuestion(questionID,
                               closeReason,
                               siteSpecificReason    = null,
                               siteSpecificOtherText = null)
   {
      do
      {
         try
         {
            await closeQuestion(questionID,
                                closeReason,
                                siteSpecificReason,
                                siteSpecificOtherText,
                                null);

            await downvotePost(questionID);

            if (IS_MOD)
            {
               await deletePost(questionID);
            }

            await reloadPage(questionID);

            return true;
         }
         catch (e)
         {
            reloadPage();
            console.error(e);
         }
      }
      while (window.confirm('Something is wrong with your shotgun, Duke. Check the console to see more details.'
                          + '\n\nDo you want to retry?'));
      return false;
   }


   function insertNukeButtons()
   {
      const qid = $('.question').data('questionid');
      const qh  = $('#question-header + .d-flex').first();
      if (qh.length > 0)
      {
         qh.find('.flex--item:last-child').addClass('mr16');

         function makeNukeBtn(caption, tooltip, reason, reasonID = null, reasonText = null)
         {
            return `<a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined"
                       href="javascript:void(0);"
                       title="${tooltip}"
                       data-reason="${reason}"
                       ${reasonID   ? `data-reasonid="${reasonID}"`     : ''}
                       ${reasonText ? `data-reasontext="${reasonText}"` : ''}
                    >${caption}</a>`;
        }

         let nukeActionsHtml = '<div class="flex--item ws-nowrap mb8" id="nuke-actions"><span class="fc-light mr2">Nuke As:&nbsp;</span>';
         if (IS_SO)
         {
            nukeActionsHtml += makeNukeBtn('Not Prog',
                                           'Not about programming, software-development tools, or a specific algorithm',
                                           'SiteSpecific',
                                           '18');
            nukeActionsHtml += makeNukeBtn('App Stores',
                                           'Asking for customer support with third-party services, such as app stores',
                                           'SiteSpecific',
                                           '3',
                                           'Questions asking for [customer support with third-party services](https://meta.stackoverflow.com/questions/255745 &quot;Why can\'t I ask customer service-related questions on Stack Overflow?&quot;), including [developer-centric questions about App Stores](https://meta.stackoverflow.com/q/272165 &quot;Are developer-centric questions about application stores on topic?&quot;) are off-topic for Stack Overflow. Instead, please direct your questions to the relevant company/organization\'s technical support team.');
            nukeActionsHtml += makeNukeBtn('Recommend',
                                           'Soliciting recommendations for off-site resources',
                                           'SiteSpecific',
                                           '16');
            nukeActionsHtml += makeNukeBtn('Typo/No Repro',
                                           'Problem was caused a typo and/or is not reproducible',
                                           'SiteSpecific',
                                           '11');
         }
         if (IS_MSO)
         {
            nukeActionsHtml += makeNukeBtn('Not Meta',
                                           'Not about Stack Overflow or the Stack Exchange network',
                                           'SiteSpecific',
                                           '6');
            nukeActionsHtml += makeNukeBtn('Not Constructive',
                                           'Does not appear to seek input and discussion from the community',
                                           'SiteSpecific',
                                           '4');
            nukeActionsHtml += makeNukeBtn('No Repro',
                                           'Rendered obsolete by changes to the system or circumstances',
                                           'SiteSpecific',
                                           '5');
         }
         nukeActionsHtml += makeNukeBtn('Unclear',
                                        'Unclear or requires additional details',
                                        'NeedsDetailsOrClarity');
         nukeActionsHtml += makeNukeBtn('Too Broad',
                                        'Not a specific problem with enough detail to identify an adequate answer',
                                        'NeedMoreFocus');
         nukeActionsHtml += makeNukeBtn('Opinion',
                                        'Primarily opinion-based',
                                        'OpinionBased');
         nukeActionsHtml += makeNukeBtn('Not English',
                                        'Not written in English',
                                        'SiteSpecific',
                                        IS_SO ? '19' : '3',
                                        IS_SO ? null : `This question is not written in English, and therefore does not meet the minimum requirements for ${StackExchange?.options?.site?.name ?? 'this site'}. All posts on this site are [required to be in English](https://meta.stackexchange.com/questions/13676/).`);
         nukeActionsHtml += '</div>';

         const nukeActions = $(nukeActionsHtml);
         nukeActions.appendTo(qh)
                    .one('click', 'a[data-reason]', function()
                         {
                            nukeActions.find('.nuke-button').attr('disabled', true);
                            nukeQuestion(qid,
                                         this.dataset.reason,
                                         this.dataset.reasonid,
                                         this.dataset.reasontext);
                         });
      }
   }


   function appendStyles()
   {
      $('body').append(`
<style>
#nuke-actions .nuke-button
{
   display:   inline;
   margin:    0 0.5em 0 0;
   padding:   0.2em 0.5em;
   font-size: 90%;
}
</style>
                       `);
   }


   appendStyles();
   insertNukeButtons();
})();
