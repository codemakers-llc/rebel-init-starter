import {createCatalogSuiteView} from '/rebel/catalog-suite.js';
export default createCatalogSuiteView({title:'Catalogs',catalogs:[
 {key:'modules',title:'Modules',endpoint:'/api/catalog/modules',fields:[{key:'name',label:'Module Name',type:'string',required:true,maxLength:100},{key:'icon',label:'Icon',type:'select',options:['folder','layout-dashboard','clipboard-list','database','blocks','shield-check','package']},{key:'order',label:'Display Order',type:'integer'},{key:'active',label:'Active',type:'checkbox'}]},
 {key:'categories',title:'Request Categories',endpoint:'/api/catalog/categories',fields:[{key:'name',label:'Category',type:'string',required:true,maxLength:100},{key:'description',label:'Description',type:'text'},{key:'active',label:'Active',type:'checkbox'}]},
 {key:'criteria',title:'Evaluation Criteria',endpoint:'/api/catalog/criteria',fields:[{key:'name',label:'Criterion',type:'string',required:true,maxLength:100},{key:'weight',label:'Weight',type:'number'},{key:'active',label:'Active',type:'checkbox'}]}
]});
