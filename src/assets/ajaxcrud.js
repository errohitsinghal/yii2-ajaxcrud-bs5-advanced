/*!
 * Ajax Crud
 * =================================
 * Use for johnitvn/yii2-ajaxcrud extension
 * @author John Martin john.itvn@gmail.com
 */
$(document).ready(function () {

    // One stack, not one modal. A modal-remote link clicked inside an open modal
    // stacks a new level instead of destroying the one the user is standing in.
    // Backwards compatible lookup of the old ajaxCrubModal ID.
    var rootId = ($('#ajaxCrubModal').length > 0 && $('#ajaxCrudModal').length === 0)
        ? '#ajaxCrubModal'
        : '#ajaxCrudModal';

    var modalStack = new ModalStack(rootId);
    window.modalStack = modalStack;

    // Back-compat: `modal` is an implicit global that app views poke directly.
    // Keep it pointing at level 0.
    modal = modalStack.remoteFor(0);

    $(document).on('click', '[role="modal-remote"]', function (event) {
        event.preventDefault();
        modalStack.openFrom(this, null);
    });

    $(document).on('click', '[role="modal-remote-bulk"]', function (event) {
        event.preventDefault();

        var selectedIds = [];
        var selection = $(this).data('selector') != null ? $(this).data('selector') : 'selection';

        $('input:checkbox[name="' + selection + '[]"]').each(function () {
            if (this.checked) { selectedIds.push($(this).val()); }
        });

        if (selectedIds.length === 0) {
            var m = modalStack.remoteFor(modalStack.targetLevelFor(this));
            m.show();
            m.setTitle('No selection');
            m.setContent('You must select item(s) to use this action');
            m.addFooterButton('Close', 'button', 'btn btn-default', function () {
                this.hide();
            });
            return;
        }

        modalStack.openFrom(this, selectedIds);
    });

    // Handle Pjax refresh on modal close
    $(document).on('hide.bs.modal', '.modal', function () {
        var pjaxRefreshId = $(this).find('[data-pjax-refresh]').data('pjax-refresh');
        if (pjaxRefreshId && typeof $.pjax !== 'undefined') {
            $.pjax.reload({ container: '#' + pjaxRefreshId, timeout: 2000 });
        }
    });
});
