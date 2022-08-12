// ==UserScript==
// @name         Fun With Flags
// @namespace    https://github.com/codygray/so-userscripts
// @description  Miscellaneous improvements to the UX for the moderator flag dashboard.
// @author       Cody Gray
// @version      0.3.2
// @homepageURL  https://github.com/codygray/so-userscripts
// @updateURL    https://github.com/codygray/so-userscripts/raw/master/FunWithFlags.user.js
// @downloadURL  https://github.com/codygray/so-userscripts/raw/master/FunWithFlags.user.js
// @supportURL   https://github.com/codygray/so-userscripts/issues
//
// @match       *://*.stackexchange.com/*
// @match       *://*.stackoverflow.com/*
// @match       *://*.superuser.com/*
// @match       *://*.serverfault.com/*
// @match       *://*.askubuntu.com/*
// @match       *://*.stackapps.com/*
// @match       *://*.mathoverflow.net/*
//
// @exclude     *://stackexchange.com/*
// @exclude     *://api.*
// @exclude     *://blog.*
// @exclude     *://chat.*
// @exclude     *://data.*
// @exclude     *://*.area51.stackexchange.com*
// @exclude     *://stackoverflow.com/advertising*
// @exclude     *://stackoverflow.com/jobs*
// @exclude     *://stackoverflow.com/talent*
// @exclude     *://stackoverflow.com/teams*
// @exclude     *://stackoverflow.com/c/*
//
// @run-at       document-end
// ==/UserScript==
/* eslint-disable no-multi-spaces */
/* global $:readonly    */  // SO/SE sites always provide jQuery, free-of-charge

// Note: Some of the functionality here is inspired by and/or adapted from Samuel Liew's ModMessageHelper script
//       (https://github.com/samliew/SO-mod-userscripts/blob/master/ModMessageHelper.user.js).
//       One of the things it implements that this doesn't is the ability to pass a URL slug to pre-select a
//       template.

