// ==UserScript==
// @name         Review Sidebar Link
// @description  Adds a link to the "reviews" to the sidebar of posts.
// @version      0.1.1
// @author       Cody Gray
// @homepage     https://github.com/codygray/so-userscripts
//
// @updateURL    https://github.com/codygray/so-userscripts/raw/master/ReviewSidebarLink.user.js
// @downloadURL  https://github.com/codygray/so-userscripts/raw/master/ReviewSidebarLink.user.js
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

if ( typeof $ === "undefined" ) return;

$(document).ready(function(e)
{
   // Moderator check
   if (typeof StackExchange == "undefined" || !StackExchange.options || !StackExchange.options.user || !StackExchange.options.user.isModerator) { return; }

   // Iterate through each post.
   var $posts = $('.question, .answer');
   $posts.each(function()
   {
      var $post            = $(this);
      //var postType = $post.hasClass('question') ? 'question' : 'answer';
      var $votingContainer = $post.find('.js-voting-container');
      var postID           = $votingContainer.data('post-id');

      // Asynchronously load the moderator menu for this post.
      $.ajax({
         'type'   : 'GET',
         'async'  : true,
         'url'    : '/admin/posts/' + postID + '/moderator-menu',
         'data'   : { 'fkey': StackExchange.options.user.fkey },
         'success': function(data)
         {
            // If the moderator menu was successfully loaded...
            var $modMenu = $(data);

            // Determine how many reviews the post has.
            var $reviews = $modMenu.find('input[name="mod-actions"][value="show-reviews"]');
            if (!$reviews.disabled)
            {
               var reviewsCount = $reviews.siblings('.action-name').find('.mod-flag-indicator').text().trim().split(' ')[0];
               if (reviewsCount !== '')
               {
                  // If the post has reviews...

                  // Asynchronously load the post review history page.
                  $.ajax({
                     'type'   : 'GET',
                     'async'  : true,
                     'url'    : '/admin/posts/' + postID + '/show-reviews',
                     'data'   : { 'fkey': StackExchange.options.user.fkey },
                     'success': function(data)
                     {
                        // If the post review history page was successfully loaded...
                        var $reviewsHistory = $(data);

                        // Only count this review queue if it has had a non-zero count of reviews.
                        var actualReviewsCount = 0;
                        var reviewTooltip      = 'Reviews:\n';
                        var $reviewsTable      = $reviewsHistory.find('#content table.sorter tbody tr').each(function()
                        {
                           var $tr             = $(this);
                           var queue           = $tr.find('td:nth-child(1)').text();
                           var count           = $tr.find('td:nth-child(4)').text();
                           actualReviewsCount += (parseInt(count, 10) > 0);
                           reviewTooltip      += ('   ' + queue + '\t' + count + '\n');
                        });

                        // Build the reviews link.
                        const reviewsLink = '<a class="js-post-issue grid--cell s-btn s-btn__unset c-pointer ta-center py8"' +
                                              ' href="/admin/posts/' + postID + '/show-reviews"'                             +
                                              ' target="_blank" data-shortcut="R"'                                           +
                                              ' title="' + reviewTooltip + '">'                                              +
                                            '<svg aria-hidden="true"'                                                        +
                                                ' class="svg-icon mr2 iconReviewQueue"'                                      +
                                                ' width="18" height="18" viewBox="0 0 18 18">'                               +
                                            '<path d="M16 7.5l-5 4.97-1.79-1.77a1 1 0 0 0-1.4 0l-2.1 2.1a1 1 0 0 0 0 1.4L8.5 17H2a2 2 0 0 1-2-2V3c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v4.5zM12 7H2v2h10V7zm2-4H2v2h12V3zM2 11v2h3v-2H2zm16-.5l-7 7-4-4L8.5 12l2.5 2.5L16.5 9l1.5 1.5z"></path>' +
                                            '</svg>'                                                                         +
                                            actualReviewsCount                                                               +
                                            '</a>';

                        // Determine where to insert the link (after flags, before comments, or at end).
                        var $flagsLink = $votingContainer.find('[data-shortcut="F"]');
                        if ($flagsLink.length !== 0)
                        {
                           $flagsLink.after(reviewsLink);
                        }
                        else
                        {
                           var $deletedCommentsLink = $votingContainer.find('[data-shortcut="D"]');
                           if ($deletedCommentsLink !== 0)
                           {
                              $deletedCommentsLink.before(reviewsLink);
                           }
                           else
                           {
                              $votingContainer.append(reviewsLink);
                           }
                        }
                     }
                  });
               }
            }
         }
      });
   });

   if (window.location.pathname.endsWith('/show-reviews'))
   {
      // Iterate through each review queue.
      var $queues = $('table td a');
      $queues.each(function()
      {
         // Asynchronously load the review page for this post.
         $.ajax({
            'type'   : 'GET',
            'async'  : true,
            'url'    : $queues.attr('href'),
            'data'   : { 'fkey': StackExchange.options.user.fkey },
            'success': function(data)
            {
               // If the review page was successfully loaded...
               var $reviewPage = $(data);
               $reviewPage.ajaxComplete(function()
               {
                  var $reviewSummary       = $reviewPage.find('.review-summary');
                  var $reviewSummaryParent = $reviewSummary.parent();
                  var $linkCell            = $queues.parent();
                  var reviewInfo           = '<td>' + $reviewSummaryParent.html() + '</td>';
                  console.log(reviewInfo);
                  $linkCell.after(reviewInfo);
               });
            }
         });
      });
   }
});
