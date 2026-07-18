/*!
 * Modal Remote
 * =================================
 * Use for johnitvn/yii2-ajaxcrud extension
 * @author John Martin john.itvn@gmail.com
 */
(function ($) {
    $.fn.hasAttr = function (name) {
        return this.attr(name) !== undefined;
    };
}(jQuery));


function ModalRemote(modalId) {

    this.defaults = {
        okLabel: "OK",
        executeLabel: "Execute",
        cancelLabel: "Cancel",
        loadingTitle: "Loading"
    };

    this.toasts = [];

    this.modal = $(modalId);

    this.dialog = $(modalId).find('.modal-dialog');

    this.header = $(modalId).find('.modal-header');

    this.content = $(modalId).find('.modal-body');

    this.footer = $(modalId).find('.modal-footer');

    this.loadingContent = '<div class="progress progress-striped active" style="margin-bottom:0;"><div class="progress-bar" style="width: 100%"></div></div>';

    /**
     * Find INSIDE this modal only.
     *
     * This object writes fixed ids (#ModalRemoteConfirmForm, #actionModalForm,
     * #modal-error, #data-confirm-passcode-input) into whatever modal it drives.
     * With more than one container on the page a document-wide $() resolves to
     * whichever is first in DOM order -- i.e. the wrong level.
     */
    this.$find = function (selector) {
        return $(this.modal).find(selector);
    };


    /**
     * Show the modal
     */
    this.show = function () {
        this.clear();
        $(this.modal).modal('show');
    };

    /**
     * Hide the modal
     */
    this.hide = function (cb=function(){}) {
        $(this.modal).modal('hide').on('hidden.bs.modal', function () {
            cb();
        });
    };

    /**
     * Toogle show/hide modal
     */
    this.toggle = function () {
        $(this.modal).modal('toggle');
    };

    /**
     * Clear modal
     */
    this.clear = function () {
        $(this.modal).find('.modal-title').remove();
        $(this.content).html("");
        $(this.footer).html("");
    };

    /**
     * Set size of modal
     * @param {string} size large/normal/small
     */
    this.setSize = function (size) {
        $(this.dialog).removeClass('modal-lg');
        $(this.dialog).removeClass('modal-sm');
        if (size == 'large')
            $(this.dialog).addClass('modal-lg');
        else if (size == 'small')
            $(this.dialog).addClass('modal-sm');
        else if (size !== 'normal')
            console.warn("Undefined size " + size);
    };

    /**
     * Set modal header
     * @param {string} content The content of modal header
     */
    this.setHeader = function (content) {
        $(this.header).html(content);
    };

    /**
     * Set modal content
     * @param {string} content The content of modal content
     */
    this.setContent = function (content) {
        $(this.content).html(content);
    };

    /**
     * Set modal footer
     * @param {string} content The content of modal footer
     */
    this.setFooter = function (content) {
        $(this.footer).html(content);
    };

    /**
     * Set modal footer
     * @param {string} title The title of modal
     */
    this.setTitle = function (title) {
        // remove old title
        $(this.header).find('h4.modal-title').remove();
        $(this.header).find('button.btn-close').remove();
        // add new title
        $(this.header).append('<h4 class="modal-title">' + title + '</h4><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>');
    };

    /**
     * Hide close button
     */
    this.hidenCloseButton = function () {
        $(this.header).find('button.btn-close').hide();
    };

    /**
     * Show close button
     */
    this.showCloseButton = function () {
        $(this.header).find('button.btn-close').show();
    };

    /**
     * Show loading state in modal
     */
    this.displayLoading = function () {
        this.setContent(this.loadingContent);
        this.setTitle(this.defaults.loadingTitle);
    };

    /**
     * Add button to footer
     * @param string label The label of button
     * @param string classes The class of button
     * @param callable callback the callback when button click
     */
    this.addFooterButton = function (label, type, classes, callback) {
        buttonElm = document.createElement('button');
        buttonElm.setAttribute('type', type === null ? 'button' : type);
        buttonElm.setAttribute('class', classes === null ? 'btn btn-primary' : classes);
        buttonElm.innerHTML = label;
        var instance = this;
        $(this.footer).append(buttonElm);
        if (callback !== null) {
            $(buttonElm).click(function (event) {
                callback.call(instance, this, event);
            });
        }
    };

    /**
     * Send ajax request and wraper response to modal
     * @param {string} url The url of request
     * @param {string} method The method of request
     * @param {object}data of request
     */
    this.doRemote = function (url, method, data, successcallback=null) {
        var instance = this;
        // Captured up front: successRemoteResponse gets no `settings` object,
        // so this is how the toast inference (below) tells GET apart from a
        // write. doRemote runs synchronously (async: false) so there is no
        // interleaving with a second call before this one's success fires.
        this.lastRequestMethod = method;
        $.ajax({
            url: url,
            method: method,
            data: data,
            async: false,
            beforeSend: function () {
                beforeRemoteRequest.call(instance);
            },
            error: function (response) {
                errorRemoteResponse.call(instance, response);
            },
            success: function (response) {
                if(successcallback !== null){
                    successcallback(instance, response);
                } else {
                    successRemoteResponse.call(instance, response);
                }
            },
            contentType: false,
            cache: false,
            processData: false
        });
    };

    /**
     * Before send request process
     * - Ensure clear and show modal
     * - Show loading state in modal
     */
    function beforeRemoteRequest() {
        this.show();
        this.displayLoading();
    }


    /**
     * When remote sends error response
     * @param {string} response
     */
    function errorRemoteResponse(response) {
        this.setTitle(response.status + response.statusText);
        this.setContent(response.responseText);
        this.addFooterButton('Close', 'button', 'btn btn-default', function (button, event) {
            this.hide();
        })
    }

    /**
     * Reload the grid a response's forceReload selector points at.
     *
     * Resolves nearest-first outward from THIS level rather than document-wide:
     * ~245 controller responses emit the same '#crud-datatable-pjax', so a bare
     * $() picks by DOM order and can reload a host-page grid instead of ours.
     * No-op when the response carries no forceReload or no target exists.
     */
    function doForceReload(response) {
        if (response.forceReload === undefined || !response.forceReload) {
            return;
        }
        var reloadSelector = (response.forceReload == 'true')
            ? '#crud-datatable-pjax'   // backwards compatible fixed target
            : response.forceReload;

        var $target = this.modalStack
            ? this.modalStack.resolveReloadTarget(reloadSelector, this.modalLevel)
            : $(reloadSelector).first();

        if ($target.length > 0) {
            $.pjax.reload({container: '#' + $target.attr('id'), timeout: 2000});
        }
    }

    /**
     * When remote sends success response
     * @param {string} response
     */
    function successRemoteResponse(response) {

        // Explicit response.toasts always wins (infer nothing); otherwise
        // infer a toast from forceClose / the rendered content. See
        // ModalRemote.decideToasts for the full contract this package now
        // owns single-handedly (absorbed from the consuming app's
        // duplicate ajaxSuccess listener, which is removed separately).
        ModalRemote.decideToasts(response, this.lastRequestMethod).forEach(function (toast) {
            ModalRemote.showToast(toast.message, toast.type);
        });

        // Close modal if response contains forceClose field
        if (response.forceClose !== undefined && response.forceClose) {
            this.hide();
            // The level below is now stale -- this write is the whole point of the
            // nested flow. Guarded inside refreshParentAfter: only on a real write,
            // and never over a parent form the user has typed into.
            var parentRefreshed = this.modalStack
                ? this.modalStack.refreshParentAfter(this.modalLevel, response)
                : false;
            // A parent refresh subsumes forceReload -- otherwise a child's save
            // would fetch the same grid twice. But a TOP-LEVEL modal has no
            // parent level (refreshParentAfter is a no-op), and forceClose +
            // forceReload is the standard write response shape (every delete /
            // settings action emits it) -- its host-page grid must still reload.
            if (!parentRefreshed) {
                doForceReload.call(this, response);
            }
            return;
        }

        // Reload datatable if response contains a forceReload field (the
        // modal-stays-open path, e.g. create's "Create More" success response).
        doForceReload.call(this, response);

        if (response.size !== undefined)
            this.setSize(response.size);

        if (response.title !== undefined)
            this.setTitle(response.title);

        if (response.content !== undefined)
            this.setContent(response.content);

        if (response.footer !== undefined)
            this.setFooter(response.footer);

        if ($(this.content).find("form")[0] !== undefined) {
            this.setupFormSubmit(
                $(this.content).find("form")[0],
                $(this.footer).find('[type="submit"]')[0]
            );
        }
    }

    /**
     * Prepare submit button when modal has form
     * @param {string} modalForm
     * @param {object} modalFormSubmitBtn
     */
    this.setupFormSubmit = function (modalForm, modalFormSubmitBtn) {

        if (modalFormSubmitBtn === undefined) {
            // If submit button not found throw warning message
            console.warn('Modal has form but does not have a submit button');
        } else {
            var instance = this;

            // Submit form when user clicks submit button
            $(modalFormSubmitBtn).click(function (e) {
                var data;

                // Test if browser supports FormData which handles uploads
                if (window.FormData) {
                    data = new FormData($(modalForm)[0]);
                } else {
                    // Fallback to serialize
                    data = $(modalForm).serializeArray();
                }

                instance.doRemote(
                    $(modalForm).attr('action'),
                    $(modalForm).hasAttr('method') ? $(modalForm).attr('method') : 'GET',
                    data
                );
            });
        }
    };

    /**
     * Show the confirm dialog
     * @param {string} title The title of modal
     * @param {string} message The message for ask user
     * @param {string} okLabel The label of ok button
     * @param {string} cancelLabel The class of cancel button
     * @param {string} size The size of the modal
     * @param {string} dataUrl Where to post
     * @param {string} dataRequestMethod POST or GET
     * @param {number[]} selectedIds
     */
    this.confirmModal = function (title, message, validatePasscode, passcodeType, passcodeValue, okLabel, cancelLabel, size, dataUrl, dataRequestMethod, selectedIds) {
        this.show();
        this.setSize(size);

        if (title !== undefined) {
            this.setTitle(title);
        }
        
        /*Passcode Change*/
        validatePasscode = validatePasscode !== undefined ? validatePasscode : false;
        passcodeType = passcodeType !== undefined ? passcodeType : 'default';
        passcodeValue = passcodeValue !== undefined ?  passcodeValue : '12345';
        passwordConfirmText='';
        if(validatePasscode){
            passwordConfirmText = '<br /><br /><b><span class="text-danger">CAUTION !! This action might end up deleting data or initiate non-reversible actions. This action require additional passcode confirmation.</span></b>';
            passwordConfirmText += '<br /><br /><div id="data-confirm-passcode" class="form-group mb-3 field-passcode required"><label class="form-label" for="data-confirm-passcode-input">Passcode ('+passcodeType+'):</label><input type="password" id="data-confirm-passcode-input" class="form-control" name="passcode" value="" maxlength="50"><div class="invalid-feedback"></div></div>';
        }
        /*Passcode Change*/
        
        
        // Submit via THIS modal's footer button. The old global
        // $('.modal-footer button[type=submit]') submitted the parent's form when
        // this confirm was nested.
        this.setContent('<form id="ModalRemoteConfirmForm">' + message + passwordConfirmText);
        var confirmInstance = this;
        this.$find('#ModalRemoteConfirmForm').on('submit', function (e) {
            e.preventDefault();
            $(confirmInstance.footer).find('button[type=submit]').first().click();
        });
        if(validatePasscode){
                setTimeout(function(){confirmInstance.$find('#data-confirm-passcode-input').focus();},500);
        }

        var instance = this;
        this.addFooterButton(
            okLabel === undefined ? this.defaults.okLabel : okLabel,
            'submit',
            'btn btn-primary',
            function (e) {
                var data;
                /*Passcode Change*/
                setTimeout(function(){instance.$find('#data-confirm-passcode-input').focus();},500);
                if(validatePasscode){
                    if(instance.$find('#data-confirm-passcode-input').val() == passcodeValue){
                        instance.$find('#data-confirm-passcode').removeClass('is-invalid').removeClass('is-valid').addClass('is-valid');
                        instance.$find('#data-confirm-passcode .invalid-feedback').html("Passcode validation Successful.").show();
                    } else {
                        instance.$find('#data-confirm-passcode').removeClass('is-invalid').removeClass('is-valid').addClass('is-invalid');
                        instance.$find('#data-confirm-passcode .invalid-feedback').html("Passcode validation failed.").show();
                        return false;
                    }
                }
                /*Passcode Change*/

                // Test if browser supports FormData which handles uploads
                if (window.FormData) {
                    data = new FormData(instance.$find('#ModalRemoteConfirmForm')[0]);
                    if (typeof selectedIds !== 'undefined' && selectedIds)
                        data.append('pks', selectedIds.join());
                } else {
                    // Fallback to serialize
                    data = instance.$find('#ModalRemoteConfirmForm');
                    if (typeof selectedIds !== 'undefined' && selectedIds)
                        data.pks = selectedIds;
                    data = data.serializeArray();
                }

                instance.doRemote(
                    dataUrl,
                    dataRequestMethod,
                    data
                );
            }
        );

        this.addFooterButton(
            cancelLabel === undefined ? this.defaults.cancelLabel : cancelLabel,
            'button',
            'btn btn-secondary float-start',
            function (e) {
                this.hide();
            }
        );

    }

    /**
     * Open the modal
     * HTML data attributes for use in local confirm
     *   - href/data-url         (If href not set will get data-url)
     *   - data-request-method   (string GET/POST)
     *   - data-confirm-ok       (string OK button text)
     *   - data-confirm-cancel   (string cancel button text)
     *   - data-confirm-title    (string title of modal box)
     *   - data-confirm-message  (string message in modal box)
     *   - data-modal-size       (string small/normal/large)
     * Attributes for remote response (json)
     *   - forceReload           (string reloads a pjax ID)
     *   - forceClose            (boolean remote close modal)
     *   - size                  (string small/normal/large)
     *   - title                 (string/html title of modal box)
     *   - content               (string/html content in modal box)
     *   - footer                (string/html footer of modal box)
     * @params {elm}
     */
    this.open = function (elm, bulkData) {
        /**
         * Show either a local confirm modal or get modal content through ajax
         */
        if ($(elm).hasAttr('data-confirm-title') || $(elm).hasAttr('data-confirm-message')) {
            this.confirmModal (
                $(elm).attr('data-confirm-title'),
                $(elm).attr('data-confirm-message'),
                $(elm).hasAttr('data-confirm-passcode') ? $(elm).attr('data-confirm-passcode') !== false : false, //Confirm Password Change
                $(elm).attr('data-confirm-passcode-type'), //Confirm Password Change
                $(elm).attr('data-confirm-passcode-value'), //Confirm Password Change
                $(elm).attr('data-confirm-ok'),
                $(elm).attr('data-confirm-cancel'),
                $(elm).hasAttr('data-modal-size') ? $(elm).attr('data-modal-size') : 'normal',
                $(elm).hasAttr('href') ? $(elm).attr('href') : $(elm).attr('data-url'),
                $(elm).hasAttr('data-request-method') ? $(elm).attr('data-request-method') : 'GET',
                bulkData
            )
        } else {
            this.doRemote(
                $(elm).hasAttr('href') ? $(elm).attr('href') : $(elm).attr('data-url'),
                $(elm).hasAttr('data-request-method') ? $(elm).attr('data-request-method') : 'GET',
                bulkData
            );
        }
    }

    //Enahncement to Open as Table
    this.openAsTable = function (url, method, config) {
        //config.title,
        this.doRemote(url, method, null, function(instance, response){
            successRemoteResponseTable(instance, response, config);
        } );
    }

    function successRemoteResponseTable(instance, response, config) {
        /*
            config.title, config.footer, config.size, config.processRow(row_data)
        */

        if (config.size !== undefined)
            instance.setSize(config.size);

        if (config.title !== undefined)
            instance.setTitle(config.title);

        //Create Table from Response
        if(config.processRow === undefined){
            content = 'config.processRow(row_data) is not defined';
        } else {
            content = '';
            response.forEach(row_data=>{
                content += config.processRow(row_data);
            });

            content = '<table class="' + config.tableClass +'"><thead>' + config.tableHeader + '</thead><tbody>' + content + '</tbody></table>';
        }
        
        instance.setContent(content);

        if (config.footer !== undefined)
            instance.setFooter(config.footer);
    }

    this.actionModal = function (config, completedCallback = function(){}) {
        var instance = this;
        beforeRemoteRequest.call(instance);
        //errorRemoteResponse.call(instance, response);
        if (config.size !== undefined)
            instance.setSize(config.size);

        if (config.title !== undefined)
            instance.setTitle(config.title);

        if (config.footer !== undefined)
            instance.setFooter(config.footer);

        if (config.content !== undefined){
            instance.setContent('<div id="modal-error" class="alert alert-danger" style="display:none; padding:3px;">HE</div><form id="actionModalForm">' + config.content + '</form>');
        } else {
            instance.setContent("NO CONTENT TO DISPLAY");
        }

        if(config.type !== undefined && config.type.toLowerCase() == 'yesno'){
             instance.addFooterButton('Yes', 'submit', 'btn btn-success btn-lg float-end', function (button, event) {
                var formData;
                var jsonData = {};

                formData = instance.$find('#actionModalForm').serializeArray();
                formData.forEach(function(item) {
                    jsonData[item.name] = item.value;
                });
                
                if (config.successCallback !== undefined) {
                    //alert(JSON.stringify(formData));
                    config.successCallback(jsonData);
                } else {
                    alert('No successCallback defined');
                }
                this.hide(function(){});
            })
            instance.addFooterButton('No', 'button', 'btn btn-danger btn-lg float-start', function (button, event) {
                if(config.cancelCallback !== undefined){
                    config.cancelCallback();
                }
                this.hide(function(){});
            })
        } else {
            instance.addFooterButton('Submit', 'button', 'btn btn-primary', function (button, event) {
            if (config.successCallback !== undefined) {
                var formData;
                formData = instance.$find('#actionModalForm').serializeArray();
        
                var jsonData = {};
                formData.forEach(function(item) {
                jsonData[item.name] = item.value;
                });
        
                if(config.validateCallback !== undefined){
                    validateResponse = config.validateCallback(jsonData);
                    if(validateResponse !== true){
                        instance.$find('#modal-error').html(validateResponse.message).show();
                        return;
                    }
                } 

                //alert(JSON.stringify(formData));
                config.successCallback(jsonData);
            } else {
                alert('No successCallback defined');
            }
            this.hide(completedCallback);
            })
        }
    };


} // End of Object

