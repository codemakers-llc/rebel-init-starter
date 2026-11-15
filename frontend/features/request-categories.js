import {createGeneratedCrudView} from '/rebel/generated-crud.js';
export default createGeneratedCrudView({
  "title": "Request Categories",
  "endpoint": "/api/catalog/categories",
  "fields": [
    {
      "key": "name",
      "label": "Category",
      "type": "string",
      "required": true,
      "maxLength": 100
    },
    {
      "key": "description",
      "label": "Description",
      "type": "text"
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean"
    }
  ]
});
