// ==UserScript==
// @name         Prolix
// @description  Improve site UX for particularly long-winded users.
// @version      0.1.1
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


   function onPageLoad()
   {
      // Make all comment textareas auto-expand vertically as lines of text
      // are added that overflow the currently visible area.
      onElementInserted('.comment-form', 'textarea.js-comment-text-input', function(element)
      {
         $(element).on('input', function()
         {
            const $this = $(this);
            const marginT = parseInt($this.css('margin-top'));
            const marginB = parseInt($this.css('margin-bottom'));
            if (this.scrollHeight > this.clientHeight)
            {
               this.style.height = `${this.scrollHeight + marginT + marginB}px`;
            }
         });
      });
   }

   function appendStyles()
   {
      const styles = `
<style>
/* Make voting arrows and other sidebar content "sticky", so that it scrolls with long posts. */
.js-voting-container {
  position: sticky;
  top: 0;
  z-index: 100;
}

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