/**
 * Render one Bootstrap 5 toast into the shared #toast-container.
 *
 * The single toast renderer: an explicit response.toasts entry and the
 * inferred classifier below (ModalRemote.decideToasts / .inferToast) both
 * funnel through here, so there is exactly one way a toast reaches the
 * screen and exactly one place its styling lives.
 *
 * @param {string} message
 * @param {string} [type] info|success|warning|danger|error
 */
ModalRemote.showToast = function (message, type) {
    var bgClass = {
        'info': 'bg-info',
        'success': 'bg-success',
        'warning': 'bg-warning',
        'danger': 'bg-danger',
        'error': 'bg-danger'
    }[type] || 'bg-info';

    var textClass = (type === 'warning') ? 'text-dark' : 'text-white';

    // Create toast container if it doesn't exist
    var container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '99999999';
        document.body.appendChild(container);
    }

    var toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    var toastElement = document.createElement('div');
    toastElement.id = toastId;
    toastElement.className = 'toast align-items-center ' + bgClass + ' ' + textClass + ' border-0';
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');

    var flex = document.createElement('div');
    flex.className = 'd-flex';

    var body = document.createElement('div');
    body.className = 'toast-body';
    body.textContent = message; // textContent -- never HTML-inject (real XSS boundary)

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close btn-close-white me-2 m-auto';
    closeBtn.setAttribute('data-bs-dismiss', 'toast');
    closeBtn.setAttribute('aria-label', 'Close');

    flex.appendChild(body);
    flex.appendChild(closeBtn);
    toastElement.appendChild(flex);
    container.appendChild(toastElement);

    // Feature-detected: absent in the jsdom test harness and in case
    // Bootstrap's JS bundle hasn't loaded yet.
    if (window.bootstrap && window.bootstrap.Toast) {
        var bsToast = new window.bootstrap.Toast(toastElement, { delay: 5000 });
        bsToast.show();
    }

    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
};

