// let params = new URLSearchParams(window.location.href),
//     checkparams = params.get('tpae_user_review');

// if( checkparams ) {
    document.addEventListener("DOMContentLoaded", function () {

        var reviewContentCon = document.querySelector('.tpae-update-popup-container');

        const updateReviewContent = () => {
            let review_container = `<div id="tp-update-popup" class="tp-update-popup">
                                        <div class="tp-update-popup-inner">
                                            <i class="theplus-i-cross"></i>
                                            <div class="tp-popup-header">
                                                <h2>What’s New in This Update?</h2>
                                            </div>
                                            <div class="tp-popup-body" style="height:100%;position:relative;">
                                                <iframe width="100%" height="100%"
                                                    src="https://www.youtube.com/embed/hByRIff5V0s?autoplay=1&mute=1&rel=0&showinfo=0"
                                                    title="YouTube video" frameborder="0" allowfullscreen>
                                                </iframe>
                                            </div>
                                        </div>
                                    </div>`;
            reviewContentCon.innerHTML = review_container;
        };

        jQuery(document).on('click', '.toplevel_page_theplus_welcome_page .tpae-update-popup-container .tp-update-popup-inner .theplus-i-cross', function(e) {
            e.preventDefault();
            
            var VideoPopup = jQuery('.tpae-update-popup-container');
            
            VideoPopup.find('iframe').remove();
            VideoPopup.hide();

            var menuItem = document.querySelector('#toplevel_page_theplus_welcome_page');
            if (menuItem) {
                menuItem.classList.remove('tpae-admin-notice-active');
            }

            jQuery.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'tpae_update_popup_dismiss',
                    security: tpaeUpdatePopup.nonce,
                    type: 'tpae_update_popup_close',
                },
                success: function(response) {
                    VideoPopup.hide();

                    var menuItem = document.querySelector('#toplevel_page_theplus_welcome_page');
					if (menuItem) {
						menuItem.classList.remove('tpae-admin-notice-active');
					}
                }
            });
        });

        const hash = window.location.href;

        if( hash.includes('theplus_welcome_page') ) {
            updateReviewContent();
        }

    });
// }