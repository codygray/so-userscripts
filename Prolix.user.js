// ==UserScript==
// @name         Prolix
// @description  Improve site UX for particularly long-winded users and their allies.
// @version      0.2.3
// @author       Cody Gray
// @homepage     https://github.com/codygray/so-userscripts
//
// @updateURL    https://github.com/codygray/so-userscripts/raw/master/Prolix.user.js
// @downloadURL  https://github.com/codygray/so-userscripts/raw/master/Prolix.user.js
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
// ==/UserScript==

(function()
{
   'use strict';


   const isMeta = (location.hostname == 'meta.stackoverflow.com' || (typeof StackExchange.options.site.parentUrl !== 'undefined'));

   function onElementInserted(containerSelector, elementSelector, callback)
   {
      const onMutationsObserved = function(mutations)
      {
         mutations.forEach(function(mutation)
         {
            if (mutation.addedNodes.length)
            {
               const elements = $(mutation.addedNodes).find(elementSelector);
               for (var i = 0, len = elements.length; i < len; ++i)
               {
                  callback(elements[i]);
               }
            }
         });
      };
      const MutationObserver = (window.MutationObserver || window.WebKitMutationObserver);
      const observer = new MutationObserver(onMutationsObserved);
      const config = { childList: true, subtree: true };
      const container = $(containerSelector);
      for (var i = 0, len = container.length; i < len; ++i)
      {
         observer.observe(container[i], config);
      }
   }


   function resizeCommentTextarea(element)
   {
      const $element = $(element);
      const marginT = parseInt($element.css('margin-top'));
      const marginB = parseInt($element.css('margin-bottom'));
      if (element.scrollHeight > element.clientHeight)
      {
         element.style.height = `${element.scrollHeight + marginT + marginB}px`;
      }
   }

   function onPageLoad()
   {
      // Make all comment textareas auto-expand vertically to fit their text, both upon
      // initial appearance (e.g., clicking "edit") and when composing as lines of text
      // are added that overflow the currently visible area.
      onElementInserted('.js-comments-list', 'textarea[name="comment"].js-comment-text-input', function(element)
      {
         const textarea = $(element);
         resizeCommentTextarea(element);
         textarea.on('input', function()
         {
            resizeCommentTextarea(this);
         });
      });
   }

   function appendStyles()
   {
      const styles = `
<style>
/* REMOVE CLUTTER: */

/* Remove the "Products" menu in the Stack Overflow top nav bar.
 * <https://meta.stackoverflow.com/q/386393> */
.top-bar .-marketing-link {
    display: none !important;
}

/* GENERAL: */

/* Make visited links visible again by changing them to a distinct color (e.g., purple).
 * <https://meta.stackoverflow.com/q/392188> */
body .post-text a:not(.post-tag):not(.badge-tag):visited,
body .comment-copy a:visited,
body .wmd-preview a:not(.post-tag):not(.badge-tag):visited,
body .question-hyperlink:visited,
body .answer-hyperlink:visited {
    color: ${isMeta ? '#848586' : '#5C08C3'};
}

/* VOTING CONTAINER: */

/* Make voting arrows and other sidebar content "sticky", so that it scrolls with long posts. */
.js-voting-container {
  position: sticky;
  top: 0;
  z-index: 100;
}

/* COMMENTS: */

/* Undo stupid Stacks style that hides the scrollbar arrows. */
.s-input, .s-textarea {
   scrollbar-color: inherit !important;
}

/* Since this textarea is auto-expanding, no need for scrollbar arrows. */
.comment-form textarea.js-comment-text-input {
   overflow: hidden;
}
</style>
`;
       $('body').append(styles);
    }


   appendStyles();
   onPageLoad();
})();
