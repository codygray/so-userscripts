// ==UserScript==
// @name         Fun With Flags
// @description  Miscellaneous improvements to the UX for the moderator flag dashboard.
// @version      0.1.5
// @author       Cody Gray
// @homepage     https://github.com/codygray/so-userscripts
//
// @updateURL    https://github.com/codygray/so-userscripts/raw/master/FunWithFlags.user.js
// @downloadURL  https://github.com/codygray/so-userscripts/raw/master/FunWithFlags.user.js
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

(function()
{
   'use strict';


   // Moderator check
   if (typeof StackExchange == "undefined" || !StackExchange.options || !StackExchange.options.user || !StackExchange.options.user.isModerator) { return; }


   function onPageLoad()
   {
      // When opening the "decline" options, pre-select the default reason and focus the submit button.
      $('.js-resolve-action[data-type="decline"]').click(function()
      {
         const flagOpts = $(this).closest('.js-post-flag-group, .js-post-flag-options');
         setTimeout(() =>
         {
            const opt = flagOpts.find('input[name="dismiss-reason"][value="2"]:visible').get(0);
            if (opt)
            {
               opt.click();
            }

            const btn = flagOpts.find('.js-submit-btn').get(0);
            if (btn)
            {
               btn.focus();
            }
         }, 100);
      });
   }

   function appendStyles()
   {
      const styles = `
<style>
/* Compress the flagged post boxes to save screen space. */
.js-flagged-post {
   margin: 24px 12px 0 24px !important;
}

/* Make visited posts a little less opaque. */
.visited-post {
    opacity: 0.7;
}

/* Make the [edited] badge stand out more. */
.s-badge[title^="post edited"] {
    color: var(--orange-500);
    border-color: var(--orange-500);
    /* The [n answers] badge has the .va-baseline class, but the [edited] badge does not.
     * It should: this is a bug in the Stack Overflow mod dashboard CSS.
     * Rather than adding that class, simply add the correct style. */
    vertical-align: baseline;
}

/* Show a "help" cursor on everything that has a tooltip on hover. */
.js-admin-dashboard span[title]:hover {
    cursor: help !important;
}


/* Hide the <p> description to save screen space. */
.js-dismiss-container .js-title + p {
   display: none;
}

/* Compress the flag decline options to save screen space. */
.js-dismiss-container fieldset > .grid--cell {
    margin: 4px 0;
}

/* Make the flag decline reason textbox fill the entire width of the container. */
.js-dismiss-container input.s-input.js-feedback,
.js-dismiss-container textarea {
    width: 100%;
    max-width: 100% !important;
}

/* Strip the "helpful" and "decline" buttons from the pop-up menu to save a click. */
.js-post-flag-options button.s-btn__dropdown.js-resolve-all {
    display: none;
}
.js-post-flag-options button.s-btn__dropdown.js-resolve-all + .s-popover {
    display: block !important;
    position: unset !important;
    background: none;
    border: none;
    box-shadow: none;
    padding: 0;
    position: unset;
    min-width: unset;
    max-width: unset;
    width: auto !important;
    transform: none !important;
    z-index: unset !important;
}
.js-post-flag-options button.s-btn__dropdown.js-resolve-all + .s-popover > .js-resolve-action {
    width: auto !important;
    margin: 0 8px 0 0;
    padding: 0;
}

/* Hide the quick-action buttons that I never use. */
.js-post-flag-options > div > button {
    display: none;
}


/* Unknown: */
.js-admin-dashboard > div.grid--cell {
    position: relative; /* so the decline + delete option goes over the sidebar */
    z-index: 1;
}
</style>
`;
      $('body').append(styles);
   }


   appendStyles();
   onPageLoad();
})();
