// REBEL_VIEW_CONFIG: {"type":"component","component":"request-workflow","title":"Request List & Creation","mode":"submission","endpoints":["/api/requests","/api/catalog/categories"],"fields":["title","description","category","priority","requesterEmail","dueDate","estimatedCost","urgent"]}
import {requestWorkflowView} from '../components/request-workflow.js';
export default requestWorkflowView('submission');
