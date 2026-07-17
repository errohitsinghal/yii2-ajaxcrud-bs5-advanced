/*!
 * ModalStack
 * =================================
 * Nested modal support for yii2-ajaxcrud-bs5-advanced.
 *
 * A modal's level is a property of WHERE THE CLICK HAPPENED, not of the link:
 * the same view is routinely rendered both as a full page and as modal content,
 * so any scheme that statically tags a link is wrong half the time.
 */
(function (window, $) {
    'use strict';

    // Bootstrap 5 defaults (--bs-modal-zindex / --bs-backdrop-zindex).
    var BASE_MODAL_Z = 1055;
    var BASE_BACKDROP_Z = 1050;

    // Gap per level. Must exceed BASE_MODAL_Z - BASE_BACKDROP_Z (5) so that a
    // level's backdrop out-paints the dialog of the level below it -- which is
    // the entire Bootstrap stacking defect this works around.
    var LEVEL_STEP = 20;

    function ModalStack(rootModalId) {
        this.rootModalId = rootModalId;
        this.levels = [];
    }

    ModalStack.modalZIndex = function (level) {
        return BASE_MODAL_Z + level * LEVEL_STEP;
    };

    ModalStack.backdropZIndex = function (level) {
        return BASE_BACKDROP_Z + level * LEVEL_STEP;
    };

    window.ModalStack = ModalStack;
}(window, window.jQuery));