/**
 * Classify a modal-remote HTML fragment by its RENDERED markers, not
 * substrings. Bootstrap5 yii forms embed the literal strings "is-invalid"/
 * "has-error" inside their embedded yiiActiveForm config JSON, so a naive
 * String#indexOf would false-positive on every such form. DOMParser never
 * executes scripts, and querySelector only ever sees real elements, so the
 * JSON-embedded strings can't trigger a false positive here.
 *
 * @param {string} html
 * @return {('danger'|'success'|null)}
 */
ModalRemote.classifyContent = function (html) {
    if (typeof html !== 'string' || typeof DOMParser === 'undefined') {
        return null;
    }

    var doc;
    try {
        doc = new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
        return null;
    }
    if (!doc) { return null; }

    if (doc.querySelector('.has-error, .is-invalid, .alert-danger')) {
        // base ActiveForm marks field wrappers has-error; bootstrap5 marks
        // inputs is-invalid; message-style failures use alert-danger.
        return 'danger';
    }
    if (doc.querySelector('.alert-success, .text-success')) {
        return 'success';
    }
    if (doc.querySelector('form')) {
        // A form came back with no error/success markers -- outcome
        // unknowable; better silent than wrong.
        return null;
    }
    // No form, no markers: a view/detail re-render after a save.
    return 'success';
};

