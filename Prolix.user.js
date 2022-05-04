// ==UserScript==
// @name         Prolix
// @description  Improve site UX for particularly long-winded users and their allies.
// @version      0.6.4
// @author       Cody Gray
// @homepage     https://github.com/codygray/so-userscripts
// @namespace    https://github.com/codygray/so-userscripts/
// @updateURL    https://github.com/codygray/so-userscripts/raw/master/Prolix.user.js
// @downloadURL  https://github.com/codygray/so-userscripts/raw/master/Prolix.user.js
// @supportURL   https://github.com/codygray/so-userscripts/issues
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


   const IS_META = (location.hostname === 'meta.stackoverflow.com' || StackExchange?.options?.site?.parentUrl);


   function onElementInserted(containerSelector, elementSelector, callback)
   {
      const MutationObserver = (window.MutationObserver || window.WebKitMutationObserver);
      const observer         = new MutationObserver((mutations) =>
      {
         mutations.forEach((mutation) =>
         {
            mutation.addedNodes.forEach((node) =>
            {
               $(node).find(elementSelector).each((i, element) =>
               {
                  callback(element);
               });
            });
         });
      });
      const config    = { childList: true, subtree: true };
      $(containerSelector).each((i, element) =>
      {
         observer.observe(element, config);
      });
   }


   function resizeCommentTextarea(element)
   {
      const styles  = window.getComputedStyle(element) || element.currentStyle;
      const marginT = parseInt(styles.marginTop);
      const marginB = parseInt(styles.marginBottom);
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
      onElementInserted('.js-comments-container', 'textarea[name="comment"].js-comment-text-input', (textarea) =>
      {
         resizeCommentTextarea(textarea);
         textarea.addEventListener('input', () =>
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
.top-bar .-marketing-link,
header.s-topbar .s-navigation
{
   display: none !important;
}

/* Hide ad banners */
#mainbar .question .js-zone-container
{
   display: none;
}


/* UNSTICKY TOP BAR: */
html
{
   --top-bar-allocated-space: 0;
}

body
{
   padding-top: 0;
}
header.top-bar,
body.channels-page header.top-bar,
header.s-topbar
{
   position: initial !important;
}


/* GENERAL: */

/* Make visited links visible again by changing them to a distinct color (e.g., purple).
 * <https://meta.stackoverflow.com/q/392188> */
body .post-text a:not(.post-tag):not(.badge-tag):visited,
body .comment-copy a:visited,
body .wmd-preview a:not(.post-tag):not(.badge-tag):visited,
body .question-hyperlink:visited,
body .answer-hyperlink:visited,
.s-post-summary--content .s-post-summary--content-title a:visited
{
   color: ${IS_META ? '#848586' : '#5C08C3'};
}


/* VOTING CONTAINER: */

/* Make voting arrows and other sidebar content "sticky", so that it scrolls with long posts. */
.votecell .js-voting-container
{
   position: sticky;
   top: 0;
   z-index: 100;
}


/* POST QUICK-LINKS: */

/* Make the quick-links underneath posts appear in lowercase, as God intended. */
.js-post-menu .s-anchors > .flex--item > *
{
   text-transform: lowercase;
}
/* But prevent the lowercase style from affecting other things. */
.js-post-menu .s-anchors > .flex--item > * > *
{
   text-transform: initial;
}

/* Allow hiding individual links. */
.js-post-menu .s-anchors > .flex--item
{
   margin: 0;
}
.js-post-menu .s-anchors > .flex--item button,
.js-post-menu .s-anchors > .flex--item a
{
   margin: 4px;
}
.js-post-menu .s-anchors > .flex--item a
{
   display: block;
}

/* Hide the "follow" link. */
.js-post-menu .s-anchors > .flex--item .js-follow-post
{
   //display: none;
}


/* COMMENTS: */

/* Undo stupid Stacks style that hides the scrollbar arrows. */
.s-input, .s-textarea
{
   scrollbar-color: inherit !important;
}

/* Since this textarea is auto-expanding, no need for scrollbar arrows. */
.comment-form textarea.js-comment-text-input
{
   overflow: hidden;
}
</style>
`;
      document.documentElement.insertAdjacentHTML('beforeend', styles);
    }


   appendStyles();
   onPageLoad();
})();
