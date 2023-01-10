// ==UserScript==
// @name         Fun With Flags
// @namespace    https://github.com/codygray/so-userscripts
// @description  Miscellaneous improvements to the UX for the moderator flag dashboard.
// @author       Cody Gray
// @version      0.4.5
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
// @run-at      document-end
// ==/UserScript==
/* eslint-disable no-multi-spaces */
/* global $:readonly              */  // SO/SE sites always provide jQuery, free-of-charge
/* global StackExchange:readonly  */  // this global object always exists on SO/SE domains

// Note: Some of the functionality here is inspired by and/or adapted from Samuel Liew's ModMessageHelper script
//       (https://github.com/samliew/SO-mod-userscripts/blob/master/ModMessageHelper.user.js).
//       One of the things it implements that this doesn't is the ability to pass a URL slug to pre-select a
//       template.

(function()
{
   'use strict';


   // Moderator check
   if (!StackExchange?.options?.user?.isModerator) { return; }

   const parentUrl = StackExchange?.options?.site?.parentUrl || `https://${location.hostname}`;

   appendStyles();
   onPageLoad();
   window.addEventListener('load', onPageLoaded);


   // -----------------------------------------------
   // Data
   // -----------------------------------------------

   // NOTE: Messages can include "{optionalSuspensionAutoMessage}" wherever you want it.
   //       If it is not included anywhere in the message, it will be automatically
   //       appended to the end of the message. In addition (or alternatively),
   //       messages can include "{suspensionDurationDays}".
   // NOTE: Officially-sanctioned options for "reason" include:
   //         - "because of low-quality contributions"
   //         - "for voting irregularities"
   //         - "to cool down"
   //         - "for rule violations"
   //         - "for promotional content"
   //         - "for plagiarism"
   const customModMessages =
   [
      {
         description:  'voluntary suspension upon request',
         reason:       'upon request',
         defaultDays:  30,
         insertBefore: 0,  // consistently low quality questions over time
         message:      `\
As requested&hellip; {optionalSuspensionAutoMessage}

Since this suspension is fully voluntary, you are welcome to reply to this message at any time in order to request that the suspension be lifted early. Otherwise, the suspension will automatically expire in {suspensionDurationDays} days, upon which time your full reputation and privileges will be restored.

We wish you a pleasant and productive vacation from the site, and we look forward to your return!`
      },
      {
         description:  'operating a shared account',
         reason:       'for rule violations',
         defaultDays:  0,
         insertBefore: 0,  // consistently low quality questions over time
         message:      `\
As stated in the [Terms of Service](${parentUrl}/legal/terms-of-service/public), accounts owned by a company or otherwise shared by multiple users are not permitted:

> To access some of the public Network features you will need to **register for an account as an individual** and consent to these Public Network Terms. If you do not consent to these Public Network Terms, Stack Overflow reserves the right to refuse, suspend or terminate your access to the public Network.

Because this account appears to be in breach of this policy, it will be deleted.

{optionalSuspensionAutoMessage}

You are welcome to register for a new account as an *individual* user, subject to the Terms of Service.

Should you wish to appeal this decision, you can contact the company using [this form](${parentUrl}/contact?referrer=${parentUrl}) or by emailing community@stackexchange.com.`
      },
      {
         description:  'operating sockpuppet/evasion accounts',
         reason:       'for rule violations',
         defaultDays:  7,
         insertBefore: 0,  // consistently low quality questions over time
         message:      `\
It has come to our attention that you have been creating and operating multiple ["sockpuppet"](https://en.wikipedia.org/wiki/Sock_puppet_account) accounts as a means for evading system-imposed limitations. This is a violation of our Terms of Service, and it is not fair to other users of {siteName}.

{optionalSuspensionAutoMessage}

All fraudulent accounts will be removed, their votes invalidated, and all unanswered questions deleted. Please refrain from using multiple accounts to circumvent our systems in the future. We take the integrity of the {siteName} systems very seriously, and future incidents of this type will result in increasingly longer suspensions being applied to your main account.

(If you'd like to avoid possible future issues altogether, please use the [contact form](${parentUrl}/contact) and select the "I need to merge user profiles" option, so that we can merge them without penalty.)

It is important to understand that all system- and moderator-imposed limits/blocks/bans/suspensions/etc. apply to the *user*, not just a single account. You are not permitted to create one or more new accounts in order to get around such limitations. If you are hitting a limit on any account, then you should act as if you were hitting that limit on *all* of your accounts.

The most common limitations for people to attempt to evade using multiple accounts are the system-imposed question and answer bans. When you're seeing the message "We are no longer accepting questions/answers from this account", then you are not allowed to post additional questions or answers (whichever applies) from *any* account, even if you're not seeing that message on the other account. For more details about post bans, including what steps you can take to get out of them, please see: [What can I do when getting "We are no longer accepting questions/answers from this account"?](https://meta.stackoverflow.com/questions/255583/)

We do understand that, in certain cases, there are legitimate reasons for operating a secondary account. This is permitted, as long as the additional account is not used to circumvent system- or moderator-imposed limitations and the accounts do not interact with each other. Basically, the rule is that you are not allowed to use multiple accounts to do things that you would not be permitted to do with a single account. If you are interested in learning more about our policies surrounding multiple accounts, please see: [What are the rules governing multiple accounts (i.e. sockpuppets)?](https://meta.stackoverflow.com/q/388984)`
      },
      {
         description:  'ban-evasion via edits',
         reason:       'for low-quality contributions',
         defaultDays:  0,
         insertBefore: 4,  // question repetition
         message:      `\
It has come to our attention that you recently edited [one of your questions]({todo}) to the point where it no longer bore any resemblance to the original version. Specifically, in [revision {todo}]({todo}), you changed {todo}.

[Edits are *only* for improving, clarifying, and adding additional information to a question](${parentUrl}/help/editing). **You are not allowed to change an old question into something completely different.** It is not acceptable to use edits as a ["backdoor"](https://en.wikipedia.org/wiki/Backdoor_(computing)) method of asking a new question because the system will not let you do so. This is especially true for questions that have received answers and/or been closed as duplicates of another question.

Therefore, this edit has been rolled back. You may make, at your discretion, further edits that improve the question, but do not make any more edits that completely change the question.

If the system has blocked you from asking questions, please read: [What can I do when getting "We are no longer accepting questions/answers from this account"?](https://meta.stackoverflow.com/q/255583) You must *improve your existing questions* in order to re-gain the privilege of asking questions on {siteName}. You cannot get around these restrictions by changing old questions or creating a new account. Attempting to do so will only escalate the penalties applied to your account.`
      },
      {
         description:  'inappropriate user name',
         reason:       'to cool down',
         defaultDays:  0,
         insertBefore: 5,  // revenge downvoting
         message:      `\
A moderator has reviewed your account and determined that the user name you chose was inappropriate. While you should feel free to express your personal identity, this is a family-friendly site and we require all user names to comply with our [Code of Conduct](${parentUrl}/conduct). Because all of your contributions to this site display your user name publicly, we cannot make any exceptions to this policy, regardless of what your intentions may be.

Therefore, we will be resetting your user name to a default, automatically-generated one based on your unique numeric user ID.

{optionalSuspensionAutoMessage}

You may keep this default name, or you may choose a new one, if you like. However, please ensure that any name you choose is an appropriate way to represent yourself on this site, that it [does not use expletives](https://meta.stackexchange.com/questions/22232/) or other harsh language, and that it does not defame other users or groups. If you have any questions about this policy, or are unable to change your user name to something else that's reasonable, please let us know by replying to this message.`
      },
      {
         description:  'requesting contact off-site',
         reason:       'for rule violations',
         defaultDays:  0,
         insertBefore: 8,  // excessive self-promotion
         message:      `\
It has come to our attention that one or more of your posts contained a request for users to contact you directly. We wanted to let you know that this is not allowed.

Users on {siteName} are not permitted to request off-site contact for questions or answers. Taking a question and/or its resolution off-site runs counter to [{siteName}'s fundamental goal of building a repository of questions and answers](${parentUrl}/tour). If a question is resolved off-site, it does nothing for future visitors, who are the primary people that this site is intending to help. It is also not permitted to make requests for off-site contact for other purposes.

Therefore, we have removed such requests, along with any contact details you may have shared, from your posts. Do not add them back in or make similar requests in future posts. If you would like to share personal contact information, you may do so by adding it to the "About me" section of your profile. However, you are still not permitted to request users to contact you off-site in order to resolve a question.`
      },
      {
         description:  'excessive vote solicitation in comments',
         reason:       'for promotional content',
         defaultDays:  0,
         insertBefore: 9,  // excessive discussion in comments
         message:      `\
It has come to our attention that you've been posting numerous comments asking other users for upvotes and/or accepts. This is not an appropriate use of comments.

Quoting from the [comment privilege page](${parentUrl}/help/privileges/comment):

> You should submit a comment if you want to:
> * Request **clarification** from the author;
> * Leave **constructive criticism** that guides the author in improving the post;
> * Add relevant but **minor or transient information** to a post (e.g. a link to a related question, or an alert to the author that the question has been updated).

**Please refrain from leaving comments urging users to vote on and/or accept answers in the future.** Such comments may be perceived as begging by other users. The system does have built-in contextual help that recommends new users accept an answer to their question at an appropriate time. Having the message come from the software itself, rather than a comment from a specific user, is preferable for several reasons:

First, it reduces the amount of noise on the site, since the message is displayed only on that user's screen, not as content that every future viewer to the Q&A will see.

Second, it eliminates the possibility that your comment comes across as pressuring the user into accepting and/or upvoting your post. The reality is, no matter how politely and neutrally you phrase the comment, if you have also posted an answer to the question, the receiving user is extremely likely to interpret that comment as pressuring them to accept your answer.

In the best case, comments like these are merely noise, redundant with system-level notifications; in the worst case, they may be perceived as an attempt to pressure someone to do something that is, after all, completely optional.

{optionalSuspensionAutoMessage}

Thank you for your attention to this matter in the future.`
      },
      {
         description:  'excessively trivial bumping edits',
         reason:       'for rule violations',
         defaultDays:  0,
         insertBefore: 10,  // plagiarism
         message:      `\
You appear to be editing one or more of your posts merely to attract attention to it, rather than to improve it. Ongoing cosmetic edits are not constructive and needlessly "bump" your post, which displaces truly active posts that require more community attention.

<!-- Consider linking to and referencing specific post(s) here. -->

Please only edit your post to correct errors, include additional insights, and/or update for changing circumstances. If you continue to make trivial, cosmetic-only edits, we'll have to lock your post from all further edits.

{optionalSuspensionAutoMessage}

Thank you for your attention to this matter. We look forward to your improved contributions in the future.`
      },
      {
         description:  'excessively minor suggested edits',
         reason:       'for low-quality contributions',
         defaultDays:  0,
         insertBefore: 10,  // plagiarism
         message:      `\
It has come to our attention that your recent suggested edits have been excessively minor and have failed to substantively improve the post. Therefore, we wanted to clarify our expectations for suggested edits. As it says in the Help Center page, ["How does editing work?"](${parentUrl}/help/editing):

> Edits are expected to be substantial and to leave the post better than you found it.

Since suggested edits must be reviewed and approved by at least two other users, **we ask that users only make edits that substantially improve a post**. Try to fix *all* of the problems with the post, rather than just correcting/changing a single thing.

<!-- Consider adding some specific examples and explanation here. -->

In order to ensure that this message reaches you before you suggest any more edits, we have temporarily removed your ability to suggest edits for a few days. The privilege will be restored after a few days.

{todo} <!-- Actually suspend the user from suggesting edits, then delete this paragraph. -->

{optionalSuspensionAutoMessage}

Thank you for your attention to this matter. We look forward to your improved contributions in the future.`
      },
      {
         description:  'demanding to show effort/\"not a code-writing service\"',
         reason:       'for rule violations',
         defaultDays:  0,
         insertBefore: 10,  // plagiarism
         message:      `\
We noticed that you have recently left several comments and/or close votes making claims similar to the following:

> {todo}

While we genuinely appreciate your efforts at curating and attempting to maintain the site's quality, we need to point out that [Stack Overflow *is* a code-writing service](https://meta.stackoverflow.com/a/408565) in a very literal sense. After all, it is a programming Q&A site, and most questions here are solved by writing code in the answer.

[Our goal](${parentUrl}/tour) is to build a repository of knowledge, [*not* provide a debugging help-desk for askers](https://meta.stackexchange.com/a/364585). Thus, we do not require that askers provide existing code to debug. Lack of problem-solving effort is not a reason to close or otherwise object to "how-to" questions. [The only type of effort we require is the effort required to ask a clear, focused, non-duplicate question](https://meta.stackoverflow.com/a/260909). Including a failed attempt often adds noise and results in answers that are only applicable to the original asker, rather than being generally useful to anyone who is trying to accomplish the same task. Many of the most useful questions on the site do not include an existing attempt at solving the problem and would not be improved by adding one.

Of course, Stack Overflow is *also not* a free application design and development service. Questions should still be closed as too broad (lacks focus) or unclear if they meet either of those criteria. But please do not try to limit the questions asked here to problems with *existing* code. Instead, focus on the scope and clarity of questions. The goal should be to encourage questions that might help the next person with the same problem.

{optionalSuspensionAutoMessage}

Please do not post any more comments of this type. They merely add noise, may be perceived as demanding or unfriendly, don't assist with our goal of creating a knowledge base, and waste moderators' time to remove.`
      },
      {
         description:  'voting to close spam',
         reason:       'for rule violations',
         defaultDays:  0,
         insertBefore: 10,  // plagiarism
         message:      `\
It has come to our attention that you recently voted to close one or more questions as spam. While we greatly appreciate your willingness to help us out with spam posts as you see them, voting to close spam is not very useful.

**Instead of voting to close spam, you should [flag it as spam](${parentUrl}/help/privileges/flag-posts).** You'll find that option at the very top of the "Flag" dialog.

Flagging as spam is much more expedient than voting to close, and it actually allows spam to be nuked from the site without even requiring intervention by a moderator.

{optionalSuspensionAutoMessage}

Thank you for your attention to this matter in the future. We look forward to handling your flags! If you have any questions, please let us know.`
      },
      {
         description:  'unilateral tag burnination',
         reason:       'for rule violations',
         defaultDays:  7,
         insertBefore: 10,  // plagiarism
         message:      `\
It has come to our attention that you have recently removed many tags from questions without following the burnination process.

As you should be aware, there is [a process for mass tag removal](https://meta.stackoverflow.com/questions/324070), also known as "burnination". The [official policy from Stack Exchange](https://meta.stackoverflow.com/questions/356963) is that the process **must** be followed and that burninations of tags which are used on more than 50 questions **must** be discussed and agreed-upon on [Meta Stack Overflow](https://meta.stackoverflow.com) *prior* to beginning to edit to remove the tag.

All of the edits you made will be reverted. Some of the edits may have included other beneficial changes, which you are welcome to re-apply, as appropriate. However, you are not permitted to systematically, single-handedly remove tags from questions without following the burnination process.

{optionalSuspensionAutoMessage}

If you do this again&mdash;with this or any other tag&mdash;then there will be further consequences.`
      },
      {
         description:  'plagiarism in tag wikis',
         reason:       'for plagiarism',
         defaultDays:  0,
         insertBefore: 10,  // plagiarism
         message:      `\
It has come to our attention that your recent tag wiki edits have consisted primarily or entirely of text copied from other websites. We prefer not to simply copy content already available elsewhere in lieu of [creating something that adds value to this site specifically](https://stackoverflow.blog/2011/03/24/redesigned-tags-page/), and, whenever possible, we prefer that content be your own original work.

Content that is copy-pasted from a Wikipedia article and/or a product description/marketing website is useless in a tag wiki. Tag wikis are not meant to give an introduction to someone who has absolutely no idea about the concept that the tag refers to, and they certainly aren't meant to promote or sell something.

If you do copy some content from elsewhere, please note that we [require full attribution](${parentUrl}/help/referencing), which consists of proper use of blockquote formatting to indicate all copied content, a link to the original source, and the name of the original author (if available).

For more advice on how to write a good tag wiki, please read: [How do I write a good tag wiki? Is it okay to use/copy content published elsewhere?](https://meta.stackoverflow.com/q/318337)

In order to ensure that this message reaches you before you edit any more tag wikis, we have temporarily removed your ability to suggest edits for a few days. The privilege will be restored after a few days.

{todo} <!-- Actually suspend the user from suggesting edits, then delete this paragraph. Yes, you can still suspend the suggested-edit privileges for a user with full editing privileges who has not yet gained the ability to edit tag wikis; this will only remove their ability to suggest edits to tag wikis. If the user has achieved full "trusted user" status, you will need to suspend their account instead. -->

{optionalSuspensionAutoMessage}

Thank you for your attention to this matter. We look forward to your contributions in the future.`
      },
      {
         description:  'ChatGPT-generated content',
         reason:       'for low-quality contributions',
         defaultDays:  7,
         insertBefore: 11,  // something else
         message:      `\
**One or more of your recent posts appear to have been generated by and copied from ChatGPT.** The use of ChatGPT as a source for content on {siteName} is currently banned&mdash;please see [the announcement of this temporary policy on Meta Stack Overflow](https://meta.stackoverflow.com/q/421831). **You are not permitted to use ChatGPT to create content on {siteName} during this ban.**

Among the problems that we have identified with the use of ChatGPT and other machine-generated content on {siteName}, which contributed to our decision to implement this blanket ban, are:

1. **Plagiarism**, which is a failure to indicate and/or properly attribute work that is not your own, including (but not limited to) machine-generated text.

    Our evaluation revealed that one or more of your posts contained text for which you were not the original author. This includes content that has been copy-pasted from the output of an AI generator such as ChatGPT. As a general rule, posts should be **your own** original work.

    The current policy (derived from user consensus) is that even machine-generated text requires [attribution](${parentUrl}/help/referencing). See "[Is it acceptable to post answers generated by an AI, such as GitHub Copilot?](https://meta.stackoverflow.com/q/412696)" for more information.

2. **Lack of regard for accuracy**

    It is our experience that users who rapidly generate content from AIs, including ChatGPT, and then copy-and-paste that into posts on {siteName} are not sufficiently vetting that content for accuracy. This is leading to an influx of low-quality content on this site.

    Using AI, or other tools, to generate a large quantity of answers without regard to if those answers are *correct and actually answer* the question on which they are posted is not acceptable. Relying solely on other users to judge the correctness of the answer&mdash;or even that the answer actually answers the question&mdash;is not permitted.

    This type of content brings down the overall quality of the site. It is ***harmful*** to your fellow users, burdening them with having to wade through a substantial amount of low-quality answers. Furthermore, it is harmful to the authors of the questions to which the answers are posted, as the answers generated by ChatGPT often look superficially reasonable, requiring the asker to waste time trying to understand the answer, thinking that its author is an expert who actually knows what they are talking about, when in reality the answer doesn't really answer the question or is substantially incorrect.

    Users come to {siteName} in order to get high-quality answers from subject-matter experts, not text that is generated by a machine without regard for its accuracy or relevance.

    As some point in the future, using AI as a tool to assist in generating high-quality content *might* be reasonable. Currently, the policies for what, if any, use of AI or similar technologies will be acceptable as a *tool* to *assist you* in creating content, particularly answers, on {siteName} are currently in flux. The restrictions which were in place prior to the existence of ChatGPT were:

    1. *You* confirm that what is posted as an answer *actually answers the question*;

    2. *You* have sufficient expertise in the subject-matter of the question to be able to ensure that any answer you post is correct (as if you wrote it yourself); and

    3. All content copied from such tools is explicitly indicated as not being your own original work, following [our standard referencing policy](${parentUrl}/help/referencing). This requires you to ensure that all text copied from elsewhere is explicitly indicated as a quote with the use of blockquote formatting and attributed to the machine/tool used to generate it.

    We expect that whatever is decided upon as the final policy for using such tools will have *at least* the above requirements (and likely be even more stringent), perhaps prohibiting the use of such technologies altogether.

Therefore, **some, many, or all of your posts have been deleted** because we believe they violated the rules cited above, and, in particular, our current blanket ban on the use of ChatGPT to generate content posted to this site.

If you believe that we have made an error in assessing the source of a specific post, then you may raise an "in need of moderator intervention" flag on that post, providing a detailed explanation of the issue, any evidence you can offer in your defense, and requesting that the post be re-evaluated by another moderator. (You can find links to your deleted posts from your "[deleted questions](${parentUrl}/users/deleted-questions/current)" and your "[deleted answers](${parentUrl}/users/deleted-answers/current)" pages. Links to these pages listing your deleted posts can be found at the bottom of the [questions](${parentUrl}/users/current?tab=questions) and [answers](${parentUrl}/users/current?tab=answers) tabs, respectively, in your user profile.)

In order to ensure that this message reaches you before you post anything else, {optionalSuspensionAutoMessage}

Thank you for your compliance with these policies. We look forward to your future contributions that do not involve the use of ChatGPT.`
      },
   ];

   // -----------------------------------------------
   // Helper/Utility Functions
   // -----------------------------------------------

   function copyAllJQueryEvents(source, destination)
   {
      $.each($._data(source.get(0), 'events'), function()
      {
         $.each(this, function()
         {
            destination.on(this.type, this.handler);
         });
      });
   }

   function attachElementInsertionHandler(containerSelector, elementSelector, callback)
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


   // -----------------------------------------------
   // on*PageLoad() Event Handler Functions
   // -----------------------------------------------

   function onContactCmPageLoad()
   {
      // On the "contact CM -> create" page, bypass the silly extra step requiring clicking
      // the link just to show a pop-up dialog that contains a menu of options, since this
      // is ALWAYS done every time on this page.
      const link  = $('#show-templates');
      const popup = link.next();
      if (link.length === 1)
      {
         link.click();

         $(document).ajaxComplete(function(event, xhr, settings)
         {
            if (settings.url.startsWith('/admin/contact-cm/template-popup/'))
            {
               // Only run this event once: once executed, unbind it.
               $(event.currentTarget).unbind('ajaxComplete');

               // Attempt to find the pop-up dialog, which is inserted into the DOM after the link.
               const popup = link.next();
               if ((popup.length === 1) && popup.hasClass('popup'))
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
               }
            }
         });
      }
   }


   function onUserMessagePageLoad()
   {
      // Prevent the page from automatically being scrolled to the bottom,
      // with the compose message editor focused.
      window.scrollTo(0, 0);
      $('#wmd-input').blur();

      // Remove chat from the sidebar.
      $('.js-chat-ad-link').closest('.s-sidebarwidget').remove();

      // Make the hidden email input parameter visible as a checkbox.
      // Also set up an alternate message for when email is disabled.
      const emailInput = $('#js-send-email');
      emailInput.attr('type', 'checkbox');
      emailInput.after('<label for="js-send-email" id="cg-send-email">send email</label>');
      $('#js-to-warning').after(`<div id="js-to-warning_noemail" class="s-notice s-notice__info mt8 hidden">The user will only see this message on ${StackExchange.options.site.name}.</div>`);
      emailInput.on('change', function()
      {
         const sendEmail = this.checked;
         $('#js-to-warning')        .toggleClass('hidden', !sendEmail);
         $('#js-to-warning_noemail').toggleClass('hidden',  sendEmail);
      });
   }


   function onContactUserPageLoad()
   {
      // When the page has been fully loaded, we're going to automatically display the list of
      // templates inline (we can't do it here, because the "click()" doesn't work). To reduce
      // confusion, go ahead and hide the button here, though.
      // BUG: Sometimes, the auto-click doesn't work, so hiding the button is not tenable.
      //$('button.js-load-modal').hide();

      // Make the hidden "template-name" input parameter visible as a textbox.
      const nameInput = $('#js-template-name');
      nameInput.attr('type', 'text');
      nameInput.addClass('s-input');
      nameInput.wrap('<label for="template-name" id="cg-template-name">template name:</label>');

      // Make the hidden "template-edited" input parameter visible as a checkbox.
      const editedInput = $('#js-template-edited');
      editedInput.attr('type', 'checkbox');
      editedInput.wrap('<label for="js-template-edited" id="cg-template-edited">edited?</label>');

      // Make the hidden "suspend-reason" input parameter visible as a textbox,
      // and move it to a more logical position.
      const reasonInput = $('#js-suspend-reason');
      reasonInput.attr('type', 'text');
      reasonInput.addClass('s-input');
      reasonInput.wrap('<label for="js-suspend-reason" id="cg-suspend-reason" title="Brief suspension reason that will be displayed publicly on the user&rsquo;s profile.">public suspension reason:</label>');
      $('#cg-template-name').before($('#cg-suspend-reason'));

      // Improve the custom number-of-days supension field by making it a numeric (spin) control
      // and enforcing a maximum of 365 days (the form fails rudely for values > 365).
      const daysInput = $('#js-suspend-days');
      daysInput.attr({'type': 'number', 'max': '365'});

      // Update the text of the submit button whenever the suspension
      // status and/or duration changes.
      $('#js-suspend-user, .js-suspend-info input[name="suspend-choice"]').on('change', function()
      {
         updateSuspensionControls();
      });

      // Fix a bug where changing the contents of the "other" field (custom number of days)
      // does not automatically select the corresponding radio button. (Note that this is
      // merely a visual bug, not a behavioral one, since the form always takes the actual,
      // current value of the number-of-days field, and that's already been updated.)
      daysInput.on('change', function()
      {
         $('#js-days-other').trigger('click');
         updateSuspensionControls();
      });

      // If the user edits the message, ensure that the "template-edited" input parameter
      // is checked (set to true).
      $('#wmd-input').on('keyup', function()
      {
         const editedInput = $('#js-template-edited');
         if (!editedInput.is(':checked'))
         {
            editedInput.trigger('click');
         }
      });
   }

   function onContactUserPageLoaded()
   {
      // On the "contact user -> create" page, bypass the silly extra step requiring clicking
      // the link just to show a pop-up dialog that contains a menu of options, since this
      // is ALWAYS done every time on this page.
      const btn   = $('button.js-load-modal');
      const aside = btn.next();
      if ((btn.length === 1) && (aside.length === 1))
      {
         btn.click();

         $(document).ajaxComplete(function(event, xhr, settings)
         {
            if (settings.url.startsWith('/admin/contact-user/template-popup/'))
            {
               // Only run this event once: once executed, unbind it.
               $(event.currentTarget).unbind('ajaxComplete');

               // Restyle and manipulate to inline.
               aside.removeClass('s-modal');
               aside.find('div.s-modal--dialog').addClass('d-grid');
               aside.find('button.s-btn[data-action="s-modal#hide"]').hide();
               btn.hide();

               // Also, to save space (and since they're not very useful anyway),
               // hide the detailed "descriptions" (which are really just the
               // first portion of the template) for each of the options.
               $('.js-action-desc').hide();

               // Add custom items.
               customModMessages.forEach(function(item, index)
               {
                  insertSuspensionReason(-(index + 1),
                                         item.description,
                                         item.reason,
                                         item.message,
                                         Object.hasOwn(item, 'defaultDays') ? item.defaultDays : 0,
                                         Object.hasOwn(item, 'insertBefore') ? item.insertBefore : 11);
               });

               // Attach an event handler to the submit button's click event.
               aside.find('.js-popup-submit').on('click', function()
               {
                  // Reverse our manipulations.
                  if (!btn.is(':visible'))
                  {
                     aside.find('button.s-btn[data-action="s-modal#hide"]').show();
                     aside.find('div.s-modal--dialog').removeClass('d-grid');
                     aside.addClass('s-modal');
                     btn.show();
                  }

                  // Update the next submit button (the one that applies a suspension).
                  // This takes care of the fact that certain of the canned reasons
                  // default to applying a suspension, so the states of the controls
                  // that we added must be updated accordingly.
                  updateSuspensionControls();
               });
            }
         });
      }
   }

   function insertSuspensionReason(id, description, reason, message, defaultDays = 0, insertBeforeId = 11)
   {
      let inputAfter = $(`input#template-${insertBeforeId}`);
      if (!inputAfter || (inputAfter.length !== 1))
      {
         insertBeforeId = 11;
         inputAfter = $(`input#template-${insertBeforeId}`);
      }
      const itemAfter = inputAfter?.parent()?.parent();
      if (itemAfter && (itemAfter.length === 1))
      {
         const userId   = $('#js-about-user-id')[0]?.value;
         const userUrl  = $(`#js-msg-form .user-details a[data-uid="${userId}"]`)[0]?.href;
         const siteName = StackExchange.options.site.name;
         const greeting = 'Hello,\n'
                        + '\n'
                        + `We\'re writing in reference to your ${siteName} account`
                        + (userUrl ? `:\n\n${userUrl}` : '.')
                        + '\n\n';
         message = message.trim()
                          .replaceAll('"', '&quot;')
                          .replaceAll('{siteName}', siteName);
         if (!message.includes('{optionalSuspensionAutoMessage}'))
         {
            message += '\n\n{optionalSuspensionAutoMessage}';
         }

         const itemNew = $('<li>'
                          +  '<label>'
                          +    `<input type="radio" id="template-${id}" name="mod-template"`
                          +    ` value="${greeting}${message}">`
                          +    `<input type="hidden" id="template-${id}-reason"`
                          +    ` data-suspension-description="${reason}"`
                          +    ` value="${reason}"`
                          +    ` data-days="${defaultDays === 0 ? '' : defaultDays}">`
                          +    ` `
                          +    `<span class="js-action-name fw-bold">${description}</span>`
                          +    '<span class="js-action-desc d-none" style="display: none;">'
                          +  '</label>'
                          +'</li>');
         itemAfter.before(itemNew);
         const inputNew = itemNew.find(`#template-${id}`);
         if (inputNew && inputNew.length === 1)
         {
            copyAllJQueryEvents(inputAfter, inputNew);
         }
      }
   }

   function updateSuspensionControls()
   {
      const suspend = !!($('#js-suspend-user').get(0).checked);

      // Update the submit button for the "contact user" form, changing the text label
      // and the style/color to reflect the action that will be taken.
      const button = $('.js-form-submit-controls .js-submit-button');
      if (suspend)
      {
         const days = $('#js-suspend-days').val();
         button.text(`Notify and Suspend User for ${days} Day${(days !== 1) ? 's' : ''}`);
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


   function onReviewPageLoad()
   {
      attachElementInsertionHandler('body.review-task-page .js-review-task .js-review-content',
                                    'ul',
                                    function(element)
      {
         $('a:contains("review suspended")').each(function()
         {
            $(this).addClass('bg-red-100');
         });
      });
   }


   function onUserProfilePageLoad()
   {
      // Semantically color action text in the profile page.
      $(document).ajaxComplete(function(event, xhr, settings)
      {
         $('#user-tab-activity .js-expandable-posts a.s-link').each(function()
         {
            const link = $(this);
            const text = link.text().trim();
            if ((text === "Approve")       ||
                (text === "approved edit") ||
                (text === "Looks OK")      ||
                (text === "No Action Needed"))
            {
               link.addClass('bg-green-050');
            }
            else if ((text === "Leave Closed") ||
                     (text === "Leave Open"))
            {
               link.addClass('bg-powder-100');
            }
            else if ((text === "Edit")             ||
                     (text === "Requires Editing") ||
                     (text === "Needs community edit"))
            {
               link.addClass('bg-yellow-100');
            }
            else if (text === "Reopen")
            {
               link.addClass('bg-bronze-lighter');
            }
            else if ((text === "Close") ||
                     (text === "Needs author edit"))
            {
               link.addClass('bg-orange-100');
            }
            else if ((text === "Reject")          ||
                     (text === "Reject and Edit") ||
                     (text === "rejected edit")   ||
                     (text === "Unsalvageable")   ||
                     (text === "Delete")          ||
                     (text === "Flag"))
            {
               link.addClass('bg-red-100');
            }
         });
      });
   }


   function onPostPageLoad()
   {
      // When opening the "reopen" pop-up modal dialog, pre-select the default submit/OK button,
      // rather than the cancel button, in order to enable dismissal by typing Enter.
      attachElementInsertionHandler('body.question-page', '.s-modal--footer', function(element)
      {
         const $this = $(element);
         $this.find('button.js-cancel-button.js-modal-close').removeClass('js-modal-initial-focus');
         $this.find('button.js-ok-button.s-btn__primary'    ).addClass   ('js-modal-initial-focus');
      });

      // When opening the "mod" menu, customize the lock options to allow more granular durations.
      attachElementInsertionHandler(document, '#se-mod-menu-action-lock-expandable', function(element)
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


   function onPageLoad()
   {
      // Apply page-specific customizations.
      const path = window.location.pathname;
      if (path.startsWith('/admin/cm-message/create/'))
      {
         onContactCmPageLoad();
      }
      if (path.startsWith('/users/message/'))
      {
         onUserMessagePageLoad();
      }
      if (path.startsWith('/users/message/create/'))
      {
         onContactUserPageLoad();
      }
      if (path.startsWith('/review/'))
      {
         onReviewPageLoad();
      }
      if (path.startsWith('/users/'))
      {
         onUserProfilePageLoad();
      }
      if (path.startsWith('/questions/'))
      {
         onPostPageLoad();
      }
      if (path.startsWith('/admin/'))
      {
         // Apply a distinct background to the actual flag text (the part typed by the user)
         // to make it stand out better. This is done by identifying and making it stylable.
         $('.js-flag-text').html((i, html) => html.replace(/^(.*) - </i, `<span class="cg-user-flag-text">$1</span> - <`));

         // When multiple users have raised the same flag, they are listed in a comma-separated list.
         // Break this list onto new lines at the commas, and indent each new line by a fixed amount.
         // (The indented lines won't line up with anything above them, but they'll be obviously indented.)
         $('.js-flagged-post .js-flag-text span.relativetime-clean').each(function()
         {
            const nextElem = this.nextSibling;
            if (nextElem.nodeValue.trim() === ',')
            {
               $(nextElem).replaceWith(',<br>');
               this.nextSibling.nextSibling.nextSibling.style.marginLeft = '32px';
            }
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


   function onPageLoaded()
   {
      // Apply page-specific customizations.
      const path = window.location.pathname;
      if (path.startsWith('/users/message/create/'))
      {
         onContactUserPageLoaded();
      }
   }

   // -----------------------------------------------
   // Style Manipulation
   // -----------------------------------------------

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
 * a horizontal scrollbar.
 * Borrowed from Makyen's version, with (hopefully) minimized side-effects:
 * <https://chat.stackoverflow.com/transcript/message/55059784#55059784>
 */
body:is(.mod-page, .user-page) #content #mainbar > table.clear:not([id]),
body:is(.mod-page, .user-page) #content #mainbar > table.clear:not([id]) > tbody,
body:is(.mod-page, .user-page) #content #mainbar > table.clear:not([id]) > tbody > tr,
body:is(.mod-page, .user-page) #content #mainbar > table.clear:not([id]) > tbody > tr > td:first-child:last-child {
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


/* On Meta, I use the "ignored tags" tool to de-emphasize completed feature requests,
 * but I don't want the fact that these are red status tags to become completely
 * invisible, so this overrides the (current) SE default style that sets the
 * grayscale filter to 100%.
 */
.s-post-summary__ignored .s-post-summary--meta-tags > a,
.s-post-summary__deleted .s-post-summary--meta-tags > a {
   filter: grayscale(65%);
}


/* Styles for classes that we applied. */
.cg-user-flag-text {
    background-color: var(--yellow-050);
    padding: 2px 0 !important;
}


/* Contact CM/User: */
#mainbar > div:first-child > span.revision-comment:first-child {
   display: block;
   padding: 9px;
   background: var(--green-050);
   border: solid 1px var(--green-200);
   border-radius: 3px;
   color: var(--green-700);
   font-size: 110%;
}
#mainbar h2.js-hide-until-confirm {
   margin-top: var(--su16) !important;  /* breathing room */
}

/* Contact CM: */
#mainbar > hr:first-child {
   display: none;  /* hide pointless and inconsistent line at top of page */
}

/* Contact User: */
#js-msg-form #modal-title {
   margin-bottom: 3px;
}
#js-msg-form #modal-description li {
   padding: 3px;
}
#js-msg-form .js-suspend-info {
   margin-top: 3px !important;
   margin-left: 18px;
}
#js-msg-form #js-suspend-days {
   margin: 0 0 0 3px;
   padding: 4px;
}
#js-msg-form #cg-suspend-reason,
#js-msg-form #cg-template-name,
#js-msg-form #cg-template-edited {
   display: block;
   font-weight: bold;
}
#js-msg-form #cg-template-name {
   margin-top: var(--su16) !important;
}
#js-msg-form #cg-template-edited {
   float: right;
}
#js-msg-form #js-template-edited {
   margin-left: 5px;
}
#js-msg-form #wmd-input {
    height: 600px; /* bigger! bigger! (I write a lot.) */
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
})();
