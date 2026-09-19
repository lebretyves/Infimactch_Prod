import {Link,useSearchParams} from 'react-router';
import {useAuth} from '@/context/AuthContext';
import {api} from '@/services/api';
import {HelpGuides} from '@/components/HelpGuides';
import {SupportTickets,type SupportRequest} from '@/components/SupportTickets';
import {usePageTitle} from '@/lib/usePageTitle';
const request:SupportRequest=(path,body)=>api('/me'+path,body===undefined?undefined:{method:'POST',body});
export default function Aide(){const {user}=useAuth();const [params]=useSearchParams();usePageTitle('Aide et support');return <main style={{maxWidth:1000,margin:'auto',padding:'24px clamp(16px,4vw,48px)',overflowWrap:'anywhere'}}><Link to={user?'/accueil':'/connexion'}>← {user?'Mon espace':'Connexion'}</Link><h1>Aide et support</h1><HelpGuides key={user?.role||'public'} initialRole={user?.role==='interimaire'?'NURSE':user?.role==='etablissement'?'ESTABLISHMENT':user?'AGENCY':'ALL'}/><hr/>{user?<SupportTickets request={request} initialTicket={params.get('ticket')||''}/>:<section><h2>Besoin d’aide sans accès au compte ?</h2><p>Consultez le guide de connexion ou écrivez à <a href="mailto:yleb.user@outlook.fr">yleb.user@outlook.fr</a>. N’envoyez aucun mot de passe, document d’identité ou donnée bancaire par email.</p><p><Link to="/mot-de-passe-oublie">Récupérer mon accès</Link> · <Link to="/connexion">Me connecter pour suivre mes demandes</Link></p></section>}</main>;}
