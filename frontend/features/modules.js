import {createGeneratedCrudView} from '/rebel/generated-crud.js';
export default createGeneratedCrudView({
  "title": "Modules",
  "endpoint": "/api/catalog/modules",
  "fields": [
    {
      "key": "name",
      "label": "Module Name",
      "type": "string",
      "required": true,
      "maxLength": 100
    },
    {
      "key": "icon",
      "label": "Icon",
      "type": "select",
      "options": [
        "folder",
        "layout-dashboard",
        "clipboard-list",
        "database",
        "blocks",
        "shield-check",
        "package"
      ]
    },
    {
      "key": "order",
      "label": "Display Order",
      "type": "integer"
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean"
    }
  ]
});