/**
 * Decide the toast for a response that carries no explicit
 * response.toasts, given the request method.
 *
 * successRemoteResponse receives no `settings` object to read the HTTP
 * method from, so doRemote captures it up front as
 * `this.lastRequestMethod` and it is threaded in here as `method`.
 *
 * @param {object} response
 * @param {string} [method]
 * @return {({type: string, message: string}|null)}
 */
ModalRemote.inferToast = function (response, method) {
    if (!response) { return null; }

    if (response.forceClose) {
        return { type: 'success', message: 'Action completed' };
    }

    var verb = (method || 'GET').toUpperCase();
    if (verb === 'GET') { return null; } // form/view loads never toast
    if (typeof response.content !== 'string') { return null; }

    var outcome = ModalRemote.classifyContent(response.content);
    if (!outcome) { return null; }

    return {
        type: outcome,
        message: outcome === 'danger' ? 'Please fix the highlighted errors' : 'Saved successfully'
    };
};

/**
 * Full toast decision for a modal-remote response. An explicit
 * response.toasts array always wins and nothing is inferred from the
 * content/method; otherwise fall back to inferToast. Pure: returns what to
 * render, it does not render anything itself (successRemoteResponse renders
 * each entry via ModalRemote.showToast).
 *
 * @param {object} response
 * @param {string} [method]
 * @return {Array<{type: string, message: string}>}
 */
ModalRemote.decideToasts = function (response, method) {
    if (response && Array.isArray(response.toasts) && response.toasts.length) {
        return response.toasts.map(function (toast) {
            return { type: toast.type, message: toast.message };
        });
    }

    var inferred = ModalRemote.inferToast(response, method);
    return inferred ? [inferred] : [];
};
