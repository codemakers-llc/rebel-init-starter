import {createGeneratedCrudView} from '/rebel/generated-crud.js';
export default createGeneratedCrudView({
  "title": "Evaluation Criteria",
  "endpoint": "/api/catalog/criteria",
  "fields": [
    {
      "key": "name",
      "label": "Criterion",
      "type": "string",
      "required": true,
      "maxLength": 100
    },
    {
      "key": "weight",
      "label": "Weight",
      "type": "number"
    },
    {
      "key": "active",
      "label": "Active",
      "type": "boolean"
    }
  ]
});
