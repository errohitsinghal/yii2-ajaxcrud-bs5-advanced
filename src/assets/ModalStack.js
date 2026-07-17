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

    /**
     * A bare Bootstrap 5 modal skeleton. The four regions must all exist up front:
     * ModalRemote caches .modal-dialog/.modal-header/.modal-body/.modal-footer at
     * construction time, so a region added later would never be seen.
     */
    ModalStack.containerHtml = function (level) {
        return '<div class="modal fade" id="ajaxCrudModal-L' + level + '" tabindex="-1" aria-hidden="true">' +
                 '<div class="modal-dialog modal-lg">' +
                   '<div class="modal-content">' +
                     '<div class="modal-header"></div>' +
                     '<div class="modal-body"></div>' +
                     '<div class="modal-footer"></div>' +
                   '</div>' +
                 '</div>' +
               '</div>';
    };

    ModalStack.bsInstance = function (el) {
        if (!window.bootstrap || !window.bootstrap.Modal || !el) { return null; }
        return window.bootstrap.Modal.getInstance(el);
    };

    /** Grow the stack until `level` exists, and return that level. */
    ModalStack.prototype.ensureLevel = function (level) {
        while (this.levels.length <= level) {
            this.push();
        }
        return this.levels[level];
    };

    ModalStack.prototype.push = function () {
        var level = this.levels.length;
        var $el = null;
        var owned = true;

        // Level 0 reuses the layout's container when it has one, so that views
        // and JS referencing #ajaxCrudModal keep working.
        if (level === 0) {
            var $root = $(this.rootModalId);
            if ($root.length) {
                $el = $root.first();
                owned = false;
            }
        }

        if (!$el) {
            // Body level, always: a container nested inside another modal would
            // inherit that modal's stacking context and could never paint above it.
            $el = $(ModalStack.containerHtml(level)).appendTo(document.body);
        }

        $el.css('z-index', ModalStack.modalZIndex(level));

        var entry = { level: level, $el: $el, owned: owned, remote: null, origin: null };
        this.levels.push(entry);
        return entry;
    };

    ModalStack.prototype.pop = function () {
        var entry = this.levels.pop();
        if (!entry) { return; }

        var inst = ModalStack.bsInstance(entry.$el[0]);
        if (inst) { inst.hide(); }

        // Only remove containers we created. The layout owns level 0's element.
        if (entry.owned) {
            if (inst) { inst.dispose(); }
            entry.$el.remove();
        }
    };

    /**
     * Drop every level deeper than `level`. Clicking a host-page link while two
     * modals are open must close both rather than orphan them.
     */
    ModalStack.prototype.truncateAbove = function (level) {
        while (this.levels.length > level + 1) {
            this.pop();
        }
    };

    /**
     * Give the backdrop Bootstrap just created this level's z-index.
     *
     * BS5's Backdrop appends a bare div to <body> and never sets z-index, so every
     * backdrop lands at 1050 while every modal sits at 1055 -- meaning a nested
     * modal's backdrop paints BELOW the parent's dialog. The backdrop is not a
     * child of the modal, so it cannot inherit a custom property from it; the value
     * has to be written onto the element.
     *
     * Untagged-and-last identifies the new one without depending on DOM order races.
     */
    ModalStack.claimBackdrop = function (level) {
        var $bd = $('.modal-backdrop').not('[data-modal-level]').last();
        if (!$bd.length) { return; }
        $bd.attr('data-modal-level', String(level))
           .css('z-index', ModalStack.backdropZIndex(level));
    };

    /**
     * Re-arm a parent modal's focus trap after a child closed.
     *
     * BS5's FocusTrap.activate() calls EventHandler.off(document, ...) before
     * binding, which DESTROYS the parent's trap rather than suspending it, while
     * leaving parentTrap._isActive === true. deactivate() never restores it, and
     * activate() early-returns forever while _isActive. Without resetting the flag
     * first the parent is left with no trap: tab escapes to the page behind, and
     * ESC (bound through the trap) dies with it.
     *
     * Touches a Bootstrap private. Pinned to Bootstrap 5.3.8 -- re-check on upgrade.
     */
    ModalStack.restoreFocusTrap = function (el, getInstance) {
        var inst = (getInstance || ModalStack.bsInstance)(el);
        if (!inst || !inst._focustrap) { return; }
        inst._focustrap._isActive = false;
        inst._focustrap.activate();
    };

    window.ModalStack = ModalStack;
}(window, window.jQuery));
