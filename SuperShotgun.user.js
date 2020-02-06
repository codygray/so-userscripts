// ==UserScript==
// @name         Super Shotgun
// @description  Facilitates immediate, hassle-free removal of inappropriate questions by a moderator.
// @version      0.1
// @author       Cody Gray
//
// @include      https://*stackoverflow.com/*
//
// @exclude      *chat.*
// @exclude      https://stackoverflow.com/c/*
// ==/UserScript==

// Credit goes to fellow moderator Samuel Liew, on whose prior work
// (https://github.com/samliew/so-mod-userscripts) much of this code is based.

(function() {
    'use strict';

    // Moderator check
    if(typeof StackExchange == "undefined" || !StackExchange.options || !StackExchange.options.user || !StackExchange.options.user.isModerator ) return;

    const fkey = StackExchange.options.user.fkey;
    const isMeta = (location.hostname == 'meta.stackoverflow.com' || (typeof StackExchange.options.site.parentUrl !== 'undefined'));

    function reloadPage() {
        location.reload(true);
    }

    function reloadWhenDone() {
        // Triggers when all ajax requests have completed
        $(document).ajaxStop(function() {
            // Stop subsequent calls
            $(this).off("ajaxStop");

            reloadPage();
        });
    }

    function voteOnPost(pid, voteId) {
        return new Promise(function(resolve, reject) {
            if(typeof pid === 'undefined' || pid === null) { reject(); return; }

            $.post({
                url: `https://${location.hostname}/posts/${pid}/vote/${voteId}`,
                data: {
                    fkey: fkey
                }
            })
            .done(resolve)
            .fail(reject);
        });
    }

    function downvotePost(pid) {
        return voteOnPost(pid, 3);
    }

    function deletePost(pid) {
        return voteOnPost(pid, 10);
    }

    function undeletePost(pid) {
        return voteOnPost(pid, 11);
    }

    function closeQuestion(pid, closeReason, offTopicReasonId, offTopicOtherText = '') {
        return new Promise(function(resolve, reject) {
            if(typeof pid === 'undefined' || pid === null) { reject(); return; }
            if(typeof closeReason === 'undefined' || closeReason === null || closeReason == '') { reject(); return; }
            if (closeReason == 'OffTopic') {
                if (typeof offTopicReasonId === 'undefined' || offTopicReasonId === null) { reject(); return; }
            }
            else {
                offTopicReasonId = null;
                offTopicOtherText = null;
            }

            $.post({
                url: `https://${location.hostname}/flags/questions/${pid}/close/add`,
                data: {
                    'fkey': fkey,
                    'closeReasonId': closeReason,
                    'closeAsOffTopicReasonId': offTopicReasonId,
                    'offTopicOtherText': offTopicOtherText,
                    'duplicateOfQuestionId': null,
                }
            })
            .done(resolve)
            .fail(reject);
        });
    }

    function closeQuestionAsOffTopic(pid, offTopicReasonId, offTopicOtherText = '') {
        return closeQuestion(pid, 'OffTopic', offTopicReasonId, offTopicOtherText);
    }

    function closeAndRemoveQuestionWithPrejudice(pid, closeReason, offTopicReasonId, offTopicOtherText = '') {
        return new Promise(function(resolve, reject) {
            if(typeof pid === 'undefined' || pid == null) { reject(); return; }

            closeQuestion(pid, closeReason, offTopicReasonId, offTopicOtherText).then(function() {
                downvotePost(pid).then(function() {
                    deletePost(pid).then(resolve, reject).finally(reloadPage);
                }, reject)
            }, reject);
        });
    }

    function appendStyles() {
        const styles = `
<style>
.js-voting-container {
  position: sticky;
  top: 0;
}

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

    function insertNukeButtons() {
        const pid = $('.question').data('questionid');
        const qh = $('#question-header + .grid').first();
        if(qh.length == 0) return;

        qh.find('.grid--cell:last-child').addClass('mr16');

        const nukeActions = $(`<div class="grid--cell ws-nowrap mb8" id="nuke-actions"><span class="fc-light mr2">Nuke As:&nbsp;</span>
                              ${!isMeta ?
    `<a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="4" title="General computer usage (e.g., Super User)" href="#">User</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="7" title="Professional server administration (e.g., Server Fault)" href="#">Server</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="3" data-reasontext="This question does not appear to be about programming within the scope defined in the [help]." title="General off-topic" href="#">Off-Topic</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="16" title="Soliciting recommendations for off-site resources" href="#">Recommend</a>`
                              :
    `<a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="6" title="Not about Stack Overflow or the Stack Exchange network" href="#">Not Meta</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="4" title="Does not appear to seek input and discussion from the community" href="#">Not Constructive</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="5" title="Rendered obsolete by changes to the system or circumstances" href="#">No Repro</a>`
                              }
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="NeedsDetailsOrClarity" title="Unclear or requires additional details" href="#">Unclear</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="NeedMoreFocus" title="Not a specific problem with enough detail to identify an adequate answer" href="#">Too Broad</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OpinionBased" title="Primarily opinion-based" href="#">Opinion</a>
     <a class="nuke-button ws-nowrap s-btn s-btn__danger s-btn__outlined" data-reason="OffTopic" data-reasonid="3" data-reasontext="This question is off-topic because it is not written in English. All posts on this site are required to be in English." title="Not written in English" href="#">Not English</a>
</div>`).appendTo(qh);

         nukeActions.one('click', 'a[data-reason]', function() {
             nukeActions.find('.nuke-button').attr("disabled", true);
             closeAndRemoveQuestionWithPrejudice(pid, this.dataset.reason, this.dataset.reasonid, this.dataset.reasontext);
        });
    }

    // On page load
    appendStyles();
    insertNukeButtons();
})();
