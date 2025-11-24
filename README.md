yii2-ajaxcrud-bs5-advanced
=============

Gii CRUD template for Single Page Ajax Administration for yii2 with Password Validation Modal Support

Based on **johnitvn/yii2-ajaxcrud** and **denkorolkov/yii2-ajaxcrud-bs5**

![yii2 ajaxcrud extension screenshot](https://c1.staticflickr.com/1/330/18659931433_6e3db2461d_o.png "yii2 ajaxcrud extension screenshot")


Features
------------
+ Create, read, update, delete in onpage with Ajax
+ Bulk delete support with optional password validation
+ Pjax widget support
+ Export function (PDF, HTML, Text, CSV, Excel, JSON)
+ Bootstrap 5 support
+ **Password Modal for Critical Operations** - Secure sensitive actions with passcode confirmation
+ Customizable button text with Font Awesome icons
+ Advanced modal dialogs with toast notifications
+ Table-based modal content display

Installation
------------

The preferred way to install this extension is through [composer](http://getcomposer.org/download/).

Either run

```
php composer.phar require --prefer-dist errohitsinghal/yii2-ajaxcrud-bs5-advanced "@dev"
```

or add

```
"errohitsinghal/yii2-ajaxcrud-bs5-advanced": "@dev"
```

to the require section of your `composer.json` file.


Usage
-----
For first you must enable Gii module Read more about [Gii code generation tool](http://www.yiiframework.com/doc-2.0/guide-tool-gii.html)

Because this extension used [kartik-v/yii2-grid](https://github.com/kartik-v/yii2-grid) extensions so we must config gridview module before

Let 's add into modules config in your main config file
```php
'modules' => [
    'gridview' =>  [
        'class' => \kartik\grid\Module::class,
        'bsVersion' => '5.x', 
        // 'downloadAction' => 'gridview/export/download',
        // 'i18n' => [],
        // 'exportEncryptSalt' => 'tG85vd1',
    ]       
]
```
Note: Font Awesome icons not required! See [Bootstrap icons](https://demos.krajee.com/grid#bootstrap-icons)!

You can then access Gii through the following URL:

http://localhost/path/to/index.php?r=gii

and you can see <b>Ajax CRUD Generator</b>


Password Validation Modal
---------
This advanced version includes secure password/passcode validation for critical operations like bulk delete.

### Using Password Modal in Views

To enable passcode confirmation for delete or other critical operations, add these data attributes to your button:

```php
<?php
// In your view file
echo Html::a('Delete', ['delete', 'id' => $model->id], [
    'class' => 'btn btn-danger',
    'data' => [
        'confirm-title' => 'Confirm Delete',
        'confirm-message' => 'Are you sure you want to delete this record?',
        'confirm-passcode' => 'true',
        'confirm-passcode-type' => 'Admin Password',
        'confirm-passcode-value' => 'your-secret-code',
        'confirm-ok' => 'Delete',
        'confirm-cancel' => 'Cancel',
        'request-method' => 'POST'
    ]
]);
?>
```

### Modal Features

- **validatePasscode**: Enable/disable passcode validation (default: false)
- **passcodeType**: Label for passcode input (e.g., 'Admin Password', 'PIN')
- **passcodeValue**: The correct passcode to validate against
- **Toast Notifications**: Success/error messages with automatic display
- **Form Validation**: Built-in form submission handling
- **Custom Callbacks**: Define custom success and cancel callbacks

### Available Modal Data Attributes

- `data-confirm-title`: Modal title
- `data-confirm-message`: Modal content/message
- `data-confirm-passcode`: Enable passcode validation (true/false)
- `data-confirm-passcode-type`: Passcode input label
- `data-confirm-passcode-value`: Correct passcode value
- `data-confirm-ok`: OK button label
- `data-confirm-cancel`: Cancel button label
- `data-modal-size`: Modal size (small/normal/large)
- `data-request-method`: HTTP method (GET/POST)
- `href` or `data-url`: Target URL for the action


Bootstrap 5 Classes
---------
This extension fully supports Bootstrap 5 CSS classes including:
- `float-start` / `float-end` (replaces pull-left/pull-right)
- `btn-close` for modal close button
- `form-label`, `form-control`, `invalid-feedback` for forms
- `is-invalid`, `is-valid` for form validation states
- `alert-danger` for error messages
- All modern Bootstrap 5 utility classes


Contributing
---------
Lets contribute to keep it updated and make it useful for all friends.
