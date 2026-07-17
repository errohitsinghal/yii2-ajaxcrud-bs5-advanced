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

    /**
     * Step or nest? Ask: will the user come back to this modal?
     *
     * Footer  -> no. It is the modal's action bar; taking one of its verbs means
     *            you are done here. Replace in place (today's behaviour).
     * Body    -> yes. It is content; the link is a detour to another record.
     *
     * Reads only the region the link sits in -- never the URL or the entity.
     * A footer "Create More" targets a brand-new record yet must still step.
     */
    ModalStack.classifyIntent = function (el) {
        var $el = $(el);

        if ($el.is('[data-modal-nest]')) { return 'nest'; }
        if ($el.is('[data-modal-step]')) { return 'step'; }

        // Not inside a modal: nothing to nest onto.
        if (!$el.closest('.modal').length) { return 'step'; }

        return $el.closest('.modal-footer').length ? 'step' : 'nest';
    };

    /**
     * Which level is this element inside? -1 for the host page.
     * Identity-compares DOM nodes -- never ids, which are not unique in the
     * consuming app (duplicate #ajaxCrudModal declarations exist).
     */
    ModalStack.prototype.levelOf = function (el) {
        var $modal = $(el).closest('.modal');
        if (!$modal.length) { return -1; }

        for (var i = 0; i < this.levels.length; i++) {
            if (this.levels[i].$el[0] === $modal[0]) { return i; }
        }
        return -1;
    };

    /**
     * Which level should this click drive?
     */
    ModalStack.prototype.targetLevelFor = function (el) {
        var origin = this.levelOf(el);
        if (origin < 0) { return 0; }
        return ModalStack.classifyIntent(el) === 'nest' ? origin + 1 : origin;
    };

    window.ModalStack = ModalStack;
}(window, window.jQuery));
