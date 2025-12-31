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
     * When remote sends success response
     * @param {string} response
     */
    function successRemoteResponse(response) {

        // check if force reload target is exists
        if ($(response.forceReload).length > 0){
            // Reload datatable if response contain forceReload field
            if (response.forceReload !== undefined && response.forceReload) {
                if (response.forceReload == 'true') {
                    // Backwards compatible reload of fixed crud-datatable-pjax
                    $.pjax.reload({container: '#crud-datatable-pjax'});
                } else {
                    $.pjax.reload({container: response.forceReload});
                }
            }
        }

       if(response.toasts !== undefined){
            if (Array.isArray(response.toasts)) {
                response.toasts.forEach(function(toast){
                    // Use Bootstrap 5 native toast
                    var bgClass = {
                        'info': 'bg-info',
                        'success': 'bg-success', 
                        'warning': 'bg-warning',
                        'danger': 'bg-danger',
                        'error': 'bg-danger'
                    }[toast.type] || 'bg-info';
                    
                    var textClass = (toast.type === 'warning') ? 'text-dark' : 'text-white';
                    
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
                    var toastHtml = '<div id="' + toastId + '" class="toast align-items-center ' + bgClass + ' ' + textClass + ' border-0" role="alert" aria-live="assertive" aria-atomic="true">' +
                        '<div class="d-flex">' +
                            '<div class="toast-body">' + toast.message + '</div>' +
                            '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>' +
                        '</div>' +
                    '</div>';
                    
                    container.insertAdjacentHTML('beforeend', toastHtml);
                    
                    var toastElement = document.getElementById(toastId);
                    var bsToast = new bootstrap.Toast(toastElement, { delay: 5000 });
                    bsToast.show();
                    
                    toastElement.addEventListener('hidden.bs.toast', function() {
                        toastElement.remove();
                    });
                }, this);
            }
        }
                
        // Close modal if response contains forceClose field
        if (response.forceClose !== undefined && response.forceClose) {
            this.hide();
            return;
        }

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
        
        
        // Add form for user input if required
        this.setContent('<form id="ModalRemoteConfirmForm" onsubmit="$(\'.modal-footer button[type=submit]\').click(); return false;">'+message+passwordConfirmText);
        if(validatePasscode){
                setTimeout(function(){$('#data-confirm-passcode-input').focus();},500);
        }

        var instance = this;
        this.addFooterButton(
            okLabel === undefined ? this.defaults.okLabel : okLabel,
            'submit',
            'btn btn-primary',
            function (e) {
                var data;
                /*Passcode Change*/
                setTimeout(function(){$('#data-confirm-passcode-input').focus();},500);
                if(validatePasscode){
                    if($('#data-confirm-passcode-input').val() == passcodeValue){
                        $('#data-confirm-passcode').removeClass('is-invalid').removeClass('is-valid').addClass('is-valid');
                        $('#data-confirm-passcode .invalid-feedback').html("Passcode validation Successful.").show();
                    } else {
                        $('#data-confirm-passcode').removeClass('is-invalid').removeClass('is-valid').addClass('is-invalid');
                        $('#data-confirm-passcode .invalid-feedback').html("Passcode validation failed.").show();
                        return false;
                    }
                }
                /*Passcode Change*/
                
                // Test if browser supports FormData which handles uploads
                if (window.FormData) {
                    data = new FormData($('#ModalRemoteConfirmForm')[0]);
                    if (typeof selectedIds !== 'undefined' && selectedIds)
                        data.append('pks', selectedIds.join());
                } else {
                    // Fallback to serialize
                    data = $('#ModalRemoteConfirmForm');
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

                formData = $('#actionModalForm').serializeArray();
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
                formData = $('#actionModalForm').serializeArray();
        
                var jsonData = {};
                formData.forEach(function(item) {
                jsonData[item.name] = item.value;
                });
        
                if(config.validateCallback !== undefined){
                    validateResponse = config.validateCallback(jsonData);
                    if(validateResponse !== true){
                        $('#modal-error').html(validateResponse.message).show();
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
