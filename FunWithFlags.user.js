// ==UserScript==
// @name         Fun With Flags
// @description  Miscellaneous improvements to the UX for the moderator flag dashboard.
// @version      0.1.11
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
      // On the "contact user" and/or "contact CM" pages, skip the silly extra step of
      // clicking the link just to show a pop-up dialog containing a menu of options,
      // since this is ALWAYS done each and every time that one navigates to these pages.
      if (window.location.pathname.startsWith('/users/message/create/') ||
          window.location.pathname.startsWith('/admin/cm-message/create/'))
      {
         if (window.location.pathname.startsWith('/users/message/create/'))
         {
            const suspendCheckbox = $('#suspendUser');

            // Make the hidden "suspendReason" input parameter visible.
            const suspendReasonInput = $('#suspendReason');
            suspendReasonInput.removeAttr('type');
            suspendReasonInput.wrap('<div id="cg-suspend-reason"></div>');
            const suspendReasonContainer = $('#cg-suspend-reason');
            suspendReasonContainer.prepend('<label for="suspendReason" id="cg-suspend-reason-desc">Brief suspension reason to display publicly on user profile:</span>');

            // Add a handler to the suspend checkbox that will fire upon state changes.
            suspendCheckbox.on('change', function()
            {
               updateSuspensionControls();
            });
         }

         const link = $('#show-templates');
         link.click();

         $(document).ajaxComplete(function(event, xhr, settings)
         {
            if (settings.url.startsWith('/admin/contact-user/template-popup/') ||
                settings.url.startsWith('/admin/contact-cm/template-popup/'))
            {
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

      // Apply a distinct background to the actual flag text (the part typed by the user) in order
      // to make it stand out better. To do this, we'll identify it, then add a style class.
      $('.js-flag-text').html((i, html) => html.replace(/^(.*) - </i, `<span class="cg-user-flag-text">$1</span> - <`));

      // When multiple users have raised the same flag, they are listed in a comma-separated list.
      // Break this list onto new lines at the commas, and indent each new line by a fixed amount.
      // (The indented lines won't line up with anything above them, but they'll be obviously indented.)
      $('.js-post-flag-group .js-flag-text span.relativetime-clean').each(function()
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


/* Styles for classes that we applied. */
.cg-user-flag-text {
    background-color: var(--powder-100);
    padding: 2px 0 !important;
}


/* Contact user/CM messages: */
#mainbar > hr:first-child {
   display: none;  /* hide pointless and inconsistent line at top of "contact CM" page */
}
#cg-suspend-reason {
   display: flex;
}
#cg-suspend-reason-desc {
   padding: 7px 6px 0 0;
}
#suspendReason {
   flex: 1;
}
#copyPanel label[for="suspendUser"] {
   margin-right: 6px;  /* give some breathing room */
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