(function()
{
   'use strict';


   // Moderator check
   if (!StackExchange?.options?.user?.isModerator) { return; }


   function onElementInserted(containerSelector, elementSelector, callback)
   {
      const onMutationsObserved = function(mutations)
      {
         mutations.forEach(function(mutation)
         {
            if (mutation.addedNodes.length)
            {
               const elements = $(mutation.addedNodes).find(elementSelector);
               for (let i = 0, len = elements.length; i < len; ++i)
               {
                  callback(elements[i]);
               }
            }
         });
      };
      const MutationObserver = (window.MutationObserver || window.WebKitMutationObserver);
      const observer         = new MutationObserver(onMutationsObserved);
      const config           = { childList: true, subtree: true };
      const container        = $(containerSelector);
      for (let i = 0, len = container.length; i < len; ++i)
      {
         observer.observe(container[i], config);
      }
   }


   function updateSuspensionControls()
   {
      const suspend = !!($('#suspendUser').get(0).checked);

      // Update the submit button for the "contact user" form, changing the text label
      // and the style/color to reflect the action that will be taken.
      const button = $('#submit-button');
      if (suspend)
      {
         const days = $('#suspendDays').val();
         button.text(`Notify and Suspend User for ${days} Day${(days != 1) ? 's' : ''}`);
         button.removeClass('s-btn__primary');
         button.addClass('s-btn__danger s-btn__filled');
      }
      else
      {
         button.text('Notify User');
         button.removeClass('s-btn__danger s-btn__filled');
         button.addClass('s-btn__primary');
      }

      // Update the display of the suspension reason.
      $('#cg-suspend-reason').toggle(suspend);
   }

   function onPageLoad()
   {
      // Customize the "contact user" page in all of its forms (creation and reply).
      if (window.location.pathname.startsWith('/users/message/'))
      {
         // Prevent the page from automatically being scrolled to the bottom,
         // with the compose message editor focused.
         window.scrollTo(0, 0);
         $('#wmd-input').blur();

         // Remove chat from the sidebar.
         $('.js-chat-ad-rooms').closest('.s-sidebarwidget').remove();

         // Make the hidden email input parameter visible as a checkbox.
         const emailInput = $('#send-email');
         emailInput.attr('type', 'checkbox');
         emailInput.wrap('<label for="send-email" id="cg-send-email">send email:</label>');
         // Prepare alternate warning message for when email is disabled:
         $('#to_warning').after(`<div id="to_warning_noemail" class="system-alert">The user will only see this message on ${StackExchange.options.site.name}.</div>`);
         emailInput.on('change', function()
         {
            $('#to_warning').toggleClass('hidden', !this.checked);
         });
      }

      // Customize the "contact user -> create" page.
      if (window.location.pathname.startsWith('/users/message/create/'))
      {
         // Make the hidden "templateName" input parameter visible as a textbox.
         const templateNameInput = $('#templateName');
         templateNameInput.attr('type', 'text');
         templateNameInput.addClass('s-input');
         templateNameInput.wrap('<label for="templateName" id="cg-template-name">template name:</label>');

         // Make the hidden "templateEdited" input parameter visible as a checkbox.
         const editedInput = $('#templateEdited');
         editedInput.attr('type', 'checkbox');
         editedInput.wrap('<label for="templateEdited" id="cg-template-edited">edited?</label>');

         // Make the hidden "suspendReason" input parameter visible as a textbox,
         // and move it to a more logical position.
         const suspendReasonInput = $('#suspendReason');
         suspendReasonInput.attr('type', 'text');
         suspendReasonInput.addClass('s-input');
         suspendReasonInput.wrap('<label for="suspendReason" id="cg-suspend-reason" title="Brief suspension reason that will be displayed publicly on the user&rsquo;s profile.">public suspension reason:</label>');
         $('#copyPanel div.suspend-info').after($('#cg-suspend-reason'));

         // Add a handler to the suspend checkbox that will fire upon state changes
         // to update the affected controls.
         const suspendCheckbox = $('#suspendUser');
         suspendCheckbox.on('change', function()
         {
            updateSuspensionControls();
         });

         // Improve the custom number-of-days supension field by making it a numeric control
         // and enforcing a maximum of 365 days (the form fails rudely for values > 365).
         const suspensionDays = $('#suspendDays');
         suspensionDays.attr({'type': 'number', 'max': '365'});
         suspensionDays.addClass('s-input');
      }

      // On the "contact user -> create" and/or "contact CM -> create" pages, bypass the
      // silly extra step requiring clicking the link just to show a pop-up dialog that
      // contains a menu of options, since this is ALWAYS done every time on these pages.
      if (window.location.pathname.startsWith('/users/message/create/') ||
          window.location.pathname.startsWith('/admin/cm-message/create/'))
      {
         const link = $('#show-templates');
         link.click();

         $(document).ajaxComplete(function(event, xhr, settings)
         {
            if (settings.url.startsWith('/admin/contact-user/template-popup/') ||
                settings.url.startsWith('/admin/contact-cm/template-popup/'))
            {
               // Only run this event once: once executed, unbind it.
               $(event.currentTarget).unbind('ajaxComplete');

               // Attempt to find the pop-up dialog, which is inserted into the DOM after the link.
               const popup = link.next();
               if ((popup.length == 1) && popup.hasClass('popup'))
               {
                  // Remove the "popup" style (so that the dialog doesn't get hidden/dismissed when the user clicks
                  // elsewhere on the page, and also to remove some, but not all, inapplicable styles).
                  popup.removeClass('popup');

                  // Style the pop-up dialog so that it appears inline, hide inapplicable UI elements,
                  // and finally insert it in place of the link.
                  popup.attr('style', 'display: inline; position: inherit;');
                  popup.find('.popup-close').hide();
                  popup.find('.popup-actions-cancel').hide();
                  link.replaceWith(popup);

                  if (settings.url.startsWith('/admin/contact-user/template-popup/'))
                  {
                     // Attach an event handler to the submit button's click event.
                     $('#pane-main + .popup-actions .popup-submit').on('click', function()
                     {
                        // Update the next submit button (the one that applies a suspension).
                        // This takes care of the fact that certain of the canned reasons
                        // default to applying a suspension, so the states of the controls
                        // that we added must be updated accordingly.
                        updateSuspensionControls();
                     });

                     // Also update the text of the submit button whenever the suspension duration changes.
                     $('#suspendDays, .suspend-info input[name="suspend-choice"]').on('change', function()
                     {
                        updateSuspensionControls();
                     });
                  }
               }
            }
         });
      }

      if (window.location.pathname.startsWith('/review/'))
      {
         onElementInserted('body.review-task-page .js-review-task .js-review-content', 'ul', function(element)
         {
            $('a:contains("review suspended")').each(function()
            {
               $(this).addClass('bg-red-100');
            });
         });
      }

      if (window.location.pathname.startsWith('/users/'))
      {
         // Semantically color text in profile page.
         $(document).ajaxComplete(function(event, xhr, settings)
         {
            $('#user-tab-activity .history-table td a').each(function()
            {
               const $this = $(this);
               const text  = $this.text();
               if ((text === "Approve")       ||
                   (text === "approved edit") ||
                   (text === "Looks OK")      ||
                   (text === "No Action Needed"))
               {
                  $this.addClass('fc-green-500');
               }
               else if ((text === "Reject")        ||
                        (text === "rejected edit") ||
                        (text === "Unsalvageable"))
               {
                  $this.addClass('fc-red-600');
               }
               else if ((text === "Edit") ||
                        (text === 'Requires Editing'))
               {
                  $this.addClass('fc-yellow-700');
               }
               else if ((text === "Leave Closed") ||
                        (text === "Leave Open"))
               {
                  $this.addClass('fc-black-400');
               }
            });
         });
      }

      // Apply the "danger" class styling to all "decline" buttons
      // (effectively making them red and visually distinct from "helpful" buttons).
      // Note that we cannot merely add the "s-btn__danger" style to the list of styles, since some of the
      // buttons are styled with "s-btn__link", which sets the color back to the default, and that always
      // overrides the color set by the "s-btn__danger" style, due to the order of the style definitions.
      // Sigh, Stacks has regressed web best practices by at least 10 years.
      $('button[data-type="decline"]')
         .addClass('s-btn__danger')
         .css('color', 'var(--red-600)');

      // Same thing for the "delete" and "decline" buttons for comment flags.
      $('.js-comment-flag-options button.js-comment-delete')
         .addClass('s-btn__danger')
         .css('color', 'var(--red-600)');
      $('.js-comment-flag-options button.js-dismiss-flags')
         .addClass('s-btn__muted')
         .css('color', 'var(--black-500)');

      // Apply a distinct background to the actual flag text (the part typed by the user)
      // to make it stand out better. This is done by identifying and making it stylable.
      $('.js-flag-text').html((i, html) => html.replace(/^(.*) - </i, `<span class="cg-user-flag-text">$1</span> - <`));

      // When multiple users have raised the same flag, they are listed in a comma-separated list.
      // Break this list onto new lines at the commas, and indent each new line by a fixed amount.
      // (The indented lines won't line up with anything above them, but they'll be obviously indented.)
      $('.js-flagged-post .js-flag-text span.relativetime-clean').each(function()
      {
         const nextElem = this.nextSibling;
         if (nextElem.nodeValue.trim() == ',')
         {
            $(nextElem).replaceWith(',<br>');
            this.nextSibling.nextSibling.nextSibling.style.marginLeft = '32px';
         }
      });

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

      // When opening the "reopen" pop-up modal dialog, pre-select the default submit/OK button,
      // rather than the cancel button, in order to enable dismissal by typing Enter.
      onElementInserted('body.question-page', '.s-modal--footer', function(element)
      {
         const $this = $(element);
         $this.find('button.js-cancel-button.js-modal-close').removeClass('js-modal-initial-focus');
         $this.find('button.js-ok-button.s-btn__primary'    ).addClass   ('js-modal-initial-focus');
      });

      // When opening the "mod" menu, customize the lock options to allow more granular durations.
      onElementInserted(document, '#se-mod-menu-action-lock-expandable', function(element)
      {
         document.getElementById('mod-menu-lock-duration').parentElement.remove();
         const duration      = element.querySelector('label[for="mod-menu-lock-duration"]');
         const container     = duration.parentElement;
         container.innerHTML = container.innerHTML
                             + '<div class="flex--item">'
                             + '  <input type="number" class="s-input lh-sm" name="cg-lock-duration-numeric" id="cg-lock-duration-numeric" min="1" max="10000" step="1" value="1" />'
                             + '</div>'
                             + '<div class="flex--item s-select">'
                             + '  <select name="cg-lock-duration-range" id="cg-lock-duration-range" class="js-lock-duration">'
                             + '    <option value="1"   data-shortcut="H">hour(s)</option>'
                             + '    <option value="24"  data-shortcut="D">day(s)</option>'
                             + '    <option value="168" data-shortcut="W">week(s)</option>'
                             + '    <option value="-1"  data-shortcut="P">permanent</option>'
                             + '  </select>'
                             + '</div>'
                             + '<div class="flex--item">'
                             + '  <input type="hidden" class="s-input" name="duration" id="mod-menu-lock-duration" value="1" disabled />'
                             + '</div>'
                             ;

         const numeric = document.getElementById('cg-lock-duration-numeric');
         const range   = document.getElementById('cg-lock-duration-range');
         numeric.addEventListener('click' , onChangeLockDuration);
         numeric.addEventListener('change', onChangeLockDuration);
         range  .addEventListener('click' , onChangeLockDuration);
         range  .addEventListener('change', onChangeLockDuration);
         $('#se-mod-menu-action-lock-expandable input[name="noticetype"]').change(function()
         {
            switch (this.value)
            {
               case '20':  // content dispute
               case '21':  // comments only
               {
                  range.value = 1;
                  break;
               }
               case '22':  // historical significance
               case '23':  // wiki answer
               case '28':  // obsolete
               {
                  range.value = -1;
                  break;
               }
            }
            onChangeLockDuration();
         });
      });
   }

   function onChangeLockDuration()
   {
      const numeric      = document.getElementById('cg-lock-duration-numeric');
      const range        = document.getElementById('cg-lock-duration-range');
      const numericValue = Number(numeric.value);
      const rangeValue   = Number(range  .value);
      const isPermanent  = (rangeValue === -1);
      const actualValue  = (isPermanent ? -1 : (numericValue * rangeValue));
      numeric.disabled   = isPermanent;
      document.getElementById('mod-menu-lock-duration').value = actualValue.toString();
   }


   function appendStyles()
   {
      const styles = `
<style>
/* Fix long-standing bug where redaction flags overflow. */
.js-redaction-flag-cell {
   overflow-x: auto;
}

/* Fix long-standing bug where code blocks cause CM escalation messages and mod messages
 * to overflow. This confines them to the width of the #mainbar container, resulting in
 * a horizontal scrollbar. */
.mod-page #content #mainbar > table,
.mod-page #content #mainbar > table > tbody,
.mod-page #content #mainbar > table > tbody > tr,
.mod-page #content #mainbar > table > tbody > tr > td:first-child:last-child {
   display: block;
   width: 100%;
}

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

/* Strip the "decline and delete" button from the pop-up menu to save a click.
.js-comment-flag-options button.s-btn[data-controller="s-popover"] {
    display: none;
}
.js-comment-flag-options .js-dismiss-flags + div.grid--cell {
    display: none;
}
.js-comment-flag-options button.s-btn[data-controller="s-popover"] + .s-popover {
    display: block !important;
    background: 0;
    border: none;
    box-shadow: none;
    min-width: unset !important;
    max-width: unset !important;
    width: auto !important;
    z-index: unset !important;
    margin: 0;
    padding: 0;
}
.js-comment-flag-options button.s-btn[data-controller="s-popover"] + .s-popover > .js-delete-and-dismiss-flags {
    top: 16px;
    left: 17px;
}
*/


/* Styles for classes that we applied. */
.cg-user-flag-text {
    background-color: var(--yellow-050);
    padding: 2px 0 !important;
}


/* Contact user/CM messages: */
#mainbar > hr:first-child {
   display: none;  /* hide pointless and inconsistent line at top of "contact CM" page */
}
#mainbar > div:first-child > span.revision-comment:first-child {
   display: block;
   padding: 9px;
   background: var(--green-050);
   border: solid 1px var(--green-200);
   border-radius: 3px;
   color: var(--green-700);
   font-size: 110%;
}
#msg-form #to_warning,
#msg-form #to_warning_noemail {
   margin-bottom: 0;
}
#msg-form #to_warning_noemail {
    display: none;
   line-height: 100%;
}
#msg-form #to_warning,
#msg-form #to_warning.hidden + #to_warning_noemail {
   display: inline-block;
}
#msg-form #cg-send-email {
   display: block;
}
#msg-form #send-email {
   margin-left: 6px;
}
#msg-form #suspendDays {
   margin: 0 0 0 3px;
   padding: 4px;
   font-size: inherit;
   width: 75px;
}
#msg-form #copyPanel div.suspend-info b {
   color: var(--red);
}
#msg-form #cg-suspend-reason,
#msg-form #cg-template-name {
   display: flex;
   line-height: 44px;  /* vertically align with textbox */
}
#msg-form #cg-template-name {
   margin-top: 30px;
}
#msg-form #suspendReason,
#msg-form #templateName {
   flex: 1;
   width: 100%;
   margin: 6px 0 6px 6px;
   font-size: inherit;
}
#msg-form #copyPanel label[for="suspendUser"] {
   margin-right: 6px;  /* give some breathing room */
}
#msg-form #cg-template-edited {
   float: right;
}
#msg-form #templateEdited {
   margin: 0 0 5px 6px;
}
#msg-form #copyPanel #wmd-input {
    min-height: 600px;
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
