import {HelpGuides} from '../components/HelpGuides';
import {SupportTickets,type SupportRequest} from '../components/SupportTickets';
import {api} from './api';
const request:SupportRequest=(path,body)=>api(path,body);
export function AdminSupport(){return <><HelpGuides initialRole="ADMIN" admin/><SupportTickets request={request} staff/></>;}
